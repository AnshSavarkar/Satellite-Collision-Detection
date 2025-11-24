import { useState, useRef, useEffect, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Line } from "@react-three/drei";
import { motion } from "framer-motion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import Earth3D from "@/components/Earth3D";
import ControlPanel from "@/components/shared/ControlPanel";
import ParameterDisplay from "@/components/shared/ParameterDisplay";
import ActionButtons from "@/components/shared/ActionButtons";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { Search, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import * as THREE from "three";
import * as satellite from "satellite.js";

const CollisionSatellite = ({ 
  tle1,
  tle2,
  color, 
  isRunning,
  timeScale = 60
}: { 
  tle1: string;
  tle2: string;
  color: string; 
  isRunning: boolean;
  timeScale?: number;
}) => {
  const satelliteGroupRef = useRef<THREE.Group>(null);
  const satrecRef = useRef<satellite.SatRec | null>(null);
  const orbitPoints = useRef<THREE.Vector3[]>([]);
  const timeOffsetRef = useRef(0);

  // Initialize satellite from TLE
  useEffect(() => {
    if (tle1 && tle2) {
      // Use requestIdleCallback or setTimeout to defer heavy computation
      const computeOrbit = () => {
        try {
          satrecRef.current = satellite.twoline2satrec(tle1, tle2);
          
          if (!satrecRef.current || satrecRef.current.error) {
            console.error('Failed to parse TLE');
            return;
          }
          
          // Calculate orbital period from mean motion
          const meanMotionRad = satrecRef.current.no; // radians per minute
          const period = (2 * Math.PI) / meanMotionRad; // period in minutes
          
          // Generate orbit points using SGP4 propagation
          const points: THREE.Vector3[] = [];
          const now = new Date();
          const steps = 64; // Full 64 points for smooth orbit
          const scale = 2.5 / 6371; // Pre-calculate scale
          
          for (let i = 0; i <= steps; i++) {
            const fraction = i / steps;
            const minutesOffset = fraction * period;
            const futureDate = new Date(now.getTime() + minutesOffset * 60000);
            
            const positionAndVelocity = satellite.propagate(satrecRef.current, futureDate);
            
            if (positionAndVelocity.position && typeof positionAndVelocity.position !== 'boolean') {
              const posEci = positionAndVelocity.position;
              
              points.push(new THREE.Vector3(
                posEci.x * scale,
                posEci.z * scale, // Swap Y and Z
                posEci.y * scale
              ));
            }
          }
          
          orbitPoints.current = points;
          
          // Set initial position from first point
          if (satelliteGroupRef.current && points.length > 0) {
            satelliteGroupRef.current.position.copy(points[0]);
          }
        } catch (error) {
          console.error('Error generating orbit:', error);
        }
      };

      // Defer computation to avoid blocking the main thread
      if ('requestIdleCallback' in window) {
        requestIdleCallback(computeOrbit, { timeout: 100 });
      } else {
        setTimeout(computeOrbit, 0);
      }
    }
  }, [tle1, tle2]);

  useFrame((state, delta) => {
    if (satelliteGroupRef.current && isRunning && orbitPoints.current.length > 1) {
      // Smooth interpolation along orbit path
      timeOffsetRef.current += delta * 0.5; // Adjust speed
      
      const totalPoints = orbitPoints.current.length - 1;
      const index = timeOffsetRef.current % totalPoints;
      const currentIndex = Math.floor(index);
      const nextIndex = (currentIndex + 1) % totalPoints;
      const t = index - currentIndex;
      
      // Interpolate between points
      const current = orbitPoints.current[currentIndex];
      const next = orbitPoints.current[nextIndex];
      
      if (current && next) {
        satelliteGroupRef.current.position.lerpVectors(current, next, t);
      }
      
      // Rotate satellite on its own axis
      satelliteGroupRef.current.rotation.y += delta * 2;
      satelliteGroupRef.current.rotation.x += delta * 0.5;
    }
  });

  return (
    <>
      {orbitPoints.current.length > 0 && (
        <Line 
          points={orbitPoints.current}
          color={color}
          lineWidth={1}
          transparent
          opacity={0.6}
        />
      )}
      <group ref={satelliteGroupRef}>
        {/* Glow effect - outer sphere */}
        <mesh>
          <sphereGeometry args={[0.12, 8, 8]} />
          <meshBasicMaterial color={color} transparent opacity={0.2} />
        </mesh>
        {/* Main satellite body */}
        <mesh>
          <boxGeometry args={[0.12, 0.06, 0.06]} />
          <meshStandardMaterial 
            color={color} 
            emissive={color} 
            emissiveIntensity={2.5}
            metalness={0.8}
            roughness={0.2}
            toneMapped={false}
          />
        </mesh>
        {/* Solar panel on one side */}
        <mesh position={[0.1, 0, 0]}>
          <boxGeometry args={[0.04, 0.16, 0.08]} />
          <meshStandardMaterial color="#1e40af" metalness={0.9} roughness={0.1} emissive="#1e40af" emissiveIntensity={0.5} />
        </mesh>
        {/* Solar panel on other side */}
        <mesh position={[-0.1, 0, 0]}>
          <boxGeometry args={[0.04, 0.16, 0.08]} />
          <meshStandardMaterial color="#1e40af" metalness={0.9} roughness={0.1} emissive="#1e40af" emissiveIntensity={0.5} />
        </mesh>
      </group>
    </>
  );
};

const CollisionPoint = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 3) * 0.3);
    }
  });

  return (
    <mesh ref={meshRef} position={[3.5, 0.2, 0]}>
      <sphereGeometry args={[0.15, 16, 16]} />
      <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={3} transparent opacity={0.8} />
    </mesh>
  );
};

