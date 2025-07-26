import { Card } from "./ui/card";

interface FlightData {
  altitude: string;
  callsign: string;
  speed: string;
  heading: string;
  aircraftType: string;
}

interface FlightInfoFooterProps {
  flightData: FlightData;
}

export function FlightInfoFooter({ flightData }: FlightInfoFooterProps) {
  const infoItems = [
    { label: "ALT", value: flightData.altitude, unit: "ft" },
    { label: "CALLSIGN", value: flightData.callsign, unit: "" },
    { label: "SPD", value: flightData.speed, unit: "kts" },
    { label: "HDG", value: flightData.heading, unit: "°" },
    { label: "A/C", value: flightData.aircraftType, unit: "" }
  ];

  return (
    <div className="flex space-x-2 px-4 py-2 bg-white/95 backdrop-blur-sm border-t">
      {infoItems.map((item, index) => (
        <Card key={index} className="flex-1 min-w-0">
          <div className="px-3 py-2 text-center">
            <div className="text-xs text-muted-foreground mb-1">
              {item.label}
            </div>
            <div className="text-sm font-medium truncate">
              {item.value}
              {item.unit && <span className="text-xs text-muted-foreground ml-1">{item.unit}</span>}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}