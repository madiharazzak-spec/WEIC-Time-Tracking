import { Clock, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  onAdminClick: () => void;
}

export default function Header({ onAdminClick }: HeaderProps) {
  return (
    <header className="bg-primary text-primary-foreground shadow-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Clock className="text-2xl" />
            <h1 className="text-xl font-bold">WEIC Time Tracker</h1>
          </div>
          <Button
            onClick={onAdminClick}
            variant="secondary"
            size="sm"
            className="bg-primary-foreground text-primary hover:bg-accent"
            data-testid="button-admin"
          >
            <Settings className="mr-2 h-4 w-4" />
            Admin
          </Button>
        </div>
      </div>
    </header>
  );
}
