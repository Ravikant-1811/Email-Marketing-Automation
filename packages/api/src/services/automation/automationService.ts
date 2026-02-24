import { Op } from "sequelize";
import App from "src/app";
import AutomationRun, {
  AutomationRunStatus,
} from "src/models/automationRun.model";
import AutomationStep, {
  AutomationStepStatus,
} from "src/models/automationStep.model";
import Email from "src/models/email.model";
import ProductUser from "src/models/productUser.model";
import SendEmail from "src/services/email/sendEmail";
import SequenceError, { HTTP_BAD_REQUEST } from "src/error/sequenceError";

interface AutomationLeadInput {
  email?: string;
  externalId?: string;
  firstName?: string;
  lastName?: string;
  traits?: Record<string, any>;
}

interface AutomationStepInput {
  emailId: string;
  delayMinutes?: number;
}

export interface CreateAutomationRunInput {
  name?: string;
  lead: AutomationLeadInput;
  steps: AutomationStepInput[];
  startImmediately?: boolean;
}

class AutomationService {
  app: App;
  constructor(app: App) {
    this.app = app;
  }

  async createRun(userId: string, payload: CreateAutomationRunInput) {
    if (!payload?.lead) {
      throw new SequenceError("lead is required", HTTP_BAD_REQUEST);
    }

    if (!payload.steps || payload.steps.length === 0) {
      throw new SequenceError("At least one step is required", HTTP_BAD_REQUEST);
    }

    const cleanedSteps = payload.steps.map((step, index) => ({
      stepOrder: index + 1,
      emailId: step.emailId,
      delayMinutes: Math.max(0, step.delayMinutes || 0),
    }));

    const emailIds = cleanedSteps.map((step) => step.emailId);
    const emails = await Email.findAll({
      where: {
        userId,
        id: emailIds,
      },
    });

    if (emails.length !== emailIds.length) {
      throw new SequenceError(
        "One or more email templates are invalid for this user",
        HTTP_BAD_REQUEST
      );
    }

    const productUser = await this.ensureProductUser(userId, payload.lead);

    const run = await AutomationRun.create({
      userId,
      productUserId: productUser.id,
      name:
        payload.name ||
        `Automation run ${new Date().toISOString().slice(0, 19).replace("T", " ")}`,
      status: AutomationRunStatus.ACTIVE,
    });

    const baseDate = new Date();
    await AutomationStep.bulkCreate(
      cleanedSteps.map((step) => ({
        automationRunId: run.id,
        emailId: step.emailId,
        stepOrder: step.stepOrder,
        delayMinutes: step.delayMinutes,
        scheduledFor: new Date(baseDate.getTime() + step.delayMinutes * 60_000),
        status: AutomationStepStatus.PENDING,
      }))
    );

    if (payload.startImmediately !== false) {
      await this.dispatchDueSteps(userId, run.id);
    }

    return this.getRunById(userId, run.id);
  }

  async listRuns(userId: string, limit = 20) {
    return AutomationRun.findAll({
      where: {
        userId,
      },
      include: [
        {
          model: AutomationStep,
          as: "steps",
        },
      ],
      order: [["createdAt", "DESC"]],
      limit,
    });
  }

  async getRunById(userId: string, runId: string) {
    return AutomationRun.findOne({
      where: {
        id: runId,
        userId,
      },
      include: [
        {
          model: AutomationStep,
          as: "steps",
        },
      ],
      order: [[{ model: AutomationStep, as: "steps" }, "stepOrder", "ASC"]],
    });
  }

