import { InitOptions, STRING, DATE, UUID, Model } from "sequelize";
import Sequelize from "sequelize";
import { v4 as uuidv4 } from "uuid";
import sequelize from "../database";
import ProductUser from "./productUser.model";
import User from "./user.model";
import AutomationStep from "./automationStep.model";

const config: InitOptions = {
  tableName: "automation_runs",
  sequelize,
  paranoid: true,
};

export enum AutomationRunStatus {
  ACTIVE = "ACTIVE",
  COMPLETED = "COMPLETED",
  PAUSED = "PAUSED",
  ERROR = "ERROR",
}

export interface AutomationRunAttributes {
  id: string;
  name: string;
  status: AutomationRunStatus;
  userId: string;
  productUserId: string;
  lastExecutedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date;
}

export interface AutomationRunCreationAttributes {
  id?: string;
  name?: string;
  status?: AutomationRunStatus;
  userId: string;
  productUserId: string;
  lastExecutedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

class AutomationRun extends Model<
  AutomationRunAttributes,
  AutomationRunCreationAttributes
> {
  public id!: string;
  public name: string;
  public status: AutomationRunStatus;
  public userId: string;
  public productUserId: string;
  public lastExecutedAt: Date | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

AutomationRun.init(
  {
    id: {
      primaryKey: true,
      unique: true,
      type: UUID,
      allowNull: false,
      defaultValue: () => uuidv4(),
    },
    name: {
      type: STRING,
      allowNull: false,
    },
    status: {
      type: STRING,
      allowNull: false,
      defaultValue: AutomationRunStatus.ACTIVE,
    },
    userId: {
      type: UUID,
      references: {
        model: "users",
        key: "id",
      },
      allowNull: false,
    },
    productUserId: {
      type: UUID,
      references: {
        model: "product_users",
        key: "id",
      },
      allowNull: false,
    },
    lastExecutedAt: {
      type: DATE,
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
AutomationRun.associate = () => {
  AutomationRun.belongsTo(User, {
    as: "user",
  });

  AutomationRun.belongsTo(ProductUser, {
    as: "productUser",
  });

  AutomationRun.hasMany(AutomationStep, {
    as: "steps",
    foreignKey: "automationRunId",
  });
};

export default AutomationRun;
