import { Button } from "./ui/button";
import { Map, Route, Settings, BookOpen } from "lucide-react";

type Screen = "main" | "settings" | "flight-plan" | "logbook";

interface NavigationFooterProps {
  currentScreen: Screen;
  onScreenChange: (screen: Screen) => void;
}

export function NavigationFooter({ currentScreen, onScreenChange }: NavigationFooterProps) {
  const navigation = [
    {
      id: "main" as const,
      label: "Map",
      icon: Map,
    },
    {
      id: "flight-plan" as const,
      label: "Plan",
      icon: Route,
    },
    {
      id: "logbook" as const,
      label: "Logbook",
      icon: BookOpen,
    },
    {
      id: "settings" as const,
      label: "Settings",
      icon: Settings,
    },
  ];

  return (
    <div className="flex bg-white/95 backdrop-blur-sm border-t">
      {navigation.map((item) => {
        const Icon = item.icon;
        const isActive = currentScreen === item.id;
        
        return (
          <Button
            key={item.id}
            variant="ghost"
            className={`flex-1 flex-col h-16 rounded-none ${
              isActive 
                ? "bg-primary/10 text-primary hover:bg-primary/20" 
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => onScreenChange(item.id)}
          >
            <Icon className="h-5 w-5 mb-1" />
            <span className="text-xs">{item.label}</span>
          </Button>
        );
      })}
    </div>
  );
}