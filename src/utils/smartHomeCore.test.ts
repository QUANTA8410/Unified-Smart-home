import test from 'node:test';
import assert from 'node:assert/strict';
import {
  autoBindRealDevicesToLayout,
  BRAND_OAUTH_CATALOG,
  buildCameraPtzRequest,
  buildHomeAssistantServicePayload,
  buildTuyaCloudSkillPayload,
  classifySmartThingsCapabilities,
  computeDeviceLiveWattage,
  computeUpdatedLevelState,
  createDefaultSampleDevices,
  decodeQrPayload,
  defaultApartmentLayout,
  getDevicesToTurnOffOnLeaveHome,
  hasTriggeredInSameMinute,
  isDummyDevice,
  isValidWebSocketTunnelPath,
  parseUnifiedHomeDeepLink,
  resolveDeterministicFixtureId,
  resolveSmartThingsPowerState,
  runSmartDiagnosis,
  sanitizeDeviceCredentials,
  shouldPollTuyaCloudDevice,
  SmartAutomationEngine,
  SmartThingsLaundryService,
  studioApartmentLayout,
  tempToColor,
  TuyaMapper,
  UniversalCategoryClassifier,
  validateTuyaLocalKey,
} from './smartHomeCore';
import {
  ConnectionProtocol,
  GarmentType,
  PreconditionKind,
  RealSmartDevice,
  TriggerKind,
  UniversalDeviceArchetype,
} from '../types/smartHome';

test('computeDeviceLiveWattage enforces strict 0.0W when offline and physics curves when online', () => {
  const washer: RealSmartDevice = {
    id: 'washer_01',
    name: 'Samsung Washer',
    room: 'Laundry',
    category: 'washer',
    protocol: ConnectionProtocol.smartThingsCloud,
    credentials: {},
    isOn: true,
    isOnline: false,
    primaryValue: 1200,
    liveWatts: 480,
    ratedMaxWatts: 480,
    liveAttributes: { machineState: 'run' },
  };

  assert.equal(computeDeviceLiveWattage(washer), 0.0);
  assert.equal(washer.liveWatts, 0.0);

  washer.isOnline = true;
  assert.equal(computeDeviceLiveWattage(washer), 480.0);

  washer.liveAttributes.machineState = 'pause';
  assert.equal(computeDeviceLiveWattage(washer), 4.5);

  washer.liveAttributes.machineState = 'stop';
  washer.isOn = false;
  assert.equal(computeDeviceLiveWattage(washer), 0.0);
});

test('computeDeviceLiveWattage calculates LG DualCool AC inverter delta curve and LED bulb curves', () => {
  const ac: RealSmartDevice = {
    id: 'lg_ac',
    name: 'LG DualCool AC',
    room: 'Living',
    category: 'ac',
    protocol: ConnectionProtocol.lgThinqCloud,
    credentials: {},
    isOn: true,
    isOnline: true,
    primaryValue: 24.0,
    liveWatts: 0,
    ratedMaxWatts: 1480,
    liveAttributes: { currentTemperature: 30.0 },
  };
  // 320 + (6 * 92) = 872.0 W
  assert.equal(computeDeviceLiveWattage(ac), 872.0);

  ac.isOn = false;
  assert.equal(computeDeviceLiveWattage(ac), 1.2);

  const hue: RealSmartDevice = {
    id: 'hue_01',
    name: 'Hue Bulb',
    room: 'Living',
    category: 'light',
    protocol: ConnectionProtocol.philipsHueLocal,
    credentials: {},
    isOn: true,
    isOnline: true,
    primaryValue: 100,
    liveWatts: 0,
    ratedMaxWatts: 9.5,
    liveAttributes: {},
  };
  assert.equal(computeDeviceLiveWattage(hue), 9.9);
  hue.primaryValue = 50;
  assert.equal(computeDeviceLiveWattage(hue), 5.15);
});

