import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const teachers = pgTable("teachers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  hourlyRate: decimal("hourly_rate", { precision: 10, scale: 2 }).notNull(),
  maxBillableHours: decimal("max_billable_hours", { precision: 4, scale: 2 }).notNull(),
  isCheckedIn: boolean("is_checked_in").default(false),
  currentCheckInTime: timestamp("current_check_in_time"),
});

export const timeEntries = pgTable("time_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teacherId: varchar("teacher_id").notNull().references(() => teachers.id),
  date: text("date").notNull(), // YYYY-MM-DD format
  checkInTime: timestamp("check_in_time").notNull(),
  checkOutTime: timestamp("check_out_time"),
  hoursWorked: decimal("hours_worked", { precision: 4, scale: 2 }),
  billableHours: decimal("billable_hours", { precision: 4, scale: 2 }),
  pay: decimal("pay", { precision: 10, scale: 2 }),
});

export const appSettings = pgTable("app_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  pinHash: text("pin_hash").notNull(),
});

export const insertTeacherSchema = createInsertSchema(teachers).omit({
  id: true,
  isCheckedIn: true,
  currentCheckInTime: true,
});

export const insertTimeEntrySchema = createInsertSchema(timeEntries).omit({
  id: true,
  hoursWorked: true,
  billableHours: true,
  pay: true,
});

export const insertAppSettingsSchema = createInsertSchema(appSettings).omit({
  id: true,
});

export const pinSetupSchema = z.object({
  pin: z.string().min(4).max(6),
});

export const pinValidationSchema = z.object({
  pin: z.string().min(4).max(6),
});

export type Teacher = typeof teachers.$inferSelect;
export type InsertTeacher = z.infer<typeof insertTeacherSchema>;
export type TimeEntry = typeof timeEntries.$inferSelect;
export type InsertTimeEntry = z.infer<typeof insertTimeEntrySchema>;
export type AppSettings = typeof appSettings.$inferSelect;
export type InsertAppSettings = z.infer<typeof insertAppSettingsSchema>;