  async dispatchDueSteps(userId: string, runId?: string) {
    const runWhere: Record<string, any> = {
      userId,
    };

    if (runId) {
      runWhere.id = runId;
    }

    const steps = await AutomationStep.findAll({
      where: {
        status: AutomationStepStatus.PENDING,
        scheduledFor: {
          [Op.lte]: new Date(),
        },
      },
      include: [
        {
          model: AutomationRun,
          as: "automationRun",
          required: true,
          where: runWhere,
        },
      ],
      order: [
        ["scheduledFor", "ASC"],
        ["stepOrder", "ASC"],
      ],
      limit: 100,
    });

    let sent = 0;
    let failed = 0;
    const affectedRuns = new Set<string>();

    for (const step of steps) {
      affectedRuns.add(step.automationRunId);
      const run = await AutomationRun.findByPk(step.automationRunId);

      if (!run) {
        failed += 1;
        continue;
      }

      const productUser = await ProductUser.findOne({
        where: {
          id: run.productUserId,
          userId,
        },
      });

      const email = await Email.findOne({
        where: {
          id: step.emailId,
          userId,
        },
      });

      if (!productUser || !email) {
        await step.update({
          status: AutomationStepStatus.ERROR,
          error: "Product user or email template missing",
        });
        await run.update({ status: AutomationRunStatus.ERROR });
        failed += 1;
        continue;
      }

      await step.update({
        status: AutomationStepStatus.PROCESSING,
        error: null,
      });

      const sender = new SendEmail();
      sender
        .setProvider(this.app.getEmail().getProvider())
        .setEmail(email)
        .setProductUser(productUser);

      try {
        await sender.send();
        const sentEmail = await this.app.models.SentEmail.create({
          emailId: email.id,
          productUserId: productUser.id,
          deliveryStatus: "DELIVERED",
          deliveredAt: new Date(),
        });

        await step.update({
          status: AutomationStepStatus.SENT,
          sentAt: new Date(),
          sentEmailId: sentEmail.id,
          error: null,
        });

        sent += 1;
      } catch (error) {
        await this.app.models.SentEmail.create({
          emailId: email.id,
          productUserId: productUser.id,
          deliveryStatus: "ERROR",
          erroredAt: new Date(),
          error: (error as Error).message,
        });

        await step.update({
          status: AutomationStepStatus.ERROR,
          error: (error as Error).message,
        });

        await run.update({ status: AutomationRunStatus.ERROR });
        failed += 1;
      }

      await run.update({ lastExecutedAt: new Date() });
    }

    await Promise.all(
      Array.from(affectedRuns).map((id) => this.syncRunStatus(id))
    );

    return {
      matched: steps.length,
      sent,
      failed,
    };
  }

  async syncRunStatus(runId: string) {
    const run = await AutomationRun.findByPk(runId);
    if (!run || run.status === AutomationRunStatus.ERROR) {
      return;
    }

    const pendingSteps = await AutomationStep.count({
      where: {
        automationRunId: runId,
        status: {
          [Op.in]: [AutomationStepStatus.PENDING, AutomationStepStatus.PROCESSING],
        },
      },
    });

    if (pendingSteps === 0) {
      await run.update({ status: AutomationRunStatus.COMPLETED });
    }
  }

  async ensureProductUser(userId: string, input: AutomationLeadInput) {
    if (!input.email && !input.externalId) {
      throw new SequenceError(
        "lead.email or lead.externalId is required",
        HTTP_BAD_REQUEST
      );
    }

    const orWhere = [];
    if (input.email) {
      orWhere.push({ email: input.email });
    }
    if (input.externalId) {
      orWhere.push({ externalId: input.externalId });
    }

    let productUser = await ProductUser.findOne({
      where: {
        userId,
        [Op.or]: orWhere,
      },
    });

    const updatePayload = {
      email: input.email,
      externalId: input.externalId || input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      traits: input.traits || {},
    };

    if (!productUser) {
      productUser = await ProductUser.create({
        ...updatePayload,
        userId,
      });
      return productUser;
    }

    await productUser.update({
      ...updatePayload,
      traits: {
        ...(productUser.traits || {}),
        ...(input.traits || {}),
      },
    });

    return productUser;
  }
}

export default AutomationService;
