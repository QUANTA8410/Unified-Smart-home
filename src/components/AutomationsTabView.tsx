import React, { useState } from 'react';
import {
  MultiConditionAutomationRule,
  PreconditionKind,
  SmartActionStep,
  TriggerKind,
} from '../types/smartHome';
import { useRealHome } from '../context/RealHomeContext';
import {
  Sparkles,
  Plus,
  Play,
  Trash2,
  Edit3,
  Wifi,
  History,
  CheckCircle2,
  X,
} from 'lucide-react';

export const AutomationsTabView: React.FC = () => {
  const {
    devices,
    multiConditionRules,
    addMultiConditionRule,
    updateMultiConditionRule,
    deleteMultiConditionRule,
    toggleMultiConditionRule,
    executeMultiConditionRuleNow,
    parseAndAddNaturalLanguageRule,
    executionLogs,
    reflexRules,
    toggleReflexRule,
    isUserAtHome,
    homeRouterBssid,
    lockCurrentBssidAsHome,
    togglePresenceSimulation,
    showToast,
  } = useRealHome();

  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [studioOpen, setStudioOpen] = useState<boolean>(false);
  const [editingRule, setEditingRule] = useState<MultiConditionAutomationRule | null>(null);

  // Rule Studio Form State
  const [ruleName, setRuleName] = useState<string>('Evening Comfort Routine');
  const [triggerKind, setTriggerKind] = useState<TriggerKind>(TriggerKind.timeSchedule);
  const [triggerVal, setTriggerVal] = useState<string>('22:30');
  const [sourceDevId, setSourceDevId] = useState<string>('');
  const [selectedPreconditions, setSelectedPreconditions] = useState<PreconditionKind[]>([]);
  const [steps, setSteps] = useState<SmartActionStep[]>([]);

  const openStudio = (existing?: MultiConditionAutomationRule) => {
    if (existing) {
      setEditingRule(existing);
      setRuleName(existing.name);
      setTriggerKind(existing.trigger.kind);
      setTriggerVal(existing.trigger.value);
      setSourceDevId(existing.trigger.sourceDeviceId || devices[0]?.id || '');
      setSelectedPreconditions(existing.preconditions.map((p) => p.kind));
      setSteps(existing.actions.map((a) => ({ ...a })));
    } else {
      setEditingRule(null);
      setRuleName('Custom Smart Routine');
      setTriggerKind(TriggerKind.timeSchedule);
      setTriggerVal('22:00');
      setSourceDevId(devices[0]?.id || '');
      setSelectedPreconditions([PreconditionKind.onlyAtNight]);
      const first = devices[0];
      setSteps(
        first
          ? [
              {
                targetDeviceId: first.id,
                targetDeviceName: first.name,
                turnOn: true,
                targetLevel: first.category === 'ac' ? 23 : 80,
                delaySecondsBefore: 0,
              },
            ]
          : [],
      );
    }
    setStudioOpen(true);
  };

  const applyTemplate = (tpl: 'washer_finished' | 'goodnight' | 'cinema') => {
    const washer = devices.find((d) => d.category === 'washer') || devices[0];
    const light = devices.find((d) => d.category === 'light') || devices[0];
    const tv = devices.find((d) => d.category === 'tv') || devices[0];

    if (tpl === 'washer_finished' && washer && light) {
      setRuleName('Washer Finished Alert');
      setTriggerKind(TriggerKind.deviceState);
      setSourceDevId(washer.id);
      setTriggerVal('off');
      setSelectedPreconditions([PreconditionKind.onlyWhenHome]);
      setSteps([
        { targetDeviceId: light.id, targetDeviceName: light.name, turnOn: true, targetLevel: 100, delaySecondsBefore: 0 },
        { targetDeviceId: light.id, targetDeviceName: light.name, turnOn: false, targetLevel: null, delaySecondsBefore: 2 },
        { targetDeviceId: light.id, targetDeviceName: light.name, turnOn: true, targetLevel: 100, delaySecondsBefore: 2 },
      ]);
    } else if (tpl === 'goodnight') {
      setRuleName('Goodnight Mode');
      setTriggerKind(TriggerKind.timeSchedule);
      setTriggerVal('23:00');
      setSelectedPreconditions([PreconditionKind.onlyWhenHome]);
      setSteps(
        devices.slice(0, 4).map((d) => ({
          targetDeviceId: d.id,
          targetDeviceName: d.name,
          turnOn: false,
          targetLevel: null,
          delaySecondsBefore: 0,
        })),
      );
    } else if (tpl === 'cinema' && tv && light) {
      setRuleName('Cinema Night');
      setTriggerKind(TriggerKind.deviceState);
      setSourceDevId(tv.id);
      setTriggerVal('on');
      setSelectedPreconditions([PreconditionKind.onlyAtNight]);
      setSteps([
        { targetDeviceId: light.id, targetDeviceName: light.name, turnOn: true, targetLevel: 15, delaySecondsBefore: 1 },
      ]);
    }
  };

  const handleSaveRule = () => {
    const srcDev = devices.find((d) => d.id === sourceDevId);
    const assembled: MultiConditionAutomationRule = {
      id: editingRule?.id || `rule_${Date.now()}`,
      name: ruleName.trim() || 'Smart Routine',
      isEnabled: true,
      trigger: {
        kind: triggerKind,
        value: triggerVal,
        sourceDeviceId: triggerKind === TriggerKind.deviceState ? sourceDevId : undefined,
        sourceDeviceName: triggerKind === TriggerKind.deviceState ? srcDev?.name : undefined,
        weekdays: [1, 2, 3, 4, 5, 6, 7],
      },
      preconditions: selectedPreconditions.map((k) => ({ kind: k })),
      actions: steps,
      executionCount: editingRule?.executionCount || 0,
    };

    if (editingRule) {
      updateMultiConditionRule(assembled);
    } else {
      addMultiConditionRule(assembled);
    }
    setStudioOpen(false);
  };

  const handleDeployAiRule = () => {
    if (!aiPrompt.trim()) {
      showToast('Enter a natural language automation rule first');
      return;
    }
    const created = parseAndAddNaturalLanguageRule(aiPrompt);
    if (created) {
      setAiPrompt('');
    } else {
      showToast('Could not match devices. Ensure appliances are paired!');
    }
  };

  return (
    <div className="space-y-6 pb-28">
      {/* 1. AI Automation Rule Copilot */}
      <div className="glass-panel rounded-3xl p-5 border border-[#BF5AF2]/40">
        <div className="flex items-center gap-2 text-sm font-bold text-white mb-1">
          <Sparkles className="w-4 h-4 text-[#BF5AF2]" />
          <span>AI Automation Rule Copilot</span>
        </div>
        <p className="text-xs text-white/65 mb-3">
          Type plain English commands to auto-generate multi-step hardware rules (e.g., "At 11:00 PM turn off Wipro Next Halo Chandelier and OnePlus TV only at night"):
        </p>
        <div className="flex flex-col sm:flex-row gap-2.5">
          <input
            type="text"
            aria-label="Natural language automation command"
            placeholder="e.g. At 11:00 PM turn off TV, wait 5s then dim light to 15%"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleDeployAiRule();
            }}
            className="flex-1 px-4 py-2.5 rounded-2xl bg-white/10 border border-white/15 text-xs text-white focus:outline-none focus:border-[#BF5AF2]"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleDeployAiRule}
              className="px-4 py-2.5 rounded-2xl bg-[#BF5AF2] hover:bg-[#A844DB] text-xs font-extrabold text-white whitespace-nowrap transition-colors"
            >
              Deploy AI Rule
            </button>
            <button
              type="button"
              onClick={() => openStudio()}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-[#30D158] hover:bg-[#28B84C] text-xs font-extrabold text-black whitespace-nowrap transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>New Custom Rule</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Multi-Condition Rules List (WHEN -> ONLY IF -> THEN) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-extrabold text-white">
            Multi-Condition Hardware Rules ({multiConditionRules.length})
          </h2>
          <button
            type="button"
            onClick={() => openStudio()}
            className="text-xs font-bold text-[#30D158] hover:underline"
          >
            Open Rule Studio
          </button>
        </div>

        <div className="space-y-3">
          {multiConditionRules.map((rule) => (
            <div
              key={rule.id}
              className={`glass-panel rounded-3xl p-5 border transition-colors ${
                rule.isEnabled ? 'border-[#30D158]/35' : 'border-white/10 opacity-70'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2.5">
                  <span className="text-sm font-extrabold text-white">{rule.name}</span>
                  <span className="text-xs font-mono tabular-nums text-[#30D158]">
                    · {rule.executionCount}x Run
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleMultiConditionRule(rule.id)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold ${
                      rule.isEnabled
                        ? 'bg-[#30D158]/20 text-[#30D158]'
                        : 'bg-white/10 text-white/50'
                    }`}
                  >
                    {rule.isEnabled ? 'Enabled' : 'Disabled'}
                  </button>
                </div>
              </div>

              {/* Clean unboxed metadata summary */}
              <div className="text-xs text-white/70 mb-3">
                <span>WHEN: {rule.trigger.kind} ({rule.trigger.value})</span>
                {rule.preconditions.length > 0 && (
                  <>
                    <span aria-hidden="true"> · </span>
                    <span>
                      ONLY IF: {rule.preconditions.map((p) => p.kind).join(', ')}
                    </span>
                  </>
                )}
                <span aria-hidden="true"> · </span>
                <span>THEN: {rule.actions.length} Action Step(s)</span>
              </div>

              {/* Action Steps Box */}
              <div className="rounded-2xl bg-black/35 p-3 border border-white/10 space-y-1 text-xs font-mono text-white/80 mb-3">
                {rule.actions.map((act, i) => (
                  <div key={i}>
                    {i + 1}. {act.delaySecondsBefore > 0 ? `[Wait ${act.delaySecondsBefore}s] ` : ''}
                    Turn {act.turnOn ? 'ON' : 'OFF'} {act.targetDeviceName}
                    {act.targetLevel !== null && act.targetLevel !== undefined
                      ? ` (${act.targetLevel})`
                      : ''}
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => executeMultiConditionRuleNow(rule)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#30D158]/20 hover:bg-[#30D158]/30 border border-[#30D158]/50 text-xs font-bold text-[#30D158]"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Run Now</span>
                </button>
                <button
                  type="button"
                  aria-label={`Edit ${rule.name}`}
                  onClick={() => openStudio(rule)}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/15 text-white/75"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${rule.name}`}
                  onClick={() => deleteMultiConditionRule(rule.id)}
                  className="p-2 rounded-xl bg-[#FF453A]/15 hover:bg-[#FF453A]/25 text-[#FF453A]"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Cross-Brand Reflex Bus & Zero-GPS Wi-Fi BSSID Geofencing */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-panel rounded-3xl p-5 border border-white/10 space-y-3">
          <h3 className="text-sm font-extrabold text-white">
            Cross-Brand Reflexes (Auto Pub/Sub Bus)
          </h3>
          {reflexRules.map((rx) => (
            <div
              key={rx.id}
              className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-white/[0.04] border border-white/10"
            >
              <div>
                <div className="text-xs font-bold text-white">{rx.title}</div>
                <div className="text-[11px] text-white/60 mt-0.5">{rx.description}</div>
              </div>
              <button
                type="button"
                onClick={() => toggleReflexRule(rx.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 ${
                  rx.isEnabled ? 'bg-[#BF5AF2] text-white' : 'bg-white/10 text-white/50'
                }`}
              >
                {rx.isEnabled ? 'Active' : 'Off'}
              </button>
            </div>
          ))}
        </div>

        <div className="glass-panel rounded-3xl p-5 border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-white">
              Zero-GPS Wi-Fi BSSID Geofencing
            </h3>
            <button
              type="button"
              onClick={togglePresenceSimulation}
              className={`px-3 py-1 rounded-xl text-xs font-bold ${
                isUserAtHome
                  ? 'bg-[#30D158]/20 text-[#30D158]'
                  : 'bg-[#FF9F0A]/20 text-[#FF9F0A]'
              }`}
            >
              {isUserAtHome ? 'AT HOME' : 'AWAY'}
            </button>
          </div>
          <p className="text-xs text-white/65 font-mono">
            Locked Home Router BSSID: {homeRouterBssid || 'Unlocked (0% GPS Battery Drain)'}
          </p>
          <button
            type="button"
            onClick={lockCurrentBssidAsHome}
            className="w-full py-2.5 rounded-2xl bg-[#0A84FF] hover:bg-[#0070E0] text-xs font-bold text-white flex items-center justify-center gap-2"
          >
            <Wifi className="w-4 h-4" />
            <span>Lock Current Wi-Fi BSSID as Home</span>
          </button>
        </div>
      </div>

      {/* 4. Live Execution History */}
      <div className="glass-panel rounded-3xl p-5 border border-white/10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-sm font-extrabold text-white">
            <History className="w-4 h-4 text-[#30D158]" />
            <span>Live Execution History</span>
          </div>
          <span className="text-xs font-mono text-white/55">{executionLogs.length} events</span>
        </div>
        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
          {executionLogs.map((log) => (
            <div
              key={log.id}
              className="flex items-start justify-between gap-3 p-3 rounded-2xl bg-[#30D158]/10 border border-[#30D158]/30 text-xs"
            >
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#30D158] shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-white">{log.ruleName}</div>
                  <div className="text-white/75 font-mono text-[11px] mt-0.5">{log.summary}</div>
                </div>
              </div>
              <span className="font-mono text-[11px] text-[#30D158] shrink-0">
                {log.timestamp.slice(11, 19)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Visual Rule Studio Modal */}
      {studioOpen && (
        <div
          role="dialog"
          aria-label="Visual Apple Glass Rule Studio"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
        >
          <div className="relative flex flex-col w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl bg-[#0A0F1E] border border-white/15 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-extrabold text-white">
                  Visual Apple Glass Rule Studio
                </h3>
                <p className="text-xs text-white/60">
                  WHEN (Trigger) → ONLY IF (Guards) → THEN (Sequence)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStudioOpen(false)}
                className="p-2 rounded-full bg-white/10 text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Routine Templates */}
            <div>
              <div className="text-[11px] font-bold text-white/50 mb-1.5">Routine Templates:</div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => applyTemplate('washer_finished')}
                  className="px-3 py-1.5 rounded-xl bg-[#30D158]/15 border border-[#30D158]/40 text-xs font-bold text-[#30D158]"
                >
                  Washer Finished Alert
                </button>
                <button
                  type="button"
                  onClick={() => applyTemplate('goodnight')}
                  className="px-3 py-1.5 rounded-xl bg-[#0A84FF]/15 border border-[#0A84FF]/40 text-xs font-bold text-[#0A84FF]"
                >
                  Goodnight Mode
                </button>
                <button
                  type="button"
                  onClick={() => applyTemplate('cinema')}
                  className="px-3 py-1.5 rounded-xl bg-[#BF5AF2]/15 border border-[#BF5AF2]/40 text-xs font-bold text-[#BF5AF2]"
                >
                  Cinema Night
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-white/70 mb-1">Rule Name</label>
              <input
                type="text"
                value={ruleName}
                onChange={(e) => setRuleName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-white/10 border border-white/15 text-xs text-white"
              />
            </div>

            {/* 1. WHEN */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
              <div className="text-xs font-bold text-[#FF9F0A]">1. WHEN (Trigger)</div>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={triggerKind}
                  onChange={(e) => setTriggerKind(e.target.value as TriggerKind)}
                  className="px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-xs text-white"
                >
                  <option value={TriggerKind.timeSchedule}>Specific Time Schedule</option>
                  <option value={TriggerKind.solarEvent}>Solar Event (Sunset/Sunrise)</option>
                  <option value={TriggerKind.wifiPresence}>Wi-Fi Presence</option>
                  <option value={TriggerKind.deviceState}>Hardware Device State</option>
                </select>
                <input
                  type="text"
                  value={triggerVal}
                  onChange={(e) => setTriggerVal(e.target.value)}
                  placeholder="22:30 or sunset or on"
                  className="px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-xs text-white font-mono"
                />
              </div>
            </div>

            {/* 2. ONLY IF */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
              <div className="text-xs font-bold text-[#0A84FF]">2. ONLY IF (Preconditions)</div>
              <div className="flex flex-wrap gap-2">
                {[
                  { kind: PreconditionKind.onlyAtNight, label: 'Only at Night (18:30-06:00)' },
                  { kind: PreconditionKind.onlyDaytime, label: 'Only Daytime' },
                  { kind: PreconditionKind.onlyWhenHome, label: 'Only When at Home' },
                  { kind: PreconditionKind.onlyWeekdays, label: 'Only Weekdays' },
                ].map((cond) => {
                  const sel = selectedPreconditions.includes(cond.kind);
                  return (
                    <button
                      type="button"
                      key={cond.kind}
                      onClick={() =>
                        setSelectedPreconditions((prev) =>
                          prev.includes(cond.kind)
                            ? prev.filter((k) => k !== cond.kind)
                            : [...prev, cond.kind],
                        )
                      }
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                        sel ? 'bg-[#0A84FF] text-white' : 'bg-white/10 text-white/65'
                      }`}
                    >
                      {cond.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. THEN */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#30D158]">
                  3. THEN (Sequenced Actions: {steps.length})
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const first = devices[0];
                    if (!first) return;
                    setSteps((prev) => [
                      ...prev,
                      {
                        targetDeviceId: first.id,
                        targetDeviceName: first.name,
                        turnOn: false,
                        targetLevel: null,
                        delaySecondsBefore: 5,
                      },
                    ]);
                  }}
                  className="text-xs font-bold text-[#30D158] hover:underline"
                >
                  + Add Step
                </button>
              </div>
              {steps.map((st, idx) => (
                <div key={idx} className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-black/40 text-xs">
                  <select
                    value={st.targetDeviceId}
                    onChange={(e) => {
                      const d = devices.find((item) => item.id === e.target.value);
                      if (!d) return;
                      setSteps((prev) =>
                        prev.map((s, i) =>
                          i === idx ? { ...s, targetDeviceId: d.id, targetDeviceName: d.name } : s,
                        ),
                      );
                    }}
                    className="px-2 py-1.5 rounded-lg bg-white/10 text-white"
                  >
                    {devices.map((d) => (
                      <option key={d.id} value={d.id} className="bg-[#0A0F1E]">
                        {d.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() =>
                      setSteps((prev) =>
                        prev.map((s, i) => (i === idx ? { ...s, turnOn: !s.turnOn } : s)),
                      )
                    }
                    className={`rounded-lg font-bold ${
                      st.turnOn ? 'bg-[#30D158] text-black' : 'bg-[#FF453A] text-white'
                    }`}
                  >
                    {st.turnOn ? 'Turn ON' : 'Turn OFF'}
                  </button>
                  <select
                    value={st.delaySecondsBefore}
                    onChange={(e) =>
                      setSteps((prev) =>
                        prev.map((s, i) =>
                          i === idx ? { ...s, delaySecondsBefore: Number(e.target.value) } : s,
                        ),
                      )
                    }
                    className="px-2 py-1.5 rounded-lg bg-white/10 text-white font-mono"
                  >
                    <option value={0} className="bg-[#0A0F1E]">No Delay</option>
                    <option value={2} className="bg-[#0A0F1E]">Wait 2s</option>
                    <option value={5} className="bg-[#0A0F1E]">Wait 5s</option>
                    <option value={10} className="bg-[#0A0F1E]">Wait 10s</option>
                  </select>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleSaveRule}
              className="w-full py-3 rounded-2xl bg-[#30D158] hover:bg-[#28B84C] text-xs font-extrabold text-black"
            >
              Save & Deploy Rule
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
