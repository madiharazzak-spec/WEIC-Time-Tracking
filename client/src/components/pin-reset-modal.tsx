import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface PinResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PinResetModal({ isOpen, onClose, onSuccess }: PinResetModalProps) {
  const { toast } = useToast();

  const resetMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/settings/reset");
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Application reset successfully",
      });
      // Invalidate all queries to refresh data
      queryClient.invalidateQueries();
      onSuccess();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to reset application",
        variant: "destructive",
      });
    },
  });

  const handleReset = () => {
    resetMutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" data-testid="modal-pin-reset">
        <DialogHeader>
          <div className="text-center mb-6">
            <AlertTriangle className="mx-auto text-4xl text-destructive mb-4 h-12 w-12" />
            <DialogTitle className="text-xl font-bold text-destructive">
              Reset Application
            </DialogTitle>
            <p className="text-muted-foreground mt-2">
              This will permanently delete all data including teachers, time entries, and settings.
            </p>
          </div>
        </DialogHeader>
        
        <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4 mb-6">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="text-destructive mt-0.5 h-5 w-5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-destructive">Warning: This action cannot be undone</p>
              <ul className="mt-2 space-y-1 text-destructive/80">
                <li>• All teacher records will be deleted</li>
                <li>• All time tracking data will be lost</li>
                <li>• You will need to set up a new PIN</li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="flex space-x-3">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={onClose}
            data-testid="button-cancel-reset"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            className="flex-1"
            onClick={handleReset}
            disabled={resetMutation.isPending}
            data-testid="button-confirm-reset"
          >
            {resetMutation.isPending ? "Resetting..." : "Reset Everything"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
