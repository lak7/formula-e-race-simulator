import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';

export const sessions = sqliteTable('sessions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  duration: integer('duration').notNull(),
  completedAt: text('completed_at').notNull(),
  sessionType: text('session_type').notNull(),
  createdAt: text('created_at').notNull(),
});

export const plants = sqliteTable('plants', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  type: text('type').notNull(),
  growthStage: integer('growth_stage').notNull().default(0),
  sessionsCompleted: integer('sessions_completed').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});