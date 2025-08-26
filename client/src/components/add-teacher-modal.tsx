import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface AddTeacherModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddTeacherModal({ isOpen, onClose }: AddTeacherModalProps) {
  const [name, setName] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [maxBillableHours, setMaxBillableHours] = useState("");
  const { toast } = useToast();

  const addTeacherMutation = useMutation({
    mutationFn: async (teacherData: {
      name: string;
      hourlyRate: string;
      maxBillableHours: string;
    }) => {
      await apiRequest("POST", "/api/teachers", teacherData);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Teacher added successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/teachers'] });
      handleClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add teacher",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast({
        title: "Error",
        description: "Please enter teacher's name",
        variant: "destructive",
      });
      return;
    }

    if (!hourlyRate || parseFloat(hourlyRate) <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid hourly rate",
        variant: "destructive",
      });
      return;
    }

    if (!maxBillableHours || parseFloat(maxBillableHours) <= 0) {
      toast({
        title: "Error",
        description: "Please enter valid max billable hours",
        variant: "destructive",
      });
      return;
    }

    addTeacherMutation.mutate({
      name: name.trim(),
      hourlyRate,
      maxBillableHours,
    });
  };

  const handleClose = () => {
    setName("");
    setHourlyRate("");
    setMaxBillableHours("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md" data-testid="modal-add-teacher">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <DialogTitle className="text-xl font-bold">Add New Teacher</DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              data-testid="button-close-add-teacher"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name" className="block text-sm font-medium mb-2">
              Full Name
            </Label>
            <Input
              id="name"
              type="text"
              placeholder="Enter teacher's full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              data-testid="input-teacher-name"
            />
          </div>
          
          <div>
            <Label htmlFor="hourlyRate" className="block text-sm font-medium mb-2">
              Hourly Rate ($)
            </Label>
            <Input
              id="hourlyRate"
              type="number"
              placeholder="25.00"
              step="0.01"
              min="0"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
              required
              data-testid="input-hourly-rate"
            />
          </div>
          
          <div>
            <Label htmlFor="maxHours" className="block text-sm font-medium mb-2">
              Max Billable Hours per Day
            </Label>
            <Input
              id="maxHours"
              type="number"
              placeholder="8"
              step="0.5"
              min="0"
              max="24"
              value={maxBillableHours}
              onChange={(e) => setMaxBillableHours(e.target.value)}
              required
              data-testid="input-max-hours"
            />
          </div>
          
          <div className="flex space-x-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={handleClose}
              data-testid="button-cancel-add-teacher"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={addTeacherMutation.isPending}
              data-testid="button-submit-add-teacher"
            >
              {addTeacherMutation.isPending ? "Adding..." : "Add Teacher"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
