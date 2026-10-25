import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Fixture3DNode,
  FloorMaterialType,
  House3DTwinLayout,
  RealSmartDevice,
} from '../types/smartHome';
import {
  FLOOR_MATERIAL_COLORS,
  HOUSE_CONTROL_AC_MODE_COLORS,
  tempToColor,
} from '../utils/smartHomeCore';
import { RotateCcw, Layers, Sun, Wind, Tv, WashingMachine, Camera, Power } from 'lucide-react';

interface IsometricHouse3DCanvasProps {
  layout: House3DTwinLayout;
  devices: RealSmartDevice[];
  selectedRoomId: string;
  height?: number;
  isInteractive?: boolean;
  showBadges?: boolean;
  onRoomSelected?: (roomId: string) => void;
  onFixtureTap?: (fixture: Fixture3DNode, device?: RealSmartDevice) => void;
  onFixtureInspect?: (fixture: Fixture3DNode, device?: RealSmartDevice) => void;
  onOpenBlueprintEditor?: () => void;
  cameraOverride?: { yaw?: number; pitch?: number; zoom?: number } | null;
}

export function projectIsoPoint(
  x: number,
  y: number,
  z: number,
  width: number,
  height: number,
  yaw: number,
  pitch: number,
  zoom: number,
  focus: [number, number],
): [number, number] {
  const scale = Math.min(width, height) * 0.94;
  const wallHeightScale = scale * 0.36;

  const cx = (x - focus[0]) * scale * zoom;
  const cy = (y - focus[1]) * scale * zoom;

  const rx = cx * Math.cos(yaw) - cy * Math.sin(yaw);
  const ry = cx * Math.sin(yaw) + cy * Math.cos(yaw);

  const cos30 = Math.cos(0.5236);
  const sin30 = Math.sin(0.5236);

  const screenX = width / 2 + (rx - ry) * cos30;
  const screenY = height / 2 + (rx + ry) * sin30 * pitch - z * wallHeightScale * zoom;
  return [screenX, screenY];
}

