import { integer, sqliteTable, text, uniqueIndex, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const accessRequests = sqliteTable("access_requests", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  status: text("status").notNull().default("pending"),
  accessKeyHash: text("access_key_hash"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  approvedAt: text("approved_at"),
}, (t) => [
  uniqueIndex("idx_access_requests_email").on(t.email),
  index("idx_access_requests_status").on(t.status),
]);

export const accessSessions = sqliteTable("access_sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull(),
  tokenHash: text("token_hash").notNull(),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t) => [uniqueIndex("idx_access_sessions_token").on(t.tokenHash)]);
