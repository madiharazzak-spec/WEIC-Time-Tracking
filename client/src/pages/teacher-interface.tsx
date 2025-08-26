import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LogIn, LogOut, Info, Timer } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Teacher, TimeEntry } from "@shared/schema";

export default function TeacherInterface() {
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());
  const { toast } = useToast();

  // Fetch teachers
  const { data: teachers = [], isLoading: teachersLoading } = useQuery<Teacher[]>({
    queryKey: ['/api/teachers'],
  });

  // Fetch time entries for selected teacher
  const { data: timeEntries = [] } = useQuery<TimeEntry[]>({
    queryKey: ['/api/time-entries', selectedTeacherId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedTeacherId) {
        params.append('teacherId', selectedTeacherId);
      }
      const response = await apiRequest('GET', `/api/time-entries?${params.toString()}`);
      return response.json();
    },
    enabled: !!selectedTeacherId,
  });

  // Get selected teacher
  const selectedTeacher = teachers.find(t => t.id === selectedTeacherId);

  // Update timer every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Check-in mutation
  const checkInMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/teachers/${selectedTeacherId}/checkin`);
    },
    onSuccess: () => {
      toast({
        title: "Checked In",
        description: "Your time tracking has started",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/teachers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/time-entries'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to check in",
        variant: "destructive",
      });
    },
  });

  // Check-out mutation
  const checkOutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/teachers/${selectedTeacherId}/checkout`);
    },
    onSuccess: () => {
      toast({
        title: "Checked Out",
        description: "Your time tracking has stopped",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/teachers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/time-entries'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to check out",
        variant: "destructive",
      });
    },
  });

  // Calculate today's hours
  const today = new Date().toISOString().split('T')[0];
  const todayEntries = timeEntries.filter(entry => entry.date === today);
  const todayHours = todayEntries.reduce((total, entry) => {
    if (entry.hoursWorked) {
      return total + parseFloat(entry.hoursWorked);
    }
    // If currently checked in, calculate current hours
    if (entry.checkInTime && !entry.checkOutTime && selectedTeacher?.isCheckedIn) {
      const now = new Date();
      const checkIn = new Date(entry.checkInTime);
      const hours = (now.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
      return total + hours;
    }
    return total;
  }, 0);

  // Get recent completed entries (last 5)
  const recentEntries = timeEntries
    .filter(entry => entry.checkOutTime)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const formatTime = (date: Date | string | null) => {
    if (!date) return "--:--";
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatHours = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}:${m.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Compare dates using toDateString to avoid timezone issues
    const entryDateString = date.toDateString();
    const todayString = today.toDateString();
    const yesterdayString = yesterday.toDateString();
    
    if (entryDateString === todayString) {
      return "Today";
    } else if (entryDateString === yesterdayString) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  const formatTimer = (checkInTime: Date | string) => {
    const start = new Date(checkInTime);
    const elapsed = currentTime.getTime() - start.getTime();
    
    const hours = Math.floor(elapsed / (1000 * 60 * 60));
    const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((elapsed % (1000 * 60)) / 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  if (teachersLoading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-md">
        <div className="bg-card rounded-lg shadow-lg p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-10 bg-muted rounded"></div>
            <div className="h-12 bg-muted rounded"></div>
            <div className="h-12 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-md">
      <div className="bg-card rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-2xl font-bold text-center mb-6">Welcome, Teachers!</h2>
        
        {/* Teacher Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Select Your Name</label>
          <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
            <SelectTrigger className="w-full p-3" data-testid="select-teacher">
              <SelectValue placeholder="Choose your name..." />
            </SelectTrigger>
            <SelectContent>
              {teachers.map((teacher) => (
                <SelectItem key={teacher.id} value={teacher.id} data-testid={`option-teacher-${teacher.id}`}>
                  {teacher.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Check-in/out Buttons */}
        <div className="space-y-4">
          <Button
            className="w-full py-4 text-lg font-semibold"
            disabled={!selectedTeacher || selectedTeacher.isCheckedIn || checkInMutation.isPending}
            onClick={() => checkInMutation.mutate()}
            data-testid="button-check-in"
          >
            <LogIn className="mr-2 h-5 w-5" />
            {checkInMutation.isPending ? "Checking In..." : "Check In"}
          </Button>
          
          <Button
            variant="secondary"
            className="w-full py-4 text-lg font-semibold"
            disabled={!selectedTeacher || !selectedTeacher.isCheckedIn || checkOutMutation.isPending}
            onClick={() => checkOutMutation.mutate()}
            data-testid="button-check-out"
          >
            <LogOut className="mr-2 h-5 w-5" />
            {checkOutMutation.isPending ? "Checking Out..." : "Check Out"}
          </Button>
        </div>
      </div>

      {/* Current Status Card */}
      <div className="bg-card rounded-lg shadow-lg p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">Your Current Status</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Status:</span>
            <span className={`flex items-center ${
              selectedTeacher?.isCheckedIn ? 'text-chart-2' : 'text-destructive'
            }`} data-testid="status-indicator">
              <span className={`w-2 h-2 rounded-full mr-2 ${
                selectedTeacher?.isCheckedIn ? 'bg-chart-2 pulse-dot' : 'bg-destructive'
              }`}></span>
              {selectedTeacher?.isCheckedIn ? 'Checked In' : 'Not Checked In'}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-muted-foreground">Check-in Time:</span>
            <span data-testid="text-checkin-time">
              {selectedTeacher?.currentCheckInTime 
                ? formatTime(selectedTeacher.currentCheckInTime)
                : '--:--'
              }
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-muted-foreground">Hours Today:</span>
            <span data-testid="text-hours-today">
              {formatHours(todayHours)}
            </span>
          </div>
          
          {selectedTeacher?.isCheckedIn && selectedTeacher?.currentCheckInTime && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Current Session:</span>
              <span className="font-mono text-primary" data-testid="text-timer">
                <Timer className="inline-block mr-1 h-4 w-4" />
                {formatTimer(selectedTeacher.currentCheckInTime)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-card rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Your Recent Activity</h3>
        
        {recentEntries.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <Info className="mx-auto h-12 w-12 mb-4" />
            <p>No recent activity to display</p>
            <p className="text-sm mt-2">Your completed time entries will appear here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentEntries.map((entry, index) => {
              const hours = entry.hoursWorked ? parseFloat(entry.hoursWorked) : 0;
              
              return (
                <div
                  key={entry.id}
                  className="flex justify-between items-center py-2 border-b border-border last:border-b-0"
                  data-testid={`activity-entry-${index}`}
                >
                  <div>
                    <div className="font-medium" data-testid={`text-entry-date-${index}`}>
                      {formatDate(entry.date)}
                    </div>
                    <div className="text-sm text-muted-foreground" data-testid={`text-entry-times-${index}`}>
                      {formatTime(entry.checkInTime)} - {formatTime(entry.checkOutTime)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium" data-testid={`text-entry-hours-${index}`}>
                      {formatHours(hours)} hrs
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        <div className="text-center text-muted-foreground text-sm mt-4">
          <Info className="inline-block mr-1 h-4 w-4" />
          Only your time entries are shown
        </div>
      </div>
    </div>
  );
}
