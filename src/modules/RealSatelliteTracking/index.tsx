import { useState, useRef, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Line } from "@react-three/drei";
import { motion } from "framer-motion";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Earth3D from "@/components/Earth3D";
import ControlPanel from "@/components/shared/ControlPanel";
import ParameterDisplay from "@/components/shared/ParameterDisplay";
import ActionButtons from "@/components/shared/ActionButtons";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import * as THREE from "three";
import * as satellite from "satellite.js";

interface SatelliteData {
  name: string;
  tle1: string;
  tle2: string;
  color: string;
  satrec?: satellite.SatRec;
}

const SatelliteOrbit = ({ 
  satData,
  speed, 
  isRunning,
  showOrbit = true,
  showDetailed = true
}: { 
  satData: SatelliteData;
  speed: number;
  isRunning: boolean;
  showOrbit?: boolean;
  showDetailed?: boolean;
}) => {
  const satelliteGroupRef = useRef<THREE.Group>(null);
  const timeOffsetRef = useRef(0);

  useFrame((state, delta) => {
    if (satelliteGroupRef.current && satData.satrec) {
      // Accelerate simulated orbital time so motion is visible in seconds instead of hours.
      // A full LEO orbit (~90 min) would otherwise take real-time to complete.
      const TIME_ACCELERATION = 600; // each real second advances 10 minutes of orbital time
      // Rotate satellite on its own axis (only if detailed)
      if (showDetailed) {
        satelliteGroupRef.current.rotation.y += delta * 2;
        satelliteGroupRef.current.rotation.x += delta * 0.5;
      }
      
      if (isRunning) {
        // Increment time for animation (speed multiplier with acceleration)
        timeOffsetRef.current += delta * speed * TIME_ACCELERATION; // Use delta for smooth animation & accelerated orbital progression
      }
      
      const now = new Date();
      const futureTime = new Date(now.getTime() + timeOffsetRef.current * 1000);
      
      try {
        const positionAndVelocity = satellite.propagate(satData.satrec, futureTime);
        
        if (positionAndVelocity.position && typeof positionAndVelocity.position !== 'boolean') {
          const position = positionAndVelocity.position;
          // Convert from km to Three.js units
          // Earth radius in Three.js = 2.5 units
          // Earth radius in km = 6371 km
          const earthRadiusKm = 6371;
          const earthRadiusThreeJS = 2.5;
          const scale = earthRadiusThreeJS / earthRadiusKm;
          
          satelliteGroupRef.current.position.set(
            position.x * scale,
            position.z * scale, // Swap Y and Z for Three.js coordinate system
            position.y * scale
          );
        }
      } catch (error) {
        console.error(`Error propagating ${satData.name}:`, error);
      }
    }
  });

  // Generate orbit path points based on actual orbital period (only if showOrbit is true)
  const points = [];
  if (satData.satrec && showOrbit) {
    const now = new Date();
    const earthRadiusKm = 6371;
    const earthRadiusThreeJS = 2.5;
    const scale = earthRadiusThreeJS / earthRadiusKm;
    
    // Calculate orbital period from mean motion (revolutions per day)
    const meanMotion = satData.satrec.no; // radians per minute
    const orbitalPeriodMinutes = (2 * Math.PI) / meanMotion; // Period in minutes
    
    // Limit very long periods (like GEO satellites)
    const maxPeriodMinutes = 1500; // Cap at ~25 hours
    const actualPeriod = Math.min(orbitalPeriodMinutes, maxPeriodMinutes);
    
    // Generate 64 points over one full orbit period (reduced for performance)
    const numPoints = 64;
    for (let i = 0; i <= numPoints; i++) {
      const timeOffset = (i / numPoints) * actualPeriod * 60; // Convert to seconds
      const futureTime = new Date(now.getTime() + timeOffset * 1000);
      
      try {
        const positionAndVelocity = satellite.propagate(satData.satrec, futureTime);
        if (positionAndVelocity.position && typeof positionAndVelocity.position !== 'boolean') {
          const pos = positionAndVelocity.position;
          points.push(new THREE.Vector3(
            pos.x * scale,
            pos.z * scale,
            pos.y * scale
          ));
        }
      } catch (error) {
        // Skip invalid points
      }
    }
  }

  // Render detailed satellite with solar panels or simple point
  if (showDetailed) {
    return (
      <>
        {points.length > 0 && (
          <Line points={points} color={satData.color} lineWidth={1} opacity={0.4} transparent />
        )}
        <group ref={satelliteGroupRef}>
          {/* Main satellite body */}
          <mesh>
            <boxGeometry args={[0.03, 0.015, 0.015]} />
            <meshStandardMaterial 
              color={satData.color} 
              emissive={satData.color} 
              emissiveIntensity={1.5}
              metalness={0.8}
              roughness={0.2}
            />
          </mesh>
          {/* Solar panel on one side */}
          <mesh position={[0.025, 0, 0]}>
            <boxGeometry args={[0.01, 0.04, 0.02]} />
            <meshStandardMaterial color="#1e40af" metalness={0.9} roughness={0.1} />
          </mesh>
          {/* Solar panel on other side */}
          <mesh position={[-0.025, 0, 0]}>
            <boxGeometry args={[0.01, 0.04, 0.02]} />
            <meshStandardMaterial color="#1e40af" metalness={0.9} roughness={0.1} />
          </mesh>
        </group>
      </>
    );
  } else {
    // Simple point representation for performance
    return (
      <>
        {points.length > 0 && (
          <Line points={points} color={satData.color} lineWidth={0.5} opacity={0.3} transparent />
        )}
        <mesh ref={satelliteGroupRef}>
          <sphereGeometry args={[0.015, 4, 4]} />
          <meshBasicMaterial color={satData.color} />
        </mesh>
      </>
    );
  }
};

