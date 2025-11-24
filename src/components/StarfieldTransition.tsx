import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

export default function StarfieldTransition() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const speedRef = useRef(0);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const stars: Array<{
      x: number;
      y: number;
      z: number;
      size: number;
    }> = [];

    // Create stars
    for (let i = 0; i < 250; i++) {
      stars.push({
        x: (Math.random() - 0.5) * canvas.width * 2,
        y: (Math.random() - 0.5) * canvas.height * 2,
        z: Math.random() * 1000,
        size: Math.random() * 2.5
      });
    }

    let running = true;
    speedRef.current = 2; // Start with initial speed

    const animate = () => {
      if (!running) return;

      // Clear with fade trail
      ctx.fillStyle = "rgba(5, 8, 14, 0.15)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Accelerate
      speedRef.current = Math.min(speedRef.current + 0.8, 45);

      stars.forEach((star) => {
        // Move star toward camera
        star.z -= speedRef.current;

        // Reset star if it goes behind camera
        if (star.z <= 1) {
          star.z = 1000;
          star.x = (Math.random() - 0.5) * canvas.width * 2;
          star.y = (Math.random() - 0.5) * canvas.height * 2;
        }

        // 3D projection
        const scale = 200 / star.z;
        const px = star.x * scale + canvas.width / 2;
        const py = star.y * scale + canvas.height / 2;

        // Only draw if on screen
        if (px >= -50 && px <= canvas.width + 50 && py >= -50 && py <= canvas.height + 50) {
          const size = (1 - star.z / 1000) * star.size * 4;
          const opacity = Math.min(1 - star.z / 1000, 0.9);

          // Draw star
          ctx.beginPath();
          ctx.arc(px, py, Math.max(size, 0.5), 0, Math.PI * 2);
          ctx.fillStyle = `rgba(0, 234, 255, ${opacity})`;
          ctx.fill();

          // Draw motion trail when moving fast
          if (speedRef.current > 10) {
            const prevZ = star.z + speedRef.current;
            const prevScale = 200 / prevZ;
            const prevX = star.x * prevScale + canvas.width / 2;
            const prevY = star.y * prevScale + canvas.height / 2;

            ctx.beginPath();
            ctx.moveTo(prevX, prevY);
            ctx.lineTo(px, py);
            ctx.strokeStyle = `rgba(0, 234, 255, ${opacity * 0.4})`;
            ctx.lineWidth = size * 0.5;
            ctx.stroke();
          }
        }
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    // Start immediately
    setIsReady(true);
    animationRef.current = requestAnimationFrame(animate);

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", handleResize);

    return () => {
      running = false;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <motion.canvas
      ref={canvasRef}
      initial={{ opacity: 1 }}
      animate={{ opacity: isReady ? [1, 1, 0.7, 0] : 1 }}
      transition={{ 
        duration: 2.2,
        times: [0, 0.3, 0.7, 1],
        ease: "easeOut"
      }}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 9999,
        pointerEvents: "none",
        background: "transparent"
      }}
    />
  );
}
