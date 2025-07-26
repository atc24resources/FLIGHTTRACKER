import { useRef, useEffect, useState } from 'react';

interface MapState {
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

interface Aircraft {
  id: string;
  x: number;
  y: number;
  heading: number;
  callsign: string;
  altitude: number;
  speed: number;
  type: string;
}

export function InteractiveMap() {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mapState, setMapState] = useState<MapState>({
    x: 0,
    y: 0,
    scale: 1,
    rotation: 0
  });
  
  const [aircraft, setAircraft] = useState<Aircraft[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [isRotating, setIsRotating] = useState(false);
  const [isUsingMockData, setIsUsingMockData] = useState(false);
  const [apiStatus, setApiStatus] = useState<'connecting' | 'connected' | 'error' | 'timeout'>('connecting');
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);

  // Fetch aircraft data from API
  useEffect(() => {
    const fetchAircraftData = async () => {
      try {
        console.log('Attempting to fetch aircraft data from API...');
        setApiStatus('connecting');
        
        // Try to fetch from API with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          controller.abort();
          setApiStatus('timeout');
          console.warn('API request timed out after 10 seconds');
        }, 10000); // Increased timeout to 10 seconds
        
        const response = await fetch('https://24data.ptfs.app/acft-data', {
          signal: controller.signal,
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          mode: 'cors',
          cache: 'no-cache'
        });
        
        clearTimeout(timeoutId);
        
        console.log('API response status:', response.status, response.statusText);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Raw API data received:', data);
        
        // Transform API data to our aircraft format
        // Handle different possible API response structures
        let aircraftData = data;
        if (data && data.aircraft && Array.isArray(data.aircraft)) {
          aircraftData = data.aircraft;
        } else if (data && data.data && Array.isArray(data.data)) {
          aircraftData = data.data;
        } else if (data && !Array.isArray(data)) {
          console.warn('API returned object instead of array:', data);
          aircraftData = [];
        }
        
        if (Array.isArray(aircraftData) && aircraftData.length > 0) {
          const transformedAircraft = aircraftData.map((acft: any, index: number) => ({
            id: acft.id || acft.callsign || acft.icao24 || `aircraft-${index}`,
            x: (acft.x || acft.longitude || 0) / 100, // Convert studs to SVG pixels
            y: (acft.y || acft.latitude || 0) / 100, // Convert studs to SVG pixels
            heading: acft.heading || acft.track || acft.direction || 0,
            callsign: acft.callsign || acft.flight || acft.registration || `ACFT${index + 1}`,
            altitude: acft.altitude || acft.alt_baro || acft.alt_geom || 0,
            speed: acft.speed || acft.gs || acft.velocity || 0,
            type: acft.type || acft.aircraft_type || acft.category || 'UNKNOWN'
          }));
          
          setAircraft(transformedAircraft);
          setIsUsingMockData(false);
          setApiStatus('connected');
          setLastUpdateTime(new Date());
          console.log(`Successfully fetched and transformed ${transformedAircraft.length} aircraft from API`);
        } else {
          console.warn('No aircraft data found in API response');
          throw new Error('No aircraft data available from API');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorName = error instanceof Error ? error.name : 'Error';
        
        console.warn(`API Error (${errorName}): ${errorMessage}`);
        
        // Provide more specific error information
        if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
          console.warn('Network error: API might be down, CORS blocked, or network connectivity issues');
        } else if (error instanceof Error && error.name === 'AbortError') {
          console.warn('Request was aborted due to timeout');
        }
        
        // Set mock data for development/fallback
        console.log('Falling back to mock aircraft data');
        setAircraft([
          {
            id: 'mock-1',
            x: -100,
            y: 50,
            heading: 45,
            callsign: 'N123AB',
            altitude: 3500,
            speed: 125,
            type: 'C172'
          },
          {
            id: 'mock-2',
            x: 200,
            y: -150,
            heading: 270,
            callsign: 'N456CD',
            altitude: 5500,
            speed: 180,
            type: 'PA28'
          },
          {
            id: 'mock-3',
            x: 50,
            y: 100,
            heading: 180,
            callsign: 'N789EF',
            altitude: 4000,
            speed: 150,
            type: 'PA44'
          },
          {
            id: 'mock-4',
            x: -200,
            y: -200,
            heading: 90,
            callsign: 'N987GH',
            altitude: 6000,
            speed: 200,
            type: 'SR22'
          }
        ]);
        setIsUsingMockData(true);
        setApiStatus('error');
        setLastUpdateTime(new Date());
      }
    };

    // Initial fetch
    fetchAircraftData();
    
    // Refresh aircraft data every 10 seconds (reduced frequency to be less aggressive)
    const interval = setInterval(fetchAircraftData, 10000);
    
