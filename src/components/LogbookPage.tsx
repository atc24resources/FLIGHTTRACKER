import { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import { Separator } from "./ui/separator";
import { Clock, MapPin, Plane, Trash2 } from "lucide-react";

interface LogbookEntry {
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
  savedAt: string;
}

export function LogbookPage() {
  const [logbookEntries, setLogbookEntries] = useState<LogbookEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<LogbookEntry | null>(null);

  useEffect(() => {
    // Load logbook entries from localStorage
    const loadLogbook = () => {
      try {
        const savedEntries = localStorage.getItem('flightLogbook');
        if (savedEntries) {
          const entries = JSON.parse(savedEntries);
          setLogbookEntries(entries);
          if (entries.length > 0 && !selectedEntry) {
            setSelectedEntry(entries[0]);
          }
        }
      } catch (error) {
        console.error('Failed to load logbook:', error);
      }
    };

    loadLogbook();
  }, [selectedEntry]);

  const deleteEntry = (entryId: string) => {
    const updatedEntries = logbookEntries.filter(entry => entry.id !== entryId);
    setLogbookEntries(updatedEntries);
    localStorage.setItem('flightLogbook', JSON.stringify(updatedEntries));
    
    // If the deleted entry was selected, select the first remaining entry or null
    if (selectedEntry?.id === entryId) {
      setSelectedEntry(updatedEntries.length > 0 ? updatedEntries[0] : null);
    }
  };

  const clearAllEntries = () => {
    setLogbookEntries([]);
    setSelectedEntry(null);
    localStorage.removeItem('flightLogbook');
  };

  const getStatusColor = (status: LogbookEntry['status']) => {
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

  const formatSavedTime = (isoString: string) => {
    return new Date(isoString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (logbookEntries.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-muted-foreground">
          <Plane className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="mb-2">No saved flight plans</p>
          <p className="text-sm">Save flight plans from the Plan tab to view them here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex">
      {/* Logbook Entries List */}
      <div className="w-1/2 border-r">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="mb-2">Flight Logbook</h2>
              <p className="text-sm text-muted-foreground">
                {logbookEntries.length} saved flight plan{logbookEntries.length !== 1 ? 's' : ''}
              </p>
            </div>
            {logbookEntries.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllEntries}
                className="text-red-600 hover:text-red-700"
              >
                Clear All
              </Button>
            )}
          </div>
        </div>
        
        <ScrollArea className="h-[calc(100%-5rem)]">
          <div className="p-4 space-y-3">
            {logbookEntries.map((entry) => (
              <Card
                key={entry.id}
                className={`p-4 cursor-pointer transition-colors hover:bg-muted/50 ${
                  selectedEntry?.id === entry.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => setSelectedEntry(entry)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Plane className="h-4 w-4" />
                    <span className="font-medium">{entry.callsign}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge 
                      variant="secondary"
                      className={`${getStatusColor(entry.status)} text-white`}
                    >
                      {entry.status}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteEntry(entry.id);
                      }}
                      className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4 text-sm">
                  <div className="flex items-center space-x-1">
                    <MapPin className="h-3 w-3" />
                    <span>{entry.departure}</span>
                  </div>
                  <span>→</span>
                  <div className="flex items-center space-x-1">
                    <MapPin className="h-3 w-3" />
                    <span>{entry.arrival}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1">
                      <Clock className="h-3 w-3" />
                      <span>{formatTime(entry.departureTime)}</span>
                    </div>
                    <span>•</span>
                    <span>{entry.aircraft}</span>
                  </div>
                  <span>Saved {formatSavedTime(entry.savedAt)}</span>
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Logbook Entry Details */}
      <div className="w-1/2">
        {selectedEntry ? (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2>{selectedEntry.callsign}</h2>
                <p className="text-muted-foreground">{selectedEntry.aircraft}</p>
              </div>
              <div className="flex items-center space-x-2">
                <Badge 
                  variant="secondary"
                  className={`${getStatusColor(selectedEntry.status)} text-white`}
                >
                  {selectedEntry.status}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => deleteEntry(selectedEntry.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </div>
            </div>

            <div className="space-y-6">
              {/* Save Information */}
              <Card className="p-4 bg-muted/30">
                <h3 className="mb-2">Logbook Entry</h3>
                <div className="text-sm text-muted-foreground">
                  Saved on {formatSavedTime(selectedEntry.savedAt)}
                </div>
              </Card>

              {/* Route Information */}
              <Card className="p-4">
                <h3 className="mb-3">Route</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Departure</div>
                    <div className="font-medium">{selectedEntry.departure}</div>
                    <div className="text-sm text-muted-foreground">
                      {formatTime(selectedEntry.departureTime)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Arrival</div>
                    <div className="font-medium">{selectedEntry.arrival}</div>
                    <div className="text-sm text-muted-foreground">
                      {formatTime(selectedEntry.arrivalTime)}
                    </div>
                  </div>
                </div>
                <Separator className="my-3" />
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Flight Route</div>
                  <div className="text-sm font-mono bg-muted p-2 rounded">
                    {selectedEntry.route}
                  </div>
                </div>
              </Card>

              {/* Flight Details */}
              <Card className="p-4">
                <h3 className="mb-3">Flight Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Cruise Altitude</div>
                    <div className="font-medium">{selectedEntry.altitude.toLocaleString()} ft</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Distance</div>
                    <div className="font-medium">{selectedEntry.distance} nm</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Duration</div>
                    <div className="font-medium">{selectedEntry.duration}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Fuel Required</div>
                    <div className="font-medium">{selectedEntry.fuel.toLocaleString()} lbs</div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-muted-foreground">
              <Plane className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Select a logbook entry to view details</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}