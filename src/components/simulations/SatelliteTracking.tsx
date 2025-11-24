import { useState, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Sphere, Line, Stars } from "@react-three/drei";
import { motion } from "framer-motion";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Play, RotateCcw } from "lucide-react";
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

const SatelliteOrbit = ({ 
  radius, 
  color, 
  name, 
  speed, 
  isRunning 
}: { 
  radius: number; 
  color: string; 
  name: string; 
  speed: number;
  isRunning: boolean;
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const angleRef = useRef(Math.random() * Math.PI * 2);

  useFrame((state, delta) => {
    if (meshRef.current) {
      if (isRunning) {
        // Use delta time for smooth, frame-rate independent animation
        angleRef.current += delta * 0.5 * speed;
      }
      // Always update position based on current angle
      meshRef.current.position.x = Math.cos(angleRef.current) * radius;
      meshRef.current.position.z = Math.sin(angleRef.current) * radius;
      meshRef.current.position.y = Math.sin(angleRef.current * 2) * 0.5;
    }
  });

  const points = [];
  for (let i = 0; i <= 64; i++) {
    const angle = (i / 64) * Math.PI * 2;
    points.push(new THREE.Vector3(
      Math.cos(angle) * radius, 
      Math.sin(angle * 2) * 0.5, 
      Math.sin(angle) * radius
    ));
  }

  return (
    <>
      <Line points={points} color={color} lineWidth={1.5} opacity={0.6} transparent />
      <mesh ref={meshRef} position={[radius, 0, 0]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2} />
      </mesh>
    </>
  );
};

const satellites = [
  { name: "SAT-1", radius: 3, color: "#06b6d4" },
  { name: "SAT-2", radius: 3.5, color: "#8b5cf6" },
  { name: "SAT-3", radius: 4, color: "#10b981" },
  { name: "SAT-4", radius: 4.5, color: "#f59e0b" },
  { name: "SAT-5", radius: 5, color: "#ef4444" },
  { name: "SAT-6", radius: 5.5, color: "#ec4899" },
];

const SatelliteTracking = () => {
  const [speed, setSpeed] = useState(1);
  const [isRunning, setIsRunning] = useState(true);
  const [selectedSatellites, setSelectedSatellites] = useState(satellites.slice(0, 4));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-full flex flex-col gap-6 p-6"
    >
      {/* Top Control Bar */}
      <Card className="glass-panel border-neon-cyan/30 p-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="text-sm text-muted-foreground mb-2 block">Animation Speed (x)</label>
            <Slider
              value={[speed]}
              onValueChange={(v) => setSpeed(v[0])}
              min={0.5}
              max={5}
              step={0.5}
              className="w-full"
            />
            <span className="text-sm text-primary mt-1 block">{speed}x</span>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => setIsRunning(!isRunning)}
              className="bg-primary glow-cyan"
            >
              <Play className="w-4 h-4 mr-2" />
              {isRunning ? "Stop" : "Start"} Animation
            </Button>
            <Button
              onClick={() => {
                setIsRunning(false);
                setSpeed(1);
              }}
              variant="outline"
              className="border-neon-purple"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset View
            </Button>
          </div>
        </div>
      </Card>

      <div className="flex-1 flex flex-col lg:flex-row gap-6">
        {/* Stats Panel */}
        <Card className="glass-panel border-neon-green/30 p-6 w-full lg:w-64 space-y-4">
          <h3 className="text-xl font-bold text-foreground glow-green">Statistics</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Active Satellites:</span>
              <span className="text-primary font-mono font-bold">{selectedSatellites.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Orbits:</span>
              <span className="text-primary font-mono font-bold">{selectedSatellites.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Simulation Speed:</span>
              <span className="text-primary font-mono font-bold">{speed}x</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status:</span>
              <span className={`font-mono font-bold ${isRunning ? 'text-green-400' : 'text-orange-400'}`}>
                {isRunning ? 'Running' : 'Paused'}
              </span>
            </div>
          </div>

          <div className="pt-4 border-t border-neon-cyan/20">
            <h4 className="text-sm font-semibold text-foreground mb-3">Active Satellites</h4>
            <div className="space-y-2">
              {selectedSatellites.map((sat, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: sat.color }} />
                  <span className="text-xs text-muted-foreground">{sat.name}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* 3D Visualization */}
        <div className="flex-1 min-h-[500px] rounded-xl overflow-hidden border border-neon-cyan/20 relative">
          <div className="absolute inset-0 bg-gradient-to-br from-space-dark via-primary/5 to-secondary/5" />
          <Canvas camera={{ position: [10, 10, 10], fov: 50 }}>
            <ambientLight intensity={0.2} />
            <pointLight position={[10, 10, 10]} intensity={1} />
            <Earth />
            {selectedSatellites.map((sat, idx) => (
              <SatelliteOrbit
                key={idx}
                radius={sat.radius}
                color={sat.color}
                name={sat.name}
                speed={speed}
                isRunning={isRunning}
              />
            ))}
            <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
            <OrbitControls enablePan={false} minDistance={8} maxDistance={25} />
          </Canvas>
        </div>
      </div>
    </motion.div>
  );
};

export default SatelliteTracking;
