import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Sphere, Stars } from "@react-three/drei";
import * as THREE from "three";

interface Earth3DProps {
  rotationSpeed?: number;
  showStars?: boolean;
  radius?: number;
}

const Earth3D = ({
  rotationSpeed = 0.001,
  showStars = true,
  radius = 2.5,
}: Earth3DProps) => {
  const earthRef = useRef<THREE.Mesh>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);

  // Create a light aqua-green Earth texture dynamically
  const earthTexture = useMemo(() => {
    if (typeof document === "undefined") return null;

    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext("2d")!;

    // Light ocean color
    ctx.fillStyle = "#3ca9f4"; // soft bright aqua blue
    ctx.fillRect(0, 0, 1024, 512);

    // Light green landmasses
    ctx.fillStyle = "#88d26f"; // bright pastel green
    const blob = (x: number, y: number, rx: number, ry: number, rot = 0) => {
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
      ctx.fill();
    };
    blob(150, 180, 80, 100, 0.3); // North America
    blob(200, 320, 50, 80, 0.2);  // South America
    blob(480, 150, 60, 40);       // Europe
    blob(520, 280, 70, 90);       // Africa
    blob(700, 180, 120, 90);      // Asia
    blob(800, 360, 50, 40);       // Australia

    // White polar caps
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 1024, 40);
    ctx.fillRect(0, 472, 1024, 40);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.needsUpdate = true;
    return texture;
  }, []);

  useFrame(() => {
    if (earthRef.current) earthRef.current.rotation.y += rotationSpeed;
    if (cloudsRef.current) cloudsRef.current.rotation.y += rotationSpeed * 1.05;
  });

  const seg = 64;
  const cloudsR = radius * 1.008;
  const atmosR = radius * 1.08;

  return (
    <>
      {/* Earth Sphere */}
      <Sphere ref={earthRef} args={[radius, seg, seg]}>
        <meshStandardMaterial
          map={earthTexture ?? undefined}
          roughness={0.45}
          metalness={0.25}
          emissive="#3ca9f4"
          emissiveIntensity={0.2}
        />
      </Sphere>

      {/* Light Clouds */}
      <Sphere ref={cloudsRef} args={[cloudsR, seg, seg]}>
        <meshStandardMaterial
          transparent
          opacity={0.18}
          color="#f8fcff"
          depthWrite={false}
        />
      </Sphere>

      {/* Soft Atmosphere Glow */}
      <Sphere args={[atmosR, seg, seg]}>
        <meshBasicMaterial
          color="#a5e3ff"
          transparent
          opacity={0.2}
          side={THREE.BackSide}
        />
      </Sphere>

      {/* Stars */}
      {showStars && (
        <Stars
          radius={100}
          depth={50}
          count={6000}
          factor={4}
          saturation={0}
          fade
          speed={1}
        />
      )}
    </>
  );
};

export default Earth3D;
