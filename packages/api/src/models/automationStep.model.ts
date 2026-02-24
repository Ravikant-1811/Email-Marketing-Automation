import { InitOptions, STRING, DATE, UUID, INTEGER, Model } from "sequelize";
import Sequelize from "sequelize";
import { v4 as uuidv4 } from "uuid";
import sequelize from "../database";
import AutomationRun from "./automationRun.model";
import Email from "./email.model";
import SentEmail from "./sent_emails";

const config: InitOptions = {
  tableName: "automation_steps",
  sequelize,
  paranoid: true,
};

export enum AutomationStepStatus {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  SENT = "SENT",
  ERROR = "ERROR",
}

export interface AutomationStepAttributes {
  id: string;
  automationRunId: string;
  emailId: string;
  sentEmailId: string | null;
  stepOrder: number;
  delayMinutes: number;
  scheduledFor: Date;
  status: AutomationStepStatus;
  sentAt: Date | null;
  error: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date;
}

export interface AutomationStepCreationAttributes {
  id?: string;
  automationRunId: string;
  emailId: string;
  sentEmailId?: string | null;
  stepOrder: number;
  delayMinutes: number;
  scheduledFor: Date;
  status?: AutomationStepStatus;
  sentAt?: Date | null;
  error?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

class AutomationStep extends Model<
  AutomationStepAttributes,
  AutomationStepCreationAttributes
> {
  public id!: string;
  public automationRunId: string;
  public emailId: string;
  public sentEmailId: string | null;
  public stepOrder: number;
  public delayMinutes: number;
  public scheduledFor: Date;
  public status: AutomationStepStatus;
  public sentAt: Date | null;
  public error: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

AutomationStep.init(
  {
    id: {
      primaryKey: true,
      unique: true,
      type: UUID,
      allowNull: false,
      defaultValue: () => uuidv4(),
    },
    automationRunId: {
      type: UUID,
      references: {
        model: "automation_runs",
        key: "id",
      },
      allowNull: false,
    },
    emailId: {
      type: UUID,
      references: {
        model: "emails",
        key: "id",
      },
      allowNull: false,
    },
    sentEmailId: {
      type: UUID,
      references: {
        model: "sent_emails",
        key: "id",
      },
      allowNull: true,
    },
    stepOrder: {
      type: INTEGER,
      allowNull: false,
    },
    delayMinutes: {
      type: INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    scheduledFor: {
      type: DATE,
      allowNull: false,
    },
    status: {
      type: STRING,
      allowNull: false,
      defaultValue: AutomationStepStatus.PENDING,
    },
    sentAt: {
      type: DATE,
      allowNull: true,
    },
    error: {
      type: STRING,
      allowNull: true,
    },
    createdAt: {
      allowNull: false,
      type: DATE,
      defaultValue: Sequelize.literal("now()"),
    },
    updatedAt: {
      allowNull: false,
      type: DATE,
      defaultValue: Sequelize.literal("now()"),
    },
    deletedAt: {
      type: DATE,
    },
  },
  config
);

//@ts-ignore
AutomationStep.associate = () => {
  AutomationStep.belongsTo(AutomationRun, {
    as: "automationRun",
    foreignKey: "automationRunId",
  });

  AutomationStep.belongsTo(Email, {
    as: "email",
  });

  AutomationStep.belongsTo(SentEmail, {
    as: "sentEmail",
  });
};

export default AutomationStep;