export const IsometricHouse3DCanvas: React.FC<IsometricHouse3DCanvasProps> = ({
  layout,
  devices,
  selectedRoomId,
  height = 380,
  isInteractive = true,
  showBadges = true,
  onRoomSelected,
  onFixtureTap,
  onFixtureInspect,
  onOpenBlueprintEditor,
  cameraOverride,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [yaw, setYaw] = useState<number>(-0.59);
  const [pitch, setPitch] = useState<number>(0.82);
  const [zoom, setZoom] = useState<number>(1.0);
  const [focus, setFocus] = useState<[number, number]>([0.5, 0.5]);
  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number }>({
    width: 800,
    height,
  });

  const dragRef = useRef<{ active: boolean; lastX: number; lastY: number }>({
    active: false,
    lastX: 0,
    lastY: 0,
  });

  // Update room focus when selectedRoomId changes
  useEffect(() => {
    const normRoom = selectedRoomId.toLowerCase();
    if (normRoom === 'all') {
      setZoom(1.0);
      setFocus([0.5, 0.5]);
    } else {
      const matched = layout.rooms.find(
        (r) =>
          r.id.toLowerCase() === normRoom ||
          r.name.toLowerCase().includes(normRoom),
      );
      if (matched) {
        setZoom(matched.cameraZoom || 1.65);
        setFocus(matched.cameraFocus || [0.5, 0.5]);
      } else {
        setZoom(1.0);
        setFocus([0.5, 0.5]);
      }
    }
  }, [selectedRoomId, layout.rooms]);

  // Apply external camera preset override
  useEffect(() => {
    if (cameraOverride) {
      if (cameraOverride.yaw !== undefined) setYaw(cameraOverride.yaw);
      if (cameraOverride.pitch !== undefined) setPitch(cameraOverride.pitch);
      if (cameraOverride.zoom !== undefined) setZoom(cameraOverride.zoom);
    }
  }, [cameraOverride]);

  // Resize observer
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setCanvasSize({ width: Math.round(rect.width), height: Math.round(rect.height) });
      }
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, [height]);

  const findBoundDevice = useCallback(
    (fix: Fixture3DNode): RealSmartDevice | undefined => {
      if (fix.linkedRealDeviceId) {
        const direct = devices.find((d) => d.id === fix.linkedRealDeviceId);
        if (direct) return direct;
      }
      return devices.find((d) => {
        const roomMatch = d.room.toLowerCase().includes(fix.roomId.toLowerCase());
        if (!roomMatch) return false;
        if (fix.fixtureType.includes('ac') && d.category === 'ac') return true;
        if (fix.fixtureType.includes('washer') && d.category === 'washer') return true;
        if (fix.fixtureType.includes('camera') && d.category === 'camera') return true;
        if (
          ['ceiling', 'pendant', 'strip', 'table', 'floor', 'spots', 'ceiling_light', 'table_lamp'].includes(
            fix.fixtureType,
          ) &&
          d.category === 'light'
        ) {
          return true;
        }
        return false;
      });
    },
    [devices],
  );

  // Main 3D Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId: number;
    const startTime = performance.now();

    const drawFrame = (now: number) => {
      const flowPhase = ((now - startTime) / 3000) % 1.0;
      const w = canvasSize.width;
      const h = canvasSize.height;

      ctx.clearRect(0, 0, w, h);

      const proj = (x: number, y: number, z: number) =>
        projectIsoPoint(x, y, z, w, h, yaw, pitch, zoom, focus);

      // 1. Plinth Base & Drop Shadow
      const p1 = proj(-0.02, -0.02, 0);
      const p2 = proj(1.02, -0.02, 0);
      const p3 = proj(1.02, 1.02, 0);
      const p4 = proj(-0.02, 1.02, 0);

      const b1 = proj(-0.02, -0.02, -0.06);
      const b2 = proj(1.02, -0.02, -0.06);
      const b3 = proj(1.02, 1.02, -0.06);
      const b4 = proj(-0.02, 1.02, -0.06);

      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.beginPath();
      ctx.moveTo(b1[0], b1[1] + 10);
      ctx.lineTo(b2[0], b2[1] + 10);
      ctx.lineTo(b3[0], b3[1] + 10);
      ctx.lineTo(b4[0], b4[1] + 10);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Plinth Front
      ctx.fillStyle = '#0F131D';
      ctx.beginPath();
      ctx.moveTo(p4[0], p4[1]);
      ctx.lineTo(p3[0], p3[1]);
      ctx.lineTo(b3[0], b3[1]);
      ctx.lineTo(b4[0], b4[1]);
      ctx.closePath();
      ctx.fill();

      // Plinth Right
      ctx.fillStyle = '#141927';
      ctx.beginPath();
      ctx.moveTo(p3[0], p3[1]);
      ctx.lineTo(p2[0], p2[1]);
      ctx.lineTo(b2[0], b2[1]);
      ctx.lineTo(b3[0], b3[1]);
      ctx.closePath();
      ctx.fill();

      // Plinth Top Slab
      ctx.fillStyle = '#1B2234';
      ctx.beginPath();
      ctx.moveTo(p1[0], p1[1]);
      ctx.lineTo(p2[0], p2[1]);
      ctx.lineTo(p3[0], p3[1]);
      ctx.lineTo(p4[0], p4[1]);
      ctx.closePath();
      ctx.fill();

      // 2. Room Floors & Procedural Planks / Tiles
      for (const room of layout.rooms) {
        const r = room.gridRect;
        const rp1 = proj(r.left, r.top, 0);
        const rp2 = proj(r.left + r.width, r.top, 0);
        const rp3 = proj(r.left + r.width, r.top + r.height, 0);
        const rp4 = proj(r.left, r.top + r.height, 0);

        const isRoomSelected =
          selectedRoomId.toLowerCase() !== 'all' &&
          (room.id.toLowerCase() === selectedRoomId.toLowerCase() ||
            room.name.toLowerCase().includes(selectedRoomId.toLowerCase()));

        const matInfo = FLOOR_MATERIAL_COLORS[room.floorType] || FLOOR_MATERIAL_COLORS[FloorMaterialType.oak];

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(rp1[0], rp1[1]);
        ctx.lineTo(rp2[0], rp2[1]);
        ctx.lineTo(rp3[0], rp3[1]);
        ctx.lineTo(rp4[0], rp4[1]);
        ctx.closePath();
        ctx.fillStyle = matInfo.color;
        ctx.fill();
        ctx.clip();

        // Procedural wood planks or ceramic tile grid
        ctx.strokeStyle = matInfo.grout;
        ctx.lineWidth = 1;
        if (room.floorType === FloorMaterialType.oak || room.floorType === FloorMaterialType.walnut) {
          const rows = 7;
          const stepY = r.height / rows;
          for (let i = 1; i < rows; i++) {
            const py = r.top + i * stepY;
            const s = proj(r.left, py, 0);
            const e = proj(r.left + r.width, py, 0);
            ctx.beginPath();
            ctx.moveTo(s[0], s[1]);
            ctx.lineTo(e[0], e[1]);
            ctx.stroke();
          }
        } else {
          const grid = 5;
          const stepX = r.width / grid;
          const stepY = r.height / grid;
          for (let i = 1; i < grid; i++) {
            const px = r.left + i * stepX;
            const s = proj(px, r.top, 0);
            const e = proj(px, r.top + r.height, 0);
            ctx.beginPath();
            ctx.moveTo(s[0], s[1]);
            ctx.lineTo(e[0], e[1]);
            ctx.stroke();
          }
          for (let j = 1; j < grid; j++) {
            const py = r.top + j * stepY;
            const s = proj(r.left, py, 0);
            const e = proj(r.left + r.width, py, 0);
            ctx.beginPath();
            ctx.moveTo(s[0], s[1]);
            ctx.lineTo(e[0], e[1]);
            ctx.stroke();
          }
        }
        ctx.restore();

        // Room Perimeter Outline
        ctx.strokeStyle = isRoomSelected ? '#0A84FF' : 'rgba(255, 255, 255, 0.18)';
        ctx.lineWidth = isRoomSelected ? 2.4 : 1.0;
        ctx.beginPath();
        ctx.moveTo(rp1[0], rp1[1]);
        ctx.lineTo(rp2[0], rp2[1]);
        ctx.lineTo(rp3[0], rp3[1]);
        ctx.lineTo(rp4[0], rp4[1]);
        ctx.closePath();
        ctx.stroke();
      }

      // 3. Volumetric Floor Light Pools & Cones
      for (const fix of layout.fixtures) {
        if (fix.fixtureType === 'wall_ac' || fix.fixtureType === 'washer' || fix.fixtureType === 'camera') {
          continue;
        }
        const dev = findBoundDevice(fix);
        const isOn = dev ? dev.isOn : true;
        if (!isOn) continue;

        const brightness = dev ? Math.max(0.25, Math.min(1.0, dev.primaryValue / 100.0)) : 0.85;
        const lightColor =
          dev?.liveAttributes?.colorHex ||
          fix.colorHex ||
          tempToColor(Number(dev?.liveAttributes?.temp ?? fix.kelvinTemp ?? 3000));

        const poolCenter = proj(fix.x, fix.y, 0);
        const lightRadius = Math.max(32, Math.min(150, 72 * zoom * brightness));

        const grad = ctx.createRadialGradient(
          poolCenter[0],
          poolCenter[1],
          2,
          poolCenter[0],
          poolCenter[1],
          lightRadius,
        );
        grad.addColorStop(0, `${lightColor}88`);
        grad.addColorStop(0.55, `${lightColor}33`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(poolCenter[0], poolCenter[1], lightRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Helper to draw 3D prism
      const drawPrism = (
        x: number,
        y: number,
        widthP: number,
        depthP: number,
        heightP: number,
        topColor: string,
        sideColor: string,
      ) => {
        const fp3 = proj(x + widthP, y + depthP, 0);
        const fp4 = proj(x, y + depthP, 0);
        const ft1 = proj(x, y, heightP);
        const ft2 = proj(x + widthP, y, heightP);
        const ft3 = proj(x + widthP, y + depthP, heightP);
        const ft4 = proj(x, y + depthP, heightP);

        ctx.fillStyle = sideColor;
        ctx.beginPath();
        ctx.moveTo(fp4[0], fp4[1]);
        ctx.lineTo(fp3[0], fp3[1]);
        ctx.lineTo(ft3[0], ft3[1]);
        ctx.lineTo(ft4[0], ft4[1]);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = topColor;
        ctx.beginPath();
        ctx.moveTo(ft1[0], ft1[1]);
        ctx.lineTo(ft2[0], ft2[1]);
        ctx.lineTo(ft3[0], ft3[1]);
        ctx.lineTo(ft4[0], ft4[1]);
        ctx.closePath();
        ctx.fill();
      };

      // 4. 3D Furniture Suite
      for (const prop of layout.furniture) {
        const { x, y, width: pw, depth: pd, height: ph, type, colorHex } = prop;
        if (type === 'rug') {
          const rp1 = proj(x, y, 0.005);
          const rp2 = proj(x + pw, y, 0.005);
          const rp3 = proj(x + pw, y + pd, 0.005);
          const rp4 = proj(x, y + pd, 0.005);
          ctx.fillStyle = colorHex || '#3B4A66';
          ctx.beginPath();
          ctx.moveTo(rp1[0], rp1[1]);
          ctx.lineTo(rp2[0], rp2[1]);
          ctx.lineTo(rp3[0], rp3[1]);
          ctx.lineTo(rp4[0], rp4[1]);
          ctx.closePath();
          ctx.fill();
        } else if (type === 'sofa') {
          drawPrism(x, y, pw, pd, ph * 0.55, colorHex || '#8B93A7', '#1E293B');
          drawPrism(x + pw * 0.72, y, pw * 0.28, pd, ph, colorHex || '#8B93A7', '#1E293B');
        } else if (type === 'bed') {
          drawPrism(x, y, pw, pd, ph, colorHex || '#7F8FB5', '#334155');
          drawPrism(x + 0.02, y + 0.02, pw * 0.4, 0.05, ph + 0.03, '#FFFFFF', '#CBD5E1');
          drawPrism(x + pw * 0.54, y + 0.02, pw * 0.4, 0.05, ph + 0.03, '#FFFFFF', '#CBD5E1');
        } else if (type === 'island' || type === 'kitchen') {
          drawPrism(x, y, pw, pd, ph, '#E9E7E2', '#39424F');
        } else if (type === 'diningSet') {
          drawPrism(x, y, pw, pd, ph, '#B48D63', '#7D5936');
        } else if (type === 'plant') {
          drawPrism(x, y, pw, pd, ph * 0.4, '#C28A5A', '#8B542A');
          drawPrism(x - 0.01, y - 0.01, pw + 0.02, pd + 0.02, ph, '#3E6B48', '#26492F');
        } else if (type === 'bathtub') {
          drawPrism(x, y, pw, pd, ph, '#F8FAFC', '#CBD5E1');
          drawPrism(x + 0.01, y + 0.01, pw - 0.02, pd - 0.02, ph - 0.01, '#0284C7', '#0369A1');
        } else {
          drawPrism(x, y, pw, pd, ph, colorHex || '#64748B', '#334155');
        }
      }

      // 5. Cutaway Dollhouse Walls
      const drawWallSegment = (x1: number, y1: number, x2: number, y2: number, wh: number) => {
        const wb1 = proj(x1, y1, 0);
        const wb2 = proj(x2, y2, 0);
        const wt1 = proj(x1, y1, wh);
        const wt2 = proj(x2, y2, wh);

        const isHorizontal = Math.abs(y2 - y1) < Math.abs(x2 - x1);
        ctx.fillStyle = isHorizontal ? 'rgba(214, 209, 199, 0.86)' : 'rgba(231, 227, 219, 0.90)';
        ctx.beginPath();
        ctx.moveTo(wb1[0], wb1[1]);
        ctx.lineTo(wb2[0], wb2[1]);
        ctx.lineTo(wt2[0], wt2[1]);
        ctx.lineTo(wt1[0], wt1[1]);
        ctx.closePath();
        ctx.fill();

        // Slate Top Cap
        ctx.strokeStyle = '#262B3A';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(wt1[0], wt1[1]);
        ctx.lineTo(wt2[0], wt2[1]);
        ctx.stroke();
      };

      // North & West Standing Walls
      drawWallSegment(0.04, 0.04, 0.96, 0.04, 0.22);
      drawWallSegment(0.04, 0.04, 0.04, 0.96, 0.22);
      // South & East Low Cutaway Curbs
      drawWallSegment(0.04, 0.96, 0.96, 0.96, 0.045);
      drawWallSegment(0.96, 0.04, 0.96, 0.96, 0.045);
      // Interior Partition Walls
      drawWallSegment(0.04, 0.46, 0.30, 0.46, 0.12);
      drawWallSegment(0.41, 0.46, 0.68, 0.46, 0.12);
      drawWallSegment(0.42, 0.04, 0.42, 0.46, 0.13);
      drawWallSegment(0.64, 0.04, 0.64, 0.46, 0.13);

      // 6. Live 3D AC Airflow Streamer Ribbons
      for (const fix of layout.fixtures) {
        if (fix.fixtureType !== 'wall_ac') continue;
        const dev = findBoundDevice(fix);
        const isAcOn = dev ? dev.isOn : true;
        if (!isAcOn) continue;

        const mode = (dev?.liveAttributes?.mode || 'cool').toString().toLowerCase();
        const flowColor = HOUSE_CONTROL_AC_MODE_COLORS[mode] || '#38BDF8';
        const acPos = proj(fix.x, fix.y, fix.zHeight);

        drawPrism(fix.x - 0.04, fix.y - 0.015, 0.08, 0.03, fix.zHeight + 0.03, '#F8FAFC', '#CBD5E1');

        const streakCount = 10;
        for (let i = 0; i < streakCount; i++) {
          const phase = (flowPhase + i * 0.1) % 1.0;
          const spreadX = ((i / streakCount) * 2 - 1) * (0.05 + 0.07 * phase);
          const sway = Math.sin(flowPhase * Math.PI * 2 + i) * 0.015 * phase;
          const reachY = 0.24 * phase;

          const target = proj(
            fix.x + spreadX + sway,
            fix.y + reachY,
            Math.max(0.04, fix.zHeight - 0.15 * phase * phase),
          );
          const ctrl = proj(
            fix.x + spreadX * 0.5,
            fix.y + reachY * 0.5,
            fix.zHeight - 0.06,
          );

          const alpha = Math.sin(Math.PI * phase) * 0.72;
          ctx.strokeStyle = flowColor;
          ctx.globalAlpha = Math.max(0.08, Math.min(0.85, alpha));
          ctx.lineWidth = 2.2 - phase * 1.2;
          ctx.beginPath();
          ctx.moveTo(acPos[0], acPos[1]);
          ctx.quadraticCurveTo(ctrl[0], ctrl[1], target[0], target[1]);
          ctx.stroke();
          ctx.globalAlpha = 1.0;
        }
      }

      rafId = requestAnimationFrame(drawFrame);
    };

    rafId = requestAnimationFrame(drawFrame);
    return () => cancelAnimationFrame(rafId);
  }, [canvasSize, focus, layout, pitch, selectedRoomId, yaw, zoom, findBoundDevice]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isInteractive) return;
    dragRef.current = { active: true, lastX: e.clientX, lastY: e.clientY };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isInteractive || !dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.lastX;
    const dy = e.clientY - dragRef.current.lastY;
    dragRef.current.lastX = e.clientX;
    dragRef.current.lastY = e.clientY;
    setYaw((prev) => prev + dx * 0.007);
    setPitch((prev) => Math.max(0.2, Math.min(1.25, prev - dy * 0.007)));
  };

  const handlePointerUp = () => {
    dragRef.current.active = false;
  };

  const handleResetOrbit = () => {
    setYaw(-0.59);
    setPitch(0.82);
    setZoom(1.0);
    setFocus([0.5, 0.5]);
    onRoomSelected?.('All');
  };

  const renderIconForFixture = (fix: Fixture3DNode) => {
    if (fix.fixtureType.includes('ac')) return <Wind className="w-3.5 h-3.5" />;
    if (fix.fixtureType.includes('washer')) return <WashingMachine className="w-3.5 h-3.5" />;
    if (fix.fixtureType.includes('camera')) return <Camera className="w-3.5 h-3.5" />;
    if (fix.fixtureType.includes('tv')) return <Tv className="w-3.5 h-3.5" />;
    return <Sun className="w-3.5 h-3.5" />;
  };

  return (
    <div
      ref={containerRef}
      style={{ height }}
      data-testid="isometric-house-3d"
      className="relative w-full overflow-hidden bg-[#0A0E1A] select-none"
    >
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className="block w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* Interactive Floating 3D Hardware Pins */}
      {showBadges &&
        layout.fixtures.map((fix) => {
          if (
            selectedRoomId.toLowerCase() !== 'all' &&
            fix.roomId.toLowerCase() !== selectedRoomId.toLowerCase()
          ) {
            return null;
          }

          const boundDev = findBoundDevice(fix);
          const isOn = boundDev ? boundDev.isOn : true;
          const [sx, sy] = projectIsoPoint(
            fix.x,
            fix.y,
            fix.zHeight,
            canvasSize.width,
            canvasSize.height,
            yaw,
            pitch,
            zoom,
            focus,
          );

          let detailText = isOn ? 'ON' : 'OFF';
          if (boundDev) {
            if (boundDev.category === 'washer') {
              const stage = (boundDev.liveAttributes.stage || 'WASH').toString().toUpperCase();
              const mins = boundDev.liveAttributes.remainingMinutes ?? 24;
              detailText = isOn ? `${stage} · ${mins}m` : 'WASHER · OFF';
            } else if (boundDev.category === 'ac') {
              detailText = isOn ? `${Math.round(boundDev.primaryValue)}°C` : 'AC · OFF';
            } else if (boundDev.category === 'light') {
              detailText = isOn ? `${Math.round(boundDev.primaryValue)}%` : 'OFF';
            } else if (boundDev.category === 'camera') {
              detailText = isOn ? '1080P LIVE' : 'PRIVACY';
            }
          }

          return (
            <div
              key={fix.id}
              style={{
                left: `${Math.max(48, Math.min(canvasSize.width - 48, sx))}px`,
                top: `${Math.max(28, Math.min(canvasSize.height - 28, sy))}px`,
                transform: 'translate(-50%, -50%)',
              }}
              className="absolute z-10 flex items-center gap-1"
            >
              <button
                type="button"
                aria-label={`Toggle 3D Pin ${fix.label}`}
                onClick={() => onFixtureTap?.(fix, boundDev)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  onFixtureInspect?.(fix, boundDev);
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-tight transition-all shadow-lg border whitespace-nowrap ${
                  isOn
                    ? 'bg-[#0F1E36]/95 border-[#00D4FF] text-white shadow-[#00D4FF]/25 hover:scale-105'
                    : 'bg-[#111827]/85 border-white/20 text-white/60 hover:text-white'
                }`}
              >
                <span className={isOn ? 'text-[#00D4FF]' : 'text-white/50'}>
                  {renderIconForFixture(fix)}
                </span>
                <span>{fix.label}</span>
                <span aria-hidden="true" className="text-white/40">·</span>
                <span className="font-mono tabular-nums text-[#30D158]">{detailText}</span>
              </button>
              {boundDev && onFixtureInspect && (
                <button
                  type="button"
                  aria-label={`Open ${boundDev.name} Controls`}
                  onClick={() => onFixtureInspect(fix, boundDev)}
                  className="p-1 rounded-full bg-black/75 border border-white/20 text-white/75 hover:text-white hover:border-[#00D4FF] transition-colors"
                  title={`Open ${boundDev.name} Controls`}
                >
                  <Power className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}

      {/* Top-Right 3D Stage Controls */}
      <div className="absolute bottom-3 right-3 z-20 flex items-center gap-2">
        {onOpenBlueprintEditor && (
          <button
            type="button"
            onClick={onOpenBlueprintEditor}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/65 hover:bg-black/85 border border-white/15 text-xs font-semibold text-white transition-colors whitespace-nowrap"
          >
            <Layers className="w-3.5 h-3.5 text-[#00D4FF]" />
            <span>2D Blueprint Editor</span>
          </button>
        )}
        <button
          type="button"
          onClick={handleResetOrbit}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/65 hover:bg-black/85 border border-white/15 text-xs font-semibold text-white transition-colors whitespace-nowrap"
        >
          <RotateCcw className="w-3.5 h-3.5 text-[#5AA2FF]" />
          <span>Reset Orbit</span>
        </button>
      </div>
    </div>
  );
};
