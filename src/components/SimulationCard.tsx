import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SimulationCardProps {
  id: string;
  title: string;
  description: string;
  image: string;
  onRun: (simType: string) => void;
  onDownload: (simType: string) => void;
  reverse?: boolean; // place image on right, Run on left
  enablePreview?: boolean; // show animated preview overlay on image
}

const SimulationCard = ({ id, title, description, image, onRun, onDownload, reverse = false, enablePreview = true }: SimulationCardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animRef = useRef<number | null>(null);
  const stateRef = useRef<any>({ t: Math.random() * Math.PI * 2, debris: [] as Array<{x:number,y:number,vx:number,vy:number,life:number}> });

  useEffect(() => {
    if (!enablePreview) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement as HTMLElement | null;
    if (!parent) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    function resize() {
      const rect = parent.getBoundingClientRect();
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    }
    resize();
    let resizeObs: ResizeObserver | null = null;
    if ('ResizeObserver' in window) {
      resizeObs = new ResizeObserver(resize);
      resizeObs.observe(parent);
    } else {
      window.addEventListener('resize', resize);
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const drawOrbit = (w: number, h: number) => {
      const cx = w * 0.5, cy = h * 0.55;
      const a = Math.min(w, h) * 0.35;
      const b = a * 0.6;
      const tilt = Math.PI / 8;
      const t = stateRef.current.t;
      ctx.save();
      ctx.clearRect(0,0,w,h);
      // planet
      const r = Math.min(w,h) * 0.08;
      const grad = ctx.createRadialGradient(cx - r*0.3, cy - r*0.3, r*0.3, cx, cy, r);
      grad.addColorStop(0, 'rgba(0,234,255,0.9)');
      grad.addColorStop(1, 'rgba(0,0,0,0.1)');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.fill();
      // orbit path
      ctx.strokeStyle = 'rgba(0,234,255,0.55)';
      ctx.lineWidth = 2; ctx.beginPath();
      for (let ang = 0; ang <= Math.PI*2+0.01; ang += 0.03) {
        const ox = cx + a*Math.cos(ang)*Math.cos(tilt) - b*Math.sin(ang)*Math.sin(tilt);
        const oy = cy + a*Math.cos(ang)*Math.sin(tilt) + b*Math.sin(ang)*Math.cos(tilt);
        if (ang === 0) ctx.moveTo(ox, oy); else ctx.lineTo(ox, oy);
      }
      ctx.stroke();
      // satellite
      const sx = cx + a*Math.cos(t)*Math.cos(tilt) - b*Math.sin(t)*Math.sin(tilt);
      const sy = cy + a*Math.cos(t)*Math.sin(tilt) + b*Math.sin(t)*Math.cos(tilt);
      ctx.fillStyle = '#b8ff39';
      ctx.beginPath(); ctx.arc(sx, sy, Math.max(2, r*0.25), 0, Math.PI*2); ctx.fill();
      ctx.restore();
      stateRef.current.t += 0.02;
    };

    const drawTracking = (w: number, h: number) => {
      ctx.clearRect(0,0,w,h);
      const cx = w*0.5, cy = h*0.5;
      const rings = 3;
      for (let i=1;i<=rings;i++){
        const rad = Math.min(w,h) * (0.15 + i*0.1);
        ctx.strokeStyle = 'rgba(0,234,255,' + (0.15 + i*0.08) + ')';
        ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI*2); ctx.stroke();
      }
      // satellites
      for (let i=0;i<5;i++){
        const speed = 0.01 + i*0.004;
        const r = Math.min(w,h) * (0.18 + i*0.06);
        const angle = stateRef.current.t * (1+i*0.2) + i;
        const x = cx + r*Math.cos(angle);
        const y = cy + r*Math.sin(angle*1.1);
        ctx.fillStyle = 'rgba(184,255,57,0.9)';
        ctx.beginPath(); ctx.arc(x,y,2.5,0,Math.PI*2); ctx.fill();
        stateRef.current.t += speed*0.002; // slow incremental drift
      }
      stateRef.current.t += 0.012;
    };

    const drawCollisions = (w: number, h: number) => {
      const st = stateRef.current;
      if (st.lastSpawn === undefined) {
        st.lastSpawn = performance.now();
        st.debris = [];
        st.flash = 0;
      }
      const now = performance.now();
      // spawn an explosion every ~2.4s
      if (now - st.lastSpawn > 2400) {
        const cx = w * 0.5;
        const cy = h * 0.5;
        st.debris = Array.from({ length: 26 }, (_, i) => {
          const a = (Math.PI * 2) * (i / 26) + Math.random() * 0.3;
          const speed = 1.6 + Math.random() * 2.4;
          return { x: cx, y: cy, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, life: 1 };
        });
        st.flash = 1.0;
        st.lastSpawn = now;
      }

      ctx.clearRect(0, 0, w, h);
      // draw debris
      st.debris.forEach((p: any) => {
        p.x += p.vx; p.y += p.vy; p.vx *= 0.995; p.vy *= 0.995; // slight damping
        p.vy += 0.01; // small drift
        p.life *= 0.983;
        ctx.fillStyle = `rgba(255,255,255,${Math.max(0, p.life)})`;
        ctx.fillRect(p.x, p.y, 3, 3);
      });

      // explosion flash overlay
      if (st.flash && st.flash > 0.02) {
        // center from average of debris (or center if none)
        let cx = w * 0.5, cy = h * 0.5;
        if (st.debris.length) {
          const sum = st.debris.reduce((acc: any, p: any) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
          cx = sum.x / st.debris.length; cy = sum.y / st.debris.length;
        }
        const rad = 50 * (2 - st.flash);
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
        g.addColorStop(0, `rgba(255,255,255,${0.45 * st.flash})`);
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2); ctx.fill();
        st.flash *= 0.88;
      }
    };

    function frame(){
      const rect = parent.getBoundingClientRect();
      const w = rect.width, h = rect.height;
      // reset transform to account for scaling set earlier
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // pick drawing based on id
      if (id === 'orbit') drawOrbit(w,h);
      else if (id === 'tracking') drawTracking(w,h);
      else if (id === 'collisions') drawCollisions(w,h);
      else {
        ctx.clearRect(0,0,w,h);
      }
      animRef.current = requestAnimationFrame(frame);
    }
    frame();

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      if (resizeObs) resizeObs.disconnect(); else window.removeEventListener('resize', resize);
    };
  }, [id, enablePreview]);

  return (
    <Card
      className="glass-panel border-neon-cyan/20 hover:border-neon-cyan/40 transition-all duration-500 group hover:glow-soft"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`flex flex-col items-stretch md:flex-row ${reverse ? 'md:flex-row-reverse' : ''}`}>
        {/* Left: Image */}
        <div className={`relative md:w-2/5 overflow-hidden rounded-t-xl ${
          reverse ? 'md:rounded-r-xl md:rounded-tl-none' : 'md:rounded-l-xl md:rounded-tr-none'
        }`}>
          <img
            src={image}
            alt={title}
            className="w-full h-56 md:h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
          <div className={`absolute inset-0 bg-gradient-to-t from-space-dark/60 to-transparent ${
            reverse ? 'md:bg-gradient-to-l' : 'md:bg-gradient-to-r'
          } md:from-space-dark/40 md:to-transparent`} />
          {/* Hover glow */}
          <div
            className={`absolute inset-0 bg-primary/10 transition-opacity duration-300 ${
              isHovered ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <div className={`absolute inset-0 border border-primary/40 rounded-t-xl ${
              reverse ? 'md:rounded-r-xl md:rounded-tl-none' : 'md:rounded-l-xl md:rounded-tr-none'
            } animate-pulse-glow`} />
          </div>
          {enablePreview && (
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none z-[20]"
              aria-hidden
            />
          )}
        </div>

        {/* Right: Content + Actions */}
        <div className="flex-1 p-6 md:p-8 flex items-center">
          <div className={`flex w-full items-center gap-6 ${reverse ? 'md:flex-row-reverse' : ''}`}>
            {/* Text */}
            <div className="flex-1 space-y-3">
              <CardTitle className="text-xl md:text-2xl font-semibold text-foreground font-poppins">
                {title}
              </CardTitle>
              <p className="text-muted-foreground leading-relaxed">
                {description}
              </p>
              {/* Secondary action (optional) */}
              <div className="pt-1">
                <Button
                  variant="outline"
                  onClick={() => onDownload(id)}
                  className="border-neon-green text-accent hover:bg-accent/10 rounded-lg"
                >
                  Download
                </Button>
              </div>
            </div>

            {/* Primary Action pinned to the right */}
            <div className="shrink-0 flex items-center">
              <Button
                onClick={() => onRun(id)}
                className="bg-primary text-primary-foreground glow-cyan hover:glow-cyan rounded-lg px-6 py-5 md:py-6 text-base md:text-lg"
              >
                Run
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default SimulationCard;