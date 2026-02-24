import { Application, Request, Response } from "express";
import database from "src/database";
import { jwt as jwtAuth } from "src/auth/jwt.auth";
import SequenceError, {
  HTTP_BAD_REQUEST,
  HTTP_UNAUTHORIZED,
} from "src/error/sequenceError";
import AutomationService, {
  CreateAutomationRunInput,
} from "src/services/automation/automationService";

class AutomationHttpHandler {
  constructor(app: Application) {
    this.registerRoutes(app);
  }

  registerRoutes(app: Application) {
    app.post("/automation/runs", this.withJwt(this.createRun.bind(this)));
    app.get("/automation/runs", this.withJwt(this.listRuns.bind(this)));
    app.get("/automation/runs/:id", this.withJwt(this.getRun.bind(this)));
    app.post(
      "/automation/runs/:id/dispatch",
      this.withJwt(this.dispatchRun.bind(this))
    );
    app.post("/automation/dispatch", this.withJwt(this.dispatchAll.bind(this)));
  }

  getService() {
    const app = (database as any).app;

    if (!app) {
      throw new SequenceError(
        "Application not initialized",
        HTTP_BAD_REQUEST
      );
    }

    return new AutomationService(app);
  }

  getAuthenticatedUser(req: Request) {
    const header = req.headers.authorization;

    if (!header || !header.startsWith("Bearer")) {
      throw new SequenceError("Unauthorized", HTTP_UNAUTHORIZED);
    }

    const user = jwtAuth(header, req);

    if (!user?.id) {
      throw new SequenceError("Unauthorized", HTTP_UNAUTHORIZED);
    }

    return user;
  }

  withJwt(handler: (user: any, req: Request) => Promise<any>) {
    return async (req: Request, res: Response) => {
      try {
        const user = this.getAuthenticatedUser(req);
        const result = await handler(user, req);
        return res.json({
          success: true,
          ...result,
        });
      } catch (error) {
        if ((error as SequenceError).statusCode) {
          const sequenceError = error as SequenceError;
          return res.status(sequenceError.statusCode).json({
            success: false,
            ...(sequenceError.payload || { message: sequenceError.message }),
          });
        }

        return res.status(500).json({
          success: false,
          message: (error as Error).message,
        });
      }
    };
  }

  async createRun(user: any, req: Request) {
    const service = this.getService();
    const run = await service.createRun(user.id, req.body as CreateAutomationRunInput);
    return { run };
  }

  async listRuns(user: any, req: Request) {
    const service = this.getService();
    const limit = Number(req.query.limit || 20);
    const runs = await service.listRuns(user.id, limit);
    return { runs };
  }

  async getRun(user: any, req: Request) {
    const service = this.getService();
    const run = await service.getRunById(user.id, req.params.id);

    if (!run) {
      throw new SequenceError("Automation run not found", HTTP_BAD_REQUEST);
    }

    return { run };
  }

  async dispatchRun(user: any, req: Request) {
    const service = this.getService();
    const summary = await service.dispatchDueSteps(user.id, req.params.id);
    return { summary };
  }

  async dispatchAll(user: any) {
    const service = this.getService();
    const summary = await service.dispatchDueSteps(user.id);
    return { summary };
  }
}

export default AutomationHttpHandler;