test('UniversalCategoryClassifier maps devices to 12 archetypes accurately', () => {
  assert.equal(
    UniversalCategoryClassifier.classify({ id: 'roborock_1', name: 'Roborock S8', category: 'vacuum' }),
    UniversalDeviceArchetype.robotVacuum,
  );
  assert.equal(
    UniversalCategoryClassifier.classify({ id: 'cam_1', name: 'Realme Cam 360', category: 'camera' }),
    UniversalDeviceArchetype.cameraSecurity,
  );
  assert.equal(
    UniversalCategoryClassifier.classify({ id: 'washer_1', name: 'Samsung Ecobubble', category: 'washer' }),
    UniversalDeviceArchetype.laundry,
  );
  assert.equal(
    UniversalCategoryClassifier.classify({ id: 'light_1', name: 'Wipro Bulb', category: 'light' }),
    UniversalDeviceArchetype.lighting,
  );
  assert.equal(
    UniversalCategoryClassifier.classify({
      id: 'light_living_backlight_01',
      name: 'Philips Hue TV Ambilight Strip',
      category: 'light',
    }),
    UniversalDeviceArchetype.lighting,
  );
});

test('TuyaMapper generates light, AC, and infrared commands accurately', () => {
  const lightCodes = new Set(['switch_led', 'bright_value_v2', 'temp_value_v2', 'colour_data_v2', 'work_mode']);
  const cmds = TuyaMapper.lightCommands({
    patch: { on: true, brightness: 0.8, temp: 3000 },
    codes: lightCodes,
  });
  assert.equal(cmds.some((c) => c.code === 'switch_led' && c.value === true), true);
  assert.equal(cmds.some((c) => c.code === 'bright_value_v2'), true);
  assert.equal(cmds.some((c) => c.code === 'temp_value_v2'), true);

  const irCodes = new Set(['PowerOn', 'PowerOff', 'T', 'M', 'F']);
  assert.equal(TuyaMapper.isInfraredAC(irCodes), true);
  const irCmds = TuyaMapper.acCommands({
    patch: { on: true, target: 24, mode: 'cool', fan: 'medium' },
    codes: irCodes,
  });
  assert.equal(irCmds.some((c) => c.code === 'PowerOn'), true);
  assert.equal(irCmds.some((c) => c.code === 'T' && c.value === 24), true);
});

test('SmartAutomationEngine parses natural language rules and evaluates preconditions', () => {
  const fleet = createDefaultSampleDevices();
  const rule = SmartAutomationEngine.parseNaturalLanguageToRule(
    'At 11:00 PM turn off Wipro Next Halo Chandelier and OnePlus TV only at night',
    fleet,
  );
  assert.ok(rule);
  assert.equal(rule.trigger.kind, TriggerKind.timeSchedule);
  assert.equal(rule.trigger.value, '23:00');
  assert.equal(rule.preconditions.some((p) => p.kind === PreconditionKind.onlyAtNight), true);
  assert.equal(rule.actions.every((a) => a.turnOn === false && a.targetLevel === null), true);

  const nightDate = new Date(2026, 9, 24, 23, 0);
  const dayDate = new Date(2026, 9, 24, 12, 0);
  assert.equal(
    SmartAutomationEngine.evaluatePreconditions(rule, { isUserAtHome: true, devices: fleet, now: nightDate }),
    true,
  );
  assert.equal(
    SmartAutomationEngine.evaluatePreconditions(rule, { isUserAtHome: true, devices: fleet, now: dayDate }),
    false,
  );
});

