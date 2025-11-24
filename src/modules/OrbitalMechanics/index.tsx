import { useState, useRef, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Line } from "@react-three/drei";
import { motion } from "framer-motion";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import Earth3D from "@/components/Earth3D";
import ControlPanel from "@/components/shared/ControlPanel";
import ParameterDisplay from "@/components/shared/ParameterDisplay";
import ActionButtons from "@/components/shared/ActionButtons";
import * as THREE from "three";

const Satellite = ({ altitude, speed, isRunning }: { altitude: number; speed: number; isRunning: boolean }) => {
  const satelliteGroupRef = useRef<THREE.Group>(null);
  const angleRef = useRef(0);

  useFrame((state, delta) => {
    if (satelliteGroupRef.current) {
      // Rotate satellite on its own axis
      satelliteGroupRef.current.rotation.y += delta * 2;
      satelliteGroupRef.current.rotation.x += delta * 0.5;
      
      if (isRunning) {
        angleRef.current += delta * speed;
        const radius = 2 + altitude / 300;
        satelliteGroupRef.current.position.x = Math.cos(angleRef.current) * radius;
        satelliteGroupRef.current.position.z = Math.sin(angleRef.current) * radius;
      }
    }
  });

  const radius = 2 + altitude / 300;
  const points = [];
  for (let i = 0; i <= 64; i++) {
    const angle = (i / 64) * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
  }

  return (
    <>
      <Line points={points} color="#00FFFF" lineWidth={2} opacity={0.7} transparent />
      <group ref={satelliteGroupRef} position={[radius, 0, 0]}>
        {/* Main satellite body */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.12, 0.06, 0.06]} />
          <meshStandardMaterial 
            color="#00FFFF" 
            emissive="#00FFFF" 
            emissiveIntensity={1.5}
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>
        {/* Solar panel on one side */}
        <mesh position={[0.1, 0, 0]} castShadow>
          <boxGeometry args={[0.04, 0.16, 0.08]} />
          <meshStandardMaterial color="#1e40af" metalness={0.9} roughness={0.1} />
        </mesh>
        {/* Solar panel on other side */}
        <mesh position={[-0.1, 0, 0]} castShadow>
          <boxGeometry args={[0.04, 0.16, 0.08]} />
          <meshStandardMaterial color="#1e40af" metalness={0.9} roughness={0.1} />
        </mesh>
      </group>
    </>
  );
};

const OrbitalMechanics = () => {
  const [altitude, setAltitude] = useState(500);
  const [speed, setSpeed] = useState(1);
  const [trailLength, setTrailLength] = useState(100);
  const [isRunning, setIsRunning] = useState(false);
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

  // Mock calculations - TODO: Connect Backend API here for real orbital mechanics calculations
  const orbitalVelocity = (7.6 * (500 / altitude)).toFixed(2);
  const orbitalPeriod = (94.6 * Math.sqrt(Math.pow(altitude / 500, 3))).toFixed(1);
  const distanceFromEarth = (6378 + altitude).toFixed(0);

  const handleReset = () => {
    setIsRunning(false);
    setAltitude(500);
    setSpeed(1);
    setTrailLength(100);
    setInclination(0);
    setEccentricity(0);
  };

  const handleDownload = () => {
    // TODO: Connect Backend API here
    console.log("Downloading orbital mechanics data...");
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
        <ControlPanel title="Orbital Parameters" accentColor="cyan">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Orbital Altitude (km)</label>
              <Slider
                value={[altitude]}
                onValueChange={(v) => setAltitude(v[0])}
                min={200}
                max={2000}
                step={10}
                className="w-full"
              />
              <span className="text-sm text-primary">{altitude} km</span>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Animation Speed</label>
              <Select value={speed.toString()} onValueChange={(v) => setSpeed(parseFloat(v))}>
                <SelectTrigger className="glass-panel border-neon-cyan/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="glass-panel border-neon-cyan/30 bg-space-dark" side="bottom">
                  <SelectItem value="0.5">0.5x</SelectItem>
                  <SelectItem value="1">1x</SelectItem>
                  <SelectItem value="2">2x</SelectItem>
                  <SelectItem value="5">5x</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Trail Length (points)</label>
              <Input
                type="number"
                value={trailLength}
                onChange={(e) => setTrailLength(parseInt(e.target.value))}
                className="glass-panel border-neon-cyan/30"
              />
            </div>

            <ActionButtons
              isRunning={isRunning}
              onPlayPause={() => setIsRunning(!isRunning)}
              onReset={handleReset}
              onDownload={handleDownload}
              variant="cyan"
            />
          </div>
        </ControlPanel>

        <ParameterDisplay
          title="Calculated Values"
          accentColor="lime"
          parameters={[
            { label: "Orbital Velocity", value: orbitalVelocity, unit: "km/s", highlight: true },
            { label: "Orbital Period", value: orbitalPeriod, unit: "min" },
            { label: "Distance from Earth", value: distanceFromEarth, unit: "km" },
            { label: "Current Speed", value: (parseFloat(orbitalVelocity) * speed).toFixed(2), unit: "km/s" },
          ]}
        />
      </div>

      {/* 3D Visualization */}
      <div ref={canvasContainerRef} className="flex-1 min-h-[400px] sm:min-h-[500px] rounded-xl overflow-hidden border border-cyan-500/20 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-space-dark via-cyan-500/5 to-primary/5" />
        
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
        
        <Canvas camera={{ position: [5, 5, 5], fov: 50 }}>
          <ambientLight intensity={0.3} />
          <pointLight position={[10, 10, 10]} intensity={1.5} castShadow />
          <pointLight position={[-10, -10, -10]} intensity={0.5} />
          <directionalLight position={[5, 5, 5]} intensity={0.8} castShadow />
          <Earth3D rotationSpeed={0.001} />
          <Satellite altitude={altitude} speed={speed} isRunning={isRunning} />
          <OrbitControls enablePan={false} minDistance={5} maxDistance={20} />
        </Canvas>
      </div>
    </motion.div>
  );
};

export default OrbitalMechanics;