const SatelliteCollisions = () => {
  const [satellite1, setSatellite1] = useState("");
  const [satellite2, setSatellite2] = useState("");
  const [startTime, setStartTime] = useState("");
  const [tleList, setTleList] = useState<Array<{name: string; tle1: string; tle2: string}>>([]);
  const [orbitType, setOrbitType] = useState<'LEO' | 'MEO' | 'GEO' | 'HEO'>('LEO');
  const [filter1, setFilter1] = useState("");
  const [filter2, setFilter2] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCacheStale, setIsCacheStale] = useState(false);
  const [duration, setDuration] = useState(12);
  const [threshold, setThreshold] = useState(10);
  const [samplePoints, setSamplePoints] = useState(1200);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [sat1TLE, setSat1TLE] = useState<{tle1: string; tle2: string} | null>(null);
  const [sat2TLE, setSat2TLE] = useState<{tle1: string; tle2: string} | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

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

  // Memoized filtered satellite lists (limit to 100 items for performance)
  const filteredList1 = useMemo(() => {
    if (!filter1) return tleList.slice(0, 100);
    const lowerFilter = filter1.toLowerCase();
    return tleList.filter(t => t.name.toLowerCase().includes(lowerFilter)).slice(0, 100);
  }, [tleList, filter1, orbitType]);

  const filteredList2 = useMemo(() => {
    if (!filter2) return tleList.slice(0, 100);
    const lowerFilter = filter2.toLowerCase();
    return tleList.filter(t => t.name.toLowerCase().includes(lowerFilter)).slice(0, 100);
  }, [tleList, filter2, orbitType]);

  // Sync startTime with current UTC time
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const utcTime = new Date(now.getTime() + (now.getTimezoneOffset() * 60000));
      setStartTime(utcTime.toISOString().slice(0, 16));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000); // Update every second

    return () => clearInterval(interval);
  }, []);

  // Fetch live TLEs with client-side caching for instant loading
  useEffect(() => {
    let mounted = true;
    const CACHE_KEY = `satellite_tle_cache_${orbitType}`;
    const CACHE_TIME_KEY = `satellite_tle_cache_time_${orbitType}`;
    const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours
    

    const fetchTles = async (useCache = true) => {
      try {
        // Reset list immediately to indicate loading for orbit switch
        if (useCache) setTleList([]);
        // Try to load from localStorage cache first for instant loading
        if (useCache) {
          const cachedData = localStorage.getItem(CACHE_KEY);
          const cacheTime = localStorage.getItem(CACHE_TIME_KEY);
          
          if (cachedData && cacheTime) {
            const age = Date.now() - parseInt(cacheTime);
            if (age < CACHE_DURATION) {
              // Cache is fresh, use it immediately
              const sets = JSON.parse(cachedData);
              if (mounted && sets.length > 0) {
                setTleList(sets);
                if (sets.length >= 2) {
                  setSatellite1(sets[0].name);
                  setSatellite2(sets[1].name);
                }
                setErrorMessage(null);
                // Fetch in background to update cache
                fetchTles(false);
                return;
              }
            }
          }
        }

        // Fetch from server for selected orbit as JSON
        const resp = await fetch(`/api/tle/live?orbit=${orbitType}&format=tle&json=true`);
        if (!resp.ok) throw new Error('Failed to fetch TLEs from server');
        const json = await resp.json();
        const sets = (json?.satellites as Array<{name:string; tle1:string; tle2:string}>) || [];
        
        if (mounted && sets.length > 0) {
          setTleList(sets);
          // Save to localStorage for instant loading next time
          localStorage.setItem(CACHE_KEY, JSON.stringify(sets));
          localStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
          
          // preselect first two if available
          if (sets.length >= 2 && !tleList.length) {
            setSatellite1(sets[0].name);
            setSatellite2(sets[1].name);
          }
          setErrorMessage(null);
        }
      } catch (err) {
        console.error('Failed to load TLEs', err);
        // Try to use expired cache as fallback
        const cachedData = localStorage.getItem(CACHE_KEY);
        if (cachedData && mounted) {
          const sets = JSON.parse(cachedData);
          if (sets.length > 0) {
            setTleList(sets);
            if (sets.length >= 2) {
              setSatellite1(sets[0].name);
              setSatellite2(sets[1].name);
            }
            setErrorMessage('Using cached data (server unavailable)');
            return;
          }
        }
        setErrorMessage('Failed to load satellite data. Please ensure the backend server is running.');
      }
    };

    fetchTles(true);
    // Refresh every 5 minutes in background
    const intv = setInterval(() => fetchTles(false), CACHE_DURATION);
    return () => { mounted = false; clearInterval(intv); };
  }, [orbitType]);

  // Prefetch other orbit caches in background for sub-0.5s switches
  useEffect(() => {
    const others: Array<'LEO'|'MEO'|'GEO'|'HEO'> = ['LEO','MEO','GEO','HEO'].filter(o => o !== orbitType) as any;
    others.forEach((o) => {
      const CACHE_KEY = `satellite_tle_cache_${o}`;
      const CACHE_TIME_KEY = `satellite_tle_cache_time_${o}`;
      const CACHE_DURATION = 6 * 60 * 60 * 1000;
      const cacheTime = localStorage.getItem(CACHE_TIME_KEY);
      const fresh = cacheTime && (Date.now() - parseInt(cacheTime)) < CACHE_DURATION;
      if (fresh) return;
      // Fetch silently
      fetch(`/api/tle/live?orbit=${o}&format=tle&json=true`).then(async (r) => {
        if (!r.ok) return;
        const json = await r.json();
        const sets = (json?.satellites as Array<{name:string; tle1:string; tle2:string}>) || [];
        if (sets.length) {
          localStorage.setItem(CACHE_KEY, JSON.stringify(sets));
          localStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
        }
      }).catch(()=>{});
    });
  }, [orbitType]);

  const handleAnalyze = async () => {
    // Validate that satellites are selected
    if (!satellite1 || !satellite2) {
      setErrorMessage('Please select both satellites before running analysis');
      return;
    }
    
    // Validate that different satellites are selected
    if (satellite1 === satellite2) {
      setErrorMessage('Please select two different satellites for collision analysis');
      return;
    }
    
    setIsAnalyzing(true);
    setErrorMessage(null);
    try {
      // find TLEs for selected satellites
      const findTle = (name: string) => tleList.find(t => t.name === name) || tleList.find(t => t.name.includes(name)) || null;
      const tle1 = findTle(satellite1);
      const tle2 = findTle(satellite2);
      
      // Validate that TLEs were found
      if (!tle1) {
        throw new Error(`TLE data not found for satellite: ${satellite1}`);
      }
      if (!tle2) {
        throw new Error(`TLE data not found for satellite: ${satellite2}`);
      }

      const body: any = {
        satellite1,
        satellite2,
        threshold,
        duration,
        samplePoints,
        start_time: new Date().toISOString(), // current UTC
      };
  if (tle1) body.satellite1_tle = [tle1.tle1, tle1.tle2];
  if (tle2) body.satellite2_tle = [tle2.tle1, tle2.tle2];

      const response = await fetch('/api/collision-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze collision');
      }

      const data = await response.json();
      if (data.status && data.status === 'error') throw new Error(data.message || 'Analysis error');
      setAnalysisResults(data);
      
      // Store TLE data for visualization
      if (tle1) setSat1TLE({ tle1: tle1.tle1, tle2: tle1.tle2 });
      if (tle2) setSat2TLE({ tle1: tle2.tle1, tle2: tle2.tle2 });
      
      setShowResults(true);
      setIsRunning(true);
    } catch (error) {
      console.error('Error analyzing collision:', error);
      setErrorMessage((error as Error).message || 'Failed to analyze collision');
      setShowResults(false);
      setIsRunning(false);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Calculate risk based on analysis results or fallback
  const minDistance = analysisResults?.min_distance || 8.4;
  const isHighRisk = minDistance < threshold;
  const riskLevel = isHighRisk ? "🔴 HIGH" : "🟢 LOW";
  const riskColor = isHighRisk ? "purple" : "cyan"; // Use valid accent colors

  const handleReset = () => {
    setShowResults(false);
    setIsRunning(false);
    setIsAnalyzing(false);
    setSatellite1('');
    setSatellite2('');
    setSat1TLE(null);
    setSat2TLE(null);
    setFilter1('');
    setFilter2('');
    setAnalysisResults(null);
    setErrorMessage(null);
    setDuration(12);
    setThreshold(10);
    setSamplePoints(1200);
  };

  const handleDownload = () => {
    if (!collisionRisk || !closestApproach || !relativeVelocity || !timeToClosestApproach) {
      console.error("No analysis data available to download");
      return;
    }

    const data = {
      satellite1: satellite1,
      satellite2: satellite2,
      orbitType: orbitType,
      collisionRisk: collisionRisk,
      closestApproach: closestApproach,
      relativeVelocity: relativeVelocity,
      timeToClosestApproach: timeToClosestApproach,
      analysisDate: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `collision-analysis-${satellite1}-${satellite2}-${Date.now()}.json`;
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
      <div className="w-full lg:w-96 space-y-6">
        <ControlPanel title="Collision Analysis" accentColor="lime">
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-orange-400" />
              <span className="text-sm text-muted-foreground">Select satellites to analyze</span>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Orbit Type</label>
              <Select value={orbitType} onValueChange={(val:any) => setOrbitType(val as 'LEO'|'MEO'|'GEO'|'HEO')}>
                <SelectTrigger className="glass-panel border-neon-cyan/30" aria-label="Select orbit type">
                  <SelectValue placeholder="Select orbit type" />
                </SelectTrigger>
                <SelectContent className="glass-panel border-neon-cyan/30 bg-space-dark" side="bottom">
                  {['LEO','MEO','GEO','HEO'].map(o => (
                    <SelectItem key={o} value={o}>{o}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-xs text-muted-foreground">Currently loaded: {tleList.length} satellites ({orbitType})</div>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Satellite 1</label>
              <div className="space-y-2">
                <Input
                  placeholder="Search satellite..."
                  value={filter1}
                  onChange={(e) => setFilter1(e.target.value)}
                  className="mb-2"
                  aria-label="Search for satellite 1"
                />
                <Select value={satellite1} onValueChange={setSatellite1}>
                <SelectTrigger className="glass-panel border-neon-cyan/30" aria-label="Select satellite 1">
                  <SelectValue placeholder="Select satellite 1" />
                </SelectTrigger>
                <SelectContent className="glass-panel border-neon-cyan/30 bg-space-dark max-h-64 overflow-auto" side="bottom">
                  {filteredList1.length === 0 ? (
                    satellite1 ? (
                      <SelectItem value={satellite1}>{satellite1}</SelectItem>
                    ) : (
                      <div className="px-2 py-1 text-xs text-muted-foreground">
                        No satellites found. Try a different search.
                      </div>
                    )
                  ) : (
                    filteredList1.map((t) => (
                      <SelectItem key={t.name} value={t.name}>{t.name}</SelectItem>
                    ))
                  )}
                  {filter1 && filteredList1.length === 100 && (
                    <div className="px-2 py-1 text-xs text-muted-foreground">
                      Showing first 100 results. Type to narrow down...
                    </div>
                  )}
                </SelectContent>
              </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Satellite 2</label>
              <div className="space-y-2">
                <Input
                  placeholder="Search satellite..."
                  value={filter2}
                  onChange={(e) => setFilter2(e.target.value)}
                  className="mb-2"
                  aria-label="Search for satellite 2"
                />
                <Select value={satellite2} onValueChange={setSatellite2}>
                <SelectTrigger className="glass-panel border-neon-cyan/30" aria-label="Select satellite 2">
                  <SelectValue placeholder="Select satellite 2" />
                </SelectTrigger>
                <SelectContent className="glass-panel border-neon-cyan/30 bg-space-dark max-h-64 overflow-auto" side="bottom">
                  {filteredList2.length === 0 ? (
                    satellite2 ? (
                      <SelectItem value={satellite2}>{satellite2}</SelectItem>
                    ) : (
                      <div className="px-2 py-1 text-xs text-muted-foreground">
                        No satellites found. Try a different search.
                      </div>
                    )
                  ) : (
                    filteredList2.map((t) => (
                      <SelectItem key={t.name} value={t.name}>{t.name}</SelectItem>
                    ))
                  )}
                  {filter2 && filteredList2.length === 100 && (
                    <div className="px-2 py-1 text-xs text-muted-foreground">
                      Showing first 100 results. Type to narrow down...
                    </div>
                  )}
                </SelectContent>
              </Select>
              </div>
            </div>

            <div className="p-3 bg-primary/10 rounded-lg border border-primary/30">
              <div className="flex items-center justify-between">
                <p className="text-xs text-primary">✅ {tleList.length} satellites loaded (Live)</p>
                {isCacheStale && (
                  <span className="text-xs text-yellow-300 bg-yellow-900/20 px-2 py-1 rounded">Using cached TLEs (stale)</span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Start Time (UTC)</label>
              <div className="glass-panel border-neon-cyan/30 px-3 py-2 rounded-md text-sm text-foreground bg-muted/50">
                {startTime || "Loading..."}
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-900/20 rounded-md border border-red-700/30 text-sm text-red-200">
                Error: {errorMessage}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="duration-input" className="text-sm text-muted-foreground">Duration (hours)</label>
                <Input
                  id="duration-input"
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value))}
                  className="glass-panel border-neon-cyan/30"
                  aria-label="Duration in hours"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="threshold-input" className="text-sm text-muted-foreground">Threshold (km)</label>
                <Input
                  id="threshold-input"
                  type="number"
                  value={threshold}
                  onChange={(e) => setThreshold(parseInt(e.target.value))}
                  className="glass-panel border-neon-cyan/30"
                  aria-label="Collision threshold in kilometers"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="sample-points-input" className="text-sm text-muted-foreground">Sample Points</label>
              <Input
                id="sample-points-input"
                type="number"
                value={samplePoints}
                onChange={(e) => setSamplePoints(parseInt(e.target.value))}
                className="glass-panel border-neon-cyan/30"
                aria-label="Number of sample points for analysis"
              />
            </div>

            <Button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white"
            >
              <Search className="w-4 h-4 mr-2" />
              {isAnalyzing ? "Analyzing..." : "Analyze Collision Risk"}
            </Button>

            <ActionButtons
              isRunning={isRunning}
              onPlayPause={() => setIsRunning(!isRunning)}
              onReset={handleReset}
              variant="lime"
            />
          </div>
        </ControlPanel>

        {showResults && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Card className="glass-panel border-orange-500/30 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-400" />
                  <h3 className="text-lg font-bold text-foreground">Analysis Results</h3>
                </div>
                <Button
                  onClick={handleDownload}
                  size="sm"
                  className="bg-green-500 hover:bg-green-600 text-white"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                  Download
                </Button>
              </div>
              <ParameterDisplay
                title="Collision Analysis"
                accentColor={riskColor}
                parameters={[
                  { label: "Minimum Distance", value: minDistance.toString(), unit: "km", highlight: true },
                  { label: "Time of Closest Approach", value: analysisResults?.time_of_closest_approach || "2025-11-07 14:32 UTC" },
                  { label: "Relative Velocity", value: (analysisResults?.relative_velocity || 12.3).toString(), unit: "km/s" },
                  { label: "Risk Level", value: riskLevel, highlight: true },
                ]}
              />
            </Card>
          </motion.div>
        )}
      </div>

      {/* 3D Visualization */}
      <div ref={canvasContainerRef} className="flex-1 min-h-[400px] sm:min-h-[500px] rounded-xl overflow-hidden border border-green-500/20 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-space-dark via-green-500/5 to-orange-500/5" />
        
        {/* Fullscreen Button */}
        <button
          onClick={toggleFullscreen}
          className="absolute top-4 right-4 z-10 p-2 rounded-lg bg-black/50 hover:bg-black/70 border border-neon-cyan/30 transition-colors"
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
        
        {isAnalyzing && (
          <div className="absolute inset-0 flex items-center justify-center bg-space-dark/80 backdrop-blur-sm z-10">
            <LoadingSpinner 
              message="Analyzing collision trajectories..." 
              accentColor="lime"
            />
          </div>
        )}
        <Canvas camera={{ position: [10, 10, 10], fov: 50 }}>
          <ambientLight intensity={0.2} />
          <pointLight position={[10, 10, 10]} intensity={0.8} />
          <pointLight position={[-10, -10, -10]} intensity={0.3} />
          <Earth3D rotationSpeed={0.001} />
          
          {sat1TLE && (
            <CollisionSatellite 
              tle1={sat1TLE.tle1} 
              tle2={sat1TLE.tle2} 
              color="#ef4444" 
              isRunning={showResults}
              timeScale={60}
            />
          )}
          {sat2TLE && (
            <CollisionSatellite 
              tle1={sat2TLE.tle1} 
              tle2={sat2TLE.tle2} 
              color="#00FF85" 
              isRunning={showResults}
              timeScale={60}
            />
          )}
          
          <OrbitControls 
            enablePan={false} 
            enableZoom={true}
            enableRotate={true}
            minDistance={8} 
            maxDistance={25}
            autoRotate={false}
            zoomSpeed={0.5}
          />
        </Canvas>
      </div>
    </motion.div>
  );
};

export default SatelliteCollisions;