test('decodeQrPayload parses Samsung, LG ThinQ, RTSP URI, and Matter MT payloads without demo vendor', () => {
  const st = decodeQrPayload('samsungce://pair?id=washer_eco_01&type=washer');
  assert.ok(st);
  assert.equal(st.providerId, 'samsung_smartthings');
  assert.equal(st.device.category, 'washer');
  assert.notEqual(st.device.credentials.vendor, 'demo');

  const lg = decodeQrPayload('lgthinq://pair?id=lg_ac_99&type=ac');
  assert.ok(lg);
  assert.equal(lg.device.protocol, ConnectionProtocol.lgThinqCloud);
  assert.equal(lg.device.credentials.vendor, 'lg_thinq');

  const rtsp = decodeQrPayload('rtsp://admin:secret123@192.168.1.148:554/stream1');
  assert.ok(rtsp);
  assert.equal(rtsp.device.protocol, ConnectionProtocol.rtspOnvifCamera);
  assert.equal(rtsp.device.credentials.ip, '192.168.1.148');
  assert.equal(rtsp.device.credentials.username, 'admin');
  assert.equal(rtsp.device.credentials.password, 'secret123');
  assert.equal(rtsp.device.credentials.streamPath, '/stream1');

  const mt = decodeQrPayload('MT:Y234567890123456');
  assert.ok(mt);
  assert.equal(mt.pairingProtocol, 'Matter Standard CHIP QR Protocol');
});

test('SmartThingsLaundryService and SmartDiagnosisService return expected recommendations and diagnostics', () => {
  const recipe = SmartThingsLaundryService.recommendRecipe([GarmentType.jeansDenim]);
  assert.equal(recipe.recommendedCycle, 'Denim & Colors');
  assert.equal(recipe.enableEcoBubble, true);

  const fleet = createDefaultSampleDevices();
  const reportOk = runSmartDiagnosis(fleet[0], null);
  assert.equal(reportOk.overallHealth, 'good');

  const reportOe = runSmartDiagnosis(fleet[0], 'OE');
  assert.equal(reportOe.overallHealth, 'fault');
  assert.equal(reportOe.activeErrorCode, 'OE');
});

test('3D layouts and tempToColor return valid structures', () => {
  const apt = defaultApartmentLayout();
  assert.equal(apt.rooms.length, 5);
  const studio = studioApartmentLayout();
  assert.equal(studio.rooms.length, 3);
  assert.ok(tempToColor(2200).startsWith('#'));
  assert.ok(tempToColor(6500).startsWith('#'));
});

