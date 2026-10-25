import React, { useState, useRef } from 'react';
import {
  Fixture3DNode,
  FloorMaterialType,
  Furniture3DProp,
  House3DTwinLayout,
  Room3DZone,
} from '../types/smartHome';
import {
  autoBindRealDevicesToLayout,
  defaultApartmentLayout,
  FLOOR_MATERIAL_COLORS,
  resolveDeterministicFixtureId,
  studioApartmentLayout,
} from '../utils/smartHomeCore';
import { useRealHome } from '../context/RealHomeContext';
import { IsometricHouse3DCanvas } from './IsometricHouse3DCanvas';
import {
  Undo2,
  Redo2,
  Code2,
  Eye,
  EyeOff,
  Check,
  Plus,
  RotateCcw,
  LayoutTemplate,
  X,
  Link2,
} from 'lucide-react';

interface FloorPlanEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FloorPlanEditorModal: React.FC<FloorPlanEditorModalProps> = ({ isOpen, onClose }) => {
  const { layout, updateLayout, devices, showToast } = useRealHome();

  const [workingLayout, setWorkingLayout] = useState<House3DTwinLayout>(() =>
    JSON.parse(JSON.stringify(layout)),
  );
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const [showMiniPreview, setShowMiniPreview] = useState<boolean>(true);
  const [selectedRoom, setSelectedRoom] = useState<Room3DZone | null>(null);
  const [selectedFixture, setSelectedFixture] = useState<Fixture3DNode | null>(null);
  const [showJsonModal, setShowJsonModal] = useState<boolean>(false);
  const [jsonText, setJsonText] = useState<string>('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [dragHud, setDragHud] = useState<string | null>(null);

  const blueprintRef = useRef<HTMLDivElement | null>(null);
  const draggingItemRef = useRef<{ kind: 'fixture' | 'furniture'; id: string } | null>(null);

  if (!isOpen) return null;

  const snapshot = () => {
    setUndoStack((prev) => [...prev.slice(-30), JSON.stringify(workingLayout)]);
    setRedoStack([]);
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const last = undoStack[undoStack.length - 1];
    setRedoStack((prev) => [...prev, JSON.stringify(workingLayout)]);
    setUndoStack((prev) => prev.slice(0, -1));
    setWorkingLayout(JSON.parse(last));
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack((prev) => [...prev, JSON.stringify(workingLayout)]);
    setRedoStack((prev) => prev.slice(0, -1));
    setWorkingLayout(JSON.parse(next));
  };

  const snapTo5cm = (normalized: number, totalMeters = 10.0) => {
    const meters = normalized * totalMeters;
    const snappedMeters = Math.round(meters / 0.05) * 0.05;
    return Math.max(0.05, Math.min(0.95, snappedMeters / totalMeters));
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const active = draggingItemRef.current;
    const el = blueprintRef.current;
    if (!active || !el) return;

    const rect = el.getBoundingClientRect();
    const rawX = (e.clientX - rect.left) / rect.width;
    const rawY = (e.clientY - rect.top) / rect.height;
    const snappedX = snapTo5cm(rawX, 10.4);
    const snappedY = snapTo5cm(rawY, 8.2);

    if (active.kind === 'fixture') {
      setWorkingLayout((prev) => ({
        ...prev,
        fixtures: prev.fixtures.map((f) =>
          f.id === active.id ? { ...f, x: snappedX, y: snappedY } : f,
        ),
      }));
      setDragHud(`Fixture: ${(snappedX * 10.4).toFixed(2)}m, ${(snappedY * 8.2).toFixed(2)}m (5cm snap)`);
    } else {
      setWorkingLayout((prev) => ({
        ...prev,
        furniture: prev.furniture.map((p) =>
          p.id === active.id ? { ...p, x: snappedX, y: snappedY } : p,
        ),
      }));
      setDragHud(`Furniture: ${(snappedX * 10.4).toFixed(2)}m, ${(snappedY * 8.2).toFixed(2)}m (5cm snap)`);
    }
  };

  const handlePointerUp = () => {
    draggingItemRef.current = null;
    setDragHud(null);
  };

  const handleAddFixture = (fixtureType: string, label: string) => {
    snapshot();
    const newFix: Fixture3DNode = {
      id: `fix_${Date.now()}`,
      label,
      fixtureType,
      roomId: workingLayout.rooms[0]?.id || 'living',
      x: 0.5,
      y: 0.5,
      zHeight: fixtureType === 'wall_ac' ? 0.82 : 0.9,
      capabilities: ['brightness'],
      kelvinTemp: 3000,
    };
    setWorkingLayout((prev) => ({
      ...prev,
      fixtures: [...prev.fixtures, newFix],
    }));
  };

  const handleAddFurniture = (type: string) => {
    snapshot();
    const newProp: Furniture3DProp = {
      id: `prop_${Date.now()}`,
      type,
      roomId: workingLayout.rooms[0]?.id || 'living',
      x: 0.48,
      y: 0.48,
      width: 0.12,
      depth: 0.1,
      height: 0.11,
      rotationDeg: 0,
    };
    setWorkingLayout((prev) => ({
      ...prev,
      furniture: [...prev.furniture, newProp],
    }));
  };

  const handleSaveAndApply = () => {
    const bound = autoBindRealDevicesToLayout(workingLayout, devices);
    updateLayout(bound);
    showToast('2D Blueprint layout & hardware links saved!');
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-label="2D Blueprint Editor"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
    >
      <div className="relative flex flex-col w-full max-w-5xl max-h-[92vh] rounded-3xl bg-[#0F172A] border border-white/15 shadow-2xl overflow-hidden">
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-white/10">
          <div>
            <h2 className="text-lg font-extrabold text-white">2D Blueprint Studio</h2>
            <p className="text-xs text-[#38BDF8] font-mono tabular-nums">
              {dragHud || '5cm snap-to-grid · Click room to inspect · Drag fixtures or link to real hardware'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Undo"
              disabled={undoStack.length === 0}
              onClick={handleUndo}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 text-white"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              aria-label="Redo"
              disabled={redoStack.length === 0}
              onClick={handleRedo}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 text-white"
            >
              <Redo2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setJsonText(JSON.stringify(workingLayout, null, 2));
                setJsonError(null);
                setShowJsonModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-[#38BDF8]"
            >
              <Code2 className="w-4 h-4" />
              <span>Blueprint JSON</span>
            </button>
            <button
              type="button"
              onClick={() => setShowMiniPreview(!showMiniPreview)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-white"
            >
              {showMiniPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              <span>{showMiniPreview ? 'Hide 3D' : 'Show 3D'}</span>
            </button>
            <button
              type="button"
              onClick={handleSaveAndApply}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0A84FF] hover:bg-[#0070E0] text-xs font-bold text-white shadow-lg"
            >
              <Check className="w-4 h-4" />
              <span>Save & Apply</span>
            </button>
            <button
              type="button"
              aria-label="Close Blueprint Editor"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Live 3D Isometric Mini Preview */}
        {showMiniPreview && (
          <div className="px-6 pt-3">
            <div className="relative h-36 rounded-2xl overflow-hidden border border-white/10">
              <IsometricHouse3DCanvas
                layout={workingLayout}
                devices={devices}
                selectedRoomId="All"
                height={144}
                isInteractive={false}
                showBadges={false}
              />
              <div className="absolute top-2 left-3 px-2.5 py-1 rounded-lg bg-black/65 text-[11px] font-semibold text-[#38BDF8]">
                Live 3D Isometric Preview ({workingLayout.name})
              </div>
            </div>
          </div>
        )}

        {/* Main 2D Blueprint & Inspector Split */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 p-6 overflow-y-auto">
          {/* 2D Architectural Grid Canvas */}
          <div
            ref={blueprintRef}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            style={{
              backgroundImage:
                'linear-gradient(to right, rgba(30, 58, 138, 0.25) 1px, transparent 1px), linear-gradient(to bottom, rgba(30, 58, 138, 0.25) 1px, transparent 1px)',
              backgroundSize: '20px 20px',
            }}
            className="lg:col-span-2 relative min-h-[340px] rounded-2xl bg-[#0B1528] border-2 border-[#1E3A8A] overflow-hidden select-none"
          >
            {/* Room Polygons */}
            {workingLayout.rooms.map((room) => {
              const r = room.gridRect;
              const isSel = selectedRoom?.id === room.id;
              const mat = FLOOR_MATERIAL_COLORS[room.floorType] || FLOOR_MATERIAL_COLORS[FloorMaterialType.oak];
              const wMeters = (r.width * 10.4).toFixed(1);
              const hMeters = (r.height * 8.2).toFixed(1);

              return (
                <button
                  type="button"
                  key={room.id}
                  onClick={() => {
                    setSelectedRoom(room);
                    setSelectedFixture(null);
                  }}
                  style={{
                    left: `${r.left * 100}%`,
                    top: `${r.top * 100}%`,
                    width: `${r.width * 100}%`,
                    height: `${r.height * 100}%`,
                    backgroundColor: `${mat.color}88`,
                    borderColor: isSel ? '#00D4FF' : '#38BDF8',
                  }}
                  className="absolute border-2 flex flex-col items-start justify-start text-left p-2.5 transition-colors hover:brightness-110 focus:outline-none"
                >
                  <span className="px-1.5 py-0.5 rounded bg-black/55 text-[11px] font-extrabold text-white drop-shadow">
                    {room.name} ({room.floorType.toUpperCase()}) · {wMeters}m × {hMeters}m
                  </span>
                </button>
              );
            })}

            {/* Furniture Nodes */}
            {workingLayout.furniture.map((furn) => (
              <div
                key={furn.id}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  snapshot();
                  draggingItemRef.current = { kind: 'furniture', id: furn.id };
                }}
                style={{
                  left: `${furn.x * 100}%`,
                  top: `${furn.y * 100}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                className="absolute z-10 px-2 py-1 rounded-md bg-[#334155]/90 border border-white/30 text-[10px] font-semibold text-white/90 cursor-move hover:border-[#38BDF8]"
              >
                {furn.type}
              </div>
            ))}

            {/* Draggable Fixture Nodes */}
            {workingLayout.fixtures.map((fix) => {
              const isLinked = Boolean(fix.linkedRealDeviceId);
              const isSel = selectedFixture?.id === fix.id;
              return (
                <div
                  key={fix.id}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    snapshot();
                    draggingItemRef.current = { kind: 'fixture', id: fix.id };
                    setSelectedFixture(fix);
                    setSelectedRoom(null);
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFixture(fix);
                    setSelectedRoom(null);
                  }}
                  style={{
                    left: `${fix.x * 100}%`,
                    top: `${fix.y * 100}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  className="absolute z-20 flex flex-col items-center cursor-move"
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center border-2 shadow-lg ${
                      isSel
                        ? 'bg-[#00D4FF] border-white text-black'
                        : isLinked
                        ? 'bg-[#0A84FF] border-[#93C5FD] text-white'
                        : 'bg-[#334155] border-white/50 text-white'
                    }`}
                  >
                    <Link2 className="w-3.5 h-3.5" />
                  </div>
                  <span className="mt-0.5 px-1.5 py-0.5 rounded bg-black/85 text-[9px] font-bold text-white whitespace-nowrap">
                    {fix.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Right Inspector & Quick Actions Panel */}
          <div className="flex flex-col gap-4">
            {/* Blueprint Templates */}
            <div className="rounded-2xl bg-white/5 p-4 border border-white/10">
              <div className="flex items-center gap-2 text-xs font-bold text-white mb-2.5">
                <LayoutTemplate className="w-4 h-4 text-[#00D4FF]" />
                <span>House Control Templates</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    snapshot();
                    setWorkingLayout(defaultApartmentLayout());
                  }}
                  className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white text-left"
                >
                  <div>5-Room Home</div>
                  <div className="text-[10px] text-white/55">home.json</div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    snapshot();
                    setWorkingLayout(studioApartmentLayout());
                  }}
                  className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white text-left"
                >
                  <div>Studio Apartment</div>
                  <div className="text-[10px] text-white/55">studio.json</div>
                </button>
              </div>
            </div>

            {/* Room Inspector */}
            {selectedRoom && (
              <div className="rounded-2xl bg-white/5 p-4 border border-[#00D4FF]/40">
                <div className="text-xs font-bold text-[#00D4FF] mb-2">
                  Room Inspector: {selectedRoom.name}
                </div>
                <label className="block text-[11px] text-white/60 mb-1">Room Name</label>
                <input
                  type="text"
                  value={selectedRoom.name}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedRoom({ ...selectedRoom, name: val });
                    setWorkingLayout((prev) => ({
                      ...prev,
                      rooms: prev.rooms.map((r) => (r.id === selectedRoom.id ? { ...r, name: val } : r)),
                    }));
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-xs text-white mb-3"
                />
                <div className="text-[11px] text-white/60 mb-1.5">Floor Material & Finish</div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { type: FloorMaterialType.oak, label: 'Oak Wood' },
                    { type: FloorMaterialType.walnut, label: 'Walnut' },
                    { type: FloorMaterialType.tile, label: 'Ceramic Tile' },
                    { type: FloorMaterialType.stone, label: 'Slate Stone' },
                  ].map((opt) => (
                    <button
                      type="button"
                      key={opt.type}
                      onClick={() => {
                        snapshot();
                        const newColor = FLOOR_MATERIAL_COLORS[opt.type].color;
                        setSelectedRoom({ ...selectedRoom, floorType: opt.type, floorColor: newColor });
                        setWorkingLayout((prev) => ({
                          ...prev,
                          rooms: prev.rooms.map((r) =>
                            r.id === selectedRoom.id
                              ? { ...r, floorType: opt.type, floorColor: newColor }
                              : r,
                          ),
                        }));
                      }}
                      className={`px-2.5 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                        selectedRoom.floorType === opt.type
                          ? 'bg-[#0A84FF]/25 border-[#0A84FF] text-white'
                          : 'bg-black/30 border-white/10 text-white/70'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Fixture Hardware Linker */}
            {selectedFixture && (
              <div className="rounded-2xl bg-white/5 p-4 border border-[#30D158]/40">
                <div className="text-xs font-bold text-[#30D158] mb-2">
                  Hardware Linker: {selectedFixture.label}
                </div>
                <label className="block text-[11px] text-white/60 mb-1">
                  Bound Real Smart Device
                </label>
                <select
                  aria-label="Bound Real Smart Device"
                  value={selectedFixture.linkedRealDeviceId || ''}
                  onChange={(e) => {
                    snapshot();
                    const devId = e.target.value || null;
                    const devObj = devices.find((d) => d.id === devId);
                    const nextLabel = devObj ? devObj.name : selectedFixture.label;
                    setSelectedFixture({
                      ...selectedFixture,
                      linkedRealDeviceId: devId,
                      label: nextLabel,
                    });
                    setWorkingLayout((prev) => ({
                      ...prev,
                      fixtures: prev.fixtures.map((f) =>
                        f.id === selectedFixture.id
                          ? { ...f, linkedRealDeviceId: devId, label: nextLabel }
                          : f,
                      ),
                    }));
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-xs text-white"
                >
                  <option value="">Unlinked (Visual Node Only)</option>
                  {devices.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.room})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Add Fixtures & Furniture */}
            <div className="rounded-2xl bg-white/5 p-4 border border-white/10">
              <div className="flex items-center gap-1.5 text-xs font-bold text-white mb-2.5">
                <Plus className="w-4 h-4 text-[#38BDF8]" />
                <span>Add to Floor Plan</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => handleAddFixture('ceiling_light', 'Ceiling Light')}
                  className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-[11px] font-medium text-white"
                >
                  + Ceiling Light
                </button>
                <button
                  type="button"
                  onClick={() => handleAddFixture('wall_ac', 'Wall AC')}
                  className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-[11px] font-medium text-white"
                >
                  + Wall AC
                </button>
                <button
                  type="button"
                  onClick={() => handleAddFurniture('sofa')}
                  className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-[11px] font-medium text-white"
                >
                  + Sofa
                </button>
                <button
                  type="button"
                  onClick={() => handleAddFurniture('bed')}
                  className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-[11px] font-medium text-white"
                >
                  + Bed
                </button>
                <button
                  type="button"
                  onClick={() => {
                    snapshot();
                    setWorkingLayout(defaultApartmentLayout());
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-[11px] font-medium text-[#FF9F0A] flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Default</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* JSON Schema Import/Export Sub-Modal */}
        {showJsonModal && (
          <div className="absolute inset-0 z-30 flex flex-col bg-[#0D1322] p-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-base font-bold text-white">House Control Blueprint JSON Schema</h3>
                <p className="text-xs text-white/60">
                  Export, backup, or import native House Control home.json / studio.json schemas.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowJsonModal(false)}
                className="p-2 rounded-xl bg-white/10 text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {jsonError && (
              <div className="mb-2 px-3 py-2 rounded-xl bg-[#FF453A]/20 border border-[#FF453A] text-xs text-[#FF453A]">
                {jsonError}
              </div>
            )}
            <textarea
              aria-label="Blueprint JSON Schema"
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              className="flex-1 w-full p-4 rounded-2xl bg-black/50 border border-white/15 font-mono text-xs text-[#93C5FD] focus:outline-none"
            />
            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowJsonModal(false)}
                className="px-4 py-2 rounded-xl bg-white/10 text-xs font-semibold text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  try {
                    const parsed = JSON.parse(jsonText);
                    if (parsed && Array.isArray(parsed.rooms)) {
                      snapshot();
                      // Fix Bug #14: Deterministic fixture ID resolution on blueprint import
                      if (Array.isArray(parsed.fixtures)) {
                        parsed.fixtures = parsed.fixtures.map((f: any, idx: number) => ({
                          ...f,
                          id: resolveDeterministicFixtureId(f, idx),
                        }));
                      }
                      const bound = autoBindRealDevicesToLayout(parsed, devices);
                      setWorkingLayout(bound);
                      setShowJsonModal(false);
                      showToast('Blueprint imported & auto-bound to real hardware!');
                    } else {
                      setJsonError('Invalid blueprint schema: missing rooms array');
                    }
                  } catch (err: any) {
                    setJsonError(`JSON Parse Error: ${err.message}`);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-[#0A84FF] text-xs font-bold text-white"
              >
                Import & Apply
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
