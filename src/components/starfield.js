// starfield.js - React hook for a continuous, dense, moving starfield effect
import { useRef, useEffect } from 'react';

export function useStarfield(canvasRef, options = {}) {
  const starCount = options.starCount || 350;
  const speed = options.speed || 1.3;
  const color = options.color || '#b8ff39';
  const sizeRange = options.sizeRange || [0.7, 2.2];
  const starsRef = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let width = window.innerWidth;
    let height = window.innerHeight;
    let ctx = canvas.getContext('2d');
    let running = true;
    let animationFrameId;

    function createStars() {
      const arr = [];
      for (let i = 0; i < starCount; i++) {
        arr.push({
          x: Math.random() * width,
          y: Math.random() * height,
          z: Math.random() * width,
          speed: speed + Math.random() * 1.5,
          size: sizeRange[0] + Math.random() * (sizeRange[1] - sizeRange[0]),
          alpha: 0.5 + Math.random() * 0.5,
        });
      }
      return arr;
    }

    function resizeCanvas() {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      starsRef.current = createStars();
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    function updateStars() {
      for (let star of starsRef.current) {
        star.z -= star.speed;
        if (star.z < 1) {
          star.z = width;
          star.x = Math.random() * width;
          star.y = Math.random() * height;
          star.size = sizeRange[0] + Math.random() * (sizeRange[1] - sizeRange[0]);
          star.alpha = 0.5 + Math.random() * 0.5;
        }
      }
    }

    function drawStars() {
      ctx.save();
      ctx.clearRect(0, 0, width, height);
      for (let star of starsRef.current) {
        const sx = (star.x - width / 2) * (width / (star.z + 1)) * 0.002 + width / 2;
        const sy = (star.y - height / 2) * (width / (star.z + 1)) * 0.002 + height / 2;
        const size = star.size * (width / (star.z + 1)) * 0.008 + 0.5;
        ctx.globalAlpha = star.alpha;
        ctx.beginPath();
        ctx.arc(sx, sy, size, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 8;
        ctx.fill();
      }
      ctx.restore();
    }

    function animate() {
      if (!running) return;
      updateStars();
      drawStars();
      animationFrameId = requestAnimationFrame(animate);
    }
    animate();

    return () => {
      running = false;
      window.removeEventListener('resize', resizeCanvas);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [canvasRef, starCount, speed, color, sizeRange]);
}
