import { useEffect, useRef } from 'react';

export default function LoginSpaceBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let running = true;

    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Stars
    const stars: Array<{
      x: number;
      y: number;
      size: number;
      speed: number;
      opacity: number;
      twinkleSpeed: number;
      twinkleOffset: number;
    }> = [];

    for (let i = 0; i < 120; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2 + 0.5,
        speed: Math.random() * 0.3 + 0.1,
        opacity: Math.random() * 0.8 + 0.2,
        twinkleSpeed: Math.random() * 0.02 + 0.01,
        twinkleOffset: Math.random() * Math.PI * 2
      });
    }

    // Satellites
    const satellites: Array<{
      orbitRadius: number;
      orbitSpeed: number;
      angle: number;
      size: number;
      tilt: number;
    }> = [];

    for (let i = 0; i < 3; i++) {
      satellites.push({
        orbitRadius: 80 + i * 60,
        orbitSpeed: (0.002 + i * 0.001) * (Math.random() > 0.5 ? 1 : -1),
        angle: Math.random() * Math.PI * 2,
        size: 8 + Math.random() * 4,
        tilt: Math.random() * Math.PI * 0.4 - Math.PI * 0.2
      });
    }

    // Planets/moons
    const celestialBodies: Array<{
      x: number;
      y: number;
      radius: number;
      color: string;
      speed: number;
      orbitRadius: number;
      angle: number;
    }> = [];

    celestialBodies.push({
      x: canvas.width * 0.8,
      y: canvas.height * 0.3,
      radius: 40,
      color: '#4a5568',
      speed: 0.0005,
      orbitRadius: 30,
      angle: 0
    });

    celestialBodies.push({
      x: canvas.width * 0.2,
      y: canvas.height * 0.7,
      radius: 25,
      color: '#2d3748',
      speed: 0.0008,
      orbitRadius: 20,
      angle: Math.PI
    });

    let frame = 0;

    const animate = () => {
      if (!running) return;

      frame++;

      // Dark space gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, 'rgba(5, 8, 14, 0.98)');
      gradient.addColorStop(0.5, 'rgba(10, 15, 25, 0.98)');
      gradient.addColorStop(1, 'rgba(15, 20, 35, 0.98)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw stars with twinkling
      stars.forEach((star) => {
        star.y += star.speed;
        if (star.y > canvas.height) {
          star.y = 0;
          star.x = Math.random() * canvas.width;
        }

        const twinkle = Math.sin(frame * star.twinkleSpeed + star.twinkleOffset) * 0.3 + 0.7;
        const opacity = star.opacity * twinkle;

        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200, 220, 255, ${opacity})`;
        ctx.fill();

        // Add star glow
        if (star.size > 1.5) {
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.size * 2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(100, 150, 255, ${opacity * 0.2})`;
          ctx.fill();
        }
      });

      // Draw celestial bodies (planets/moons)
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      celestialBodies.forEach((body) => {
        body.angle += body.speed;
        const offsetX = Math.cos(body.angle) * body.orbitRadius;
        const offsetY = Math.sin(body.angle) * body.orbitRadius;

        // Planet shadow/depth
        const gradient = ctx.createRadialGradient(
          body.x + offsetX - body.radius * 0.3,
          body.y + offsetY - body.radius * 0.3,
          body.radius * 0.1,
          body.x + offsetX,
          body.y + offsetY,
          body.radius
        );
        gradient.addColorStop(0, body.color);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.8)');

        ctx.beginPath();
        ctx.arc(body.x + offsetX, body.y + offsetY, body.radius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Subtle glow
        ctx.beginPath();
        ctx.arc(body.x + offsetX, body.y + offsetY, body.radius + 3, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(100, 120, 160, 0.3)`;
        ctx.lineWidth = 2;
        ctx.stroke();
      });

      // Draw satellites and orbits
      satellites.forEach((sat) => {
        sat.angle += sat.orbitSpeed;

        // Draw orbit path
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(sat.tilt);
        ctx.beginPath();
        ctx.ellipse(0, 0, sat.orbitRadius, sat.orbitRadius * 0.5, 0, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0, 234, 255, 0.15)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();

        // Calculate satellite position
        const satX = centerX + Math.cos(sat.angle) * sat.orbitRadius * Math.cos(sat.tilt);
        const satY = centerY + Math.sin(sat.angle) * sat.orbitRadius * 0.5;

        // Draw satellite body
        ctx.save();
        ctx.translate(satX, satY);
        ctx.rotate(sat.angle);

        // Main body
        ctx.fillStyle = '#00eaff';
        ctx.fillRect(-sat.size * 0.4, -sat.size * 0.15, sat.size * 0.8, sat.size * 0.3);

        // Solar panels
        ctx.fillStyle = 'rgba(0, 200, 255, 0.7)';
        ctx.fillRect(-sat.size * 1.2, -sat.size * 0.08, sat.size * 0.5, sat.size * 0.16);
        ctx.fillRect(sat.size * 0.7, -sat.size * 0.08, sat.size * 0.5, sat.size * 0.16);

        // Antenna
        ctx.strokeStyle = '#00eaff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -sat.size * 0.4);
        ctx.stroke();

        // Antenna tip
        ctx.beginPath();
        ctx.arc(0, -sat.size * 0.4, 2, 0, Math.PI * 2);
        ctx.fillStyle = '#b8ff39';
        ctx.fill();

        // Satellite glow
        ctx.shadowBlur = 15;
        ctx.shadowColor = 'rgba(0, 234, 255, 0.6)';
        ctx.fillStyle = 'rgba(0, 234, 255, 0.2)';
        ctx.fillRect(-sat.size * 0.5, -sat.size * 0.2, sat.size, sat.size * 0.4);
        ctx.shadowBlur = 0;

        ctx.restore();
      });

      // Shooting stars occasionally
      if (Math.random() < 0.005) {
        const startX = Math.random() * canvas.width;
        const startY = Math.random() * canvas.height * 0.5;
        const length = 50 + Math.random() * 80;
        const angle = Math.PI * 0.25 + Math.random() * Math.PI * 0.1;

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(startX + Math.cos(angle) * length, startY + Math.sin(angle) * length);
        const gradient = ctx.createLinearGradient(
          startX,
          startY,
          startX + Math.cos(angle) * length,
          startY + Math.sin(angle) * length
        );
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      running = false;
      if (animationId) cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0
      }}
    />
  );
}
