import { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import { Separator } from "./ui/separator";
import { Clock, MapPin, Plane, Save } from "lucide-react";
import { toast } from "sonner@2.0.3";

interface FlightPlan {
  id: string;
  callsign: string;
  departure: string;
  arrival: string;
  departureTime: string;
  arrivalTime: string;
  aircraft: string;
  altitude: number;
  route: string;
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
  distance: number;
  duration: string;
  fuel: number;
}

interface LogbookEntry extends FlightPlan {
  savedAt: string;
}

export function FlightPlanPage() {
  const [flightPlans, setFlightPlans] = useState<FlightPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<FlightPlan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock API call - replace with actual API endpoint
    const fetchFlightPlans = async () => {
      try {
        setLoading(true);
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Mock data - replace with actual API call
        const mockPlans: FlightPlan[] = [
          {
            id: '1',
            callsign: 'N123AB',
            departure: 'KJFK',
            arrival: 'KLAX',
            departureTime: '2025-01-25T14:30:00',
            arrivalTime: '2025-01-25T18:45:00',
            aircraft: 'Boeing 737-800',
            altitude: 37000,
            route: 'KJFK DCT PENNS J70 RICCE DCT KLAX',
            status: 'active',
            distance: 2475,
            duration: '5h 15m',
            fuel: 18500
          },
          {
            id: '2',
            callsign: 'N456CD',
            departure: 'KORD',
            arrival: 'KDEN',
            departureTime: '2025-01-25T16:00:00',
            arrivalTime: '2025-01-25T18:30:00',
            aircraft: 'Airbus A320',
            altitude: 35000,
            route: 'KORD DCT WYNDE J146 KATEE DCT KDEN',
            status: 'scheduled',
            distance: 888,
            duration: '2h 30m',
            fuel: 12000
          },
          {
            id: '3',
            callsign: 'N789EF',
            departure: 'KSEA',
            arrival: 'KPHX',
            departureTime: '2025-01-25T12:15:00',
            arrivalTime: '2025-01-25T15:45:00',
            aircraft: 'Boeing 787-9',
            altitude: 41000,
            route: 'KSEA J503 LKV J134 KPHX',
            status: 'completed',
            distance: 1107,
            duration: '3h 30m',
            fuel: 15200
          },
          {
            id: '4',
            callsign: 'N987GH',
            departure: 'KMIA',
            arrival: 'KJFK',
            departureTime: '2025-01-25T09:00:00',
            arrivalTime: '2025-01-25T12:30:00',
            aircraft: 'Cessna Citation X',
            altitude: 45000,
            route: 'KMIA J79 WINCO J174 KJFK',
            status: 'active',
            distance: 1092,
            duration: '3h 30m',
            fuel: 8500
          }
        ];
        
        setFlightPlans(mockPlans);
        if (mockPlans.length > 0) {
          setSelectedPlan(mockPlans[0]);
        }
      } catch (error) {
        console.error('Failed to fetch flight plans:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFlightPlans();
  }, []);

  const getStatusColor = (status: FlightPlan['status']) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'scheduled': return 'bg-blue-500';
      case 'completed': return 'bg-gray-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const saveToLogbook = (flightPlan: FlightPlan) => {
    try {
      // Get existing logbook entries
      const existingLogbook = localStorage.getItem('flightLogbook');
      const logbookEntries: LogbookEntry[] = existingLogbook ? JSON.parse(existingLogbook) : [];
      
      // Create new logbook entry with current timestamp
      const logbookEntry: LogbookEntry = {
        ...flightPlan,
        id: `logbook-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Generate unique ID for logbook
        savedAt: new Date().toISOString()
      };
      
      // Add to beginning of array (most recent first)
      logbookEntries.unshift(logbookEntry);
      
      // Save back to localStorage
      localStorage.setItem('flightLogbook', JSON.stringify(logbookEntries));
      
      toast.success(`Flight plan ${flightPlan.callsign} saved to logbook`);
    } catch (error) {
      console.error('Failed to save to logbook:', error);
      toast.error('Failed to save flight plan to logbook');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading flight plans...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex">
      {/* Flight Plans List */}
      <div className="w-1/2 border-r">
        <div className="p-4 border-b">
          <h2 className="mb-2">Flight Plans</h2>
          <p className="text-sm text-muted-foreground">
            {flightPlans.length} flight plan{flightPlans.length !== 1 ? 's' : ''} found
          </p>
        </div>
        
        <ScrollArea className="h-[calc(100%-5rem)]">
          <div className="p-4 space-y-3">
            {flightPlans.map((plan) => (
              <Card
                key={plan.id}
                className={`p-4 cursor-pointer transition-colors hover:bg-muted/50 ${
                  selectedPlan?.id === plan.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => setSelectedPlan(plan)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Plane className="h-4 w-4" />
                    <span className="font-medium">{plan.callsign}</span>
                  </div>
                  <Badge 
                    variant="secondary"
                    className={`${getStatusColor(plan.status)} text-white`}
                  >
                    {plan.status}
                  </Badge>
                </div>
                
                <div className="flex items-center space-x-4 text-sm">
                  <div className="flex items-center space-x-1">
                    <MapPin className="h-3 w-3" />
                    <span>{plan.departure}</span>
                  </div>
                  <span>→</span>
                  <div className="flex items-center space-x-1">
                    <MapPin className="h-3 w-3" />
                    <span>{plan.arrival}</span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4 text-xs text-muted-foreground mt-2">
                  <div className="flex items-center space-x-1">
                    <Clock className="h-3 w-3" />
                    <span>{formatTime(plan.departureTime)}</span>
                  </div>
                  <span>•</span>
                  <span>{plan.aircraft}</span>
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Flight Plan Details */}
      <div className="w-1/2">
        {selectedPlan ? (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2>{selectedPlan.callsign}</h2>
                <p className="text-muted-foreground">{selectedPlan.aircraft}</p>
              </div>
              <div className="flex items-center space-x-2">
                <Badge 
                  variant="secondary"
                  className={`${getStatusColor(selectedPlan.status)} text-white`}
                >
                  {selectedPlan.status}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => saveToLogbook(selectedPlan)}
                  className="flex items-center space-x-1"
                >
                  <Save className="h-4 w-4" />
                  <span>Save to Logbook</span>
                </Button>
              </div>
            </div>

            <div className="space-y-6">
              {/* Route Information */}
              <Card className="p-4">
                <h3 className="mb-3">Route</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Departure</div>
                    <div className="font-medium">{selectedPlan.departure}</div>
                    <div className="text-sm text-muted-foreground">
                      {formatTime(selectedPlan.departureTime)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Arrival</div>
                    <div className="font-medium">{selectedPlan.arrival}</div>
                    <div className="text-sm text-muted-foreground">
                      {formatTime(selectedPlan.arrivalTime)}
                    </div>
                  </div>
                </div>
                <Separator className="my-3" />
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Flight Route</div>
                  <div className="text-sm font-mono bg-muted p-2 rounded">
                    {selectedPlan.route}
                  </div>
                </div>
              </Card>

              {/* Flight Details */}
              <Card className="p-4">
                <h3 className="mb-3">Flight Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Cruise Altitude</div>
                    <div className="font-medium">{selectedPlan.altitude.toLocaleString()} ft</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Distance</div>
                    <div className="font-medium">{selectedPlan.distance} nm</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Duration</div>
                    <div className="font-medium">{selectedPlan.duration}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Fuel Required</div>
                    <div className="font-medium">{selectedPlan.fuel.toLocaleString()} lbs</div>
                  </div>
                </div>
              </Card>


            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-muted-foreground">
              <Plane className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Select a flight plan to view details</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}