import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTeacherSchema, pinSetupSchema, pinValidationSchema } from "@shared/schema";
import bcrypt from "bcryptjs";

export async function registerRoutes(app: Express): Promise<Server> {
  // Check if PIN is set up
  app.get("/api/settings/pin-setup", async (req, res) => {
    try {
      const settings = await storage.getAppSettings();
      res.json({ hasPin: !!settings });
    } catch (error) {
      res.status(500).json({ message: "Failed to check PIN setup" });
    }
  });

  // Set up initial PIN
  app.post("/api/settings/setup-pin", async (req, res) => {
    try {
      const { pin } = pinSetupSchema.parse(req.body);
      const settings = await storage.getAppSettings();
      
      if (settings) {
        return res.status(400).json({ message: "PIN already set up" });
      }

      const pinHash = await bcrypt.hash(pin, 10);
      await storage.createAppSettings(pinHash);
      
      res.json({ message: "PIN set up successfully" });
    } catch (error) {
      res.status(400).json({ message: "Invalid PIN format" });
    }
  });

  // Validate PIN for admin access
  app.post("/api/auth/validate-pin", async (req, res) => {
    try {
      const { pin } = pinValidationSchema.parse(req.body);
      const isValid = await storage.validatePin(pin);
      
      if (!isValid) {
        return res.status(401).json({ message: "Invalid PIN" });
      }

      // Set session
      (req as any).session.isAdmin = true;
      res.json({ message: "PIN validated successfully" });
    } catch (error) {
      res.status(400).json({ message: "Invalid PIN format" });
    }
  });

  // Check admin session
  app.get("/api/auth/check-admin", async (req, res) => {
    const isAdmin = (req as any).session?.isAdmin || false;
    res.json({ isAdmin });
  });

  // Logout admin
  app.post("/api/auth/logout", async (req, res) => {
    (req as any).session.isAdmin = false;
    res.json({ message: "Logged out successfully" });
  });

  // Reset all data
  app.post("/api/settings/reset", async (req, res) => {
    try {
      await storage.resetAllData();
      (req as any).session.isAdmin = false;
      res.json({ message: "All data reset successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to reset data" });
    }
  });

  // Get all teachers
  app.get("/api/teachers", async (req, res) => {
    try {
      const teachers = await storage.getTeachers();
      res.json(teachers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch teachers" });
    }
  });

  // Create teacher (admin only)
  app.post("/api/teachers", async (req, res) => {
    const isAdmin = (req as any).session?.isAdmin || false;
    if (!isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const teacherData = insertTeacherSchema.parse(req.body);
      const teacher = await storage.createTeacher(teacherData);
      res.status(201).json(teacher);
    } catch (error) {
      res.status(400).json({ message: "Invalid teacher data" });
    }
  });

  // Update teacher (admin only)
  app.patch("/api/teachers/:id", async (req, res) => {
    const isAdmin = (req as any).session?.isAdmin || false;
    if (!isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { id } = req.params;
      const updates = req.body;
      const teacher = await storage.updateTeacher(id, updates);
      
      if (!teacher) {
        return res.status(404).json({ message: "Teacher not found" });
      }

      res.json(teacher);
    } catch (error) {
      res.status(400).json({ message: "Failed to update teacher" });
    }
  });

  // Delete teacher (admin only)
  app.delete("/api/teachers/:id", async (req, res) => {
    const isAdmin = (req as any).session?.isAdmin || false;
    if (!isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { id } = req.params;
      const deleted = await storage.deleteTeacher(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Teacher not found" });
      }

      res.json({ message: "Teacher deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete teacher" });
    }
  });

  // Check in teacher
  app.post("/api/teachers/:id/checkin", async (req, res) => {
    try {
      const { id } = req.params;
      const teacher = await storage.getTeacher(id);
      
      if (!teacher) {
        return res.status(404).json({ message: "Teacher not found" });
      }

      if (teacher.isCheckedIn) {
        return res.status(400).json({ message: "Teacher already checked in" });
      }

      const now = new Date();
      const updatedTeacher = await storage.updateTeacher(id, {
        isCheckedIn: true,
        currentCheckInTime: now,
      });

      // Create time entry
      const today = now.toISOString().split('T')[0];
      await storage.createTimeEntry({
        teacherId: id,
        date: today,
        checkInTime: now,
        checkOutTime: null,
      });

      res.json(updatedTeacher);
    } catch (error) {
      res.status(500).json({ message: "Failed to check in" });
    }
  });

  // Check out teacher
  app.post("/api/teachers/:id/checkout", async (req, res) => {
    try {
      const { id } = req.params;
      const teacher = await storage.getTeacher(id);
      
      if (!teacher) {
        return res.status(404).json({ message: "Teacher not found" });
      }

      if (!teacher.isCheckedIn || !teacher.currentCheckInTime) {
        return res.status(400).json({ message: "Teacher not checked in" });
      }

      const now = new Date();
      const checkInTime = new Date(teacher.currentCheckInTime);
      const hoursWorked = (now.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
      
      const maxHours = parseFloat(teacher.maxBillableHours);
      const billableHours = Math.min(hoursWorked, maxHours);
      const pay = billableHours * parseFloat(teacher.hourlyRate);

      // Update teacher
      const updatedTeacher = await storage.updateTeacher(id, {
        isCheckedIn: false,
        currentCheckInTime: null,
      });

      // Find and update time entry
      const today = now.toISOString().split('T')[0];
      const timeEntries = await storage.getTimeEntriesByTeacher(id);
      const todayEntry = timeEntries.find(entry => entry.date === today && !entry.checkOutTime);
      
      if (todayEntry) {
        await storage.updateTimeEntry(todayEntry.id, {
          checkOutTime: now,
          hoursWorked: hoursWorked.toString(),
          billableHours: billableHours.toString(),
          pay: pay.toString(),
        });
      }

      res.json(updatedTeacher);
    } catch (error) {
      res.status(500).json({ message: "Failed to check out" });
    }
  });

  // Get time entries
  app.get("/api/time-entries", async (req, res) => {
    try {
      const { teacherId, date } = req.query;
      let entries;

      if (teacherId) {
        entries = await storage.getTimeEntriesByTeacher(teacherId as string);
      } else if (date) {
        entries = await storage.getTimeEntriesByDate(date as string);
      } else {
        entries = await storage.getTimeEntries();
      }

      res.json(entries);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch time entries" });
    }
  });

  // Export timesheet data (admin only)
  app.get("/api/export/timesheet", async (req, res) => {
    const isAdmin = (req as any).session?.isAdmin || false;
    if (!isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const teachers = await storage.getTeachers();
      const timeEntries = await storage.getTimeEntries();
      
      const exportData = timeEntries
        .filter(entry => entry.checkOutTime) // Only completed entries
        .map(entry => {
          const teacher = teachers.find(t => t.id === entry.teacherId);
          return {
            teacherName: teacher?.name || 'Unknown',
            date: entry.date,
            checkInTime: entry.checkInTime,
            checkOutTime: entry.checkOutTime,
            hoursWorked: entry.hoursWorked,
            billableHours: entry.billableHours,
            hourlyRate: teacher?.hourlyRate || '0',
            pay: entry.pay,
          };
        })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      res.json(exportData);
    } catch (error) {
      res.status(500).json({ message: "Failed to export timesheet data" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
