"use strict";
const { UUID } = require("sequelize");

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("automation_runs", {
      id: {
        primaryKey: true,
        unique: true,
        type: UUID,
        allowNull: false,
        defaultValue: Sequelize.literal("uuid_generate_v4()"),
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: "ACTIVE",
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
        type: Sequelize.DATE,
        allowNull: true,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("now()"),
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("now()"),
      },
      deletedAt: {
        type: Sequelize.DATE,
      },
    });

    await queryInterface.createTable("automation_steps", {
      id: {
        primaryKey: true,
        unique: true,
        type: UUID,
        allowNull: false,
        defaultValue: Sequelize.literal("uuid_generate_v4()"),
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
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      delayMinutes: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      scheduledFor: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: "PENDING",
      },
      sentAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      error: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("now()"),
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("now()"),
      },
      deletedAt: {
        type: Sequelize.DATE,
      },
    });

    await queryInterface.addIndex("automation_steps", ["status", "scheduledFor"], {
      name: "automation_steps_status_scheduled_for_idx",
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable("automation_steps");
    await queryInterface.dropTable("automation_runs");
  },
};
