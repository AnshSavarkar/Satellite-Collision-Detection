import { useState, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Sphere, Line, Stars } from "@react-three/drei";
import { motion } from "framer-motion";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Play, Pause, RotateCcw } from "lucide-react";
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

const Satellite = ({ altitude, speed, isRunning }: { altitude: number; speed: number; isRunning: boolean }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const angleRef = useRef(0);

  useFrame(() => {
    if (meshRef.current && isRunning) {
      angleRef.current += 0.01 * speed;
      const radius = 2 + altitude / 300;
      meshRef.current.position.x = Math.cos(angleRef.current) * radius;
      meshRef.current.position.z = Math.sin(angleRef.current) * radius;
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
      <Line points={points} color="#06b6d4" lineWidth={2} opacity={0.7} transparent />
      <mesh ref={meshRef} position={[radius, 0, 0]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial color="#06b6d4" emissive="#06b6d4" emissiveIntensity={2} />
      </mesh>
    </>
  );
};

const OrbitalMechanics = () => {
  const [altitude, setAltitude] = useState(500);
  const [speed, setSpeed] = useState(1);
  const [trailLength, setTrailLength] = useState(100);
  const [isRunning, setIsRunning] = useState(false);

  const orbitalVelocity = (7.6 * (500 / altitude)).toFixed(2);
  const orbitalPeriod = (94.6 * Math.sqrt(Math.pow(altitude / 500, 3))).toFixed(1);
  const distanceFromEarth = (6378 + altitude).toFixed(0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-full flex flex-col lg:flex-row gap-6 p-6"
    >
      {/* Control Panel */}
      <div className="w-full lg:w-80 space-y-6">
        <Card className="glass-panel border-neon-cyan/30 p-6 space-y-6">
          <h3 className="text-xl font-bold text-foreground glow-cyan">Orbital Parameters</h3>
          
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
              <SelectContent className="glass-panel border-neon-cyan/30 bg-space-dark">
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

          <div className="flex gap-2">
            <Button
              onClick={() => setIsRunning(!isRunning)}
              className="flex-1 bg-primary glow-cyan"
            >
              {isRunning ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
              {isRunning ? "Pause" : "Start"}
            </Button>
            <Button
              onClick={() => {
                setIsRunning(false);
                setAltitude(500);
                setSpeed(1);
              }}
              variant="outline"
              className="border-neon-purple"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </Card>

        <Card className="glass-panel border-neon-green/30 p-6 space-y-3">
          <h3 className="text-lg font-bold text-foreground glow-green">Calculated Values</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Orbital Velocity:</span>
              <span className="text-primary font-mono">{orbitalVelocity} km/s</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Orbital Period:</span>
              <span className="text-primary font-mono">{orbitalPeriod} min</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Distance from Earth:</span>
              <span className="text-primary font-mono">{distanceFromEarth} km</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Current Speed:</span>
              <span className="text-primary font-mono">{(parseFloat(orbitalVelocity) * speed).toFixed(2)} km/s</span>
            </div>
          </div>
        </Card>
      </div>

      {/* 3D Visualization */}
      <div className="flex-1 min-h-[500px] rounded-xl overflow-hidden border border-neon-cyan/20 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-space-dark via-primary/5 to-secondary/5" />
        <Canvas camera={{ position: [8, 8, 8], fov: 50 }}>
          <ambientLight intensity={0.2} />
          <pointLight position={[10, 10, 10]} intensity={1} />
          <Earth />
          <Satellite altitude={altitude} speed={speed} isRunning={isRunning} />
          <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
          <OrbitControls enablePan={false} minDistance={5} maxDistance={20} />
        </Canvas>
      </div>
    </motion.div>
  );
};

export default OrbitalMechanics;