test('39-Bug Audit Fixes: dummy check, credential sanitization, SmartThings power, HA service, and Tuya Cloud', () => {
  // Bug #3: Dummy check only triggers when credentials.vendor === 'demo'
  const fleet = createDefaultSampleDevices();
  assert.equal(fleet.every((d) => !isDummyDevice(d)), true);
  assert.equal(fleet.find((d) => d.id.startsWith('lg_'))?.protocol, ConnectionProtocol.lgThinqCloud);

  // Bug #3 & #26: Sanitize credentials strips vendor='demo' when real IP/token present and removes 17-char 'auto_detected_lan'
  const sanitized = sanitizeDeviceCredentials(
    {
      vendor: 'demo',
      token: 'secret_pat_token',
      localKey: 'auto_detected_lan',
      ip: '192.168.1.50',
    },
    'samsung_smartthings',
  );
  assert.equal(sanitized.vendor, 'samsung_smartthings');
  assert.equal(sanitized.localKey, undefined);
  assert.equal(sanitized.ip, '192.168.1.50');

  // Bug #4: SmartThings power state resolver supports washer/dryer machineState & switchVal
  assert.equal(
    resolveSmartThingsPowerState({
      currentIsOn: false,
      switchVal: null,
      washerState: 'run',
    }),
    true,
  );
  assert.equal(
    resolveSmartThingsPowerState({
      currentIsOn: true,
      switchVal: null,
      washerState: 'stop',
    }),
    false,
  );

  // Bug #6: Home Assistant merges argument map into JSON payload alongside entity_id
  const haClimate = buildHomeAssistantServicePayload('climate.living_room_ac', [{ temperature: 21 }]);
  assert.equal(haClimate.entity_id, 'climate.living_room_ac');
  assert.equal(haClimate.temperature, 21);

  // Bug #7: setDeviceLevel keeps AC & TV powered on when primaryValue > 0 or muted (0)
  const acUpdated = computeUpdatedLevelState(fleet.find((d) => d.category === 'ac')!, 22);
  assert.equal(acUpdated.isOn, true);
  assert.equal(acUpdated.primaryValue, 22);
  const tvMuted = computeUpdatedLevelState(fleet.find((d) => d.category === 'tv')!, 0);
  assert.equal(tvMuted.isOn, true);

  // Bug #8: Tuya Cloud Skill payload & 120s poll rate-limit guard
  const tuyaPayload = buildTuyaCloudSkillPayload('dev_123', 'tok_abc', 'brightnessSet', [500]);
  assert.equal(tuyaPayload.header.name, 'brightnessSet');
  assert.equal(tuyaPayload.payload.value, 500);
  assert.equal(shouldPollTuyaCloudDevice(Date.now() - 30_000, Date.now()), false);
  assert.equal(shouldPollTuyaCloudDevice(Date.now() - 130_000, Date.now()), true);

  // Bug #15 & #16: Leave Home exemption & minute deduplication
  const toTurnOff = getDevicesToTurnOffOnLeaveHome(fleet);
  assert.equal(toTurnOff.some((d) => d.category === 'fridge'), false);
  assert.equal(toTurnOff.some((d) => d.category === 'camera'), false);
  assert.equal(toTurnOff.some((d) => d.category === 'washer'), false);
  assert.equal(
    hasTriggeredInSameMinute('2026-10-24T23:00:05.000Z', new Date('2026-10-24T23:00:45.000Z')),
    true,
  );

  // Bug #18, #25, #26, #32, #33, #36
  assert.equal(
    classifySmartThingsCapabilities(['thermostatCoolingSetpoint', 'airConditionerMode'], 'Samsung WindFree AC'),
    'ac',
  );
  assert.equal(
    classifySmartThingsCapabilities(['thermostatCoolingSetpoint'], 'Samsung Family Hub Fridge'),
    'fridge',
  );
  assert.equal(
    classifySmartThingsCapabilities(['washerOperatingState'], 'Samsung Ecobubble'),
    'washer',
  );

  const ptz = buildCameraPtzRequest('192.168.1.148', 'left');
  assert.ok(ptz);
  assert.equal(ptz.panVelocity, -0.5);
  assert.equal(ptz.cgiFallbackUrl, 'http://192.168.1.148/cgi-bin/ptz.cgi?action=move&dir=left');

  assert.equal(validateTuyaLocalKey('0123456789abcdef'), true);
  assert.equal(validateTuyaLocalKey('auto_detected_lan'), false);
  assert.equal(validateTuyaLocalKey('short'), false);
  assert.equal(
    BRAND_OAUTH_CATALOG.find((b) => b.id === 'tplink_tapo')?.vendorType,
    'tplink_tapo',
  );

  const deepLink = parseUnifiedHomeDeepLink('unifiedhome://oauth/samsung?token=pat_123');
  assert.ok(deepLink);
  assert.equal(deepLink.action, 'oauth_callback');
  assert.equal(deepLink.vendor, 'samsung');
  assert.equal(deepLink.token, 'pat_123');

  assert.equal(isValidWebSocketTunnelPath('/ws'), true);
  assert.equal(isValidWebSocketTunnelPath('/api/ws'), true);
  assert.equal(isValidWebSocketTunnelPath('/invalid'), false);

  // Bug #13 & #14: Auto-binding 3D layout fixtures & deterministic fixture IDs
  const boundLayout = autoBindRealDevicesToLayout(defaultApartmentLayout(), fleet);
  assert.equal(boundLayout.fixtures.some((f) => Boolean(f.linkedRealDeviceId)), true);
  assert.equal(
    resolveDeterministicFixtureId({ id: '[#a1b2c]', roomId: 'living', fixtureType: 'ceiling_light' }),
    'living.ceiling_light',
  );
});

