import { useEffect, useRef, useState } from "react";

interface Props {
  label: string;
  onAttempt?: () => void;
}

export default function RunawayButton({ label, onAttempt }: Props) {
  const ref = useRef<HTMLButtonElement | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const attempts = useRef(0);

  function teleport() {
    const margin = 16;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const btnW = ref.current?.offsetWidth ?? 80;
    const btnH = ref.current?.offsetHeight ?? 44;
    const x = Math.random() * (w - btnW - margin * 2) + margin;
    const y = Math.random() * (h - btnH - margin * 2) + margin;
    setPos({ x, y });
    attempts.current += 1;
    onAttempt?.();
  }

  useEffect(() => {
    function onMove(e: MouseEvent) {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.hypot(dx, dy);
      if (dist < 120) {
        teleport();
      }
    }
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <button
      ref={ref}
      type="button"
      onTouchStart={(e) => {
        e.preventDefault();
        teleport();
      }}
      onFocus={teleport}
      onClick={(e) => {
        e.preventDefault();
        teleport();
      }}
      style={
        pos
          ? {
              position: "fixed",
              left: pos.x,
              top: pos.y,
              transition: "left 200ms ease, top 200ms ease",
            }
          : undefined
      }
      className="btn-secondary"
    >
      {label}
    </button>
  );
}
