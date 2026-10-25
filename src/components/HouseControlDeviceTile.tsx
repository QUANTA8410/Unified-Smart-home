import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RealSmartDevice, UniversalDeviceArchetype } from '../types/smartHome';
import { UniversalCategoryClassifier } from '../utils/smartHomeCore';
import {
  Lightbulb,
  Snowflake,
  Fan,
  WashingMachine,
  Refrigerator,
  Tv,
  Speaker,
  Bot,
  Video,
  Lock,
  Blinds,
  Zap,
  Minus,
  Plus,
  Play,
  Pause,
  Power,
} from 'lucide-react';

interface HouseControlDeviceTileProps {
  device: RealSmartDevice;
  onTap: () => void;
  onPowerToggle: () => void;
  onLevelChanged?: (val: number) => void;
  onTempChanged?: (temp: number) => void;
}

export const HouseControlDeviceTile: React.FC<HouseControlDeviceTileProps> = ({
  device,
  onTap,
  onPowerToggle,
  onLevelChanged,
  onTempChanged,
}) => {
  const archetype = UniversalCategoryClassifier.classify(device);
  const tint = UniversalCategoryClassifier.colorFor(archetype);
  const isAc = archetype === UniversalDeviceArchetype.climateAc || device.category === 'ac';
  const isWasher = archetype === UniversalDeviceArchetype.laundry || device.category === 'washer';
  const isLight = archetype === UniversalDeviceArchetype.lighting || device.category === 'light';
  const isOn = device.isOn;

  // 150ms debounced slider state to prevent hardware packet flooding while dragging
  const [localLevel, setLocalLevel] = useState<number>(() => Math.round(device.primaryValue));
  const debounceTimerRef = useRef<number | null>(null);
  const isDraggingRef = useRef<boolean>(false);

  useEffect(() => {
    if (!isDraggingRef.current) {
      setLocalLevel(Math.round(device.primaryValue));
    }
  }, [device.primaryValue]);

  const handleSliderChange = useCallback(
    (nextVal: number) => {
      isDraggingRef.current = true;
      setLocalLevel(nextVal);
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = window.setTimeout(() => {
        isDraggingRef.current = false;
        onLevelChanged?.(nextVal);
      }, 150);
    },
    [onLevelChanged],
  );

  const handleSliderCommit = useCallback(() => {
    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      onLevelChanged?.(localLevel);
    }
  }, [localLevel, onLevelChanged]);

  const levelFraction = Math.max(0.02, Math.min(1, localLevel / 100));

  const renderIcon = () => {
    const cls = 'w-5 h-5';
    switch (archetype) {
      case UniversalDeviceArchetype.lighting:
        return <Lightbulb className={cls} />;
      case UniversalDeviceArchetype.climateAc:
        return <Snowflake className={cls} />;
      case UniversalDeviceArchetype.fanAir:
        return <Fan className={cls} />;
      case UniversalDeviceArchetype.laundry:
        return <WashingMachine className={cls} />;
      case UniversalDeviceArchetype.refrigeration:
        return <Refrigerator className={cls} />;
      case UniversalDeviceArchetype.tvMedia:
        return <Tv className={cls} />;
      case UniversalDeviceArchetype.speakerAudio:
        return <Speaker className={cls} />;
      case UniversalDeviceArchetype.robotVacuum:
        return <Bot className={cls} />;
      case UniversalDeviceArchetype.cameraSecurity:
        return <Video className={cls} />;
      case UniversalDeviceArchetype.lockAccess:
        return <Lock className={cls} />;
      case UniversalDeviceArchetype.curtainShade:
        return <Blinds className={cls} />;
      default:
        return <Zap className={cls} />;
    }
  };

  const getSubtitle = () => {
    if (!device.isOnline) return `Offline · ${device.room}`;
    if (!isOn) return `Off · ${device.room} · Standby`;

    switch (archetype) {
      case UniversalDeviceArchetype.lighting:
        return `On · ${Math.round(device.primaryValue)}% · ${device.liveWatts.toFixed(1)}W`;
      case UniversalDeviceArchetype.climateAc: {
        const wf = device.liveAttributes.windFree ? ' · WindFree™' : '';
        return `Cool · ${Math.round(device.primaryValue)}°C${wf} · ${device.liveWatts.toFixed(0)}W`;
      }
      case UniversalDeviceArchetype.laundry: {
        const stage = (device.liveAttributes.stage || 'Wash').toString();
        const min = device.liveAttributes.remainingMinutes ?? 24;
        return `${stage.toUpperCase()} · ${min}m left · ${device.liveWatts.toFixed(0)}W`;
      }
      case UniversalDeviceArchetype.refrigeration: {
        const ft = device.liveAttributes.fridgeTemp ?? 3;
        const fzt = device.liveAttributes.freezerTemp ?? -19;
        return `${ft}°C / ${fzt}°C · ${device.liveWatts.toFixed(0)}W`;
      }
      case UniversalDeviceArchetype.tvMedia:
        return device.liveAttributes.artMode
          ? `Art Mode (${device.liveAttributes.selectedArtwork || 'Starry Night'}) · ${device.liveWatts.toFixed(0)}W`
          : `${device.liveAttributes.currentApp || 'OxygenPlay'} · ${device.liveWatts.toFixed(0)}W`;
      case UniversalDeviceArchetype.cameraSecurity:
        return `1080p RTSP Stream · Pan ${device.liveAttributes.panAngle ?? 0}° · ${device.liveWatts.toFixed(1)}W`;
      default:
        return `Active · ${device.liveWatts.toFixed(1)}W`;
    }
  };

  return (
    <div
      style={{
        borderColor: isOn ? `${tint}70` : 'rgba(255, 255, 255, 0.08)',
        backgroundColor: isOn ? '#121B2E' : '#0F1522',
        boxShadow: isOn ? `0 8px 24px -6px ${tint}30` : undefined,
      }}
      className="relative flex flex-col justify-center min-h-[78px] px-4 py-3 rounded-[22px] border transition-all duration-200 overflow-hidden"
    >
      <div className="flex items-center justify-between gap-3">
        {/* Left Glowing Squircle Power Toggle Button */}
        <button
          type="button"
          aria-label={`Toggle power for ${device.name}`}
          onClick={(e) => {
            e.stopPropagation();
            onPowerToggle();
          }}
          style={{
            backgroundColor: isOn ? tint : 'rgba(255, 255, 255, 0.08)',
            boxShadow: isOn ? `0 0 16px ${tint}88` : undefined,
          }}
          className={`w-11 h-11 rounded-[14px] flex items-center justify-center shrink-0 transition-transform active:scale-95 ${
            isOn ? 'text-[#0A0E1A]' : 'text-white/60 hover:text-white'
          }`}
        >
          {renderIcon()}
        </button>

        {/* Middle Title & Subtitle (Opens Deep Sheet) */}
        <button
          type="button"
          onClick={onTap}
          className="flex-1 min-w-0 text-left focus:outline-none group"
        >
          <div className="text-sm font-semibold text-[#F3F5FA] truncate group-hover:text-[#5AA2FF] transition-colors">
            {device.name}
          </div>
          <div className="text-xs font-medium text-white/65 truncate font-mono tabular-nums mt-0.5">
            {getSubtitle()}
          </div>
        </button>

        {/* Right Controls */}
        {isAc && (
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              aria-label={`Decrease ${device.name} temperature`}
              disabled={!isOn}
              onClick={() => onTempChanged?.(Math.max(16, device.primaryValue - 1))}
              className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-30 flex items-center justify-center text-white transition-colors"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="w-10 text-center text-sm font-bold font-mono tabular-nums text-white">
              {Math.round(device.primaryValue)}°
            </span>
            <button
              type="button"
              aria-label={`Increase ${device.name} temperature`}
              disabled={!isOn}
              onClick={() => onTempChanged?.(Math.min(30, device.primaryValue + 1))}
              className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-30 flex items-center justify-center text-white transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              aria-label={`Open ${device.name} Climate Controls`}
              onClick={onTap}
              className="ml-1 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white whitespace-nowrap"
            >
              Controls
            </button>
          </div>
        )}

        {isWasher && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              aria-label={`${isOn ? 'Pause' : 'Start'} ${device.name}`}
              onClick={onPowerToggle}
              style={{
                borderColor: isOn ? `${tint}80` : 'rgba(255,255,255,0.15)',
                color: isOn ? tint : 'rgba(255,255,255,0.7)',
              }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border text-xs font-bold whitespace-nowrap transition-colors"
            >
              {isOn ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isOn ? 'Pause' : 'Start'}</span>
            </button>
            <button
              type="button"
              aria-label={`Inspect ${device.name}`}
              onClick={onTap}
              className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white whitespace-nowrap"
            >
              Cycles
            </button>
          </div>
        )}

        {isLight && (
          <div className="flex items-center gap-2 shrink-0">
            {isOn && (
              <input
                type="range"
                aria-label={`${device.name} brightness`}
                min={5}
                max={100}
                value={localLevel}
                onChange={(e) => handleSliderChange(Number(e.target.value))}
                onPointerUp={handleSliderCommit}
                onTouchEnd={handleSliderCommit}
                className="w-20 accent-[#FF9F0A] cursor-pointer"
              />
            )}
            <button
              type="button"
              onClick={onTap}
              className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold font-mono tabular-nums text-[#FF9F0A] whitespace-nowrap"
            >
              {isOn ? `${localLevel}%` : 'Color'}
            </button>
          </div>
        )}

        {!isAc && !isWasher && !isLight && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onTap}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white whitespace-nowrap"
            >
              Open Cockpit
            </button>
            <button
              type="button"
              aria-label={`Power ${device.name}`}
              onClick={onPowerToggle}
              className={`p-2 rounded-full transition-colors ${
                isOn ? 'bg-[#30D158]/25 text-[#30D158]' : 'bg-white/10 text-white/50'
              }`}
            >
              <Power className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Bottom Dimmable Level Bar (.tile-level) */}
      {isLight && isOn && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/5">
          <div
            style={{
              width: `${Math.round(levelFraction * 100)}%`,
              backgroundColor: tint,
              boxShadow: `0 0 8px ${tint}`,
            }}
            className="h-full transition-all duration-150"
          />
        </div>
      )}
    </div>
  );
};
