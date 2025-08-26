import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, AlertTriangle } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import PinResetModal from "./pin-reset-modal";

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  isSetup: boolean;
  onSuccess: () => void;
}

export default function AdminLoginModal({ isOpen, onClose, isSetup, onSuccess }: AdminLoginModalProps) {
  const [pin, setPin] = useState("");
  const [showReset, setShowReset] = useState(false);
  const { toast } = useToast();

  const setupPinMutation = useMutation({
    mutationFn: async (pinData: { pin: string }) => {
      await apiRequest("POST", "/api/settings/setup-pin", pinData);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "PIN set up successfully",
      });
      setPin("");
      onSuccess();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to set up PIN",
        variant: "destructive",
      });
    },
  });

  const validatePinMutation = useMutation({
    mutationFn: async (pinData: { pin: string }) => {
      await apiRequest("POST", "/api/auth/validate-pin", pinData);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Access granted",
      });
      setPin("");
      onSuccess();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Invalid PIN",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length < 4 || pin.length > 6) {
      toast({
        title: "Error",
        description: "PIN must be 4-6 digits",
        variant: "destructive",
      });
      return;
    }

    if (isSetup) {
      setupPinMutation.mutate({ pin });
    } else {
      validatePinMutation.mutate({ pin });
    }
  };

  const isPending = setupPinMutation.isPending || validatePinMutation.isPending;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md" data-testid="modal-admin-login">
          <DialogHeader>
            <div className="text-center mb-6">
              <Lock className="mx-auto text-4xl text-primary mb-4 h-12 w-12" />
              <DialogTitle className="text-xl font-bold">
                {isSetup ? "Set Up PIN" : "Admin Access"}
              </DialogTitle>
              <p className="text-muted-foreground mt-2">
                {isSetup 
                  ? "Create a secure PIN to protect admin access" 
                  : "Enter your PIN to continue"
                }
              </p>
            </div>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                type="password"
                placeholder={isSetup ? "Create PIN (4-6 digits)" : "Enter PIN"}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="text-center text-lg tracking-widest"
                maxLength={6}
                data-testid="input-pin"
              />
            </div>
            <div className="flex space-x-3">
              {!isSetup && (
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1"
                  onClick={onClose}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
              )}
              <Button
                type="submit"
                className={`${isSetup ? 'w-full' : 'flex-1'}`}
                disabled={isPending}
                data-testid="button-submit-pin"
              >
                {isPending ? "Processing..." : isSetup ? "Set PIN" : "Login"}
              </Button>
            </div>
          </form>
          
          {!isSetup && (
            <div className="mt-6 pt-4 border-t border-border">
              <Button
                variant="ghost"
                className="w-full text-destructive hover:text-destructive"
                onClick={() => setShowReset(true)}
                data-testid="button-forgot-pin"
              >
                <AlertTriangle className="mr-1 h-4 w-4" />
                Forgot PIN? Reset Application
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <PinResetModal
        isOpen={showReset}
        onClose={() => setShowReset(false)}
        onSuccess={() => {
          setShowReset(false);
          onSuccess();
        }}
      />
    </>
  );
}
