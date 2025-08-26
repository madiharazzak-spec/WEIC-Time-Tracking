import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useState, useEffect } from "react";
import TeacherInterface from "@/pages/teacher-interface";
import AdminDashboard from "@/pages/admin-dashboard";
import Header from "@/components/header";
import AdminLoginModal from "@/components/admin-login-modal";
import { useQuery } from "@tanstack/react-query";

function AppContent() {
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminView, setAdminView] = useState(false);

  // Check if PIN is set up
  const { data: pinSetup } = useQuery({
    queryKey: ['/api/settings/pin-setup'],
  });

  // Check admin session
  const { data: adminAuth, refetch: refetchAdminAuth } = useQuery<{ isAdmin: boolean }>({
    queryKey: ['/api/auth/check-admin'],
  });

  useEffect(() => {
    if (adminAuth?.isAdmin) {
      setAdminView(true);
      setShowAdminLogin(false);
    } else {
      setAdminView(false);
    }
  }, [adminAuth]);

  // If no PIN is set up and we have the data, show setup
  if (pinSetup && !(pinSetup as { hasPin: boolean }).hasPin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <AdminLoginModal
          isOpen={true}
          onClose={() => {}}
          isSetup={true}
          onSuccess={() => {
            refetchAdminAuth();
            queryClient.invalidateQueries({ queryKey: ['/api/settings/pin-setup'] });
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header onAdminClick={() => setShowAdminLogin(true)} />
      
      <Switch>
        <Route path="/">
          {adminView ? <AdminDashboard onLogout={() => {
            setAdminView(false);
            refetchAdminAuth();
          }} /> : <TeacherInterface />}
        </Route>
      </Switch>

      <AdminLoginModal
        isOpen={showAdminLogin}
        onClose={() => setShowAdminLogin(false)}
        isSetup={false}
        onSuccess={() => {
          setShowAdminLogin(false);
          refetchAdminAuth();
        }}
      />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AppContent />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
