import React, { useState, useEffect, useRef } from 'react';
import {
  DiagnosticReport,
  GarmentType,
  RealSmartDevice,
  UniversalDeviceArchetype,
} from '../types/smartHome';
import {
  HOUSE_CONTROL_SWATCHES,
  runSmartDiagnosis,
  SmartThingsLaundryService,
  tempToColor,
  UniversalCategoryClassifier,
} from '../utils/smartHomeCore';
import { useRealHome } from '../context/RealHomeContext';
import {
  X,
  Power,
  Play,
  Pause,
  RotateCcw,
  Trash2,
  ArrowLeftRight,
  Stethoscope,
  Sparkles,
  Minus,
  Plus,
  Volume2,
  VolumeX,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Crosshair,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';

export const DeviceControlSheetModal: React.FC = () => {
  const {
    activeControlDevice,
    setActiveControlDevice,
    studioSheetMode,
    setStudioSheetMode,
    toggleDevicePower,
    setDeviceLevel,
    updateDeviceAttributes,
    removeDevice,
    flashDevice,
    sendCameraPtz,
    sendTvRemoteKey,
    launchTvApp,
    hardwarePacketLog,
    syncAllDevicesSilent,
    showToast,
  } = useRealHome();

  const [diagnosisReport, setDiagnosisReport] = useState<DiagnosticReport | null>(null);
  const [simulatedFault, setSimulatedFault] = useState<string | null>(null);
  const [selectedGarments, setSelectedGarments] = useState<GarmentType[]>([GarmentType.shirtsDaily]);
  const [samsungTab, setSamsungTab] = useState<number>(0);
  const [lgTab, setLgTab] = useState<number>(0);
  const [instaViewLit, setInstaViewLit] = useState<boolean>(false);
  const [camSubStream, setCamSubStream] = useState<boolean>(false);
  const [camMuted, setCamMuted] = useState<boolean>(true);
  const [rtspRelayStatus, setRtspRelayStatus] = useState<string>(
    'RTSP Relay Ready · HLS /api/camera/stream.m3u8',
  );
  const [localBrightness, setLocalBrightness] = useState<number>(80);
  const brightnessDebounceRef = useRef<number | null>(null);
  const isDraggingBrightnessRef = useRef<boolean>(false);

  const foamCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const camCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const device = activeControlDevice;

  useEffect(() => {
    if (device && !isDraggingBrightnessRef.current) {
      setLocalBrightness(Math.round(device.primaryValue || 80));
    }
  }, [device?.id, device?.primaryValue]);

  useEffect(() => {
    if (!device || device.category !== 'camera') return;
    const rtsp = device.credentials.rtspUrl || 'rtsp://admin:pass@192.168.1.120:554/live/ch0';
    fetch(`/api/camera/${encodeURIComponent(device.id)}/probe?rtspUrl=${encodeURIComponent(rtsp)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && data.rtspHandshake) {
          setRtspRelayStatus(`${data.rtspHandshake} · ${data.hlsManifestUrl}`);
        }
      })
      .catch(() => {});
  }, [device?.id, device?.category]);

  // Ecobubble foam animation
  useEffect(() => {
    const canvas = foamCanvasRef.current;
    if (!canvas || !device || device.category !== 'washer') return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId: number;
    const start = performance.now();
    const isActive = Boolean(device.liveAttributes.ecoBubble ?? true) && device.isOn;

    const draw = (now: number) => {
      const phase = ((now - start) / 4000) % 1.0;
      const w = canvas.width;
      const h = canvas.height;
      ctx.fillStyle = '#0A1526';
      ctx.fillRect(0, 0, w, h);

      if (!isActive) {
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.font = '11px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Ecobubble foam generator standby', w / 2, h / 2 + 4);
      } else {
        for (let i = 0; i < 18; i++) {
          const xRatio = (i / 18 + phase * 0.4) % 1.0;
          const x = xRatio * w;
          const y = h * 0.7 - Math.sin(phase * 2 * Math.PI + i) * (h * 0.35);
          const r = 4 + (i % 5) * 1.5;
          ctx.fillStyle = 'rgba(0, 212, 255, 0.22)';
          ctx.strokeStyle = 'rgba(0, 229, 255, 0.65)';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      }
      rafId = requestAnimationFrame(draw);
    };

    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, [device]);

  // Camera viewfinder animation
  useEffect(() => {
    const canvas = camCanvasRef.current;
    if (!canvas || !device || device.category !== 'camera') return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId: number;
    const start = performance.now();

    const draw = (now: number) => {
      const t = ((now - start) / 3500) % 1.0;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      if (!device.isOn) return;

      // Subtle living room architectural wireframe feed + pan/tilt offset
      const pan = Number(device.liveAttributes.panAngle ?? 0);
      const tilt = Number(device.liveAttributes.tiltAngle ?? 0);
      const offsetX = (pan / 180) * 60;
      const offsetY = (tilt / 90) * 35;

      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#0B1628');
      grad.addColorStop(1, '#070E1A');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Perspective room grid
      ctx.strokeStyle = 'rgba(0, 212, 255, 0.14)';
      ctx.lineWidth = 1;
      for (let gx = -80; gx < w + 80; gx += 40) {
        ctx.beginPath();
        ctx.moveTo(gx + offsetX, 0);
        ctx.lineTo(gx + offsetX * 1.4, h);
        ctx.stroke();
      }
      for (let gy = -40; gy < h + 40; gy += 32) {
        ctx.beginPath();
        ctx.moveTo(0, gy + offsetY);
        ctx.lineTo(w, gy + offsetY);
        ctx.stroke();
      }

      // Scanning laser line
      const scanY = 16 + (h - 32) * t;
      ctx.strokeStyle = 'rgba(0, 212, 255, 0.55)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(16, scanY);
      ctx.lineTo(w - 16, scanY);
      ctx.stroke();

      // Corner brackets
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 1.8;
      const pad = 14;
      const c = 18;
      // TL
      ctx.beginPath();
      ctx.moveTo(pad, pad + c);
      ctx.lineTo(pad, pad);
      ctx.lineTo(pad + c, pad);
      ctx.stroke();
      // TR
      ctx.beginPath();
      ctx.moveTo(w - pad - c, pad);
      ctx.lineTo(w - pad, pad);
      ctx.lineTo(w - pad, pad + c);
      ctx.stroke();
      // BL
      ctx.beginPath();
      ctx.moveTo(pad, h - pad - c);
      ctx.lineTo(pad, h - pad);
      ctx.lineTo(pad + c, h - pad);
      ctx.stroke();
      // BR
      ctx.beginPath();
      ctx.moveTo(w - pad - c, h - pad);
      ctx.lineTo(w - pad, h - pad);
      ctx.lineTo(w - pad, h - pad - c);
      ctx.stroke();

      rafId = requestAnimationFrame(draw);
    };

    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, [device]);

  if (!device) return null;

  const archetype = UniversalCategoryClassifier.classify(device);
  const devIdLower = device.id.toLowerCase();
  const devNameLower = device.name.toLowerCase();
  const isLg = devIdLower.includes('lg') || devNameLower.includes('lg');

  const closeModal = () => {
    setDiagnosisReport(null);
    setSimulatedFault(null);
    setStudioSheetMode('default');
    setActiveControlDevice(null);
  };

  // Determine which view to render
  const renderSheetContent = () => {
    if (studioSheetMode === 'samsung_future') {
      return renderSamsungFutureStudio();
    }
    if (studioSheetMode === 'lg_future') {
      return renderLgFutureStudio();
    }

    if (archetype === UniversalDeviceArchetype.cameraSecurity || device.category === 'camera') {
      return renderCameraCockpit();
    }
    if (archetype === UniversalDeviceArchetype.laundry || device.category === 'washer') {
      if (isLg || devIdLower.includes('washtower')) {
        return renderLgFutureStudio();
      }
      return renderSamsungWasherSheet();
    }
    if (archetype === UniversalDeviceArchetype.climateAc || device.category === 'ac') {
      if (devIdLower.includes('samsung') || devIdLower.includes('windfree')) {
        return renderSamsungFutureStudio();
      }
      return renderLgThinqAcSheet();
    }
    if (archetype === UniversalDeviceArchetype.refrigeration || device.category === 'fridge') {
      if (isLg || devIdLower.includes('instaview')) {
        return renderLgFutureStudio(1);
      }
      return renderSamsungFutureStudio(1);
    }
    if (archetype === UniversalDeviceArchetype.tvMedia || device.category === 'tv') {
      if (devIdLower.includes('frame') || devNameLower.includes('samsung')) {
        return renderSamsungFutureStudio(2);
      }
      return renderOnePlusTvSheet();
    }
    return renderSmartLightSheet();
  };

  // ==========================================================================
  // 1. SAMSUNG AI ECOBUBBLE™ WASHER SHEET
  // ==========================================================================
  const renderSamsungWasherSheet = () => {
    const stage = (device.liveAttributes.stage || (device.isOn ? 'rinse' : 'idle')).toString().toLowerCase();
    const remainingMin = Number(device.liveAttributes.remainingMinutes ?? (device.isOn ? 24 : 0));
    const cycle = (device.liveAttributes.cycle || 'AI Wash').toString();
    const detPct = Number(device.liveAttributes.detergentPercent ?? 78);
    const softPct = Number(device.liveAttributes.softenerPercent ?? 62);
    const drumCleanCount = Number(device.liveAttributes.drumCleanCount ?? 12);
    const ecoBubble = device.liveAttributes.ecoBubble !== false;
    const superSpeed = Boolean(device.liveAttributes.superSpeed);
    const aiWash = device.liveAttributes.aiWash !== false;
    const autoCycleLink = Boolean(device.liveAttributes.autoCycleLink);

    const homeCare = SmartThingsLaundryService.checkHomeCareStatus({
      drumCleanCount,
      detergentPercent: detPct,
      softenerPercent: softPct,
    });

    const toggleGarment = (g: GarmentType) => {
      setSelectedGarments((prev) =>
        prev.includes(g) ? (prev.length > 1 ? prev.filter((item) => item !== g) : prev) : [...prev, g],
      );
    };

    return (
      <div className="space-y-5">
        {/* Top Bar with Swap to LG WashTower */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-[#00D4FF]">Samsung SmartThings · AI Ecobubble™</div>
            <h3 className="text-xl font-extrabold text-white">{device.name}</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setLgTab(0);
                setStudioSheetMode('lg_future');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-[#FF4081]"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span>LG WashTower™ Studio</span>
            </button>
            <button
              type="button"
              aria-label="Toggle Washer Power"
              onClick={() => toggleDevicePower(device.id)}
              className={`p-2.5 rounded-full transition-colors ${
                device.isOn ? 'bg-[#0A84FF] text-white' : 'bg-white/10 text-white/50'
              }`}
            >
              <Power className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Circular Cycle Dial & Stage Chips */}
        <div className="rounded-2xl bg-[#0A1120] p-5 border border-white/10 flex flex-col items-center">
          <div className="relative w-44 h-44 rounded-full border-8 border-[#0A84FF]/30 flex flex-col items-center justify-center shadow-[0_0_30px_rgba(0,212,255,0.2)]">
            <div className="text-3xl font-extrabold font-mono tabular-nums text-white">
              {device.isOn ? `${remainingMin} min` : 'Idle'}
            </div>
            <div className="mt-1 px-2.5 py-0.5 rounded-md bg-[#00D4FF]/20 text-[11px] font-bold text-[#00D4FF] uppercase">
              {device.isOn ? stage : 'OFF'}
            </div>
            <div className="mt-1.5 text-xs text-white/65">{cycle}</div>
          </div>

          <div className="mt-4 flex items-center gap-2">
            {['wash', 'rinse', 'spin'].map((s) => (
              <button
                type="button"
                key={s}
                onClick={() => updateDeviceAttributes(device.id, { stage: s })}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold capitalize transition-colors ${
                  device.isOn && stage === s
                    ? 'bg-[#00D4FF] text-black'
                    : 'bg-white/10 text-white/70 hover:text-white'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="mt-4 flex items-center gap-3 w-full">
            <button
              type="button"
              onClick={() => toggleDevicePower(device.id)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#0A84FF] hover:bg-[#0070E0] text-xs font-bold text-white"
            >
              {device.isOn ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{device.isOn ? 'Pause Cycle' : 'Start Cycle'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                updateDeviceAttributes(device.id, { stage: 'idle', remainingMinutes: 0 });
                if (device.isOn) toggleDevicePower(device.id);
              }}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white/80"
            >
              Cancel
            </button>
          </div>
        </div>

        {/* AI Ecobubble™ Active Foam Simulation */}
        <div className="rounded-2xl bg-[#0F1E36] p-4 border border-[#00D4FF]/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-white">AI Ecobubble™ Active Foam</span>
            <span className="text-[11px] font-mono text-[#00D4FF]">~70% Energy Saved</span>
          </div>
          <canvas
            ref={foamCanvasRef}
            width={420}
            height={44}
            className="w-full h-11 rounded-xl block mb-2"
          />
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/70">
              {ecoBubble ? 'Bubble Soak: Active' : 'Bubble Soak: Off'}
            </span>
            <button
              type="button"
              onClick={() => updateDeviceAttributes(device.id, { ecoBubble: !ecoBubble })}
              className={`px-3 py-1 rounded-lg font-bold ${
                ecoBubble ? 'bg-[#00D4FF] text-black' : 'bg-white/10 text-white/60'
              }`}
            >
              {ecoBubble ? 'Enabled' : 'Disabled'}
            </button>
          </div>
        </div>

        {/* HomeCare Wizard Auto-Dispenser Gauges */}
        <div className="rounded-2xl bg-white/5 p-4 border border-white/10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-white">
              Auto Dispenser System (HomeCare Wizard)
            </span>
            <span className="text-[11px] text-[#30D158] font-medium">{homeCare.careSummary}</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-white/65">Liquid Detergent</span>
                <span className="font-mono font-bold text-white">{detPct}%</span>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div style={{ width: `${detPct}%` }} className="h-full bg-[#0A84FF]" />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-white/65">Fabric Softener</span>
                <span className="font-mono font-bold text-white">{softPct}%</span>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div style={{ width: `${softPct}%` }} className="h-full bg-[#30D158]" />
              </div>
            </div>
          </div>
        </div>

        {/* SmartThings AI Laundry Recipe Generator */}
        <div className="rounded-2xl bg-[#BF5AF2]/10 p-4 border border-[#BF5AF2]/30">
          <div className="flex items-center gap-1.5 text-xs font-bold text-white mb-2">
            <Sparkles className="w-4 h-4 text-[#BF5AF2]" />
            <span>SmartThings Laundry Recipe</span>
          </div>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {[
              { type: GarmentType.shirtsDaily, label: 'Shirts & Daily' },
              { type: GarmentType.jeansDenim, label: 'Jeans & Denim' },
              { type: GarmentType.gymActivewear, label: 'Gym Activewear' },
              { type: GarmentType.delicates, label: 'Delicates / Silk' },
              { type: GarmentType.towels, label: 'Towels & Bedding' },
              { type: GarmentType.babyWear, label: 'Baby Clothes' },
            ].map((item) => {
              const sel = selectedGarments.includes(item.type);
              return (
                <button
                  type="button"
                  key={item.type}
                  onClick={() => toggleGarment(item.type)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    sel
                      ? 'bg-[#BF5AF2] text-white'
                      : 'bg-white/10 text-white/70 hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => {
              const recipe = SmartThingsLaundryService.recommendRecipe(selectedGarments);
              updateDeviceAttributes(device.id, {
                cycle: recipe.recommendedCycle,
                waterTemperature: recipe.recommendedTempC,
                waterTemp: `${recipe.recommendedTempC}°C`,
                spinSpeed: recipe.recommendedSpin,
                ecoBubble: recipe.enableEcoBubble,
                recommendedRecipe: recipe.advice,
              });
              showToast(`Applied Smart Recipe: ${recipe.recommendedCycle}`);
            }}
            className="w-full py-2 rounded-xl bg-[#BF5AF2] hover:bg-[#A844DB] text-xs font-bold text-white transition-colors"
          >
            Apply Smart Recipe
          </button>
          {device.liveAttributes.recommendedRecipe && (
            <p className="mt-2 text-[11px] text-white/80 italic">
              AI Advice: {device.liveAttributes.recommendedRecipe}
            </p>
          )}
        </div>

        {/* Samsung Tech Toggles & Smart Diagnosis */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => updateDeviceAttributes(device.id, { superSpeed: !superSpeed })}
            className={`px-3 py-2 rounded-xl text-xs font-bold border ${
              superSpeed
                ? 'bg-[#0A84FF]/25 border-[#0A84FF] text-white'
                : 'bg-white/5 border-white/10 text-white/60'
            }`}
          >
            SuperSpeed 39m: {superSpeed ? 'ON' : 'OFF'}
          </button>
          <button
            type="button"
            onClick={() => updateDeviceAttributes(device.id, { aiWash: !aiWash })}
            className={`px-3 py-2 rounded-xl text-xs font-bold border ${
              aiWash
                ? 'bg-[#30D158]/25 border-[#30D158] text-white'
                : 'bg-white/5 border-white/10 text-white/60'
            }`}
          >
            AI Wash Sensors: {aiWash ? 'ON' : 'OFF'}
          </button>
          <button
            type="button"
            onClick={() => updateDeviceAttributes(device.id, { autoCycleLink: !autoCycleLink })}
            className={`px-3 py-2 rounded-xl text-xs font-bold border ${
              autoCycleLink
                ? 'bg-[#00D4FF]/25 border-[#00D4FF] text-white'
                : 'bg-white/5 border-white/10 text-white/60'
            }`}
          >
            Auto Cycle Link: {autoCycleLink ? 'ON' : 'OFF'}
          </button>
          <button
            type="button"
            onClick={() => {
              const rep = runSmartDiagnosis(device, simulatedFault);
              setDiagnosisReport(rep);
            }}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-bold text-[#00D4FF]"
          >
            <Stethoscope className="w-3.5 h-3.5" />
            <span>Smart Diagnosis™</span>
          </button>
        </div>
      </div>
    );
  };

  // ==========================================================================
  // 2. LG THINQ DUALCOOL™ AI AC SHEET
  // ==========================================================================
  const renderLgThinqAcSheet = () => {
    const targetTemp = Math.round(device.primaryValue || 24);
    const roomTemp = Number(device.liveAttributes.roomTemp ?? 26.5);
    const humidity = Number(device.liveAttributes.humidity ?? 55);
    const opMode = (device.liveAttributes.mode || 'cool').toString().toLowerCase();
    const fanSpeed = (device.liveAttributes.fan || 'auto').toString().toLowerCase();
    const swingV = device.liveAttributes.swingVertical !== false;
    const swingH = Boolean(device.liveAttributes.swingHorizontal);
    const indirectWind = Boolean(device.liveAttributes.indirectWind);
    const airClean = device.liveAttributes.airClean !== false;
    const pm25 = Number(device.liveAttributes.pm25 ?? 14);
    const energyStep = Number(device.liveAttributes.energyStep ?? 1);
    const autoDry = device.liveAttributes.autoDry !== false;

    const modes = [
      { id: 'cool', label: 'Cool', sub: '냉방' },
      { id: 'dry', label: 'Dry', sub: '제습' },
      { id: 'fan', label: 'Fan', sub: '송풍' },
      { id: 'ai', label: 'AI Smart', sub: '스마트케어' },
      { id: 'heat', label: 'Heat', sub: '난방' },
      { id: 'jet', label: 'Jet Turbo', sub: '쿨파워' },
    ];

    return (
      <div className="space-y-5">
        {/* Header with Swap to Samsung WindFree */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-[#38BDF8]">LG ThinQ · DUAL Inverter AI</div>
            <h3 className="text-xl font-extrabold text-white">{device.name}</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setSamsungTab(0);
                setStudioSheetMode('samsung_future');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-[#00D4FF]"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span>Samsung WindFree™ Studio</span>
            </button>
            <button
              type="button"
              aria-label="Toggle AC Power"
              onClick={() => toggleDevicePower(device.id)}
              className={`p-2.5 rounded-full transition-colors ${
                device.isOn ? 'bg-[#38BDF8] text-black' : 'bg-white/10 text-white/50'
              }`}
            >
              <Power className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Hero Stage: Radial Dial + Steppers */}
        <div className="rounded-3xl bg-white/[0.04] p-5 border border-white/10 flex flex-col items-center">
          <div className="flex items-center gap-3 text-xs text-white/75 mb-4 font-mono tabular-nums">
            <span>Room {roomTemp.toFixed(1)}°C</span>
            <span aria-hidden="true">·</span>
            <span>Humidity {humidity}%</span>
          </div>

          <div className="flex items-center gap-6">
            <button
              type="button"
              aria-label="Decrease target temperature"
              disabled={!device.isOn || targetTemp <= 16}
              onClick={() => setDeviceLevel(device.id, Math.max(16, targetTemp - 1))}
              className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 flex items-center justify-center text-white"
            >
              <Minus className="w-5 h-5" />
            </button>

            <div className="w-40 h-40 rounded-full border-8 border-[#38BDF8]/40 flex flex-col items-center justify-center shadow-[0_0_32px_rgba(56,189,248,0.22)]">
              <div className="text-4xl font-extrabold font-mono tabular-nums text-white">
                {opMode === 'fan' ? 'FAN' : `${targetTemp}°`}
              </div>
              <div className="mt-1 text-xs font-semibold text-[#38BDF8]">
                {device.isOn ? 'Target Setpoint' : 'Standby'}
              </div>
            </div>

            <button
              type="button"
              aria-label="Increase target temperature"
              disabled={!device.isOn || targetTemp >= 30}
              onClick={() => setDeviceLevel(device.id, Math.min(30, targetTemp + 1))}
              className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 flex items-center justify-center text-white"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Operation Modes */}
        <div>
          <div className="text-xs font-bold text-white/60 mb-2">Operation Mode</div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {modes.map((m) => {
              const sel = opMode === m.id;
              return (
                <button
                  type="button"
                  key={m.id}
                  onClick={() => {
                    if (m.id === 'jet') {
                      updateDeviceAttributes(device.id, { mode: 'jet', fan: 'turbo', jetCool: true }, 18);
                    } else {
                      updateDeviceAttributes(device.id, { mode: m.id, jetCool: false });
                    }
                  }}
                  className={`p-2 rounded-xl border text-center transition-colors ${
                    sel
                      ? 'bg-[#38BDF8]/25 border-[#38BDF8] text-white'
                      : 'bg-white/5 border-white/10 text-white/65 hover:text-white'
                  }`}
                >
                  <div className="text-xs font-bold">{m.label}</div>
                  <div className="text-[10px] text-[#38BDF8]">{m.sub}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Wind Strength & 3D Vanes */}
        <div className="rounded-2xl bg-white/[0.04] p-4 border border-white/10 space-y-3">
          <div className="flex justify-between text-xs font-bold">
            <span className="text-white/60">Wind Strength</span>
            <span className="text-[#38BDF8] uppercase">{fanSpeed}</span>
          </div>
          <div className="grid grid-cols-5 gap-1.5 bg-black/30 p-1 rounded-xl">
            {['auto', 'low', 'mid', 'high', 'turbo'].map((spd) => (
              <button
                type="button"
                key={spd}
                onClick={() => updateDeviceAttributes(device.id, { fan: spd, fanSpeed: spd })}
                className={`py-1.5 rounded-lg text-xs font-bold capitalize transition-colors ${
                  fanSpeed === spd ? 'bg-[#38BDF8] text-black' : 'text-white/60 hover:text-white'
                }`}
              >
                {spd}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2">
            <button
              type="button"
              onClick={() => updateDeviceAttributes(device.id, { swingVertical: !swingV })}
              className={`py-2 px-2 rounded-xl text-xs font-bold border ${
                swingV ? 'bg-[#38BDF8]/20 border-[#38BDF8] text-white' : 'bg-black/25 border-white/10 text-white/50'
              }`}
            >
              Vertical 3D
            </button>
            <button
              type="button"
              onClick={() => updateDeviceAttributes(device.id, { swingHorizontal: !swingH })}
              className={`py-2 px-2 rounded-xl text-xs font-bold border ${
                swingH ? 'bg-[#38BDF8]/20 border-[#38BDF8] text-white' : 'bg-black/25 border-white/10 text-white/50'
              }`}
            >
              Horizontal 3D
            </button>
            <button
              type="button"
              onClick={() => updateDeviceAttributes(device.id, { indirectWind: !indirectWind })}
              className={`py-2 px-2 rounded-xl text-xs font-bold border ${
                indirectWind ? 'bg-[#38BDF8]/20 border-[#38BDF8] text-white' : 'bg-black/25 border-white/10 text-white/50'
              }`}
            >
              Comfort Indirect
            </button>
          </div>
        </div>

        {/* PuriCare Air Quality & Active Energy Control */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white/[0.04] p-4 border border-white/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[#34C759]">PuriCare Air Quality</span>
              <button
                type="button"
                onClick={() => updateDeviceAttributes(device.id, { airClean: !airClean })}
                className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                  airClean ? 'bg-[#38BDF8] text-black' : 'bg-white/10 text-white/50'
                }`}
              >
                Ionizer: {airClean ? 'ON' : 'OFF'}
              </button>
            </div>
            <div className="text-sm font-bold text-white">Clean / 좋음 ({pm25} μg/m³ PM2.5)</div>
            <div className="text-xs text-white/55 mt-0.5">Micro-Dust Filter Life: 92%</div>
          </div>

          <div className="rounded-2xl bg-white/[0.04] p-4 border border-white/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-white/70">Active Energy Control</span>
              <button
                type="button"
                onClick={() => updateDeviceAttributes(device.id, { autoDry: !autoDry })}
                className="text-[11px] font-semibold text-[#38BDF8]"
              >
                Auto-Dry: {autoDry ? 'ON' : 'OFF'}
              </button>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { step: 0, label: '100%' },
                { step: 1, label: '80%' },
                { step: 2, label: '60%' },
                { step: 3, label: '40%' },
              ].map((s) => (
                <button
                  type="button"
                  key={s.step}
                  onClick={() => updateDeviceAttributes(device.id, { energyStep: s.step })}
                  className={`py-1.5 rounded-lg text-xs font-bold font-mono ${
                    energyStep === s.step ? 'bg-[#34C759] text-black' : 'bg-black/30 text-white/60'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ==========================================================================
  // 3. SAMSUNG SMARTKIT™ DEVICE STUDIO (WindFree AC, Family Hub, The Frame TV)
  // ==========================================================================
  const renderSamsungFutureStudio = (forcedTab?: number) => {
    const activeTab = forcedTab !== undefined ? forcedTab : samsungTab;
    const isWindFree = device.liveAttributes.windFree !== false;
    const isGoodSleep = Boolean(device.liveAttributes.goodSleep);
    const fridgeTemp = Number(device.liveAttributes.fridgeTemp ?? 3);
    const freezerTemp = Number(device.liveAttributes.freezerTemp ?? -19);
    const flexMode = (device.liveAttributes.flexZoneMode || 'Beverage').toString();
    const isArtMode = device.liveAttributes.artMode !== false;
    const artwork = (device.liveAttributes.selectedArtwork || 'Starry Night').toString();

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-[#00D4FF]">Samsung SmartKit™ Device Studio</div>
            <h3 className="text-lg font-extrabold text-white">{device.name}</h3>
          </div>
          <button
            type="button"
            onClick={() => setStudioSheetMode('default')}
            className="px-3 py-1.5 rounded-xl bg-white/10 text-xs font-semibold text-white"
          >
            Standard View
          </button>
        </div>

        <div className="grid grid-cols-3 gap-1.5 bg-white/10 p-1 rounded-2xl">
          {['WindFree™ AC', 'Family Hub Fridge', 'The Frame TV'].map((tabName, idx) => (
            <button
              type="button"
              key={tabName}
              onClick={() => setSamsungTab(idx)}
              className={`py-2 rounded-xl text-xs font-bold transition-colors ${
                activeTab === idx ? 'bg-[#0A84FF] text-white' : 'text-white/65 hover:text-white'
              }`}
            >
              {tabName}
            </button>
          ))}
        </div>

        {activeTab === 0 && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-[#131D33] p-4 border border-[#00D4FF]/30">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-white">
                    {isWindFree ? 'WindFree™ Still Air Cooling' : 'High-Velocity Directional Louver'}
                  </div>
                  <div className="text-xs text-white/60">
                    Dispersing through 23,000 micro-holes (&lt;0.15 m/s)
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => updateDeviceAttributes(device.id, { windFree: !isWindFree })}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                    isWindFree ? 'bg-[#00D4FF] text-black' : 'bg-white/10 text-white/70'
                  }`}
                >
                  {isWindFree ? 'WindFree ON' : 'WindFree OFF'}
                </button>
              </div>
            </div>

            <div className="rounded-2xl bg-white/5 p-4 border border-white/10">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-white">GoodSleep™ AI Nocturnal Curve</span>
                <button
                  type="button"
                  onClick={() => updateDeviceAttributes(device.id, { goodSleep: !isGoodSleep })}
                  className={`px-3 py-1 rounded-lg text-xs font-bold ${
                    isGoodSleep ? 'bg-[#BF5AF2] text-white' : 'bg-white/10 text-white/60'
                  }`}
                >
                  {isGoodSleep ? 'Active' : 'Off'}
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-blue-950/60 border border-blue-500/30">
                  <div className="font-bold text-blue-300">1. Fall Asleep</div>
                  <div className="text-[11px] text-white/65">22°C Induction</div>
                </div>
                <div className="p-2.5 rounded-xl bg-purple-950/60 border border-purple-500/30">
                  <div className="font-bold text-purple-300">2. Sound Sleep</div>
                  <div className="text-[11px] text-white/65">24°C Deep Rest</div>
                </div>
                <div className="p-2.5 rounded-xl bg-teal-950/60 border border-teal-500/30">
                  <div className="font-bold text-teal-300">3. Wake-up</div>
                  <div className="text-[11px] text-white/65">25°C Fresh Air</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 1 && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-white/5 p-4 border border-white/10">
              <div className="text-xs font-bold text-white mb-2">
                Family Hub View Inside™ Camera · Expiration Tracker
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-black/50 border border-amber-400/40">
                  <div className="font-bold text-white">Whole Milk</div>
                  <div className="text-[11px] text-amber-400">2 days left</div>
                </div>
                <div className="p-2.5 rounded-xl bg-black/50 border border-emerald-400/40">
                  <div className="font-bold text-white">Fresh Berries</div>
                  <div className="text-[11px] text-emerald-400">Fresh</div>
                </div>
                <div className="p-2.5 rounded-xl bg-black/50 border border-cyan-400/40">
                  <div className="font-bold text-white">Organic Eggs</div>
                  <div className="text-[11px] text-cyan-400">6 days left</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-center">
                <div className="text-xs text-white/60">Fridge Compartment</div>
                <div className="text-2xl font-extrabold font-mono text-[#00D4FF] my-1">
                  {fridgeTemp}°C
                </div>
                <div className="flex justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateDeviceAttributes(device.id, { fridgeTemp: Math.max(1, fridgeTemp - 1) })}
                    className="px-2.5 py-1 rounded bg-white/10 text-xs"
                  >
                    -
                  </button>
                  <button
                    type="button"
                    onClick={() => updateDeviceAttributes(device.id, { fridgeTemp: Math.min(7, fridgeTemp + 1) })}
                    className="px-2.5 py-1 rounded bg-white/10 text-xs"
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-center">
                <div className="text-xs text-white/60">Freezer Compartment</div>
                <div className="text-2xl font-extrabold font-mono text-[#00D4FF] my-1">
                  {freezerTemp}°C
                </div>
                <div className="flex justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateDeviceAttributes(device.id, { freezerTemp: Math.max(-23, freezerTemp - 1) })}
                    className="px-2.5 py-1 rounded bg-white/10 text-xs"
                  >
                    -
                  </button>
                  <button
                    type="button"
                    onClick={() => updateDeviceAttributes(device.id, { freezerTemp: Math.min(-15, freezerTemp + 1) })}
                    className="px-2.5 py-1 rounded bg-white/10 text-xs"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <div>
              <div className="text-xs text-white/60 mb-1.5">FlexZone™ Drawer Mode</div>
              <div className="flex flex-wrap gap-2">
                {['Beverage', 'Deli', 'Fish', 'Wine'].map((m) => (
                  <button
                    type="button"
                    key={m}
                    onClick={() => updateDeviceAttributes(device.id, { flexZoneMode: m })}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                      flexMode === m ? 'bg-teal-500 text-black' : 'bg-white/10 text-white/70'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 2 && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-[#2C2416] p-6 border-4 border-[#8B6B38] text-center">
              <div className="text-xs font-bold text-amber-400">The Frame Art Mode · Matte Display</div>
              <div className="text-lg font-extrabold text-white mt-1">{artwork}</div>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                {['Starry Night', 'Water Lilies', 'The Great Wave', 'Sunset Impression'].map((art) => (
                  <button
                    type="button"
                    key={art}
                    onClick={() => updateDeviceAttributes(device.id, { selectedArtwork: art, artMode: true })}
                    className={`px-3 py-1 rounded-lg text-xs font-bold ${
                      artwork === art ? 'bg-amber-400 text-black' : 'bg-black/40 text-white/80'
                    }`}
                  >
                    {art}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/5 border border-white/10">
              <div>
                <div className="text-xs font-bold text-white">Ambient Light Sync (lightsync)</div>
                <div className="text-[11px] text-white/60">
                  Streams edge video color gradients to room RGB fixtures
                </div>
              </div>
              <button
                type="button"
                onClick={() => updateDeviceAttributes(device.id, { artMode: !isArtMode })}
                className="px-3 py-1.5 rounded-xl bg-[#BF5AF2] text-xs font-bold text-white"
              >
                Synced
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ==========================================================================
  // 4. LG THINQ™ APPLIANCE STUDIO (WashTower, InstaView, AeroTower, Styler)
  // ==========================================================================
  const renderLgFutureStudio = (forcedTab?: number) => {
    const activeTab = forcedTab !== undefined ? forcedTab : lgTab;
    const isTurboWash = device.liveAttributes.turboWash360 !== false;
    const isCraftIce = device.liveAttributes.craftIce !== false;
    const tiltAngle = Number(device.liveAttributes.cleanBoosterTilt ?? 55);
    const hangerRpm = Number(device.liveAttributes.movingHangerRpm ?? 180);

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-[#FF4081]">LG ThinQ™ Appliance Studio</div>
            <h3 className="text-lg font-extrabold text-white">{device.name}</h3>
          </div>
          <button
            type="button"
            onClick={() => setStudioSheetMode('default')}
            className="px-3 py-1.5 rounded-xl bg-white/10 text-xs font-semibold text-white"
          >
            Standard View
          </button>
        </div>

        <div className="grid grid-cols-4 gap-1 bg-white/10 p-1 rounded-2xl">
          {['WashTower', 'InstaView', 'AeroTower', 'Styler & Dish'].map((tabName, idx) => (
            <button
              type="button"
              key={tabName}
              onClick={() => setLgTab(idx)}
              className={`py-2 rounded-xl text-xs font-bold transition-colors ${
                activeTab === idx ? 'bg-[#A50034] text-white' : 'text-white/65 hover:text-white'
              }`}
            >
              {tabName}
            </button>
          ))}
        </div>

        {activeTab === 0 && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-2xl bg-black/40 border border-pink-500/30">
                <div className="text-[10px] font-bold text-pink-400">WASHER (BOTTOM)</div>
                <div className="text-sm font-extrabold text-white mt-0.5">RINSE · 24 min</div>
              </div>
              <div className="p-3.5 rounded-2xl bg-black/40 border border-amber-400/30">
                <div className="text-[10px] font-bold text-amber-400">DRYER (TOP)</div>
                <div className="text-sm font-extrabold text-white mt-0.5">PRE-HEATING · 34 min</div>
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-white">TurboWash™ 360° 4-Jet Spray</div>
                <div className="text-[11px] text-white/60">3D multi-nozzles complete cycle in 39 minutes</div>
              </div>
              <button
                type="button"
                onClick={() => updateDeviceAttributes(device.id, { turboWash360: !isTurboWash })}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                  isTurboWash ? 'bg-[#00D4FF] text-black' : 'bg-white/10 text-white/60'
                }`}
              >
                {isTurboWash ? 'Active' : 'Off'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 1 && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => {
                const nextLit = !instaViewLit;
                setInstaViewLit(nextLit);
                updateDeviceAttributes(device.id, { instaViewTransparent: nextLit });
              }}
              className={`w-full p-5 rounded-2xl border text-left transition-all ${
                instaViewLit
                  ? 'bg-[#1E2D4A] border-amber-400 shadow-[0_0_24px_rgba(251,191,36,0.25)]'
                  : 'bg-[#0A0F1D] border-white/20'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-amber-300">
                  {instaViewLit
                    ? 'InstaView™ Illuminated (Glass Transparent)'
                    : 'InstaView™ Tinted Glass (Click to Knock Twice)'}
                </span>
                <span className="text-[10px] font-mono text-white/70">
                  {instaViewLit ? 'TRANSPARENT' : 'TINTED'}
                </span>
              </div>
              {instaViewLit ? (
                <div className="grid grid-cols-3 gap-2 pt-2 text-center text-xs">
                  <div className="p-2 rounded-xl bg-white/10">6 Beverage Cans</div>
                  <div className="p-2 rounded-xl bg-white/10">Fresh Dairy 100%</div>
                  <div className="p-2 rounded-xl bg-white/10">Crisper Fresh</div>
                </div>
              ) : (
                <div className="text-xs text-white/45 py-3 text-center">
                  Click here to knock twice and illuminate interior without opening door
                </div>
              )}
            </button>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-white">Craft Ice™ Dual Spherical Maker</div>
                <div className="text-[11px] text-white/60">Slow-melting 50mm ice spheres (6/day)</div>
              </div>
              <button
                type="button"
                onClick={() => updateDeviceAttributes(device.id, { craftIce: !isCraftIce })}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                  isCraftIce ? 'bg-[#00D4FF] text-black' : 'bg-white/10 text-white/60'
                }`}
              >
                {isCraftIce ? 'Active' : 'Off'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 2 && (
          <div className="space-y-3">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex justify-between text-xs font-bold mb-2">
                <span className="text-white">Clean Booster™ Pop-up Fan Tilt</span>
                <span className="font-mono text-[#00D4FF]">{tiltAngle}°</span>
              </div>
              <input
                type="range"
                min={0}
                max={55}
                step={5}
                value={tiltAngle}
                onChange={(e) =>
                  updateDeviceAttributes(device.id, { cleanBoosterTilt: Number(e.target.value) })
                }
                className="w-full accent-[#00D4FF]"
              />
            </div>
          </div>
        )}

        {activeTab === 3 && (
          <div className="space-y-3">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex justify-between text-xs font-bold mb-2">
                <span className="text-white">LG Styler® Moving Hanger™ Oscillation</span>
                <span className="font-mono text-amber-400">{hangerRpm} RPM</span>
              </div>
              <input
                type="range"
                min={0}
                max={200}
                step={20}
                value={hangerRpm}
                onChange={(e) =>
                  updateDeviceAttributes(device.id, { movingHangerRpm: Number(e.target.value) })
                }
                className="w-full accent-amber-400"
              />
            </div>
          </div>
        )}
      </div>
    );
  };

  // ==========================================================================
  // 5. SMART LIGHT (WIPRO / PHILIPS HUE / WIZ) SHEET
  // ==========================================================================
  const renderSmartLightSheet = () => {
    const brightness = localBrightness;
    const currentKelvin = Number(device.liveAttributes.temp ?? 4200);
    const currentColor = device.liveAttributes.colorHex || tempToColor(currentKelvin);
    const activeScene = (device.liveAttributes.activeScene || 'Relax').toString();

    const handleBrightnessChange = (val: number) => {
      isDraggingBrightnessRef.current = true;
      setLocalBrightness(val);
      if (brightnessDebounceRef.current) {
        window.clearTimeout(brightnessDebounceRef.current);
      }
      brightnessDebounceRef.current = window.setTimeout(() => {
        isDraggingBrightnessRef.current = false;
        setDeviceLevel(device.id, val);
      }, 150);
    };

    const handleBrightnessCommit = () => {
      if (brightnessDebounceRef.current) {
        window.clearTimeout(brightnessDebounceRef.current);
        brightnessDebounceRef.current = null;
      }
      if (isDraggingBrightnessRef.current) {
        isDraggingBrightnessRef.current = false;
        setDeviceLevel(device.id, localBrightness);
      }
    };

    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-[#FF9F0A]">
              {device.protocol.toUpperCase()} · Tunable White & 16M RGB
            </div>
            <h3 className="text-xl font-extrabold text-white">{device.name}</h3>
          </div>
          <button
            type="button"
            aria-label="Toggle Light Power"
            onClick={() => toggleDevicePower(device.id)}
            style={{ backgroundColor: device.isOn ? currentColor : 'rgba(255,255,255,0.1)' }}
            className="p-3 rounded-full text-black transition-transform active:scale-95"
          >
            <Power className="w-5 h-5" />
          </button>
        </div>

        {/* Brightness Slider (150ms Debounced + Coalesced) */}
        <div className="rounded-2xl bg-white/5 p-4 border border-white/10">
          <div className="flex justify-between text-xs font-bold mb-2">
            <span className="text-white/70">Brightness</span>
            <span className="font-mono tabular-nums text-[#FF9F0A]">{brightness}%</span>
          </div>
          <input
            type="range"
            aria-label="Light Brightness Slider"
            min={1}
            max={100}
            value={brightness}
            onChange={(e) => handleBrightnessChange(Number(e.target.value))}
            onPointerUp={handleBrightnessCommit}
            onTouchEnd={handleBrightnessCommit}
            className="w-full accent-[#FF9F0A] cursor-pointer"
          />
        </div>

        {/* Kelvin Color Temperature */}
        <div className="rounded-2xl bg-white/5 p-4 border border-white/10">
          <div className="text-xs font-bold text-white/70 mb-2.5">
            Color Temperature (Kelvin CCT)
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { k: 2200, label: '2200K Candle' },
              { k: 3000, label: '3000K Warm' },
              { k: 4200, label: '4200K Neutral' },
              { k: 6500, label: '6500K Daylight' },
            ].map((preset) => {
              const col = tempToColor(preset.k);
              const sel = currentKelvin === preset.k;
              return (
                <button
                  type="button"
                  key={preset.k}
                  onClick={() =>
                    updateDeviceAttributes(device.id, {
                      temp: preset.k,
                      colorHex: col,
                    })
                  }
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border ${
                    sel ? 'border-white bg-white/15 text-white' : 'border-white/10 bg-black/30 text-white/70'
                  }`}
                >
                  <span style={{ backgroundColor: col }} className="w-3 h-3 rounded-full shrink-0" />
                  <span>{preset.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 8 Authentic House Control Swatches */}
        <div className="rounded-2xl bg-white/5 p-4 border border-white/10">
          <div className="text-xs font-bold text-white/70 mb-2.5">16M RGB Color Swatches</div>
          <div className="flex flex-wrap gap-3">
            {HOUSE_CONTROL_SWATCHES.map((hex) => (
              <button
                type="button"
                key={hex}
                aria-label={`Set color ${hex}`}
                onClick={() => updateDeviceAttributes(device.id, { colorHex: hex })}
                style={{ backgroundColor: hex }}
                className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${
                  currentColor.toUpperCase() === hex ? 'ring-2 ring-white ring-offset-2 ring-offset-[#090E1D]' : ''
                }`}
              />
            ))}
          </div>
        </div>

        {/* Wipro Scenes & 3-Pulse Flash Alert */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            {['Reading', 'Relax', 'Night Light', 'Focus Work', 'Party Mode'].map((sc) => (
              <button
                type="button"
                key={sc}
                onClick={() => updateDeviceAttributes(device.id, { activeScene: sc })}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                  activeScene === sc ? 'bg-[#FF9F0A] text-black' : 'bg-white/10 text-white/70'
                }`}
              >
                {sc}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => flashDevice(device.id)}
            className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-bold text-white"
          >
            3-Pulse Flash Alert
          </button>
        </div>
      </div>
    );
  };

  // ==========================================================================
  // 6. ONEPLUS CONNECT TV SHEET
  // ==========================================================================
  const renderOnePlusTvSheet = () => {
    const currentApp = (device.liveAttributes.currentApp || 'OxygenPlay').toString();
    const pictureMode = (device.liveAttributes.pictureMode || 'Cinema').toString();

    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-[#F50057]">OnePlus Connect · Port 8008 DIAL</div>
            <h3 className="text-xl font-extrabold text-white">{device.name}</h3>
          </div>
          <button
            type="button"
            onClick={() => toggleDevicePower(device.id)}
            className={`p-2.5 rounded-full ${
              device.isOn ? 'bg-[#F50057] text-white' : 'bg-white/10 text-white/50'
            }`}
          >
            <Power className="w-4 h-4" />
          </button>
        </div>

        {/* Virtual D-Pad Remote (Fix Bug #29: Wired to OnePlusConnectService TCP 6466 / ADB 5555) */}
        <div className="rounded-2xl bg-white/5 p-5 border border-white/10 flex flex-col items-center">
          <div className="text-xs font-bold text-white/60 mb-3">
            Virtual D-Pad Remote (TCP 6466 / ADB 5555)
          </div>
          <div className="grid grid-cols-3 gap-2 w-36 h-36 items-center justify-items-center">
            <div />
            <button
              type="button"
              aria-label="TV D-Pad Up"
              onClick={() => sendTvRemoteKey(device.id, 'DPAD_UP')}
              className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
            <div />
            <button
              type="button"
              aria-label="TV D-Pad Left"
              onClick={() => sendTvRemoteKey(device.id, 'DPAD_LEFT')}
              className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              aria-label="TV D-Pad OK"
              onClick={() => sendTvRemoteKey(device.id, 'DPAD_CENTER')}
              className="w-12 h-12 rounded-full bg-[#F50057] text-xs font-extrabold text-white shadow-lg"
            >
              OK
            </button>
            <button
              type="button"
              aria-label="TV D-Pad Right"
              onClick={() => sendTvRemoteKey(device.id, 'DPAD_RIGHT')}
              className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
            <div />
            <button
              type="button"
              aria-label="TV D-Pad Down"
              onClick={() => sendTvRemoteKey(device.id, 'DPAD_DOWN')}
              className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center"
            >
              <ArrowDown className="w-4 h-4" />
            </button>
            <div />
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => sendTvRemoteKey(device.id, 'BACK')}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => sendTvRemoteKey(device.id, 'HOME')}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white"
            >
              Home
            </button>
            <button
              type="button"
              onClick={() => sendTvRemoteKey(device.id, 'VOLUME_MUTE')}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white"
            >
              Mute
            </button>
          </div>
        </div>

        {/* OxygenPlay Quick App Switcher (Fix Bug #10 & #29: Wired to DIAL Port 8008) */}
        <div>
          <div className="text-xs font-bold text-white/70 mb-2">
            OxygenPlay Quick App Launcher (DIAL Port 8008)
          </div>
          <div className="flex flex-wrap gap-2">
            {['OxygenPlay', 'Netflix', 'YouTube', 'Prime Video', 'Disney+ Hotstar', 'Spotify'].map((app) => (
              <button
                type="button"
                key={app}
                onClick={() => launchTvApp(device.id, app)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors ${
                  currentApp === app
                    ? 'bg-[#F50057] text-white'
                    : 'bg-white/10 text-white/75 hover:text-white'
                }`}
              >
                {app}
              </button>
            ))}
          </div>
        </div>

        {/* Picture Engine Profiles */}
        <div>
          <div className="text-xs font-bold text-white/70 mb-2">Gamma Picture Engine Profile</div>
          <div className="grid grid-cols-4 gap-2">
            {['Vivid', 'Cinema', 'Standard', 'Eye Comfort'].map((mode) => (
              <button
                type="button"
                key={mode}
                onClick={() => updateDeviceAttributes(device.id, { pictureMode: mode })}
                className={`py-2 rounded-xl text-xs font-bold ${
                  pictureMode === mode ? 'bg-white text-black' : 'bg-white/10 text-white/70'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ==========================================================================
  // 7. CAMERA COCKPIT SHEET (Realme Smart Cam 360 & Philips Home Camera)
  // ==========================================================================
  const renderCameraCockpit = () => {
    const isPrivacy = !device.isOn;
    const pan = Number(device.liveAttributes.panAngle ?? 0);
    const tilt = Number(device.liveAttributes.tiltAngle ?? 0);
    const nightVision = device.liveAttributes.nightVision !== false;
    const motionTrack = device.liveAttributes.motionTrack !== false;
    const patrol360 = Boolean(device.liveAttributes.patrol360);
    const rtspUrl = device.credentials.rtspUrl || 'rtsp://admin:pass@192.168.1.120:554/live/ch0';

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-[#FFB800]">
              RTSP / ONVIF Hardware Stream · {device.liveWatts.toFixed(1)}W
            </div>
            <h3 className="text-xl font-extrabold text-white">{device.name}</h3>
          </div>
          <button
            type="button"
            onClick={() => toggleDevicePower(device.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
              isPrivacy ? 'bg-[#30D158] text-black' : 'bg-[#FF9F0A] text-black'
            }`}
          >
            {isPrivacy ? 'Resume Video' : 'Privacy Mask'}
          </button>
        </div>

        {/* 16:9 Live Viewfinder */}
        <div className="relative aspect-video w-full rounded-2xl bg-black border border-[#30D158]/50 overflow-hidden">
          <canvas ref={camCanvasRef} width={560} height={315} className="w-full h-full block" />

          {isPrivacy ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85">
              <div className="text-sm font-bold text-[#FF9F0A]">Privacy Mask Active</div>
              <div className="text-xs text-white/60 mt-1">
                Lens Tilted Down · Sensor Powered Down (2.0 W)
              </div>
            </div>
          ) : (
            <>
              <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-md bg-[#FF453A] text-[10px] font-extrabold text-white">
                  LIVE RTSP
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCamSubStream(!camSubStream)}
                    className="px-2.5 py-1 rounded-md bg-black/70 border border-[#00D4FF] text-[10px] font-bold text-[#00D4FF]"
                  >
                    {camSubStream ? 'SUB (640x360)' : 'MAIN HD (1080P)'}
                  </button>
                  <button
                    type="button"
                    aria-label="Toggle Camera Audio Mute"
                    onClick={() => setCamMuted(!camMuted)}
                    className="p-1.5 rounded-md bg-black/70 border border-white/20 text-white"
                  >
                    {camMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-[#30D158]" />}
                  </button>
                </div>
              </div>
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[11px] font-mono font-bold text-[#00D4FF]">
                <span>PAN {pan}° / TILT {tilt}°</span>
                <span>{camSubStream ? '15 FPS · 512 Kbps' : '30 FPS · 2.4 Mbps · H.264'}</span>
              </div>
            </>
          )}
        </div>

        {/* RTSP URL & Server Media Bridge Relay Info */}
        <div className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 space-y-1">
          <div className="font-mono text-xs text-white/75 truncate">{rtspUrl}</div>
          <div className="text-[11px] font-mono text-[#30D158] truncate">{rtspRelayStatus}</div>
        </div>

        {/* 360° PTZ Gimbal Pad */}
        <div className="rounded-2xl bg-white/5 p-4 border border-white/10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-white">360° PTZ Gimbal Pad</span>
            <span className="text-xs font-mono text-[#00D4FF]">
              Pan: {pan}° · Tilt: {tilt}°
            </span>
          </div>
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              aria-label="PTZ Left"
              disabled={isPrivacy}
              onClick={() => sendCameraPtz(device.id, 'left')}
              className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 flex items-center justify-center"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                aria-label="PTZ Up"
                disabled={isPrivacy}
                onClick={() => sendCameraPtz(device.id, 'up')}
                className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 flex items-center justify-center"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
              <button
                type="button"
                aria-label="PTZ Center"
                disabled={isPrivacy}
                onClick={() => sendCameraPtz(device.id, 'center')}
                className="w-11 h-11 rounded-full bg-[#FFB800]/25 border border-[#FFB800] text-[#FFB800] flex items-center justify-center"
              >
                <Crosshair className="w-4 h-4" />
              </button>
              <button
                type="button"
                aria-label="PTZ Down"
                disabled={isPrivacy}
                onClick={() => sendCameraPtz(device.id, 'down')}
                className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 flex items-center justify-center"
              >
                <ArrowDown className="w-4 h-4" />
              </button>
            </div>
            <button
              type="button"
              aria-label="PTZ Right"
              disabled={isPrivacy}
              onClick={() => sendCameraPtz(device.id, 'right')}
              className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 flex items-center justify-center"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 4 Hardware Feature Toggles */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => updateDeviceAttributes(device.id, { nightVision: !nightVision })}
            className={`py-2.5 px-3 rounded-xl text-xs font-bold border ${
              nightVision ? 'bg-[#30D158]/20 border-[#30D158] text-white' : 'bg-white/5 border-white/10 text-white/60'
            }`}
          >
            Night Vision (IR): {nightVision ? 'ON' : 'OFF'}
          </button>
          <button
            type="button"
            onClick={() => updateDeviceAttributes(device.id, { motionTrack: !motionTrack })}
            className={`py-2.5 px-3 rounded-xl text-xs font-bold border ${
              motionTrack ? 'bg-[#BF5AF2]/20 border-[#BF5AF2] text-white' : 'bg-white/5 border-white/10 text-white/60'
            }`}
          >
            AI Motion Track: {motionTrack ? 'ON' : 'OFF'}
          </button>
          <button
            type="button"
            onClick={() => updateDeviceAttributes(device.id, { patrol360: !patrol360 })}
            className={`py-2.5 px-3 rounded-xl text-xs font-bold border ${
              patrol360 ? 'bg-[#00D4FF]/20 border-[#00D4FF] text-white' : 'bg-white/5 border-white/10 text-white/60'
            }`}
          >
            360° Patrol: {patrol360 ? 'ON' : 'OFF'}
          </button>
          <button
            type="button"
            onClick={() => toggleDevicePower(device.id)}
            className={`py-2.5 px-3 rounded-xl text-xs font-bold border ${
              isPrivacy ? 'bg-[#FF9F0A]/25 border-[#FF9F0A] text-white' : 'bg-white/5 border-white/10 text-white/60'
            }`}
          >
            Privacy Mask: {isPrivacy ? 'ACTIVE' : 'OFF'}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div
      role="dialog"
      aria-label={`${device.name} Control Sheet`}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-md p-0 sm:p-4"
    >
      <div className="relative w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-[#090E1D] border border-white/15 p-6 shadow-2xl">
        {/* Close Button */}
        <button
          type="button"
          aria-label="Close Control Sheet"
          onClick={closeModal}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>

        {renderSheetContent()}

        {/* Smart Diagnosis Sub-View if active */}
        {diagnosisReport && (
          <div className="mt-5 rounded-2xl bg-[#11192E] p-4 border border-[#00D4FF]/40 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {diagnosisReport.overallHealth === 'good' ? (
                  <ShieldCheck className="w-5 h-5 text-[#30D158]" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-[#FF453A]" />
                )}
                <span className="text-sm font-bold text-white">
                  LG Smart Diagnosis™ 3.0:{' '}
                  {diagnosisReport.overallHealth === 'good'
                    ? 'Appliance in Optimal Health'
                    : `Fault Detected: Error ${diagnosisReport.activeErrorCode}`}
                </span>
              </div>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setSimulatedFault(null);
                    setDiagnosisReport(runSmartDiagnosis(device, null));
                  }}
                  className={`px-2 py-1 rounded text-[10px] font-bold ${
                    !simulatedFault ? 'bg-[#30D158] text-black' : 'bg-white/10 text-white'
                  }`}
                >
                  Normal Health
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSimulatedFault('OE');
                    setDiagnosisReport(runSmartDiagnosis(device, 'OE'));
                  }}
                  className={`px-2 py-1 rounded text-[10px] font-bold ${
                    simulatedFault === 'OE' ? 'bg-[#FF453A] text-white' : 'bg-white/10 text-white'
                  }`}
                >
                  Simulate Error OE
                </button>
              </div>
            </div>
            <p className="text-xs text-white/70">{diagnosisReport.errorSummary}</p>
            <div className="space-y-2">
              {diagnosisReport.componentChecks.map((chk) => (
                <div key={chk.componentName} className="p-2.5 rounded-xl bg-black/40 text-xs">
                  <div className="flex justify-between font-bold">
                    <span>{chk.componentName}</span>
                    <span className="font-mono text-[#30D158]">{chk.healthScore}%</span>
                  </div>
                  <div className="text-[11px] text-white/55 mt-0.5">{chk.metricDetail}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Latest Hardware Protocol Packet Strip */}
        {(() => {
          const lastPkt = hardwarePacketLog.find((p) => p.deviceId === device.id);
          if (!lastPkt) return null;
          return (
            <div className="mt-4 p-3 rounded-2xl bg-black/55 border border-[#30D158]/40 text-xs font-mono space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-[#30D158]">
                  VERIFIED HARDWARE DISPATCH · {lastPkt.transport}
                </span>
                <span className="text-white/60">{lastPkt.latencyMs}ms</span>
              </div>
              <div className="text-[11px] text-[#00D4FF] truncate">
                {lastPkt.method} {lastPkt.endpoint}
              </div>
              <div className="text-[10px] text-white/65 truncate">{lastPkt.payloadSummary}</div>
            </div>
          );
        })()}

        {/* Bottom Actions: Refresh & Remove */}
        <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => syncAllDevicesSilent()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Refresh Hardware Status</span>
          </button>
          <button
            type="button"
            onClick={() => removeDevice(device.id)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FF453A]/15 hover:bg-[#FF453A]/25 border border-[#FF453A]/40 text-xs font-semibold text-[#FF453A]"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Remove Device</span>
          </button>
        </div>
      </div>
    </div>
  );
};
