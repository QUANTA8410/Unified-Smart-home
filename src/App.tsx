import React, { useState } from 'react';
import { RealHomeProvider, useRealHome } from './context/RealHomeContext';
import { LiquidGlassSplashScreen } from './components/LiquidGlassSplashScreen';
import { IsometricHouse3DCanvas } from './components/IsometricHouse3DCanvas';
import { HouseControlDeviceTile } from './components/HouseControlDeviceTile';
import { AnimatedPowerFlowCard } from './components/AnimatedPowerFlowCard';
import { FloorPlanEditorModal } from './components/FloorPlanEditorModal';
import { DeviceControlSheetModal } from './components/DeviceControlSheets';
import { UniversalQrScannerModal } from './components/UniversalQrScannerModal';
import { PairDeviceAndOAuthModal } from './components/PairDeviceAndOAuthModal';
import { NodeServerAndOtaModal } from './components/NodeServerAndOtaModal';
import { AutomationsTabView } from './components/AutomationsTabView';
import {
  Home,
  Box,
  Zap,
  Plus,
  Layers,
  Power,
  QrCode,
  Sun,
  Coffee,
  Film,
  Moon,
  DoorOpen,
  RotateCcw,
} from 'lucide-react';

const AppleGlassHomeShell: React.FC = () => {
  const {
    devices,
    layout,
    selectedRoom,
    setSelectedRoom,
    activeScene,
    applyScene,
    toggleDevicePower,
    setDeviceLevel,
    clearAllDevices,
    loadSampleSmartHome,
    syncAllDevicesSilent,
    totalLiveWatts,
    setActiveControlDevice,
    setStudioSheetMode,
    toastMessage,
  } = useRealHome();

  const [tabIndex, setTabIndex] = useState<number>(0);
  const [showPowerFlow, setShowPowerFlow] = useState<boolean>(false);
  const [blueprintOpen, setBlueprintOpen] = useState<boolean>(false);
  const [pairModalOpen, setPairModalOpen] = useState<boolean>(false);
  const [qrModalOpen, setQrModalOpen] = useState<boolean>(false);
  const [qrProviderFilter, setQrProviderFilter] = useState<string>('all');
  const [hubModalOpen, setHubModalOpen] = useState<boolean>(false);
  const [hubInitialTab, setHubInitialTab] = useState<'node' | 'ota' | 'copilot' | 'audit'>('node');
  const [mapCameraPreset, setMapCameraPreset] = useState<{
    yaw?: number;
    pitch?: number;
    zoom?: number;
  } | null>(null);

  const activeCount = devices.filter((d) => d.isOn).length;
  const acDevice = devices.find((d) => d.category === 'ac');
  const acTemp = acDevice && acDevice.primaryValue > 0 ? acDevice.primaryValue : 23.0;

  const filteredDevices =
    selectedRoom === 'All'
      ? devices
      : devices.filter((d) => d.room.toLowerCase().includes(selectedRoom.toLowerCase()));

  const handleMasterPower = () => {
    const anyOn = devices.some((d) => d.isOn);
    devices.forEach((d) => {
      if (anyOn && d.isOn) {
        toggleDevicePower(d.id);
      } else if (!anyOn && !d.isOn) {
        toggleDevicePower(d.id);
      }
    });
  };

  const handleBulkRoomPower = (turnOn: boolean) => {
    filteredDevices.forEach((d) => {
      if (d.isOn !== turnOn) {
        toggleDevicePower(d.id);
      }
    });
  };

  const scenes = [
    { id: 'Bright', name: 'Bright', icon: Sun, color: '#FFD60A' },
    { id: 'Cozy', name: 'Cozy', icon: Coffee, color: '#FF9F0A' },
    { id: 'Movie', name: 'Movie', icon: Film, color: '#BF5AF2' },
    { id: 'Night', name: 'Night', icon: Moon, color: '#5E5CE6' },
    { id: 'Away', name: 'Away', icon: DoorOpen, color: '#FF453A' },
  ];

  const roomsList = ['All', 'Living', 'Bedroom', 'Kitchen', 'Laundry', 'Bathroom'];

  return (
    <div className="relative min-h-screen w-full bg-[#070B14] text-white">
      {/* Ambient Circadian Refraction Orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-20 -left-16 w-80 h-80 rounded-full bg-[#0A84FF]/20 blur-[90px]" />
        <div className="absolute top-64 -right-20 w-80 h-80 rounded-full bg-[#30D158]/15 blur-[90px]" />
        <div className="absolute bottom-16 left-20 w-72 h-72 rounded-full bg-[#5E5CE6]/15 blur-[90px]" />
      </div>

      {/* Top Navigation Bar (Strict 3-Zone Contract) */}
      <header className="relative z-20 flex items-center justify-between gap-8 max-w-7xl mx-auto px-6 py-4 border-b border-white/10">
        {/* Zone 1: Single text element Brand wordmark */}
        <a
          href="#home"
          onClick={(e) => {
            e.preventDefault();
            setTabIndex(0);
          }}
          className="text-lg font-extrabold tracking-tight text-white whitespace-nowrap shrink-0"
        >
          Unified Smart Home
        </a>

        {/* Zone 2: 5 concise single-line navigation links */}
        <nav aria-label="Main Navigation" className="hidden md:flex items-center gap-6 text-sm font-semibold text-white/70">
          <button
            type="button"
            onClick={() => setTabIndex(0)}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${
              tabIndex === 0 ? 'text-white underline underline-offset-8 decoration-[#0A84FF] decoration-2' : ''
            }`}
          >
            My Home
          </button>
          <button
            type="button"
            onClick={() => setTabIndex(1)}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${
              tabIndex === 1 ? 'text-white underline underline-offset-8 decoration-[#0A84FF] decoration-2' : ''
            }`}
          >
            3D Spatial Twin
          </button>
          <button
            type="button"
            onClick={() => setTabIndex(2)}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${
              tabIndex === 2 ? 'text-white underline underline-offset-8 decoration-[#0A84FF] decoration-2' : ''
            }`}
          >
            Automations
          </button>
          <button
            type="button"
            onClick={() => {
              setHubInitialTab('node');
              setHubModalOpen(true);
            }}
            className="hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            24/7 Hub & OTA
          </button>
          <button
            type="button"
            onClick={() => {
              setHubInitialTab('copilot');
              setHubModalOpen(true);
            }}
            className="hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            AI Copilot
          </button>
        </nav>

        {/* Zone 3: 1 primary CTA action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setPairModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0A84FF] hover:bg-[#0070E0] text-xs font-bold text-white shadow-lg shadow-[#0A84FF]/25 transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Pair Device</span>
          </button>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-5 pb-28">
        {/* ===================================================================
            TAB 0: MY HOME DASHBOARD
            =================================================================== */}
        {tabIndex === 0 && (
          <div className="space-y-6">
            {/* 1. Hero 3D Stage & Overlaid Top Header */}
            <div className="relative rounded-[28px] overflow-hidden border border-white/15 bg-[#090E1D] shadow-2xl">
              <IsometricHouse3DCanvas
                layout={layout}
                devices={devices}
                selectedRoomId={selectedRoom}
                height={390}
                onRoomSelected={setSelectedRoom}
                onFixtureTap={(fix, dev) => {
                  if (dev) toggleDevicePower(dev.id);
                }}
                onFixtureInspect={(fix, dev) => {
                  if (dev) {
                    setStudioSheetMode('default');
                    setActiveControlDevice(dev);
                  }
                }}
                onOpenBlueprintEditor={() => setBlueprintOpen(true)}
              />

              {/* Overlaid House Control Header */}
              <div className="absolute top-3.5 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
                <div className="flex items-center gap-3 pointer-events-auto bg-black/55 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/15">
                  <div className="w-9 h-9 rounded-xl bg-[#0A84FF]/25 border border-[#0A84FF]/50 flex items-center justify-center text-white">
                    <Home className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-base font-extrabold text-white leading-tight">My Home</div>
                    <div className="text-xs font-semibold text-white/75 font-mono tabular-nums">
                      {activeCount} active · {acTemp.toFixed(0)}°C · {Math.round(totalLiveWatts)}W
                    </div>
                  </div>
                </div>

                {/* Action Toolbar */}
                <div className="flex items-center gap-2 pointer-events-auto">
                  <button
                    type="button"
                    aria-label="Scan Appliance QR Code"
                    onClick={() => {
                      setQrProviderFilter('all');
                      setQrModalOpen(true);
                    }}
                    className="w-10 h-10 rounded-xl bg-black/60 hover:bg-black/80 border border-white/15 flex items-center justify-center text-[#00D4FF] transition-colors"
                    title="Scan Appliance QR Code"
                  >
                    <QrCode className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    aria-label="Edit 2D Floor Plan"
                    onClick={() => setBlueprintOpen(true)}
                    className="w-10 h-10 rounded-xl bg-black/60 hover:bg-black/80 border border-white/15 flex items-center justify-center text-white transition-colors"
                    title="2D Blueprint Studio"
                  >
                    <Layers className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    aria-label="Toggle Live Power Topology"
                    onClick={() => setShowPowerFlow(!showPowerFlow)}
                    className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-colors ${
                      showPowerFlow
                        ? 'bg-[#30D158]/30 border-[#30D158] text-[#30D158]'
                        : 'bg-black/60 hover:bg-black/80 border-white/15 text-white'
                    }`}
                    title="Live Power Topology"
                  >
                    <Zap className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    aria-label="Sync Hardware Telemetry"
                    onClick={syncAllDevicesSilent}
                    className="w-10 h-10 rounded-xl bg-black/60 hover:bg-black/80 border border-white/15 flex items-center justify-center text-white transition-colors"
                    title="Sync Real Hardware Status"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>

                  {/* Circular Master Power Button */}
                  <button
                    type="button"
                    aria-label="Master Home Power Toggle"
                    onClick={handleMasterPower}
                    className={`w-11 h-11 rounded-full flex items-center justify-center border transition-all ${
                      activeCount > 0
                        ? 'bg-gradient-to-b from-[#5AA2FF] to-[#2F7BF2] border-[#90C2FF] text-white shadow-[0_0_18px_rgba(47,123,242,0.6)]'
                        : 'bg-white/10 border-white/20 text-white/50'
                    }`}
                    title="Master Power Toggle"
                  >
                    <Power className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* 2. Scenes Row & Rooms Filter Bar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* 5 House Control Mood Scenes */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {scenes.map((s) => {
                  const Icon = s.icon;
                  const isSel = activeScene === s.id;
                  return (
                    <button
                      type="button"
                      key={s.id}
                      onClick={() => applyScene(s.id)}
                      style={{
                        borderColor: isSel ? s.color : 'rgba(255,255,255,0.1)',
                        backgroundColor: isSel ? `${s.color}28` : 'rgba(255,255,255,0.05)',
                      }}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border text-xs font-bold text-white transition-all whitespace-nowrap shrink-0"
                    >
                      <Icon style={{ color: isSel ? s.color : '#FFFFFF' }} className="w-4 h-4" />
                      <span>{s.name}</span>
                    </button>
                  );
                })}
              </div>

              {/* Room Filter Buttons */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {roomsList.map((room) => {
                  const isSel = selectedRoom.toLowerCase() === room.toLowerCase();
                  const count = devices.filter((d) => {
                    if (!d.isOn) return false;
                    if (room === 'All') return true;
                    return d.room.toLowerCase().includes(room.toLowerCase());
                  }).length;

                  return (
                    <button
                      type="button"
                      key={room}
                      onClick={() => setSelectedRoom(room)}
                      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
                        isSel
                          ? 'bg-[#2F7BF2] text-white shadow-md shadow-[#2F7BF2]/30'
                          : 'bg-white/[0.06] text-white/70 hover:text-white'
                      }`}
                    >
                      <span>{room}</span>
                      {count > 0 && (
                        <span className="font-mono tabular-nums text-[11px] opacity-90">
                          ({count})
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Optional Collapsible Live Power Topology */}
            {showPowerFlow && <AnimatedPowerFlowCard devices={devices} />}

            {/* 4. Device Fleet Header & Quick Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-extrabold text-white">
                {selectedRoom === 'All'
                  ? `All Connected Appliances (${filteredDevices.length})`
                  : `${selectedRoom} Appliances (${filteredDevices.length})`}
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleBulkRoomPower(true)}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-[#30D158] whitespace-nowrap"
                >
                  All on
                </button>
                <button
                  type="button"
                  onClick={() => handleBulkRoomPower(false)}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-[#FF453A] whitespace-nowrap"
                >
                  All off
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setHubInitialTab('audit');
                    setHubModalOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-[#00D4FF]/15 hover:bg-[#00D4FF]/25 border border-[#00D4FF]/40 text-xs font-bold text-[#00D4FF] whitespace-nowrap"
                >
                  39-Bug Audit & Live Packets
                </button>
                {devices.length > 0 ? (
                  <button
                    type="button"
                    onClick={clearAllDevices}
                    className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-white/60 hover:text-white whitespace-nowrap"
                  >
                    Clear Sample Fleet
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={loadSampleSmartHome}
                    className="px-3 py-1.5 rounded-xl bg-[#0A84FF] text-xs font-bold text-white whitespace-nowrap"
                  >
                    Load Sample Smart Home
                  </button>
                )}
              </div>
            </div>

            {/* 5. Connected Appliances Grid */}
            {filteredDevices.length === 0 ? (
              <div className="glass-panel rounded-3xl p-10 text-center space-y-4">
                <div className="text-lg font-extrabold text-white">
                  No Devices in {selectedRoom}
                </div>
                <p className="text-xs text-white/65 max-w-md mx-auto">
                  Click "Pair Device" to connect your Samsung SmartThings account, LG ThinQ PAT, Wipro Next bulb, Philips Hue bridge, or RTSP camera, or load the sample fleet.
                </p>
                <div className="flex justify-center gap-3">
                  <button
                    type="button"
                    onClick={loadSampleSmartHome}
                    className="px-5 py-2.5 rounded-2xl bg-[#0A84FF] text-xs font-extrabold text-white"
                  >
                    Load Sample Smart Home (Samsung & LG Fleet)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPairModalOpen(true)}
                    className="px-5 py-2.5 rounded-2xl bg-white/10 text-xs font-bold text-white"
                  >
                    Pair Real Hardware
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredDevices.map((dev) => (
                  <HouseControlDeviceTile
                    key={dev.id}
                    device={dev}
                    onTap={() => {
                      setStudioSheetMode('default');
                      setActiveControlDevice(dev);
                    }}
                    onPowerToggle={() => toggleDevicePower(dev.id)}
                    onLevelChanged={(val) => setDeviceLevel(dev.id, val)}
                    onTempChanged={(temp) => setDeviceLevel(dev.id, temp)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===================================================================
            TAB 1: 3D SPATIAL DIGITAL TWIN MAP VIEW
            =================================================================== */}
        {tabIndex === 1 && (
          <div className="space-y-4">
            {/* Top 3D Map Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setBlueprintOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-[#00D4FF]/20 border border-[#00D4FF] text-xs font-bold text-white whitespace-nowrap"
                >
                  <Layers className="w-4 h-4 text-[#00D4FF]" />
                  <span>2D Blueprint Studio</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleBulkRoomPower(true)}
                  className="px-3.5 py-2 rounded-2xl bg-white/10 hover:bg-white/15 text-xs font-bold text-[#30D158] whitespace-nowrap"
                >
                  All On
                </button>
                <button
                  type="button"
                  onClick={() => handleBulkRoomPower(false)}
                  className="px-3.5 py-2 rounded-2xl bg-white/10 hover:bg-white/15 text-xs font-bold text-[#FF453A] whitespace-nowrap"
                >
                  All Off
                </button>
              </div>

              {/* Camera Presets */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMapCameraPreset({ yaw: -0.59, pitch: 0.82, zoom: 1.0 })}
                  className="px-3 py-2 rounded-2xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white whitespace-nowrap"
                >
                  Isometric 3D
                </button>
                <button
                  type="button"
                  onClick={() => setMapCameraPreset({ yaw: 0.0, pitch: 0.18, zoom: 1.05 })}
                  className="px-3 py-2 rounded-2xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white whitespace-nowrap"
                >
                  Top Blueprint
                </button>
                <button
                  type="button"
                  onClick={() => setMapCameraPreset({ yaw: 0.0, pitch: 1.22, zoom: 1.1 })}
                  className="px-3 py-2 rounded-2xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white whitespace-nowrap"
                >
                  Elevation Front
                </button>
              </div>
            </div>

            {/* Full-Screen 3D Dollhouse Viewport */}
            <div className="rounded-3xl overflow-hidden border border-white/15 shadow-2xl">
              <IsometricHouse3DCanvas
                layout={layout}
                devices={devices}
                selectedRoomId={selectedRoom}
                height={540}
                cameraOverride={mapCameraPreset}
                onRoomSelected={setSelectedRoom}
                onFixtureTap={(fix, dev) => {
                  if (dev) toggleDevicePower(dev.id);
                }}
                onFixtureInspect={(fix, dev) => {
                  if (dev) {
                    setStudioSheetMode('default');
                    setActiveControlDevice(dev);
                  }
                }}
                onOpenBlueprintEditor={() => setBlueprintOpen(true)}
              />
            </div>

            {/* Bottom Room Camera Zoom Selector */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {['All', ...layout.rooms.map((r) => r.name)].map((rName) => {
                const isSel = selectedRoom.toLowerCase() === rName.toLowerCase();
                return (
                  <button
                    type="button"
                    key={rName}
                    onClick={() => setSelectedRoom(rName)}
                    className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-colors ${
                      isSel
                        ? 'bg-[#00D4FF] text-black'
                        : 'bg-white/10 text-white/75 hover:text-white'
                    }`}
                  >
                    {rName === 'All' ? 'All Rooms Overview' : rName}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ===================================================================
            TAB 2: SMART AUTOMATIONS & REFLEX STUDIO
            =================================================================== */}
        {tabIndex === 2 && <AutomationsTabView />}
      </main>

      {/* Bottom Apple Liquid Glass Dock */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30">
        <div className="glass-panel rounded-full px-3 py-2 flex items-center gap-2 shadow-2xl">
          {[
            { idx: 0, label: 'Home', icon: Home },
            { idx: 1, label: '3D Map', icon: Box },
            { idx: 2, label: 'Automations', icon: Zap },
          ].map((item) => {
            const Icon = item.icon;
            const selected = tabIndex === item.idx;
            return (
              <button
                type="button"
                key={item.idx}
                onClick={() => setTabIndex(item.idx)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                  selected
                    ? 'bg-white/25 text-white shadow-inner'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-2xl bg-[#101935]/95 border border-white/25 text-xs font-bold text-white shadow-2xl whitespace-nowrap"
        >
          {toastMessage}
        </div>
      )}

      {/* Modals & Deep Control Sheets */}
      <DeviceControlSheetModal />
      <FloorPlanEditorModal isOpen={blueprintOpen} onClose={() => setBlueprintOpen(false)} />
      <UniversalQrScannerModal
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        initialProvider={qrProviderFilter}
      />
      <PairDeviceAndOAuthModal
        isOpen={pairModalOpen}
        onClose={() => setPairModalOpen(false)}
        onOpenQrScanner={(provId) => {
          setQrProviderFilter(provId || 'all');
          setQrModalOpen(true);
        }}
      />
      <NodeServerAndOtaModal
        isOpen={hubModalOpen}
        onClose={() => setHubModalOpen(false)}
        initialTab={hubInitialTab}
      />
    </div>
  );
};

export default function App() {
  return (
    <RealHomeProvider>
      <LiquidGlassSplashScreen>
        <AppleGlassHomeShell />
      </LiquidGlassSplashScreen>
    </RealHomeProvider>
  );
}