    return () => clearInterval(interval);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.shiftKey) {
      setIsRotating(true);
    } else {
      setIsDragging(true);
    }
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging && !isRotating) return;
    
    const deltaX = e.clientX - lastMousePos.x;
    const deltaY = e.clientY - lastMousePos.y;
    
    if (isRotating) {
      setMapState(prev => ({
        ...prev,
        rotation: prev.rotation + deltaX * 0.01
      }));
    } else if (isDragging) {
      setMapState(prev => ({
        ...prev,
        x: prev.x + deltaX / prev.scale,
        y: prev.y + deltaY / prev.scale
      }));
    }
    
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsRotating(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
    setMapState(prev => ({
      ...prev,
      scale: Math.max(0.1, Math.min(5, prev.scale * scaleFactor))
    }));
  };

  return (
    <div className="relative w-full h-full overflow-hidden" ref={containerRef}>
      <svg
        ref={svgRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        viewBox="-1000 -1000 2000 2000"
      >
        <g
          transform={`
            translate(${mapState.x}, ${mapState.y}) 
            scale(${mapState.scale}) 
            rotate(${mapState.rotation * 180 / Math.PI})
          `}
        >
          {/* Base map background */}
          <rect
            x="-2000"
            y="-2000"
            width="4000"
            height="4000"
            fill="#e8f4f8"
          />
          
          {/* Grid lines */}
          <defs>
            <pattern
              id="grid"
              width="100"
              height="100"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 100 0 L 0 0 0 100"
                fill="none"
                stroke="#d0d0d0"
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect
            x="-2000"
            y="-2000"
            width="4000"
            height="4000"
            fill="url(#grid)"
          />
          
          {/* Sample airports - replace with actual SVG map data */}
          <g id="airports">
            <g transform="translate(-500, -300)">
              <rect x="-8" y="-8" width="16" height="16" fill="#4a90e2" />
              <text x="0" y="25" textAnchor="middle" fontSize="12" fill="#333">KJFK</text>
            </g>
            <g transform="translate(200, 150)">
              <rect x="-8" y="-8" width="16" height="16" fill="#4a90e2" />
              <text x="0" y="25" textAnchor="middle" fontSize="12" fill="#333">KLGA</text>
            </g>
            <g transform="translate(-100, -100)">
              <rect x="-8" y="-8" width="16" height="16" fill="#4a90e2" />
              <text x="0" y="25" textAnchor="middle" fontSize="12" fill="#333">KEWR</text>
            </g>
          </g>
          
          {/* Flight paths */}
          <g id="flight-paths">
            <path
              d="M -500 -300 L -200 -100 L 100 50 L 200 150"
              fill="none"
              stroke="#ff6b6b"
              strokeWidth="3"
            />
          </g>
          
          {/* Aircraft */}
          <g id="aircraft">
            {aircraft.map((acft) => (
              <g key={acft.id} transform={`translate(${acft.x}, ${acft.y})`}>
                {/* Aircraft symbol */}
                <circle r="8" fill="#ff6b6b" />
                
                {/* Heading indicator */}
                <line
                  x1="0"
                  y1="0"
                  x2={20 * Math.cos((acft.heading - 90) * Math.PI / 180)}
                  y2={20 * Math.sin((acft.heading - 90) * Math.PI / 180)}
                  stroke="#ff6b6b"
                  strokeWidth="2"
                />
                
                {/* Callsign label */}
                <text
                  x="15"
                  y="-5"
                  fontSize="10"
                  fill="#333"
                  className="pointer-events-none"
                >
                  {acft.callsign}
                </text>
                
                {/* Altitude label */}
                <text
                  x="15"
                  y="8"
                  fontSize="8"
                  fill="#666"
                  className="pointer-events-none"
                >
                  {acft.altitude}ft
                </text>
              </g>
            ))}
          </g>
        </g>
      </svg>
      
      {/* Map controls */}
      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg p-2 shadow-lg">
        <div className="text-xs text-gray-600 mb-1">
          Zoom: {Math.round(mapState.scale * 100)}%
        </div>
        <div className="text-xs text-gray-600 mb-1">
          Aircraft: {aircraft.length}
        </div>
        <div className="text-xs text-gray-600 mb-1 flex items-center">
          <span className={`inline-block w-2 h-2 rounded-full mr-1 ${
            apiStatus === 'connected' ? 'bg-green-500' :
            apiStatus === 'connecting' ? 'bg-yellow-500' :
            apiStatus === 'timeout' ? 'bg-orange-500' :
            'bg-red-500'
          }`}></span>
          Data: {isUsingMockData ? 'Mock' : 'Live API'}
        </div>
        {lastUpdateTime && (
          <div className="text-xs text-gray-500 mb-1">
            Updated: {lastUpdateTime.toLocaleTimeString()}
          </div>
        )}
        <div className="text-xs text-gray-600">
          Hold Shift + drag to rotate
        </div>
        {apiStatus === 'error' && (
          <div className="text-xs text-red-600 mt-1">
            API unavailable - using mock data
          </div>
        )}
      </div>
    </div>
  );
}