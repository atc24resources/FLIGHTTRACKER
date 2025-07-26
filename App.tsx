import { useState } from "react";
import { MainScreen } from "./components/MainScreen";
import { SettingsPage } from "./components/SettingsPage";
import { FlightPlanPage } from "./components/FlightPlanPage";
import { LogbookPage } from "./components/LogbookPage";
import { FlightInfoFooter } from "./components/FlightInfoFooter";
import { NavigationFooter } from "./components/NavigationFooter";
import { Toaster } from "./components/ui/sonner";

type Screen = "main" | "settings" | "flight-plan" | "logbook";

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("main");

  // Mock flight data - in a real app this would come from flight systems
  const flightData = {
    altitude: "3,500",
    callsign: "N123AB",
    speed: "125",
    heading: "045",
    aircraftType: "C172"
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case "main":
        return <MainScreen />;
      case "settings":
        return <SettingsPage />;
      case "flight-plan":
        return <FlightPlanPage />;
      case "logbook":
        return <LogbookPage />;
      default:
        return <MainScreen />;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden">
        {renderScreen()}
      </div>

      {/* Flight Info Footer - Only show on main screen */}
      {currentScreen === "main" && (
        <FlightInfoFooter flightData={flightData} />
      )}

      {/* Navigation Footer */}
      <NavigationFooter 
        currentScreen={currentScreen} 
        onScreenChange={setCurrentScreen}
      />

      {/* Toast notifications */}
      <Toaster />
    </div>
  );
}