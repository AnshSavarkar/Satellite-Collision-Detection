import { useState, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Sphere, Line, Stars } from "@react-three/drei";
import { motion } from "framer-motion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Search, RotateCcw, AlertTriangle } from "lucide-react";
import * as THREE from "three";

const Earth = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.001;
    }
  });

  return (
    <Sphere ref={meshRef} args={[2, 64, 64]} position={[0, 0, 0]}>
      <meshStandardMaterial 
        color="#1e3a8a" 
        emissive="#3b82f6" 
        emissiveIntensity={0.3}
        roughness={0.7}
        metalness={0.2}
      />
    </Sphere>
  );
};

const CollisionSatellite = ({ 
  radius, 
  color, 
  isRunning,
  speed 
}: { 
  radius: number; 
  color: string; 
  isRunning: boolean;
  speed: number;
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const angleRef = useRef(0);

  useFrame(() => {
    if (meshRef.current && isRunning) {
      angleRef.current += 0.01 * speed;
      meshRef.current.position.x = Math.cos(angleRef.current) * radius;
      meshRef.current.position.z = Math.sin(angleRef.current) * radius;
      meshRef.current.position.y = Math.sin(angleRef.current * 1.5) * 0.3;
    }
  });

  const points = [];
  for (let i = 0; i <= 64; i++) {
    const angle = (i / 64) * Math.PI * 2;
    points.push(new THREE.Vector3(
      Math.cos(angle) * radius, 
      Math.sin(angle * 1.5) * 0.3,
      Math.sin(angle) * radius
    ));
  }

  return (
    <>
      <Line points={points} color={color} lineWidth={2} opacity={0.7} transparent />
      <mesh ref={meshRef} position={[radius, 0, 0]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2} />
      </mesh>
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
  const [satellite1, setSatellite1] = useState("ISS");
  const [satellite2, setSatellite2] = useState("Hubble");
  const [startTime, setStartTime] = useState(new Date().toISOString().slice(0, 16));
  const [duration, setDuration] = useState(12);
  const [threshold, setThreshold] = useState(10);
  const [samplePoints, setSamplePoints] = useState(1200);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const handleAnalyze = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      setShowResults(true);
    }, 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-full flex flex-col lg:flex-row gap-6 p-6"
    >
      {/* Control Panel */}
      <div className="w-full lg:w-96 space-y-6">
        <Card className="glass-panel border-neon-cyan/30 p-6 space-y-6">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-400" />
            <h3 className="text-xl font-bold text-foreground glow-cyan">Collision Analysis</h3>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Satellite 1</label>
            <Select value={satellite1} onValueChange={setSatellite1}>
              <SelectTrigger className="glass-panel border-neon-cyan/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="glass-panel border-neon-cyan/30 bg-space-dark" side="bottom">
                <SelectItem value="ISS">ISS (International Space Station)</SelectItem>
                <SelectItem value="Hubble">Hubble Space Telescope</SelectItem>
                <SelectItem value="Tiangong">Tiangong Space Station</SelectItem>
                <SelectItem value="GPS-IIF">GPS IIF-12</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Satellite 2</label>
            <Select value={satellite2} onValueChange={setSatellite2}>
              <SelectTrigger className="glass-panel border-neon-cyan/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="glass-panel border-neon-cyan/30 bg-space-dark" side="bottom">
                <SelectItem value="Hubble">Hubble Space Telescope</SelectItem>
                <SelectItem value="ISS">ISS (International Space Station)</SelectItem>
                <SelectItem value="Starlink-1234">Starlink-1234</SelectItem>
                <SelectItem value="NOAA-20">NOAA-20</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="p-3 bg-primary/10 rounded-lg border border-primary/30">
            <p className="text-xs text-primary">✅ 200 satellites loaded (Mock Data)</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Start Time (UTC)</label>
            <Input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="glass-panel border-neon-cyan/30"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Duration (hours)</label>
              <Input
                type="number"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value))}
                className="glass-panel border-neon-cyan/30"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Threshold (km)</label>
              <Input
                type="number"
                value={threshold}
                onChange={(e) => setThreshold(parseInt(e.target.value))}
                className="glass-panel border-neon-cyan/30"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Sample Points</label>
            <Input
              type="number"
              value={samplePoints}
              onChange={(e) => setSamplePoints(parseInt(e.target.value))}
              className="glass-panel border-neon-cyan/30"
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
            >
              <Search className="w-4 h-4 mr-2" />
              {isAnalyzing ? "Analyzing..." : "Analyze Collision Risk"}
            </Button>
            <Button
              onClick={() => {
                setShowResults(false);
                setIsAnalyzing(false);
              }}
              variant="outline"
              className="border-neon-purple"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </Card>

        {showResults && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Card className="glass-panel border-orange-500/30 p-6 space-y-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-400" />
                <h3 className="text-lg font-bold text-foreground">Analysis Results</h3>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Minimum Distance:</span>
                  <span className="text-orange-400 font-mono font-bold">8.4 km</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Time of Closest Approach:</span>
                  <span className="text-primary font-mono">2025-11-07 14:32 UTC</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Relative Velocity:</span>
                  <span className="text-primary font-mono">12.3 km/s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Risk Level:</span>
                  <span className="text-orange-400 font-bold">⚠️ MODERATE</span>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </div>

      {/* 3D Visualization */}
      <div className="flex-1 min-h-[500px] rounded-xl overflow-hidden border border-neon-cyan/20 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-space-dark via-orange-500/5 to-red-500/5" />
        {isAnalyzing && (
          <div className="absolute inset-0 flex items-center justify-center bg-space-dark/80 backdrop-blur-sm z-10">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-lg text-foreground">Analyzing collision trajectories...</p>
            </div>
          </div>
        )}
        <Canvas camera={{ position: [10, 10, 10], fov: 50 }}>
          <ambientLight intensity={0.2} />
          <pointLight position={[10, 10, 10]} intensity={1} />
          <Earth />
          <CollisionSatellite radius={3.5} color="#ef4444" isRunning={showResults} speed={1} />
          <CollisionSatellite radius={4.2} color="#3b82f6" isRunning={showResults} speed={1.3} />
          {showResults && <CollisionPoint />}
          <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
          <OrbitControls enablePan={false} minDistance={8} maxDistance={25} />
        </Canvas>
      </div>
    </motion.div>
  );
};

export default SatelliteCollisions;