const colors = ["#9D4EDD", "#FF006E", "#00F5FF", "#7FFF00", "#FFD60A", "#FF9500"];

const RealSatelliteTracking = () => {
  const [speed, setSpeed] = useState(1);
  const [isRunning, setIsRunning] = useState(true); // Start animation by default
  const [orbitType, setOrbitType] = useState("LEO");
  const [satellites, setSatellites] = useState<SatelliteData[]>([]);
  const [selectedSatellites, setSelectedSatellites] = useState<SatelliteData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredSatellites, setFilteredSatellites] = useState<SatelliteData[]>([]);
  const [maxSatellites, setMaxSatellites] = useState(1); // Default to 1 satellite

  // Handle fullscreen toggle
  const toggleFullscreen = () => {
    if (!canvasContainerRef.current) return;

    if (!document.fullscreenElement) {
      canvasContainerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch((err) => {
        console.error("Error attempting to enable fullscreen:", err);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      });
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Filter satellites based on search query
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredSatellites(selectedSatellites);
    } else {
      const filtered = selectedSatellites.filter(sat => 
        sat.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredSatellites(filtered);
    }
  }, [searchQuery, selectedSatellites]);

  // Fetch satellites when orbit type changes
  useEffect(() => {
    const fetchSatellites = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/tle/live?orbit=${orbitType}&format=tle&json=true`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch satellites: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Parse TLE data and initialize satellite.js records
        const parsedSatellites: SatelliteData[] = data.satellites
          .map((sat: any, idx: number) => {
            try {
              const satrec = satellite.twoline2satrec(sat.tle1, sat.tle2);
              return {
                name: sat.name,
                tle1: sat.tle1,
                tle2: sat.tle2,
                color: colors[idx % colors.length],
                satrec
              };
            } catch (err) {
              console.error(`Failed to parse TLE for ${sat.name}:`, err);
              return null;
            }
          })
          .filter((sat: SatelliteData | null): sat is SatelliteData => sat !== null);
        
        setSatellites(parsedSatellites);
        // Select limited satellites by default for performance
        setSelectedSatellites(parsedSatellites.slice(0, maxSatellites));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load satellites");
        console.error("Error fetching satellites:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSatellites();
  }, [orbitType]);

  const handleReset = () => {
    setIsRunning(false);
    setSpeed(1);
    setSelectedOrbit('LEO');
    setSearchQuery('');
    // Reset selected satellites to limited set for performance
    if (satellites.length > 0) {
      setSelectedSatellites(satellites.slice(0, maxSatellites));
    }
  };

  const handleDownload = () => {
    const data = {
      orbitType,
      satellites: selectedSatellites.map(sat => ({
        name: sat.name,
        tle1: sat.tle1,
        tle2: sat.tle2
      })),
      timestamp: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `satellite-tracking-${orbitType}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="h-full flex flex-col lg:flex-row gap-4 sm:gap-6 p-4 sm:p-6"
    >
      {/* Control Panel */}
      <div className="w-full lg:w-80 space-y-6">
        <ControlPanel title="Tracking Controls" accentColor="purple">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground" htmlFor="orbit-select">
                Orbit Type
              </label>
              <Select value={orbitType} onValueChange={setOrbitType}>
                <SelectTrigger id="orbit-select" className="w-full" aria-label="Select orbit type">
                  <SelectValue placeholder="Select orbit type" />
                </SelectTrigger>
                <SelectContent side="bottom">
                  <SelectItem value="LEO">LEO (Low Earth Orbit)</SelectItem>
                  <SelectItem value="MEO">MEO (Medium Earth Orbit)</SelectItem>
                  <SelectItem value="GEO">GEO (Geostationary)</SelectItem>
                  <SelectItem value="HEO">HEO (High Elliptical)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Animation Speed (x)</label>
              <Slider
                value={[speed]}
                onValueChange={(v) => setSpeed(v[0])}
                min={0.5}
                max={5}
                step={0.5}
                className="w-full"
                disabled={loading}
              />
              <span className="text-sm text-primary mt-1 block">{speed}x</span>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Max Satellites</label>
              <Input
                type="number"
                min="1"
                max="100"
                value={maxSatellites}
                onChange={(e) => {
                  const newMax = Math.max(1, Math.min(100, parseInt(e.target.value) || 1));
                  setMaxSatellites(newMax);
                  if (satellites.length > 0) {
                    setSelectedSatellites(satellites.slice(0, newMax));
                  }
                }}
                className="w-full"
                disabled={loading}
              />
              <span className="text-xs text-muted-foreground">
                Enter number of satellites to display (1-100)
              </span>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-muted-foreground" htmlFor="satellite-search">
                Search Satellites
              </label>
              <Input
                id="satellite-search"
                type="text"
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
                disabled={loading}
              />
              {searchQuery && (
                <span className="text-xs text-muted-foreground">
                  Found {filteredSatellites.length} matches
                </span>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Select Individual Satellites</label>
              <div className="glass-panel border-neon-purple/30 p-3 space-y-2 max-h-48 overflow-y-auto">
                {satellites.slice(0, 50).map((sat, idx) => (
                  <label key={idx} className="flex items-center gap-2 cursor-pointer hover:bg-white/5 p-1 rounded">
                    <input
                      type="checkbox"
                      checked={selectedSatellites.some(s => s.name === sat.name)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedSatellites([...selectedSatellites, sat]);
                        } else {
                          setSelectedSatellites(selectedSatellites.filter(s => s.name !== sat.name));
                        }
                      }}
                      className="rounded border-neon-purple/30"
                    />
                    <span className="text-xs text-muted-foreground truncate">{sat.name}</span>
                  </label>
                ))}
                {satellites.length > 50 && (
                  <p className="text-xs text-muted-foreground italic">
                    Showing first 50. Use search or max satellites to select more.
                  </p>
                )}
              </div>
            </div>

            <ActionButtons
              isRunning={isRunning}
              onPlayPause={() => !loading && setIsRunning(!isRunning)}
              onReset={handleReset}
              onDownload={handleDownload}
              playLabel="Start Animation"
              pauseLabel="Stop Animation"
              variant="purple"
            />
          </div>
        </ControlPanel>

        <ParameterDisplay
          title="Statistics"
          accentColor="lime"
          parameters={[
            { label: "Orbit Type", value: orbitType, highlight: true },
            { label: "Active Satellites", value: selectedSatellites.length, highlight: true },
            { label: "Available", value: satellites.length },
            { label: "Simulation Speed", value: `${speed}x` },
            { label: "Status", value: isRunning ? "Running" : "Paused", highlight: true },
          ]}
        />

        <div className="glass-panel border-neon-purple/30 p-4 space-y-3 max-h-64 overflow-y-auto">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-foreground">
              {searchQuery ? "Search Results" : "Active Satellites"}
            </h4>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-xs text-neon-purple hover:text-neon-purple/70 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <LoadingSpinner size="sm" />
            </div>
          ) : error ? (
            <div className="text-xs text-red-400">{error}</div>
          ) : filteredSatellites.length === 0 ? (
            <div className="text-xs text-muted-foreground text-center py-4">
              {searchQuery ? "No satellites found" : "No satellites available"}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredSatellites.slice(0, 50).map((sat, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: sat.color }} />
                  <span className="text-xs text-muted-foreground truncate">{sat.name}</span>
                </div>
              ))}
              {filteredSatellites.length > 50 && (
                <div className="text-xs text-muted-foreground text-center pt-2 border-t border-neon-purple/20">
                  +{filteredSatellites.length - 50} more satellites
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 3D Visualization */}
      <div 
        ref={canvasContainerRef}
        className="flex-1 min-h-[400px] sm:min-h-[500px] rounded-xl overflow-hidden border border-neon-purple/20 relative"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-space-dark via-secondary/5 to-primary/5" />
        
        {/* Fullscreen Button */}
        <button
          onClick={toggleFullscreen}
          className="absolute top-4 right-4 z-10 p-2 rounded-lg bg-black/50 hover:bg-black/70 border border-neon-purple/30 transition-colors"
          title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
        >
          {isFullscreen ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
            </svg>
          )}
        </button>

        {/* Satellite Count Badge */}
        <div className="absolute top-4 left-4 z-10 px-3 py-2 rounded-lg bg-black/50 border border-neon-purple/30">
          <div className="text-xs text-muted-foreground">Displaying</div>
          <div className="text-lg font-bold text-neon-purple">{selectedSatellites.length}</div>
          <div className="text-xs text-muted-foreground">of {satellites.length}</div>
        </div>

        {/* Camera Controls Legend */}
        <div className="absolute bottom-4 left-4 z-10 px-3 py-2 rounded-lg bg-black/50 border border-neon-purple/30 text-xs space-y-1">
          <div className="font-semibold text-foreground mb-2">Camera Controls</div>
          <div className="text-muted-foreground flex items-center gap-2">
            <span className="w-20">🖱️ Left Click</span>
            <span>Rotate</span>
          </div>
          <div className="text-muted-foreground flex items-center gap-2">
            <span className="w-20">🖱️ Scroll</span>
            <span>Zoom</span>
          </div>
          <div className="text-muted-foreground flex items-center gap-2">
            <span className="w-20">🖱️ Right Click</span>
            <span>Pan (Disabled)</span>
          </div>
        </div>

        {/* Performance Notice */}
        <div className="absolute bottom-4 right-4 z-10 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/30 text-xs max-w-xs">
          <div className="text-blue-400 font-semibold mb-1">Rendering Info</div>
          <div className="text-blue-400/80 space-y-0.5">
            <div>• Detailed models: First 100</div>
            <div>• Orbit paths: First 150</div>
            <div>• Simple points: Remaining</div>
          </div>
        </div>

        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <LoadingSpinner />
          </div>
        ) : error ? (
          <div className="absolute inset-0 flex items-center justify-center text-red-400">
            {error}
          </div>
        ) : (
          <Canvas camera={{ position: [10, 10, 10], fov: 50 }}>
            <ambientLight intensity={0.3} />
            <pointLight position={[10, 10, 10]} intensity={1.5} />
            <pointLight position={[-10, -10, -10]} intensity={0.5} />
            <Earth3D rotationSpeed={0.001} />
            {selectedSatellites.map((sat, idx) => (
              <SatelliteOrbit
                key={idx}
                satData={sat}
                speed={speed}
                isRunning={isRunning}
                showOrbit={idx < 150}
                showDetailed={idx < 100}
              />
            ))}
            <OrbitControls enablePan={false} minDistance={8} maxDistance={25} />
          </Canvas>
        )}
      </div>
    </motion.div>
  );
};

export default RealSatelliteTracking;