test('Part 2B & Part 3 Enhancements: Vault secret stripping, LatestValueCommandCoalescer, layout.scenes, and unified Reflex Bus', async () => {
  const {
    stripSecretsForPublicStorage,
    VAULT_SEALED_PLACEHOLDER,
    LatestValueCommandCoalescer,
    computeSceneDeviceTargetState,
    evaluateCrossBrandReflexes,
    DEFAULT_REFLEX_RULES,
  } = await import('./smartHomeCore');

  // 1. stripSecretsForPublicStorage redacts tokens, localKey, and RTSP passwords
  const publicCreds = stripSecretsForPublicStorage({
    vendor: 'wipro_tuya',
    ip: '192.168.1.102',
    localKey: '0123456789abcdef',
    token: 'st_secret_pat_token',
    rtspUrl: 'rtsp://admin:mySecretPass@192.168.1.120:554/live/ch0',
  });
  assert.equal(publicCreds.localKey, VAULT_SEALED_PLACEHOLDER);
  assert.equal(publicCreds.token, VAULT_SEALED_PLACEHOLDER);
  assert.equal(publicCreds.ip, '192.168.1.102');
  assert.equal(
    publicCreds.rtspUrl,
    `rtsp://admin:${VAULT_SEALED_PLACEHOLDER}@192.168.1.120:554/live/ch0`,
  );

  // 2. LatestValueCommandCoalescer drops intermediate slider values while a command is in flight
  const coalescer = new LatestValueCommandCoalescer(15);
  const executedValues: number[] = [];
  const p1 = coalescer.scheduleCoalesced('bulb_1', 20, async (val) => {
    executedValues.push(val);
    await new Promise((r) => setTimeout(r, 25));
    return val;
  });
  const p2 = coalescer.scheduleCoalesced('bulb_1', 45, async (val) => {
    executedValues.push(val);
    return val;
  });
  const p3 = coalescer.scheduleCoalesced('bulb_1', 70, async (val) => {
    executedValues.push(val);
    return val;
  });
  const p4 = coalescer.scheduleCoalesced('bulb_1', 95, async (val) => {
    executedValues.push(val);
    return val;
  });

  const results = await Promise.all([p1, p2, p3, p4]);
  assert.deepEqual(executedValues, [20, 95]);
  assert.equal(results[0], 20);
  assert.equal(results[3], 95);

  // 3. computeSceneDeviceTargetState honors layout.scenes per-fixture overrides
  const fleet = createDefaultSampleDevices();
  const layout = autoBindRealDevicesToLayout(defaultApartmentLayout(), fleet);
  const ambilight = fleet.find((d) => d.id === 'light_living_backlight_01')!;
  const movieTarget = computeSceneDeviceTargetState(ambilight, 'Movie', layout);
  assert.equal(movieTarget.isOn, true);
  assert.equal(movieTarget.primaryValue, 90); // 0.9 in defaultScenes['movie']['living.tv'] -> 90%
  assert.equal(movieTarget.liveAttributesPatch.colorHex, '#6A4CFF');
  assert.equal(movieTarget.matchedFixtureId, 'living.tv');

  // Ensure fridge is protected in 'Away' scene
  const fridge = fleet.find((d) => d.category === 'fridge')!;
  const awayFridge = computeSceneDeviceTargetState(fridge, 'Away', layout);
  assert.equal(awayFridge.isOn, true);

  // 4. evaluateCrossBrandReflexes triggers when TV turns on from any source
  const prevFleet = fleet.map((d) => (d.category === 'tv' ? { ...d, isOn: false } : { ...d }));
  const nextFleet = fleet.map((d) => (d.category === 'tv' ? { ...d, isOn: true } : { ...d }));
  const reflexEval = evaluateCrossBrandReflexes(prevFleet, nextFleet, DEFAULT_REFLEX_RULES);
  assert.equal(reflexEval.triggeredRules.length >= 2, true);
  const chandelierAfterReflex = reflexEval.devicesWithReflexes.find(
    (d) => d.id === 'light_living_chandelier_01',
  )!;
  assert.equal(chandelierAfterReflex.isOn, true);
  assert.equal(chandelierAfterReflex.primaryValue, 15);
});


