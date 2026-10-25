import React, { useEffect, useRef } from 'react';
import { RealSmartDevice } from '../types/smartHome';
import { useRealHome } from '../context/RealHomeContext';

interface AnimatedPowerFlowCardProps {
  devices: RealSmartDevice[];
}

export const AnimatedPowerFlowCard: React.FC<AnimatedPowerFlowCardProps> = ({ devices }) => {
  const {
    totalLiveWatts,
    hvacAndLaundryWatts,
    lightingAndMediaWatts,
    activeDrawingDevicesCount,
    aiEnergyMode,
    setAiEnergyMode,
  } = useRealHome();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hour = new Date().getHours();
  const isPeak = hour >= 18 && hour <= 22;
  const rateInr = isPeak ? 8.5 : 5.8;
  const costPerHourInr = (totalLiveWatts / 1000.0) * rateInr;
  const onlineCount = devices.filter((d) => d.isOnline).length;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId: number;
    const start = performance.now();

    const draw = (now: number) => {
      const progress = ((now - start) / 2500) % 1.0;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const topNode: [number, number] = [w * 0.5, 26];
      const centerNode: [number, number] = [w * 0.5, h * 0.52];
      const leftNode: [number, number] = [w * 0.22, h - 26];
      const rightNode: [number, number] = [w * 0.78, h - 26];

      const isFlowing = totalLiveWatts > 0;

      // Top -> Center Line
      ctx.strokeStyle = isFlowing ? 'rgba(48, 209, 88, 0.45)' : 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(topNode[0], topNode[1]);
      ctx.lineTo(centerNode[0], centerNode[1]);
      ctx.stroke();

      // Center -> Left Curve
      ctx.strokeStyle = hvacAndLaundryWatts > 0 ? 'rgba(0, 212, 255, 0.45)' : 'rgba(255,255,255,0.12)';
      ctx.beginPath();
      ctx.moveTo(centerNode[0], centerNode[1]);
      ctx.quadraticCurveTo(centerNode[0] - 50, centerNode[1] + 20, leftNode[0], leftNode[1]);
      ctx.stroke();

      // Center -> Right Curve
      ctx.strokeStyle = lightingAndMediaWatts > 0 ? 'rgba(191, 90, 242, 0.45)' : 'rgba(255,255,255,0.12)';
      ctx.beginPath();
      ctx.moveTo(centerNode[0], centerNode[1]);
      ctx.quadraticCurveTo(centerNode[0] + 50, centerNode[1] + 20, rightNode[0], rightNode[1]);
      ctx.stroke();

      // Animated particles
      if (isFlowing) {
        for (let i = 0; i < 3; i++) {
          const t = (progress + i / 3) % 1;
          const py = topNode[1] + (centerNode[1] - topNode[1]) * t;
          ctx.fillStyle = '#30D158';
          ctx.beginPath();
          ctx.arc(topNode[0], py, 3.2, 0, Math.PI * 2);
          ctx.fill();
        }
        if (hvacAndLaundryWatts > 0) {
          for (let i = 0; i < 3; i++) {
            const t = (progress + i / 3) % 1;
            const px = centerNode[0] + (leftNode[0] - centerNode[0]) * t;
            const py = centerNode[1] + (leftNode[1] - centerNode[1]) * t;
            ctx.fillStyle = '#00D4FF';
            ctx.beginPath();
            ctx.arc(px, py, 3, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        if (lightingAndMediaWatts > 0) {
          for (let i = 0; i < 3; i++) {
            const t = (progress + i / 3) % 1;
            const px = centerNode[0] + (rightNode[0] - centerNode[0]) * t;
            const py = centerNode[1] + (rightNode[1] - centerNode[1]) * t;
            ctx.fillStyle = '#BF5AF2';
            ctx.beginPath();
            ctx.arc(px, py, 3, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      const drawNode = (pt: [number, number], color: string, label: string, sub: string) => {
        ctx.fillStyle = '#0B1220';
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(pt[0], pt[1], 13, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(pt[0], pt[1], 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 10px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${label}: ${sub}`, pt[0], pt[1] < 40 ? pt[1] + 25 : pt[1] - 18);
      };

      drawNode(topNode, '#30D158', 'MAIN GRID', `${Math.round(totalLiveWatts)}W`);
      drawNode(centerNode, '#0A84FF', 'SMART BUS', `${onlineCount}/${devices.length}`);
      drawNode(leftNode, '#00D4FF', 'HVAC & LAUNDRY', `${Math.round(hvacAndLaundryWatts)}W`);
      drawNode(rightNode, '#BF5AF2', 'LIGHTS & MEDIA', `${Math.round(lightingAndMediaWatts)}W`);

      rafId = requestAnimationFrame(draw);
    };

    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, [devices.length, hvacAndLaundryWatts, lightingAndMediaWatts, onlineCount, totalLiveWatts]);

  return (
    <div className="glass-panel rounded-3xl p-5 border border-[#30D158]/30">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs font-bold tracking-wider text-[#30D158]">
            Live Power Topology
          </div>
          <div className="mt-1 text-2xl font-extrabold font-mono tabular-nums text-white">
            {Math.round(totalLiveWatts)} W · ₹{costPerHourInr.toFixed(2)}/hr
          </div>
        </div>
        <button
          type="button"
          onClick={() => setAiEnergyMode(!aiEnergyMode)}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors border whitespace-nowrap ${
            aiEnergyMode
              ? 'bg-[#30D158]/20 border-[#30D158] text-[#30D158]'
              : 'bg-white/5 border-white/15 text-white/70'
          }`}
        >
          AI Energy Mode (-15%): {aiEnergyMode ? 'Active' : 'Off'}
        </button>
      </div>

      {/* Metrics Row */}
      <div className="mt-4 grid grid-cols-3 gap-3 rounded-2xl bg-white/5 p-3 border border-white/10 text-center">
        <div>
          <div className="text-[11px] font-medium text-white/55">Grid Draw</div>
          <div className="text-sm font-bold font-mono tabular-nums text-[#30D158]">
            {totalLiveWatts.toFixed(1)} W
          </div>
        </div>
        <div className="border-x border-white/10">
          <div className="text-[11px] font-medium text-white/55">24h Projection</div>
          <div className="text-sm font-bold font-mono tabular-nums text-[#00D4FF]">
            {((totalLiveWatts * 24) / 1000).toFixed(2)} kWh
          </div>
        </div>
        <div>
          <div className="text-[11px] font-medium text-white/55">Utility Tariff</div>
          <div className="text-sm font-bold font-mono tabular-nums text-[#FF9F0A]">
            ₹{rateInr.toFixed(2)}/kWh
          </div>
        </div>
      </div>

      {/* Topology Canvas */}
      <div className="mt-4 flex justify-center">
        <canvas ref={canvasRef} width={520} height={150} className="w-full max-w-[520px] h-[150px]" />
      </div>

      {/* Per-Appliance Telemetry Table */}
      <div className="mt-3 flex items-center justify-between text-xs text-white/60 mb-2">
        <span>Appliance Power Telemetry</span>
        <span className="font-mono tabular-nums text-[#30D158]">
          {activeDrawingDevicesCount} active drawing
        </span>
      </div>
      <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
        {devices.map((dev) => {
          const kwh24 = ((dev.liveWatts * 24) / 1000).toFixed(2);
          return (
            <div
              key={dev.id}
              className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] text-xs"
            >
              <div className="min-w-0 pr-3">
                <div className="font-semibold text-white truncate">{dev.name}</div>
                <div className="text-[11px] text-white/55 truncate">
                  {dev.room} · {dev.liveAttributes.powerSource || 'Calibrated Telemetry'}
                </div>
              </div>
              <div className="text-right shrink-0 font-mono tabular-nums">
                <div className="font-bold text-white">{dev.liveWatts.toFixed(1)} W</div>
                <div className="text-[10px] text-white/50">{kwh24} kWh/d</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
