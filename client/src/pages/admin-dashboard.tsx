import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Download, LogOut, Watch, Clock, DollarSign, Edit, Trash2, Calendar } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import AddTeacherModal from "@/components/add-teacher-modal";
import type { Teacher, TimeEntry } from "@shared/schema";

interface AdminDashboardProps {
  onLogout: () => void;
}

export default function AdminDashboard({ onLogout }: AdminDashboardProps) {
  const [showAddTeacher, setShowAddTeacher] = useState(false);
  const [exportMonth, setExportMonth] = useState("");
  const [exportYear, setExportYear] = useState("");
  const { toast } = useToast();

  // Fetch teachers
  const { data: teachers = [] } = useQuery<Teacher[]>({
    queryKey: ['/api/teachers'],
  });

  // Fetch time entries
  const { data: timeEntries = [] } = useQuery<TimeEntry[]>({
    queryKey: ['/api/time-entries'],
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Logged out successfully",
      });
      onLogout();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to logout",
        variant: "destructive",
      });
    },
  });

  // Delete teacher mutation
  const deleteTeacherMutation = useMutation({
    mutationFn: async (teacherId: string) => {
      await apiRequest("DELETE", `/api/teachers/${teacherId}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Teacher deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/teachers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/time-entries'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete teacher",
        variant: "destructive",
      });
    },
  });

  // Export timesheet mutation
  const exportMutation = useMutation({
    mutationFn: async ({ month, year }: { month?: string; year?: string } = {}) => {
      const params = new URLSearchParams();
      if (month) params.append('month', month);
      if (year) params.append('year', year);
      const queryString = params.toString();
      const url = queryString ? `/api/export/timesheet?${queryString}` : "/api/export/timesheet";
      const response = await apiRequest("GET", url);
      return response.json();
    },
    onSuccess: (data) => {
      // Create and download CSV
      const headers = [
        'Teacher Name',
        'Date',
        'Check In Time',
        'Check Out Time',
        'Hours Worked',
        'Billable Hours',
        'Hourly Rate',
        'Pay'
      ];
      
      const csvContent = [
        headers.join(','),
        ...data.map((row: any) => [
          `"${row.teacherName}"`,
          row.date,
          `"${new Date(row.checkInTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}"`,
          `"${new Date(row.checkOutTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}"`,
          parseFloat(row.hoursWorked).toFixed(2),
          parseFloat(row.billableHours).toFixed(2),
          row.hourlyRate,
          parseFloat(row.pay).toFixed(2)
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Generate filename based on export filter
      let filename = 'timesheet';
      if (exportMonth && exportYear) {
        const monthName = new Date(2000, parseInt(exportMonth) - 1, 1).toLocaleString('default', { month: 'long' });
        filename += `-${monthName}-${exportYear}`;
      } else {
        filename += `-${new Date().toISOString().split('T')[0]}`;
      }
      a.download = `${filename}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Timesheet exported successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to export timesheet",
        variant: "destructive",
      });
    },
  });

  // Calculate statistics
  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayEntries = timeEntries.filter(entry => entry.date === today);
    
    const checkedInCount = teachers.filter(t => t.isCheckedIn).length;
    
    const todayHours = todayEntries.reduce((total, entry) => {
      if (entry.hoursWorked) {
        return total + parseFloat(entry.hoursWorked);
      }
      // Calculate current hours for checked in teachers
      if (entry.checkInTime && !entry.checkOutTime) {
        const teacher = teachers.find(t => t.id === entry.teacherId);
        if (teacher?.isCheckedIn) {
          const now = new Date();
          const checkIn = new Date(entry.checkInTime);
          const hours = (now.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
          return total + hours;
        }
      }
      return total;
    }, 0);
    
    const todayPay = todayEntries.reduce((total, entry) => {
      if (entry.pay) {
        return total + parseFloat(entry.pay);
      }
      // Calculate current pay for checked in teachers
      if (entry.checkInTime && !entry.checkOutTime) {
        const teacher = teachers.find(t => t.id === entry.teacherId);
        if (teacher?.isCheckedIn) {
          const now = new Date();
          const checkIn = new Date(entry.checkInTime);
          const hours = (now.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
          const maxHours = parseFloat(teacher.maxBillableHours);
          const billableHours = Math.min(hours, maxHours);
          const pay = billableHours * parseFloat(teacher.hourlyRate);
          return total + pay;
        }
      }
      return total;
    }, 0);

    // Weekly stats (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekEntries = timeEntries.filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate >= weekAgo;
    });

    const weeklyHours = weekEntries.reduce((total, entry) => {
      return total + (entry.hoursWorked ? parseFloat(entry.hoursWorked) : 0);
    }, 0);

    const weeklyBillable = weekEntries.reduce((total, entry) => {
      return total + (entry.billableHours ? parseFloat(entry.billableHours) : 0);
    }, 0);

    const weeklyPay = weekEntries.reduce((total, entry) => {
      return total + (entry.pay ? parseFloat(entry.pay) : 0);
    }, 0);

    const avgDaily = weeklyHours / 7;

    return {
      checkedInCount,
      todayHours,
      todayPay,
      weeklyHours,
      weeklyBillable,
      weeklyPay,
      avgDaily
    };
  }, [teachers, timeEntries]);

  // Get teacher stats for table
  const teacherStats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    
    return teachers.map(teacher => {
      const todayEntries = timeEntries.filter(
        entry => entry.teacherId === teacher.id && entry.date === today
      );
      
      let todayHours = 0;
      let checkInTime = null;
      let checkOutTime = null;
      
      todayEntries.forEach(entry => {
        if (entry.hoursWorked) {
          todayHours += parseFloat(entry.hoursWorked);
        }
        if (entry.checkInTime && !entry.checkOutTime && teacher.isCheckedIn) {
          const now = new Date();
          const checkIn = new Date(entry.checkInTime);
          todayHours += (now.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
          checkInTime = entry.checkInTime;
        } else if (entry.checkInTime) {
          checkInTime = entry.checkInTime;
          checkOutTime = entry.checkOutTime;
        }
      });

      const maxHours = parseFloat(teacher.maxBillableHours);
      const billableHours = Math.min(todayHours, maxHours);
      const pay = billableHours * parseFloat(teacher.hourlyRate);

      return {
        ...teacher,
        todayHours,
        billableHours,
        pay,
        checkInTime,
        checkOutTime,
      };
    });
  }, [teachers, timeEntries]);

  const formatTime = (date: Date | string | null) => {
    if (!date) return "--:--";
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatHours = (hours: number) => {
    return hours.toFixed(1);
  };

  const handleDeleteTeacher = (teacherId: string, teacherName: string) => {
    if (window.confirm(`Are you sure you want to delete ${teacherName}? This will also delete all their time entries.`)) {
      deleteTeacherMutation.mutate(teacherId);
    }
  };

  const handleExport = () => {
    exportMutation.mutate({ 
      month: exportMonth || undefined, 
      year: exportYear || undefined 
    });
  };

  // Generate year options (current year and 2 years back)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 3 }, (_, i) => currentYear - i);
  
  // Month options
  const monthOptions = [
    { value: "1", label: "January" },
    { value: "2", label: "February" },
    { value: "3", label: "March" },
    { value: "4", label: "April" },
    { value: "5", label: "May" },
    { value: "6", label: "June" },
    { value: "7", label: "July" },
    { value: "8", label: "August" },
    { value: "9", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ];

  return (
    <>
      <div className="container mx-auto px-4 py-6">
        {/* Dashboard Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h2 className="text-2xl font-bold">Admin Dashboard</h2>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => setShowAddTeacher(true)}
              data-testid="button-add-teacher"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Teacher
            </Button>
            <Button
              variant="secondary"
              onClick={handleExport}
              disabled={exportMutation.isPending}
              data-testid="button-export"
            >
              <Download className="mr-2 h-4 w-4" />
              {exportMutation.isPending ? "Exporting..." : "Export"}
            </Button>
            <Button
              variant="destructive"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
              data-testid="button-logout"
            >
              <LogOut className="mr-2 h-4 w-4" />
              {logoutMutation.isPending ? "Logging out..." : "Logout"}
            </Button>
          </div>
        </div>

        {/* Export Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Export Options</h3>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setExportMonth("");
                  setExportYear("");
                }}
                data-testid="button-clear-filters"
              >
                Clear Filters
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Month</label>
                <Select value={exportMonth} onValueChange={setExportMonth}>
                  <SelectTrigger data-testid="select-month">
                    <SelectValue placeholder="All months" />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map((month) => (
                      <SelectItem key={month.value} value={month.value} data-testid={`option-month-${month.value}`}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Year</label>
                <Select value={exportYear} onValueChange={setExportYear}>
                  <SelectTrigger data-testid="select-year">
                    <SelectValue placeholder="All years" />
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions.map((year) => (
                      <SelectItem key={year} value={year.toString()} data-testid={`option-year-${year}`}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <div className="text-sm text-muted-foreground">
                  {exportMonth && exportYear ? (
                    <span>Exporting: {monthOptions.find(m => m.value === exportMonth)?.label} {exportYear}</span>
                  ) : exportMonth ? (
                    <span>Exporting: {monthOptions.find(m => m.value === exportMonth)?.label} (All years)</span>
                  ) : exportYear ? (
                    <span>Exporting: {exportYear} (All months)</span>
                  ) : (
                    <span>Exporting: All data</span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Currently Checked In</p>
                  <p className="text-2xl font-bold text-primary" data-testid="stat-checked-in">
                    {stats.checkedInCount}
                  </p>
                </div>
                <Watch className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Today's Total Hours</p>
                  <p className="text-2xl font-bold text-secondary" data-testid="stat-total-hours">
                    {formatHours(stats.todayHours)}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-secondary" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Today's Payroll</p>
                  <p className="text-2xl font-bold text-chart-1" data-testid="stat-total-pay">
                    ${stats.todayPay.toFixed(2)}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-chart-1" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Teachers Management */}
        <Card className="mb-6">
          <CardContent className="p-0">
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-semibold">Teachers & Time Tracking</h3>
            </div>
            
            {teachers.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                <Watch className="mx-auto h-12 w-12 mb-4" />
                <p>No teachers added yet</p>
                <p className="text-sm mt-2">Add teachers to start tracking time</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-4 font-medium">Teacher</th>
                      <th className="text-left p-4 font-medium">Status</th>
                      <th className="text-left p-4 font-medium">Today's Hours</th>
                      <th className="text-left p-4 font-medium">Billable Hours</th>
                      <th className="text-left p-4 font-medium">Pay</th>
                      <th className="text-left p-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {teacherStats.map((teacher, index) => (
                      <tr key={teacher.id} data-testid={`row-teacher-${index}`}>
                        <td className="p-4">
                          <div>
                            <div className="font-medium" data-testid={`text-teacher-name-${index}`}>
                              {teacher.name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              ${teacher.hourlyRate}/hr • Max {teacher.maxBillableHours}hrs
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`flex items-center ${
                            teacher.isCheckedIn ? 'text-chart-2' : 'text-muted-foreground'
                          }`} data-testid={`status-${index}`}>
                            <span className={`w-2 h-2 rounded-full mr-2 ${
                              teacher.isCheckedIn ? 'bg-chart-2 pulse-dot' : 'bg-muted-foreground'
                            }`}></span>
                            {teacher.isCheckedIn ? 'Checked In' : 'Not Checked In'}
                          </span>
                          {teacher.checkInTime && (
                            <div className="text-xs text-muted-foreground">
                              Since {formatTime(teacher.checkInTime)}
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="font-medium" data-testid={`hours-${index}`}>
                            {formatHours(teacher.todayHours)}
                          </div>
                          {teacher.checkInTime && teacher.checkOutTime && (
                            <div className="text-xs text-muted-foreground">
                              {formatTime(teacher.checkInTime)} - {formatTime(teacher.checkOutTime)}
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="font-medium" data-testid={`billable-${index}`}>
                            {formatHours(teacher.billableHours)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {teacher.billableHours < teacher.todayHours ? 'At limit' : 'Under limit'}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="font-medium" data-testid={`pay-${index}`}>
                            ${teacher.pay.toFixed(2)}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:bg-destructive/10"
                              onClick={() => handleDeleteTeacher(teacher.id, teacher.name)}
                              data-testid={`button-delete-${index}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Weekly Summary */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Weekly Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary" data-testid="weekly-hours">
                  {formatHours(stats.weeklyHours)}
                </div>
                <div className="text-sm text-muted-foreground">Total Hours</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-secondary" data-testid="weekly-billable">
                  {formatHours(stats.weeklyBillable)}
                </div>
                <div className="text-sm text-muted-foreground">Billable Hours</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-chart-1" data-testid="weekly-pay">
                  ${stats.weeklyPay.toFixed(2)}
                </div>
                <div className="text-sm text-muted-foreground">Total Pay</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-chart-2" data-testid="avg-daily">
                  {formatHours(stats.avgDaily)}
                </div>
                <div className="text-sm text-muted-foreground">Avg Daily Hours</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <AddTeacherModal
        isOpen={showAddTeacher}
        onClose={() => setShowAddTeacher(false)}
      />
    </>
  );
}
