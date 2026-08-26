import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  size: number;
  color: string;
  shape: "heart" | "square";
  life: number;
}

const colors = ["#ff2e76", "#ff5d92", "#ff8db1", "#ffc1d5", "#ffd700", "#9b59b6"];

export default function Confetti({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particles = useRef<Particle[]>([]);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    function resize() {
      canvas!.width = window.innerWidth * dpr;
      canvas!.height = window.innerHeight * dpr;
      canvas!.style.width = `${window.innerWidth}px`;
      canvas!.style.height = `${window.innerHeight}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    function spawn() {
      for (let i = 0; i < 80; i++) {
        particles.current.push({
          x: window.innerWidth / 2,
          y: window.innerHeight / 2,
          vx: (Math.random() - 0.5) * 12,
          vy: (Math.random() - 0.8) * 14,
          rot: Math.random() * Math.PI * 2,
          vr: (Math.random() - 0.5) * 0.3,
          size: 6 + Math.random() * 8,
          color: colors[Math.floor(Math.random() * colors.length)],
          shape: Math.random() > 0.4 ? "heart" : "square",
          life: 0,
        });
      }
    }

    function drawHeart(c: CanvasRenderingContext2D, x: number, y: number, s: number) {
      c.beginPath();
      c.moveTo(x, y + s * 0.3);
      c.bezierCurveTo(x, y - s * 0.3, x - s, y - s * 0.3, x - s, y + s * 0.2);
      c.bezierCurveTo(x - s, y + s * 0.7, x, y + s * 0.9, x, y + s * 1.1);
      c.bezierCurveTo(x, y + s * 0.9, x + s, y + s * 0.7, x + s, y + s * 0.2);
      c.bezierCurveTo(x + s, y - s * 0.3, x, y - s * 0.3, x, y + s * 0.3);
      c.closePath();
      c.fill();
    }

    function tick() {
      ctx!.clearRect(0, 0, window.innerWidth, window.innerHeight);
      const ps = particles.current;
      for (let i = ps.length - 1; i >= 0; i--) {
        const p = ps[i];
        p.vy += 0.35;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        p.life += 1;
        ctx!.save();
        ctx!.translate(p.x, p.y);
        ctx!.rotate(p.rot);
        ctx!.fillStyle = p.color;
        if (p.shape === "heart") drawHeart(ctx!, 0, -p.size / 2, p.size / 2);
        else ctx!.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx!.restore();
        if (p.y > window.innerHeight + 40 || p.life > 400) ps.splice(i, 1);
      }
      raf.current = requestAnimationFrame(tick);
    }

    if (active) {
      spawn();
      tick();
      const interval = setInterval(spawn, 800);
      setTimeout(() => clearInterval(interval), 3000);
    }

    return () => {
      window.removeEventListener("resize", resize);
      if (raf.current) cancelAnimationFrame(raf.current);
      particles.current = [];
    };
  }, [active]);

  if (!active) return null;
  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[100]"
      aria-hidden
    />
  );
}
