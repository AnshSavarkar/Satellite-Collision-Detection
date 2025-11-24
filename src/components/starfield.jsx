// starfield.js - animated starfield for login page
export function startStarfield(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  let w = window.innerWidth, h = window.innerHeight;
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  const STAR_COUNT = 180;
  const stars = Array.from({ length: STAR_COUNT }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    z: Math.random() * w,
    o: 0.2 + Math.random() * 0.8
  }));
  function draw() {
    ctx.clearRect(0, 0, w, h);
    for (let s of stars) {
      let k = 128.0 / s.z;
      let px = (s.x - w / 2) * k + w / 2;
      let py = (s.y - h / 2) * k + h / 2;
      let size = Math.max(1.2, 2.5 * (1 - s.z / w));
      ctx.beginPath();
      ctx.arc(px, py, size, 0, 2 * Math.PI);
      ctx.fillStyle = `rgba(255,255,255,${s.o})`;
      ctx.shadowColor = '#fff';
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;
      s.z -= 2.2 + 2.5 * Math.random();
      if (s.z < 1) {
        s.x = Math.random() * w;
        s.y = Math.random() * h;
        s.z = w;
        s.o = 0.2 + Math.random() * 0.8;
      }
    }
    requestAnimationFrame(draw);
  }
  draw();
  window.addEventListener('resize', () => {
    w = window.innerWidth; h = window.innerHeight;
    canvas.width = w; canvas.height = h;
  });
}
