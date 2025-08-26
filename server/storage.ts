import { type Teacher, type InsertTeacher, type TimeEntry, type InsertTimeEntry, type AppSettings } from "@shared/schema";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";

export interface IStorage {
  // Teachers
  getTeachers(): Promise<Teacher[]>;
  getTeacher(id: string): Promise<Teacher | undefined>;
  createTeacher(teacher: InsertTeacher): Promise<Teacher>;
  updateTeacher(id: string, updates: Partial<Teacher>): Promise<Teacher | undefined>;
  deleteTeacher(id: string): Promise<boolean>;
  
  // Time Entries
  getTimeEntries(): Promise<TimeEntry[]>;
  getTimeEntriesByTeacher(teacherId: string): Promise<TimeEntry[]>;
  getTimeEntriesByDate(date: string): Promise<TimeEntry[]>;
  getTimeEntry(id: string): Promise<TimeEntry | undefined>;
  createTimeEntry(timeEntry: InsertTimeEntry): Promise<TimeEntry>;
  updateTimeEntry(id: string, updates: Partial<TimeEntry>): Promise<TimeEntry | undefined>;
  
  // App Settings
  getAppSettings(): Promise<AppSettings | undefined>;
  createAppSettings(pinHash: string): Promise<AppSettings>;
  updateAppSettings(pinHash: string): Promise<AppSettings | undefined>;
  validatePin(pin: string): Promise<boolean>;
  resetAllData(): Promise<void>;
}

export class MemStorage implements IStorage {
  private teachers: Map<string, Teacher>;
  private timeEntries: Map<string, TimeEntry>;
  private appSettings: AppSettings | undefined;

  constructor() {
    this.teachers = new Map();
    this.timeEntries = new Map();
    this.appSettings = undefined;
  }

  // Teachers
  async getTeachers(): Promise<Teacher[]> {
    return Array.from(this.teachers.values());
  }

  async getTeacher(id: string): Promise<Teacher | undefined> {
    return this.teachers.get(id);
  }

  async createTeacher(insertTeacher: InsertTeacher): Promise<Teacher> {
    const id = randomUUID();
    const teacher: Teacher = {
      ...insertTeacher,
      id,
      isCheckedIn: false,
      currentCheckInTime: null,
    };
    this.teachers.set(id, teacher);
    return teacher;
  }

  async updateTeacher(id: string, updates: Partial<Teacher>): Promise<Teacher | undefined> {
    const teacher = this.teachers.get(id);
    if (!teacher) return undefined;
    
    const updatedTeacher = { ...teacher, ...updates };
    this.teachers.set(id, updatedTeacher);
    return updatedTeacher;
  }

  async deleteTeacher(id: string): Promise<boolean> {
    return this.teachers.delete(id);
  }

  // Time Entries
  async getTimeEntries(): Promise<TimeEntry[]> {
    return Array.from(this.timeEntries.values());
  }

  async getTimeEntriesByTeacher(teacherId: string): Promise<TimeEntry[]> {
    return Array.from(this.timeEntries.values()).filter(entry => entry.teacherId === teacherId);
  }

  async getTimeEntriesByDate(date: string): Promise<TimeEntry[]> {
    return Array.from(this.timeEntries.values()).filter(entry => entry.date === date);
  }

  async getTimeEntry(id: string): Promise<TimeEntry | undefined> {
    return this.timeEntries.get(id);
  }

  async createTimeEntry(insertTimeEntry: InsertTimeEntry): Promise<TimeEntry> {
    const id = randomUUID();
    const timeEntry: TimeEntry = {
      ...insertTimeEntry,
      id,
      checkOutTime: insertTimeEntry.checkOutTime || null,
      hoursWorked: null,
      billableHours: null,
      pay: null,
    };
    this.timeEntries.set(id, timeEntry);
    return timeEntry;
  }

  async updateTimeEntry(id: string, updates: Partial<TimeEntry>): Promise<TimeEntry | undefined> {
    const timeEntry = this.timeEntries.get(id);
    if (!timeEntry) return undefined;
    
    const updatedTimeEntry = { ...timeEntry, ...updates };
    this.timeEntries.set(id, updatedTimeEntry);
    return updatedTimeEntry;
  }

  // App Settings
  async getAppSettings(): Promise<AppSettings | undefined> {
    return this.appSettings;
  }

  async createAppSettings(pinHash: string): Promise<AppSettings> {
    const id = randomUUID();
    const settings: AppSettings = {
      id,
      pinHash,
    };
    this.appSettings = settings;
    return settings;
  }

  async updateAppSettings(pinHash: string): Promise<AppSettings | undefined> {
    if (!this.appSettings) return undefined;
    
    this.appSettings.pinHash = pinHash;
    return this.appSettings;
  }

  async validatePin(pin: string): Promise<boolean> {
    if (!this.appSettings) return false;
    return bcrypt.compare(pin, this.appSettings.pinHash);
  }

  async resetAllData(): Promise<void> {
    this.teachers.clear();
    this.timeEntries.clear();
    this.appSettings = undefined;
  }
}

export const storage = new MemStorage();
