import React, { useEffect, useRef, useState } from 'react';

interface LiquidGlassSplashScreenProps {
  children: React.ReactNode;
}

export const LiquidGlassSplashScreen: React.FC<LiquidGlassSplashScreenProps> = ({ children }) => {
  const [completed, setCompleted] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') return true;
    }
    return false;
  });

  const [progress, setProgress] = useState<number>(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (completed) return;
    const duration = 2200;
    const start = performance.now();
    let rafId: number;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setProgress(t);
      if (t < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        setCompleted(true);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [completed]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || completed) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = 200;
    const h = 200;
    ctx.clearRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2 + 12;

    const blueprintT = Math.max(0, Math.min(1, (progress - 0.05) / 0.35));
    const extrudeT = Math.max(0, Math.min(1, (progress - 0.2) / 0.38));
    const roomGlowT = Math.max(0, Math.min(1, (progress - 0.35) / 0.32));

    // 1. Volumetric Halo
    if (roomGlowT > 0) {
      const grad = ctx.createRadialGradient(cx, cy, 8, cx, cy, 88);
      grad.addColorStop(0, `rgba(255, 159, 10, ${0.42 * roomGlowT})`);
      grad.addColorStop(0.55, `rgba(0, 212, 255, ${0.22 * roomGlowT})`);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, 88, 0, Math.PI * 2);
      ctx.fill();
    }

    // Isometric projection helper
    const yaw = -0.7854 + Math.sin(progress * 0.4) * 0.1;
    const iso = (x: number, y: number, z: number): [number, number] => {
      const rx = x * Math.cos(yaw) - y * Math.sin(yaw);
      const ry = x * Math.sin(yaw) + y * Math.cos(yaw);
      return [cx + rx * 0.866, cy + ry * 0.5 - z];
    };

    const r = 46 * blueprintT;
    const wallH = 40 * extrudeT;

    const pFront = iso(r, r, 0);
    const pRight = iso(r, -r, 0);
    const pBack = iso(-r, -r, 0);
    const pLeft = iso(-r, r, 0);

    const tFront = iso(r, r, wallH);
    const tRight = iso(r, -r, wallH);
    const tBack = iso(-r, -r, wallH);
    const tLeft = iso(-r, r, wallH);

    // Floor Slab
    ctx.beginPath();
    ctx.moveTo(pFront[0], pFront[1]);
    ctx.lineTo(pRight[0], pRight[1]);
    ctx.lineTo(pBack[0], pBack[1]);
    ctx.lineTo(pLeft[0], pLeft[1]);
    ctx.closePath();
    ctx.fillStyle = `rgba(255, 179, 64, ${0.2 + 0.45 * roomGlowT})`;
    ctx.fill();

    // Left Wall (Warm Amber)
    if (extrudeT > 0.02) {
      ctx.beginPath();
      ctx.moveTo(pLeft[0], pLeft[1]);
      ctx.lineTo(pFront[0], pFront[1]);
      ctx.lineTo(tFront[0], tFront[1]);
      ctx.lineTo(tLeft[0], tLeft[1]);
      ctx.closePath();
      ctx.fillStyle = `rgba(255, 159, 10, ${0.35 + 0.45 * roomGlowT})`;
      ctx.fill();

      // Right Wall (Cryo Cyan)
      ctx.beginPath();
      ctx.moveTo(pFront[0], pFront[1]);
      ctx.lineTo(pRight[0], pRight[1]);
      ctx.lineTo(tRight[0], tRight[1]);
      ctx.lineTo(tFront[0], tFront[1]);
      ctx.closePath();
      ctx.fillStyle = `rgba(0, 212, 255, ${0.3 + 0.4 * roomGlowT})`;
      ctx.fill();

      // Roof Prism
      ctx.beginPath();
      ctx.moveTo(tFront[0], tFront[1]);
      ctx.lineTo(tRight[0], tRight[1]);
      ctx.lineTo(tBack[0], tBack[1]);
      ctx.lineTo(tLeft[0], tLeft[1]);
      ctx.closePath();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.24)';
      ctx.fill();
    }

    // Wireframe Edges
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.9 * blueprintT})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(pFront[0], pFront[1]);
    ctx.lineTo(pRight[0], pRight[1]);
    ctx.lineTo(pBack[0], pBack[1]);
    ctx.lineTo(pLeft[0], pLeft[1]);
    ctx.closePath();
    ctx.stroke();

    if (extrudeT > 0.02) {
      ctx.beginPath();
      ctx.moveTo(tFront[0], tFront[1]);
      ctx.lineTo(tRight[0], tRight[1]);
      ctx.lineTo(tBack[0], tBack[1]);
      ctx.lineTo(tLeft[0], tLeft[1]);
      ctx.closePath();
      ctx.stroke();

      for (const [b, t] of [
        [pFront, tFront],
        [pRight, tRight],
        [pBack, tBack],
        [pLeft, tLeft],
      ]) {
        ctx.beginPath();
        ctx.moveTo(b[0], b[1]);
        ctx.lineTo(t[0], t[1]);
        ctx.stroke();
      }
    }
  }, [progress, completed]);

  if (completed) {
    return <>{children}</>;
  }

  const exitT = Math.max(0, Math.min(1, (progress - 0.8) / 0.2));
  const opacity = 1 - exitT;
  const scale = 1 + exitT * 1.4;

  return (
    <div className="relative min-h-screen w-full">
      {children}
      <div
        style={{ opacity, transform: `scale(${scale})` }}
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#070B14] transition-transform duration-75"
      >
        <div className="relative flex flex-col items-center">
          <div className="glass-panel rounded-[38px] p-4 shadow-2xl">
            <canvas ref={canvasRef} width={200} height={200} className="block" />
          </div>
          <h1 className="mt-7 text-2xl font-extrabold tracking-[0.22em] text-white">
            UNIFIED HOME
          </h1>
          <p className="mt-2 text-xs font-semibold tracking-[0.2em] text-[#00D4FF]">
            3D SPATIAL SMART CONTROLLER
          </p>
          <div className="mt-6 h-1.5 w-40 overflow-hidden rounded-full bg-white/10">
            <div
              style={{ width: `${Math.min(100, (progress / 0.85) * 100)}%` }}
              className="h-full rounded-full bg-gradient-to-r from-[#FF9F0A] to-[#00D4FF]"
            />
          </div>
          <button
            type="button"
            onClick={() => setCompleted(true)}
            className="mt-6 px-4 py-1.5 text-xs font-medium text-white/60 hover:text-white transition-colors"
          >
            Skip Intro
          </button>
        </div>
      </div>
    </div>
  );
};
