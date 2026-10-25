import {
  AppOtaManifest,
  BrandAuthProviderConfig,
  ConnectionProtocol,
  CrossBrandReflexRule,
  DeviceFirmwareUpdate,
  DiagnosticReport,
  Fixture3DNode,
  FloorMaterialType,
  Furniture3DProp,
  GarmentType,
  House3DTwinLayout,
  HouseScene3D,
  LaundryRecipeResult,
  MultiConditionAutomationRule,
  Opening3D,
  PartnerApp,
  PreconditionKind,
  RealSmartDevice,
  Room3DZone,
  SmartActionStep,
  SmartPrecondition,
  SmartTrigger,
  TriggerKind,
  UniversalDeviceArchetype,
} from '../types/smartHome';

// ============================================================================
// 1. FLOOR MATERIAL COLORS & KELVIN SHADERS
// ============================================================================
export const FLOOR_MATERIAL_COLORS: Record<FloorMaterialType, { color: string; grout: string }> = {
  [FloorMaterialType.oak]: { color: '#C7A47C', grout: 'rgba(40, 26, 16, 0.22)' },
  [FloorMaterialType.walnut]: { color: '#94705A', grout: 'rgba(27, 18, 11, 0.22)' },
  [FloorMaterialType.tile]: { color: '#D5DADE', grout: '#AAB0B8' },
  [FloorMaterialType.stone]: { color: '#A2A7AE', grout: '#7C828B' },
};

export const HOUSE_CONTROL_SWATCHES = [
  '#FF5A4F',
  '#FF9A3C',
  '#FFD84A',
  '#5FE08A',
  '#42D6E8',
  '#4F8DFF',
  '#8B5CFF',
  '#FF5FC4',
];

export const HOUSE_CONTROL_AC_MODE_COLORS: Record<string, string> = {
  cool: '#4EA0FF',
  heat: '#FF9037',
  dry: '#3DD4BA',
  fan: '#B0BCCD',
  auto: '#B78AFF',
  ai: '#A855F7',
  jet: '#00E5FF',
};

function lerpHex(hexA: string, hexB: string, t: number): string {
  const clamped = Math.max(0, Math.min(1, t));
  const a = parseInt(hexA.replace('#', ''), 16);
  const b = parseInt(hexB.replace('#', ''), 16);
  const rA = (a >> 16) & 255;
  const gA = (a >> 8) & 255;
  const bA = a & 255;
  const rB = (b >> 16) & 255;
  const gB = (b >> 8) & 255;
  const bB = b & 255;
  const r = Math.round(rA + (rB - rA) * clamped);
  const g = Math.round(gA + (gB - gA) * clamped);
  const bl = Math.round(bA + (bB - bA) * clamped);
  return `#${((1 << 24) + (r << 16) + (g << 8) + bl).toString(16).slice(1).toUpperCase()}`;
}

export function tempToColor(kelvin: number): string {
  const k = Math.max(2200, Math.min(6500, kelvin));
  if (k <= 3000) {
    const t = (k - 2200) / (3000 - 2200);
    return lerpHex('#FF9438', '#FFBD7A', t);
  } else if (k <= 4200) {
    const t = (k - 3000) / (4200 - 3000);
    return lerpHex('#FFBD7A', '#FFE2C2', t);
  } else {
    const t = (k - 4200) / (6500 - 4200);
    return lerpHex('#FFE2C2', '#DFE9FF', t);
  }
}

// ============================================================================
// 2. UNIVERSAL 12-CATEGORY CLASSIFIER
// ============================================================================
export class UniversalCategoryClassifier {
  static classify(device: Pick<RealSmartDevice, 'category' | 'id' | 'name'>): UniversalDeviceArchetype {
    const cat = device.category.toLowerCase().trim();
    if (cat === 'light') return UniversalDeviceArchetype.lighting;
    if (cat === 'ac' || cat === 'climate') return UniversalDeviceArchetype.climateAc;
    if (cat === 'washer' || cat === 'laundry' || cat === 'dryer' || cat === 'dishwasher' || cat === 'styler') {
      return UniversalDeviceArchetype.laundry;
    }
    if (cat === 'fridge' || cat === 'refrigerator') return UniversalDeviceArchetype.refrigeration;
    if (cat === 'tv') return UniversalDeviceArchetype.tvMedia;
    if (cat === 'camera') return UniversalDeviceArchetype.cameraSecurity;
    if (cat === 'fan' || cat === 'air_purifier') return UniversalDeviceArchetype.fanAir;
    if (cat === 'vacuum') return UniversalDeviceArchetype.robotVacuum;
    if (cat === 'lock') return UniversalDeviceArchetype.lockAccess;
    if (cat === 'curtain' || cat === 'shade') return UniversalDeviceArchetype.curtainShade;
    if (cat === 'speaker') return UniversalDeviceArchetype.speakerAudio;

    const hay = `${device.category} ${device.id} ${device.name}`.toLowerCase();

    if (hay.includes('vacuum') || hay.includes('roborock') || hay.includes('roomba') || hay.includes('mop')) {
      return UniversalDeviceArchetype.robotVacuum;
    }
    if (hay.includes('camera') || /\bcam\b/.test(hay) || hay.includes('doorbell') || hay.includes('ring') || hay.includes('arlo') || hay.includes('eufy')) {
      return UniversalDeviceArchetype.cameraSecurity;
    }
    if (hay.includes('lock') || hay.includes('door') || hay.includes('gate') || hay.includes('garage') || hay.includes('yale') || hay.includes('nuki')) {
      return UniversalDeviceArchetype.lockAccess;
    }
    if (hay.includes('curtain') || hay.includes('blind') || hay.includes('shade') || hay.includes('roller') || hay.includes('somfy')) {
      return UniversalDeviceArchetype.curtainShade;
    }
    if (hay.includes('fridge') || hay.includes('refrigerator') || hay.includes('freezer') || hay.includes('instaview') || hay.includes('familyhub')) {
      return UniversalDeviceArchetype.refrigeration;
    }
    if (hay.includes('washer') || hay.includes('laundry') || hay.includes('dryer') || hay.includes('dishwasher') || hay.includes('washtower') || hay.includes('styler')) {
      return UniversalDeviceArchetype.laundry;
    }
    if (hay.includes('light') || hay.includes('bulb') || hay.includes('lamp') || hay.includes('strip') || hay.includes('wipro') || hay.includes('hue') || hay.includes('wiz') || hay.includes('nanoleaf') || hay.includes('lifx') || hay.includes('yeelight') || hay.includes('chandelier') || hay.includes('ambilight')) {
      return UniversalDeviceArchetype.lighting;
    }
    if (hay.includes('fan') || hay.includes('purifier') || hay.includes('humidifier') || hay.includes('exhaust') || hay.includes('dyson') || hay.includes('aerotower') || hay.includes('puricare')) {
      return UniversalDeviceArchetype.fanAir;
    }
    if (/\bac\b/.test(hay) || hay.includes('aircon') || hay.includes('climate') || hay.includes('thermostat') || hay.includes('dualcool') || hay.includes('windfree') || hay.includes('heater')) {
      return UniversalDeviceArchetype.climateAc;
    }
    if (hay.includes('speaker') || hay.includes('sonos') || hay.includes('soundbar') || hay.includes('echo') || hay.includes('homepod') || hay.includes('bose') || hay.includes('audio')) {
      return UniversalDeviceArchetype.speakerAudio;
    }
    if (/\btv\b/.test(hay) || hay.includes('television') || hay.includes('oneplus') || hay.includes('chromecast') || hay.includes('projector') || hay.includes('media') || hay.includes('theframe') || hay.includes('frame')) {
      return UniversalDeviceArchetype.tvMedia;
    }
    return UniversalDeviceArchetype.plugEnergy;
  }

  static colorFor(type: UniversalDeviceArchetype): string {
    switch (type) {
      case UniversalDeviceArchetype.lighting:
        return '#FF9F0A'; // Warm Amber
      case UniversalDeviceArchetype.climateAc:
        return '#00D4FF'; // Cryo Cyan
      case UniversalDeviceArchetype.fanAir:
        return '#5AC8FA'; // Sky Breeze
      case UniversalDeviceArchetype.laundry:
        return '#30D158'; // EcoBubble Emerald
      case UniversalDeviceArchetype.refrigeration:
        return '#64D2FF'; // Glacial Ice
      case UniversalDeviceArchetype.tvMedia:
        return '#BF5AF2'; // Cinema Violet
      case UniversalDeviceArchetype.speakerAudio:
        return '#FF2D55'; // Acoustic Magenta
      case UniversalDeviceArchetype.robotVacuum:
        return '#00E5A3'; // LiDAR Mint
      case UniversalDeviceArchetype.cameraSecurity:
        return '#FF453A'; // Sentinel Crimson
      case UniversalDeviceArchetype.lockAccess:
        return '#FFD60A'; // Vault Gold
      case UniversalDeviceArchetype.curtainShade:
        return '#FFCC00'; // Daylight Gold
      case UniversalDeviceArchetype.plugEnergy:
        return '#0A84FF'; // Electric Blue
    }
  }

  static supportsHorizontalSlider(type: UniversalDeviceArchetype): boolean {
    return (
      type === UniversalDeviceArchetype.lighting ||
      type === UniversalDeviceArchetype.climateAc ||
      type === UniversalDeviceArchetype.fanAir ||
      type === UniversalDeviceArchetype.speakerAudio ||
      type === UniversalDeviceArchetype.curtainShade
    );
  }
}

// ============================================================================
// 3. PHYSICS-CALIBRATED LIVE WATTAGE ENGINE
// ============================================================================
export function computeDeviceLiveWattage(device: RealSmartDevice): number {
  if (!device.isOnline) {
    device.liveWatts = 0.0;
    device.liveAttributes = {
      ...device.liveAttributes,
      powerSource: 'Offline (0.0 W)',
    };
    return 0.0;
  }

  const sensorPower = device.liveAttributes?.powerW;
  if (typeof sensorPower === 'number' && sensorPower > 0) {
    device.liveWatts = sensorPower;
    device.liveAttributes = {
      ...device.liveAttributes,
      powerSource: device.liveAttributes.powerSource || 'Hardware Telemetry',
    };
    return device.liveWatts;
  }

  const attrs = { ...device.liveAttributes };

  switch (device.category) {
    case 'washer': {
      const machineState = (
        attrs.machineState ||
        attrs.state ||
        (device.isOn ? 'run' : 'stop')
      )
        .toString()
        .toLowerCase();
      if (['run', 'wash', 'spin', 'rinse'].includes(machineState)) {
        device.liveWatts = device.ratedMaxWatts > 0 ? device.ratedMaxWatts : 480.0;
        attrs.powerSource = 'Samsung AI EcoBubble Telemetry';
      } else if (machineState === 'pause') {
        device.liveWatts = 4.5;
        attrs.powerSource = 'Samsung Standby';
      } else {
        device.liveWatts = device.isOn ? 4.5 : 0.0;
        attrs.powerSource = device.isOn ? 'Samsung Standby' : 'Power Off';
      }
      break;
    }

    case 'ac':
    case 'climate': {
      if (!device.isOn) {
        device.liveWatts = 1.2;
        attrs.powerSource = 'LG Inverter Standby';
      } else {
        const target = device.primaryValue;
        const roomTemp = typeof attrs.currentTemperature === 'number'
          ? attrs.currentTemperature
          : typeof attrs.roomTemp === 'number'
          ? attrs.roomTemp
          : 28.0;
        const deltaT = Math.max(0.0, Math.min(12.0, roomTemp - target));
        device.liveWatts = Math.max(320.0, Math.min(1480.0, 320.0 + deltaT * 92.0));
        attrs.powerSource = 'DualCool Inverter Curve';
      }
      break;
    }

    case 'camera': {
      const brandName = device.credentials.brand === 'realme' ? 'Realme Cam 360' : 'Philips Home Cam';
      if (!device.isOn) {
        device.liveWatts = 2.0;
        attrs.powerSource = `${brandName} Standby (Privacy Mode)`;
      } else {
        device.liveWatts = device.ratedMaxWatts > 0 ? device.ratedMaxWatts : 4.5;
        attrs.powerSource = `${brandName} Active 1080p Stream`;
      }
      break;
    }

    case 'light': {
      if (device.protocol === ConnectionProtocol.philipsHueLocal) {
        if (!device.isOn) {
          device.liveWatts = 0.4;
          attrs.powerSource = 'Philips Hue Zigbee Standby';
        } else {
          const pct = Math.max(0.01, Math.min(1.0, device.primaryValue / 100.0));
          const maxW = device.ratedMaxWatts > 0 ? device.ratedMaxWatts : 9.5;
          device.liveWatts = Number((0.4 + pct * maxW).toFixed(2));
          attrs.powerSource = 'Philips Hue White & Color (9.5W)';
        }
      } else if (device.protocol === ConnectionProtocol.philipsWizUdp) {
        if (!device.isOn) {
          device.liveWatts = 0.4;
          attrs.powerSource = 'Philips WiZ Wi-Fi Standby';
        } else {
          const pct = Math.max(0.01, Math.min(1.0, device.primaryValue / 100.0));
          const maxW = device.ratedMaxWatts > 0 ? device.ratedMaxWatts : 8.5;
          device.liveWatts = Number((0.4 + pct * maxW).toFixed(2));
          attrs.powerSource = 'Philips WiZ Smart LED (8.5W)';
        }
      } else {
        if (!device.isOn) {
          device.liveWatts = 0.4;
          attrs.powerSource = 'Wipro Standby';
        } else {
          const maxW = device.ratedMaxWatts > 0 ? device.ratedMaxWatts : 9.0;
          const pct = Math.max(0.01, Math.min(1.0, device.primaryValue / 100.0));
          device.liveWatts = Number((0.4 + pct * maxW).toFixed(2));
          attrs.powerSource = 'Calibrated 9W LED Curve';
        }
      }
      break;
    }

    case 'tv': {
      if (!device.isOn) {
        device.liveWatts = 0.5;
        attrs.powerSource = 'OnePlus Standby';
      } else {
        const vol = Math.max(0.0, Math.min(1.0, device.primaryValue / 100.0));
        device.liveWatts = Number((75.0 + vol * 35.0).toFixed(2));
        attrs.powerSource = '4K Panel + Audio Curve';
      }
      break;
    }

    case 'fridge':
    case 'refrigerator': {
      if (!device.isOn) {
        device.liveWatts = 0.0;
        attrs.powerSource = 'Power Off';
      } else {
        device.liveWatts = device.ratedMaxWatts > 0 ? device.ratedMaxWatts : 145.0;
        attrs.powerSource = 'Inverter Linear Compressor';
      }
      break;
    }

    default: {
      if (!device.isOn) {
        device.liveWatts = 0.0;
        attrs.powerSource = 'Power Off';
      } else {
        device.liveWatts = device.ratedMaxWatts > 0 ? device.ratedMaxWatts : 25.0;
        attrs.powerSource = 'Smart Relay';
      }
      break;
    }
  }

  device.liveAttributes = attrs;
  return device.liveWatts;
}

// ============================================================================
// 4. TUYA / WIPRO MAPPER (Ported from TuyaMapper in wipro_tuya_service.dart)
// ============================================================================
export class TuyaMapper {
  static readonly acModes: Record<string, string> = {
    cool: 'cold',
    heat: 'hot',
    dry: 'wet',
    fan: 'wind',
    auto: 'auto',
  };

  static readonly acFans: Record<string, string> = {
    auto: 'auto',
    low: 'low',
    medium: 'mid',
    high: 'high',
    turbo: 'strong',
  };

  static readonly irModes: Record<string, number> = {
    cool: 0,
    heat: 1,
    auto: 2,
    fan: 3,
    dry: 4,
  };

  static readonly irFans: Record<string, number> = {
    auto: 0,
    low: 1,
    medium: 2,
    high: 3,
    turbo: 3,
  };

  static pick(candidates: string[], codes: Set<string>, override?: string): string | null {
    if (override && override.length > 0) return override;
    for (const c of candidates) {
      if (codes.has(c)) return c;
    }
    return null;
  }

  static range(code: string, ranges: Record<string, [number, number]> = {}, floor = 0): [number, number] {
    const r = ranges[code];
    if (r && r.length === 2 && r[1] > r[0]) return r;
    return code.endsWith('_v2') ? [floor > 0 ? 10.0 : 0.0, 1000.0] : [floor, 255.0];
  }

  static hexToHsv(hex: string): [number, number, number] | null {
    const clean = hex.replace('#', '').trim();
    if (clean.length !== 6) return null;
    const r = parseInt(clean.slice(0, 2), 16) / 255.0;
    const g = parseInt(clean.slice(2, 4), 16) / 255.0;
    const b = parseInt(clean.slice(4, 6), 16) / 255.0;

    const maxC = Math.max(r, g, b);
    const minC = Math.min(r, g, b);
    const delta = maxC - minC;

    let h = 0;
    if (delta > 0) {
      if (maxC === r) {
        h = ((g - b) / delta) % 6;
      } else if (maxC === g) {
        h = (b - r) / delta + 2;
      } else {
        h = (r - g) / delta + 4;
      }
      h *= 60;
      if (h < 0) h += 360;
    }
    const s = maxC === 0 ? 0 : delta / maxC;
    const v = maxC;
    return [h, s, v];
  }

  static lightCommands(params: {
    patch: Record<string, any>;
    state?: Record<string, any>;
    codes: Set<string>;
    ranges?: Record<string, [number, number]>;
  }): Array<{ code: string; value: any }> {
    const { patch, state = {}, codes, ranges = {} } = params;
    const out: Array<{ code: string; value: any }> = [];

    if ('on' in patch) {
      const code = this.pick(['switch_led', 'switch_1', 'switch'], codes) ?? 'switch_led';
      out.push({ code, value: Boolean(patch.on) });
    }

    if ('brightness' in patch) {
      const b = Number(patch.brightness);
      const code = this.pick(['bright_value_v2', 'bright_value'], codes);
      if (code) {
        const [lo, hi] = this.range(code, ranges, 25);
        out.push({ code, value: Math.round(lo + b * (hi - lo)) });
      }
    }

    if ('temp' in patch) {
      const k = Number(patch.temp);
      const code = this.pick(['temp_value_v2', 'temp_value'], codes);
      if (code) {
        const t = Math.max(0, Math.min(1, (k - 2200) / (6500 - 2200)));
        const [lo, hi] = this.range(code, ranges);
        if (codes.has('work_mode')) {
          out.push({ code: 'work_mode', value: 'white' });
        }
        out.push({ code, value: Math.round(lo + t * (hi - lo)) });
      }
    }

    if ('color' in patch) {
      const hsv = this.hexToHsv(String(patch.color));
      const code = this.pick(['colour_data_v2', 'colour_data'], codes);
      if (hsv && code) {
        const [, hi] = this.range(code === 'colour_data_v2' ? 'bright_value_v2' : 'bright_value', ranges);
        const scale = hi > 255 ? 1000.0 : 255.0;
        const v = Math.max(0.01, Math.min(1.0, Number(state.brightness ?? 1.0)));
        if (codes.has('work_mode')) {
          out.push({ code: 'work_mode', value: 'colour' });
        }
        out.push({
          code,
          value: JSON.stringify({
            h: Math.round(hsv[0]),
            s: Math.round(hsv[1] * scale),
            v: Math.round(v * scale),
          }),
        });
      }
    }

    return out;
  }

  static isInfraredAC(codes: Set<string>): boolean {
    return codes.has('PowerOn') || codes.has('PowerOff');
  }

  static infraredKeys(patch: Record<string, any>): Array<{ code: string; value: any }> {
    const out: Array<{ code: string; value: any }> = [];
    if ('on' in patch) {
      const key = patch.on ? 'PowerOn' : 'PowerOff';
      out.push({ code: key, value: key });
    }
    if ('mode' in patch && patch.mode in this.irModes) {
      out.push({ code: 'M', value: this.irModes[patch.mode] });
    }
    if ('target' in patch) {
      out.push({ code: 'T', value: Math.round(Number(patch.target)) });
    }
    if ('fan' in patch && patch.fan in this.irFans) {
      out.push({ code: 'F', value: this.irFans[patch.fan] });
    }
    return out;
  }

  static acCommands(params: {
    patch: Record<string, any>;
    codes: Set<string>;
  }): Array<{ code: string; value: any }> {
    const { patch, codes } = params;
    if (this.isInfraredAC(codes)) return this.infraredKeys(patch);

    const out: Array<{ code: string; value: any }> = [];
    if ('on' in patch) {
      const code = this.pick(['switch', 'power', 'switch_1'], codes) ?? 'switch';
      out.push({ code, value: Boolean(patch.on) });
    }
    if ('target' in patch) {
      const code = this.pick(['temp_set'], codes) ?? 'temp_set';
      out.push({ code, value: Math.round(Number(patch.target)) });
    }
    if ('mode' in patch && patch.mode in this.acModes) {
      const code = this.pick(['mode'], codes) ?? 'mode';
      out.push({ code, value: this.acModes[patch.mode] });
    }
    if ('fan' in patch && patch.fan in this.acFans) {
      const code = this.pick(['fan_speed_enum', 'windspeed'], codes);
      if (code) out.push({ code, value: this.acFans[patch.fan] });
    }
    if ('sleep' in patch && codes.has('sleep')) {
      out.push({ code: 'sleep', value: Boolean(patch.sleep) });
    }
    if ('eco' in patch && codes.has('eco')) {
      out.push({ code: 'eco', value: Boolean(patch.eco) });
    }
    return out;
  }
}

// ============================================================================
// 5. SMARTTHINGS LAUNDRY RECIPE & HOMECARE SERVICE
// ============================================================================
export class SmartThingsLaundryService {
  static recommendRecipe(selectedGarments: GarmentType[]): LaundryRecipeResult {
    const set = new Set(selectedGarments);
    if (set.has(GarmentType.delicates)) {
      return {
        recommendedCycle: 'Delicates & Wool',
        recommendedTempC: 30,
        recommendedSpin: 'Low',
        rinseCount: 2,
        enableEcoBubble: true,
        enableBubbleSoak: false,
        advice: 'Gentle cradle motion with low spin protects fine fabrics and prevents snagging.',
      };
    }
    if (set.has(GarmentType.babyWear)) {
      return {
        recommendedCycle: 'Hygiene Steam / Baby Care',
        recommendedTempC: 60,
        recommendedSpin: 'Med',
        rinseCount: 4,
        enableEcoBubble: true,
        enableBubbleSoak: true,
        advice: 'High-temperature steam and extra rinses remove 99.9% of bacteria and detergent residue.',
      };
    }
    if (set.has(GarmentType.jeansDenim)) {
      return {
        recommendedCycle: 'Denim & Colors',
        recommendedTempC: 30,
        recommendedSpin: 'Med',
        rinseCount: 3,
        enableEcoBubble: true,
        enableBubbleSoak: true,
        advice: 'Cold-water EcoBubble™ penetrates dense denim weave while locking indigo dye.',
      };
    }
    if (set.has(GarmentType.gymActivewear)) {
      return {
        recommendedCycle: 'Activewear SuperSpeed',
        recommendedTempC: 30,
        recommendedSpin: 'Med',
        rinseCount: 2,
        enableEcoBubble: true,
        enableBubbleSoak: false,
        advice: 'Speed Spray washes sweat from synthetic dry-fit fibers in 39 minutes.',
      };
    }
    if (set.has(GarmentType.towels) || set.has(GarmentType.bedding)) {
      return {
        recommendedCycle: 'Towels & Bedding',
        recommendedTempC: 60,
        recommendedSpin: 'Max',
        rinseCount: 3,
        enableEcoBubble: true,
        enableBubbleSoak: true,
        advice: 'Deep soak with hot water ensures maximum fluffiness and sanitization.',
      };
    }
    return {
      recommendedCycle: 'AI Wash (Auto Sense)',
      recommendedTempC: 40,
      recommendedSpin: 'High',
      rinseCount: 2,
      enableEcoBubble: true,
      enableBubbleSoak: false,
      advice: 'Smart sensors auto-detect load weight and soil turbidity to optimize detergent and time.',
    };
  }

  static checkHomeCareStatus(params: {
    drumCleanCount: number;
    detergentPercent: number;
    softenerPercent: number;
  }) {
    const drumCleanNeeded = params.drumCleanCount >= 40;
    const detergentLow = params.detergentPercent <= 20;
    const softenerLow = params.softenerPercent <= 20;

    return {
      drumCleanNeeded,
      drumCleanCyclesRemaining: Math.max(0, Math.min(40, 40 - params.drumCleanCount)),
      detergentLow,
      softenerLow,
      meshFilterStatus: 'Normal',
      careSummary: drumCleanNeeded
        ? 'Run Drum Clean+ cycle now (70°C water)'
        : detergentLow
        ? 'Refill Auto Dispenser detergent tank'
        : 'All systems optimal',
    };
  }
}

// ============================================================================
// 6. LG SMART DIAGNOSIS™ 3.0 ENGINE
// ============================================================================
export function runSmartDiagnosis(device: RealSmartDevice, simulatedFaultCode?: string | null): DiagnosticReport {
  if (simulatedFaultCode === 'OE') {
    return {
      deviceId: device.id,
      timestamp: new Date().toISOString(),
      overallHealth: 'fault',
      activeErrorCode: 'OE',
      errorSummary: 'Drain Pump Error: Water did not drain within expected window.',
      resolutionSteps: [
        'Unplug washer and locate lower-front drain filter cap.',
        'Place a towel down and unscrew the filter plug counterclockwise.',
        'Clean out any trapped coins, hairpins, or debris from the impeller.',
        'Reinsert filter tightly and run a quick rinse cycle.',
      ],
      componentChecks: [
        {
          componentName: 'Inverter DirectDrive Motor',
          healthScore: 98,
          status: 'good',
          metricDetail: 'Vibration & magnetic flux nominal',
        },
        {
          componentName: 'Drain Pump Assembly',
          healthScore: 32,
          status: 'fault',
          metricDetail: 'Flow resistance high (blocked impeller detected)',
        },
        {
          componentName: 'Water Inlet Valves',
          healthScore: 95,
          status: 'good',
          metricDetail: 'Water pressure 4.2 bar nominal',
        },
        {
          componentName: 'Door Lock Solenoid',
          healthScore: 100,
          status: 'good',
          metricDetail: 'Latch interlock secure',
        },
      ],
    };
  }

  if (!device.isOnline) {
    return {
      deviceId: device.id,
      timestamp: new Date().toISOString(),
      overallHealth: 'fault',
      activeErrorCode: 'NET_OFFLINE',
      errorSummary: `${device.name} is unreachable over LAN / Cloud gateway.`,
      resolutionSteps: [
        `Verify that ${device.name} has physical power connected.`,
        'Check that home Wi-Fi is active on 2.4 GHz band.',
        `Verify network IP address in device credentials (${device.credentials.ip || 'cloud'}).`,
      ],
      componentChecks: [
        {
          componentName: 'Network Radio / IP Reachability',
          healthScore: 0,
          status: 'fault',
          metricDetail: `Socket connection timed out (${device.credentials.ip || 'Cloud API'})`,
        },
        {
          componentName: 'Power & Telemetry Bus',
          healthScore: 50,
          status: 'warning',
          metricDetail: 'Awaiting device reconnect',
        },
      ],
    };
  }

  const checks: {
    componentName: string;
    healthScore: number;
    status: 'good' | 'warning' | 'fault';
    metricDetail: string;
  }[] = [
    {
      componentName: 'Network Radio & TCP Socket',
      healthScore: 100,
      status: 'good',
      metricDetail: `Connected · Protocol: ${device.protocol}`,
    },
    {
      componentName: 'Power Telemetry & Shunt Sensor',
      healthScore: 98,
      status: 'good',
      metricDetail: device.isOn
        ? `Live draw: ${device.liveWatts.toFixed(1)}W (Nominal)`
        : 'Standby mode: 0.0W',
    },
  ];

  if (device.category === 'washer') {
    const det = Number(device.liveAttributes.detergentPercent ?? device.liveAttributes.detergentLevel ?? 78);
    const soft = Number(device.liveAttributes.softenerPercent ?? device.liveAttributes.softenerLevel ?? 62);
    const drum = Number(device.liveAttributes.drumCleanCount ?? device.liveAttributes.drumCleanCycleCount ?? 12);
    checks.push(
      {
        componentName: 'Auto Dispenser Reservoirs',
        healthScore: det < 20 || soft < 20 ? 60 : 96,
        status: det < 20 || soft < 20 ? 'warning' : 'good',
        metricDetail: `Detergent: ${det}% · Softener: ${soft}%`,
      },
      {
        componentName: 'Tub Sanitization Index',
        healthScore: drum >= 35 ? 70 : 95,
        status: drum >= 35 ? 'warning' : 'good',
        metricDetail: `${drum}/40 cycles since last Tub Clean`,
      },
    );
  } else if (device.category === 'ac' || device.category === 'climate') {
    checks.push({
      componentName: 'DualCool Compressor & Coil',
      healthScore: 98,
      status: 'good',
      metricDetail: `Setpoint: ${device.primaryValue}°C · Airflow balanced`,
    });
  }

  return {
    deviceId: device.id,
    timestamp: new Date().toISOString(),
    overallHealth: 'good',
    activeErrorCode: null,
    errorSummary: `All ${device.name} subsystems operating within factory specifications.`,
    resolutionSteps: [
      'No hardware maintenance required at this time.',
      'Routine filter cleaning recommended every 30 operating days.',
    ],
    componentChecks: checks,
  };
}

// ============================================================================
// 7. SMART AUTOMATION ENGINE & NATURAL LANGUAGE PARSER
// ============================================================================
export class SmartAutomationEngine {
  static evaluatePreconditions(
    rule: MultiConditionAutomationRule,
    context: {
      isUserAtHome: boolean;
      devices: RealSmartDevice[];
      now?: Date;
    },
  ): boolean {
    const current = context.now ?? new Date();
    const hourDecimal = current.getHours() + current.getMinutes() / 60.0;
    const jsDay = current.getDay(); // 0=Sun..6=Sat
    const isoWeekday = jsDay === 0 ? 7 : jsDay; // 1=Mon..7=Sun

    for (const cond of rule.preconditions) {
      switch (cond.kind) {
        case PreconditionKind.none:
          break;
        case PreconditionKind.onlyAtNight: {
          const isNight = hourDecimal >= 18.5 || hourDecimal < 6.0;
          if (!isNight) return false;
          break;
        }
        case PreconditionKind.onlyDaytime: {
          const isDay = hourDecimal >= 6.0 && hourDecimal < 18.5;
          if (!isDay) return false;
          break;
        }
        case PreconditionKind.onlyWhenHome:
          if (!context.isUserAtHome) return false;
          break;
        case PreconditionKind.onlyWeekdays:
          if (isoWeekday > 5) return false;
          break;
        case PreconditionKind.onlyWeekends:
          if (isoWeekday < 6) return false;
          break;
        case PreconditionKind.deviceMustBeOn: {
          if (cond.checkDeviceId) {
            const dev = context.devices.find((d) => d.id === cond.checkDeviceId);
            if (!dev || !dev.isOn) return false;
          }
          break;
        }
        case PreconditionKind.deviceMustBeOff: {
          if (cond.checkDeviceId) {
            const dev = context.devices.find((d) => d.id === cond.checkDeviceId);
            if (!dev || dev.isOn) return false;
          }
          break;
        }
      }
    }
    return true;
  }

  static shouldTriggerTime(rule: MultiConditionAutomationRule, now: Date): boolean {
    if (rule.trigger.kind !== TriggerKind.timeSchedule) return false;
    const jsDay = now.getDay();
    const isoWeekday = jsDay === 0 ? 7 : jsDay;
    if (!rule.trigger.weekdays.includes(isoWeekday)) return false;

    const parts = rule.trigger.value.split(':');
    if (parts.length !== 2) return false;
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m)) return false;

    return now.getHours() === h && now.getMinutes() === m;
  }

  static shouldTriggerSolar(rule: MultiConditionAutomationRule, now: Date): boolean {
    if (rule.trigger.kind !== TriggerKind.solarEvent) return false;
    const isSunset = rule.trigger.value.toLowerCase() === 'sunset';
    const targetH = isSunset ? 18 : 6;
    const targetM = isSunset ? 30 : 0;
    return now.getHours() === targetH && now.getMinutes() === targetM;
  }

  static shouldTriggerPresence(rule: MultiConditionAutomationRule, isArriving: boolean): boolean {
    if (rule.trigger.kind !== TriggerKind.wifiPresence) return false;
    const expected = isArriving ? 'arrive_home' : 'leave_home';
    return rule.trigger.value === expected;
  }

  static parseNaturalLanguageToRule(
    prompt: string,
    availableDevices: RealSmartDevice[],
  ): MultiConditionAutomationRule | null {
    const lower = prompt.toLowerCase().trim();
    if (!lower) return null;

    let trigger: SmartTrigger | null = null;
    let ruleName = 'Smart Routine';

    if (lower.includes('sunset')) {
      trigger = { kind: TriggerKind.solarEvent, value: 'sunset', weekdays: [1, 2, 3, 4, 5, 6, 7] };
      ruleName = 'Sunset Routine';
    } else if (lower.includes('sunrise')) {
      trigger = { kind: TriggerKind.solarEvent, value: 'sunrise', weekdays: [1, 2, 3, 4, 5, 6, 7] };
      ruleName = 'Sunrise Routine';
    } else if (lower.includes('leave home') || lower.includes('leaving home') || lower.includes('i leave')) {
      trigger = { kind: TriggerKind.wifiPresence, value: 'leave_home', weekdays: [1, 2, 3, 4, 5, 6, 7] };
      ruleName = 'Leaving Home Routine';
    } else if (lower.includes('arrive home') || lower.includes('arriving home') || lower.includes('i arrive') || lower.includes('come home')) {
      trigger = { kind: TriggerKind.wifiPresence, value: 'arrive_home', weekdays: [1, 2, 3, 4, 5, 6, 7] };
      ruleName = 'Welcome Home Routine';
    } else {
      const timeRegex = /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/;
      const match = lower.match(timeRegex);
      if (match) {
        let hour = parseInt(match[1], 10);
        const minute = match[2] ? parseInt(match[2], 10) : 0;
        const meridiem = match[3];
        if (meridiem === 'pm' && hour < 12) hour += 12;
        if (meridiem === 'am' && hour === 12) hour = 0;
        const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        trigger = { kind: TriggerKind.timeSchedule, value: timeStr, weekdays: [1, 2, 3, 4, 5, 6, 7] };
        ruleName = `Schedule at ${timeStr}`;
      }
    }

    if (!trigger && lower.includes('when')) {
      for (const d of availableDevices) {
        if (lower.includes(d.name.toLowerCase()) || lower.includes(d.category.toLowerCase())) {
          const isTurnOn = lower.includes('turns on') || lower.includes('is on');
          trigger = {
            kind: TriggerKind.deviceState,
            value: isTurnOn ? 'on' : 'off',
            sourceDeviceId: d.id,
            sourceDeviceName: d.name,
            weekdays: [1, 2, 3, 4, 5, 6, 7],
          };
          ruleName = `When ${d.name} turns ${isTurnOn ? 'ON' : 'OFF'}`;
          break;
        }
      }
    }

    if (!trigger) {
      trigger = { kind: TriggerKind.timeSchedule, value: '22:00', weekdays: [1, 2, 3, 4, 5, 6, 7] };
    }

    const preconditions: SmartPrecondition[] = [];
    if (lower.includes('at night') || lower.includes('only at night')) {
      preconditions.push({ kind: PreconditionKind.onlyAtNight });
    }
    if (lower.includes('daytime') || lower.includes('during the day')) {
      preconditions.push({ kind: PreconditionKind.onlyDaytime });
    }
    if (lower.includes('when home') || lower.includes('only when home') || lower.includes('if at home')) {
      preconditions.push({ kind: PreconditionKind.onlyWhenHome });
    }
    if (lower.includes('weekdays') || lower.includes('weekday')) {
      preconditions.push({ kind: PreconditionKind.onlyWeekdays });
    }
    if (lower.includes('weekends') || lower.includes('weekend')) {
      preconditions.push({ kind: PreconditionKind.onlyWeekends });
    }

    let detectedDelay = 0;
    const delayMatch = lower.match(/wait\s+(\d+)\s*(?:s|sec|seconds)?/);
    if (delayMatch) {
      detectedDelay = parseInt(delayMatch[1], 10) || 0;
    }

    const isOffCommand = lower.includes('turn off') || lower.includes('switch off') || lower.includes('shut down');

    let detectedLevel: number | null = null;
    if (!isOffCommand) {
      const levelMatch = lower.match(/(?:to|set)\s+(\d{1,3})(?!\s*(?::|am|pm))\s*(?:%|°c|deg|degrees)?/);
      if (levelMatch) {
        detectedLevel = parseFloat(levelMatch[1]);
      }
    }

    const actions: SmartActionStep[] = [];

    if (lower.includes('all lights') || lower.includes('everything')) {
      for (const d of availableDevices) {
        if (d.category === 'light' || lower.includes('everything')) {
          actions.push({
            targetDeviceId: d.id,
            targetDeviceName: d.name,
            turnOn: !isOffCommand,
            targetLevel: detectedLevel,
            delaySecondsBefore: actions.length === 0 ? 0 : detectedDelay,
          });
        }
      }
    } else {
      for (const d of availableDevices) {
        const matchesName = lower.includes(d.name.toLowerCase());
        const matchesCat =
          lower.includes(d.category.toLowerCase()) ||
          (d.category === 'light' && (lower.includes('bulb') || lower.includes('lamp') || lower.includes('light'))) ||
          (d.category === 'ac' && lower.includes('ac')) ||
          (d.category === 'tv' && lower.includes('tv')) ||
          (d.category === 'washer' && lower.includes('washer'));

        if (matchesName || matchesCat) {
          actions.push({
            targetDeviceId: d.id,
            targetDeviceName: d.name,
            turnOn: !isOffCommand,
            targetLevel: detectedLevel,
            delaySecondsBefore: actions.length === 0 ? 0 : detectedDelay,
          });
        }
      }
    }

    if (actions.length === 0 && availableDevices.length > 0) {
      const first = availableDevices[0];
      actions.push({
        targetDeviceId: first.id,
        targetDeviceName: first.name,
        turnOn: !isOffCommand,
        targetLevel: detectedLevel,
        delaySecondsBefore: 0,
      });
    }

    if (actions.length === 0) return null;

    return {
      id: `rule_${Date.now()}`,
      name: ruleName,
      isEnabled: true,
      trigger,
      preconditions,
      actions,
      executionCount: 0,
    };
  }
}

// ============================================================================
// 8. UNIVERSAL MULTI-BRAND QR DECODER
// ============================================================================
export interface ParsedQrDeviceResult {
  providerId: string;
  providerName: string;
  brandColor: string;
  device: RealSmartDevice;
  pairingProtocol: string;
  rawCode: string;
}

export function decodeQrPayload(rawText: string, forcedProvider?: string): ParsedQrDeviceResult | null {
  const text = rawText.trim();
  if (!text) return null;

  const lower = text.toLowerCase();
  let providerKey = forcedProvider && forcedProvider !== 'all' ? forcedProvider : 'all';

  if (providerKey === 'all') {
    if (lower.includes('smartthings') || lower.includes('samsung') || lower.includes('ecobubble') || lower.includes('windfree')) {
      providerKey = 'samsung_smartthings';
    } else if (lower.includes('thinq') || lower.includes('lg_') || lower.includes('washtower') || lower.includes('dualcool') || lower.includes('instaview') || lower.includes('aerotower')) {
      providerKey = 'lg_thinq';
    } else if (lower.includes('wipro') || lower.includes('smartlife') || lower.includes('tuya')) {
      providerKey = 'wipro_smart_next';
    } else if (lower.includes('meethue') || lower.includes('philips-hue') || lower.includes('hue://')) {
      providerKey = 'philips_hue';
    } else if (lower.includes('wiz')) {
      providerKey = 'philips_wiz';
    } else if (lower.includes('realme') || (lower.includes('rtsp://') && lower.includes('554'))) {
      providerKey = 'realme_camera';
    } else if (lower.includes('philips') && (lower.includes('cam') || lower.includes('safety'))) {
      providerKey = 'philips_camera';
    } else if (lower.includes('tapo') || lower.includes('kasa')) {
      providerKey = 'tplink_tapo';
    } else if (lower.startsWith('mt:') || lower.startsWith('chip:') || lower.includes('matter')) {
      providerKey = 'home_assistant';
    }
  }

  const suffix = String(Date.now() % 100000);

  switch (providerKey) {
    case 'samsung_smartthings': {
      let category = 'washer';
      let name = 'Samsung AI Ecobubble™ Washer';
      let room = 'Laundry';
      let primaryVal = 1400;
      let ratedMaxWatts = 480;
      let attrs: Record<string, any> = {
        machineState: 'run',
        stage: 'wash',
        cycle: 'AI Wash',
        remainingMinutes: 32,
        detergentPercent: 85,
        softenerPercent: 70,
        ecoBubble: true,
        aiWash: true,
        drumCleanCount: 14,
      };
      if (lower.includes('ac') || lower.includes('windfree')) {
        category = 'ac';
        name = 'Samsung WindFree™ AI Inverter AC';
        room = 'Bedroom';
        primaryVal = 23;
        ratedMaxWatts = 1480;
        attrs = { windFree: true, goodSleep: true, pm1AirQuality: 11, aiEnergyMode: true };
      } else if (lower.includes('fridge') || lower.includes('familyhub')) {
        category = 'fridge';
        name = 'Samsung Family Hub™ Refrigerator';
        room = 'Kitchen';
        primaryVal = 3;
        ratedMaxWatts = 150;
        attrs = { fridgeTemp: 3, freezerTemp: -19, flexZoneMode: 'Beverage', iceBites: true };
      }
      const dev: RealSmartDevice = {
        id: `samsung_qr_${suffix}`,
        name,
        room,
        category,
        protocol: ConnectionProtocol.smartThingsCloud,
        // Fix Bug #31: Never hardcode vendor='demo' on QR-commissioned devices
        credentials: { vendor: 'smartthings', component: 'main', qr_payload: text },
        isOn: true,
        isOnline: true,
        primaryValue: primaryVal,
        liveWatts: 0,
        ratedMaxWatts,
        liveAttributes: attrs,
      };
      computeDeviceLiveWattage(dev);
      return {
        providerId: 'samsung_smartthings',
        providerName: 'Samsung SmartThings',
        brandColor: '#1428A0',
        device: dev,
        pairingProtocol: 'SmartThings OCF / Matter Wi-Fi',
        rawCode: text,
      };
    }

    case 'lg_thinq': {
      // Fix Bug #5 & #31: Use dedicated ConnectionProtocol.lgThinqCloud and vendor: 'lg_thinq'
      const dev: RealSmartDevice = {
        id: `lg_qr_${suffix}`,
        name: 'LG ThinQ DualCool™ AI AC',
        room: 'Living',
        category: 'ac',
        protocol: ConnectionProtocol.lgThinqCloud,
        credentials: { vendor: 'lg_thinq', qr_payload: text },
        isOn: true,
        isOnline: true,
        primaryValue: 23,
        liveWatts: 0,
        ratedMaxWatts: 1480,
        liveAttributes: {
          mode: 'cool',
          fanSpeed: 'auto',
          jetCool: true,
          roomTemp: 26,
          pm25: 12,
        },
      };
      computeDeviceLiveWattage(dev);
      return {
        providerId: 'lg_thinq',
        providerName: 'LG ThinQ',
        brandColor: '#A50034',
        device: dev,
        pairingProtocol: 'LG ThinQ SoftAP / Wi-Fi Barcode',
        rawCode: text,
      };
    }

    case 'wipro_smart_next': {
      const ipMatch = text.match(/(\d{1,3}(?:\.\d{1,3}){3})/);
      const keyMatch = text.match(/key=([a-zA-Z0-9]{16})/);
      const dev: RealSmartDevice = {
        id: `wipro_qr_${suffix}`,
        name: 'Wipro Next 9W Smart LED Bulb',
        room: 'Living',
        category: 'light',
        protocol: ipMatch && keyMatch ? ConnectionProtocol.tuyaLocalLan : ConnectionProtocol.tuyaCloudDirect,
        credentials: {
          vendor: 'wipro_tuya',
          ip: ipMatch ? ipMatch[1] : '192.168.1.102',
          localKey: keyMatch ? keyMatch[1] : '0123456789abcdef',
          version: '3.3',
          qr_payload: text,
        },
        isOn: true,
        isOnline: true,
        primaryValue: 100,
        liveWatts: 0,
        ratedMaxWatts: 9.0,
        liveAttributes: { colorTemp: 'warm_white', activeScene: 'Relax', musicSync: true },
      };
      computeDeviceLiveWattage(dev);
      return {
        providerId: 'wipro_smart_next',
        providerName: 'Wipro Next Smart Home',
        brandColor: '#0052CC',
        device: dev,
        pairingProtocol: 'Tuya Cloud & Local LAN (Port 6668)',
        rawCode: text,
      };
    }

    case 'philips_hue': {
      const ipMatch = text.match(/(\d{1,3}(?:\.\d{1,3}){3})/);
      const dev: RealSmartDevice = {
        id: `hue_qr_${suffix}`,
        name: 'Philips Hue White & Color Ambiance',
        room: 'Living',
        category: 'light',
        protocol: ConnectionProtocol.philipsHueLocal,
        credentials: {
          vendor: 'philips_hue',
          bridgeIp: ipMatch ? ipMatch[1] : '192.168.1.55',
          username: 'hue_pushlink_user',
          lightId: '1',
        },
        isOn: true,
        isOnline: true,
        primaryValue: 85,
        liveWatts: 0,
        ratedMaxWatts: 9.5,
        liveAttributes: { colorTemp: 'warm_amber', reachable: true },
      };
      computeDeviceLiveWattage(dev);
      return {
        providerId: 'philips_hue',
        providerName: 'Philips Hue',
        brandColor: '#0066CC',
        device: dev,
        pairingProtocol: 'Philips Hue Zigbee 3.0 Bridge Pushlink',
        rawCode: text,
      };
    }

    case 'realme_camera':
    case 'philips_camera': {
      // Fix Bug #31: Extract real IP, port, username, and password from rtsp://user:pass@ip:port/path
      const rtspRegex = /^rtsp:\/\/(?:([^:@/]+)(?::([^@/]+))?@)?([^:/]+)(?::(\d+))?(\/.*)?$/i;
      const m = text.match(rtspRegex);
      const username = m?.[1] || 'admin';
      const password = m?.[2] || 'realme';
      const ip = m?.[3] || '192.168.1.88';
      const port = m?.[4] || '554';
      const path = m?.[5] || '/live/ch0';
      const isPhilips = providerKey === 'philips_camera';
      const dev: RealSmartDevice = {
        id: `cam_${isPhilips ? 'philips' : 'realme'}_qr_${suffix}`,
        name: isPhilips ? 'Philips Home Safety Cam' : 'Realme Smart Cam 360',
        room: 'Living',
        category: 'camera',
        protocol: ConnectionProtocol.rtspOnvifCamera,
        credentials: {
          vendor: isPhilips ? 'philips_camera' : 'realme_camera',
          brand: isPhilips ? 'philips' : 'realme',
          ip,
          port,
          username,
          password,
          streamPath: path,
          rtspUrl: `rtsp://${username}:${password}@${ip}:${port}${path}`,
        },
        isOn: true,
        isOnline: true,
        primaryValue: 1080,
        liveWatts: 0,
        ratedMaxWatts: 4.5,
        liveAttributes: { privacyMode: false, panAngle: 0, tiltAngle: 0, nightVision: true, motionTrack: true },
      };
      computeDeviceLiveWattage(dev);
      return {
        providerId: providerKey,
        providerName: isPhilips ? 'Philips Home Camera' : 'Realme Smart Cam 360',
        brandColor: isPhilips ? '#0066CC' : '#FFB800',
        device: dev,
        pairingProtocol: 'RTSP H.264 / ONVIF Profile S',
        rawCode: text,
      };
    }

    default: {
      const isMatter = text.toUpperCase().startsWith('MT:') || text.toUpperCase().startsWith('CHIP:');
      const dev: RealSmartDevice = {
        id: `matter_qr_${suffix}`,
        name: isMatter ? 'Matter Certified Universal Appliance' : `Universal Smart Appliance (${text.slice(0, 16)})`,
        room: 'Living',
        category: 'switch',
        protocol: ConnectionProtocol.homeAssistantBridge,
        credentials: {
          vendor: 'matter_chip',
          hubUrl: 'http://homeassistant.local:8123',
          matter_code: text,
        },
        isOn: true,
        isOnline: true,
        primaryValue: 100,
        liveWatts: 0,
        ratedMaxWatts: 25,
        liveAttributes: { matterCommissioned: true, protocol: 'CHIP/Matter over Thread/Wi-Fi' },
      };
      computeDeviceLiveWattage(dev);
      return {
        providerId: 'home_assistant',
        providerName: isMatter ? 'Matter / Home Assistant' : 'Universal IoT Device',
        brandColor: '#03A9F4',
        device: dev,
        pairingProtocol: isMatter ? 'Matter Standard CHIP QR Protocol' : 'Universal Barcode / QR Stream',
        rawCode: text,
      };
    }
  }
}

// ============================================================================
// 9. DEFAULT FLEET, 3D FLOOR PLAN LAYOUTS & BRAND CATALOGS
// ============================================================================
export function createDefaultSampleDevices(): RealSmartDevice[] {
  const list: RealSmartDevice[] = [
    {
      id: 'samsung_washer_ecobubble_01',
      name: 'Samsung AI Ecobubble™ Washer',
      room: 'Laundry',
      category: 'washer',
      protocol: ConnectionProtocol.smartThingsCloud,
      credentials: { vendor: 'smartthings', component: 'main', token: 'st_pat_ecobubble_01', type: 'samsung_washer', cloudDeviceId: 'st-ecobubble-9kg-01' },
      isOn: true,
      isOnline: true,
      primaryValue: 1400,
      liveWatts: 0,
      ratedMaxWatts: 480,
      liveAttributes: {
        machineState: 'run',
        stage: 'rinse',
        cycle: 'AI Wash',
        remainingMinutes: 24,
        waterTemperature: 40,
        waterTemp: '40°C',
        spinSpeed: '1200 RPM',
        detergentPercent: 78,
        softenerPercent: 62,
        ecoBubble: true,
        aiWash: true,
        superSpeed: true,
        addWashDoorLocked: true,
        autoCycleLink: true,
        drumCleanCount: 12,
      },
    },
    {
      id: 'lg_ac_dualcool_01',
      name: 'LG ThinQ DualCool™ AI AC',
      room: 'Living',
      category: 'ac',
      // Fix Bug #5: Dedicated lgThinqCloud protocol so automations & reflexes route cleanly
      protocol: ConnectionProtocol.lgThinqCloud,
      credentials: { vendor: 'lg_thinq', token: 'lg_pat_dualcool_01', type: 'lg_ac' },
      isOn: true,
      isOnline: true,
      primaryValue: 23,
      liveWatts: 0,
      ratedMaxWatts: 1480,
      liveAttributes: {
        mode: 'cool',
        fan: 'auto',
        fanSpeed: 'Auto',
        jetCool: false,
        goodSleep: false,
        roomTemp: 26.5,
        currentTemp: 26.5,
        humidity: 55,
        pm25: 14,
        swingVertical: true,
        swingHorizontal: false,
        indirectWind: false,
        airClean: true,
        energyStep: 1,
        autoDry: true,
      },
    },
    {
      id: 'samsung_ac_windfree_01',
      name: 'Samsung WindFree™ Micro-Hole AC',
      room: 'Bedroom',
      category: 'ac',
      protocol: ConnectionProtocol.smartThingsCloud,
      credentials: { vendor: 'smartthings', component: 'main', token: 'st_pat_windfree_01', type: 'samsung_ac' },
      isOn: true,
      isOnline: true,
      primaryValue: 22,
      liveWatts: 0,
      ratedMaxWatts: 1420,
      liveAttributes: {
        mode: 'cool',
        windFree: true,
        goodSleep: true,
        pm1AirQuality: 11,
        aiEnergyMode: true,
        roomTemp: 24.5,
      },
    },
    {
      id: 'light_living_chandelier_01',
      name: 'Wipro Next Halo Chandelier',
      room: 'Living',
      category: 'light',
      protocol: ConnectionProtocol.tuyaLocalLan,
      credentials: { vendor: 'wipro_tuya', ip: '192.168.1.102', port: '6668', localKey: '0123456789abcdef', version: '3.3' },
      isOn: true,
      isOnline: true,
      primaryValue: 80,
      liveWatts: 0,
      ratedMaxWatts: 12,
      liveAttributes: { temp: 4200, colorHex: '#FFBD7A', activeScene: 'Relax', musicSync: false },
    },
    {
      id: 'light_living_backlight_01',
      name: 'Philips Hue TV Ambilight Strip',
      room: 'Living',
      category: 'light',
      protocol: ConnectionProtocol.philipsHueLocal,
      credentials: { vendor: 'philips_hue', bridgeIp: '192.168.1.50', username: 'hue_user_01', lightId: '1' },
      isOn: true,
      isOnline: true,
      primaryValue: 70,
      liveWatts: 0,
      ratedMaxWatts: 9.5,
      liveAttributes: { colorHex: '#7B5CFF', activeScene: 'Movie' },
    },
    {
      id: 'oneplus_tv_55_01',
      name: 'OnePlus TV 55" U1S 4K',
      room: 'Living',
      category: 'tv',
      protocol: ConnectionProtocol.onePlusTvLan,
      credentials: { vendor: 'oneplus', ip: '192.168.1.105', port: '8008' },
      isOn: true,
      isOnline: true,
      primaryValue: 25,
      liveWatts: 0,
      ratedMaxWatts: 110,
      liveAttributes: { currentApp: 'OxygenPlay', pictureMode: 'Cinema', volume: 25, smartVolume: true },
    },
    {
      id: 'samsung_tv_theframe_01',
      name: 'Samsung The Frame 65" 4K QLED',
      room: 'Living',
      category: 'tv',
      protocol: ConnectionProtocol.smartThingsCloud,
      credentials: { vendor: 'smartthings', component: 'main', token: 'st_pat_theframe_01', type: 'samsung_tv' },
      isOn: true,
      isOnline: true,
      primaryValue: 30,
      liveWatts: 0,
      ratedMaxWatts: 115,
      liveAttributes: { artMode: true, lightSync: true, selectedArtwork: 'Starry Night' },
    },
    {
      id: 'samsung_fridge_familyhub_01',
      name: 'Samsung Family Hub™ Refrigerator',
      room: 'Kitchen',
      category: 'fridge',
      protocol: ConnectionProtocol.smartThingsCloud,
      credentials: { vendor: 'smartthings', component: 'main', token: 'st_pat_familyhub_01', type: 'samsung_fridge' },
      isOn: true,
      isOnline: true,
      primaryValue: 3,
      liveWatts: 0,
      ratedMaxWatts: 150,
      liveAttributes: {
        fridgeTemp: 3,
        freezerTemp: -19,
        flexZoneMode: 'Beverage',
        powerCool: false,
        powerFreeze: false,
        iceBites: true,
      },
    },
    {
      id: 'lg_fridge_instaview_01',
      name: 'LG InstaView™ Door-in-Door Fridge',
      room: 'Kitchen',
      category: 'fridge',
      protocol: ConnectionProtocol.lgThinqCloud,
      credentials: { vendor: 'lg_thinq', token: 'lg_pat_instaview_01', type: 'lg_fridge' },
      isOn: true,
      isOnline: true,
      primaryValue: 2,
      liveWatts: 0,
      ratedMaxWatts: 140,
      liveAttributes: {
        instaViewTransparent: false,
        craftIce: true,
        doorCooling: true,
        fridgeTemp: 2,
        freezerTemp: -19,
        expressCool: false,
        expressFreeze: false,
      },
    },
    {
      id: 'lg_washtower_01',
      name: 'LG WashTower™ AI DirectDrive',
      room: 'Laundry',
      category: 'washer',
      protocol: ConnectionProtocol.lgThinqCloud,
      credentials: { vendor: 'lg_thinq', token: 'lg_pat_washtower_01', type: 'lg_washtower' },
      isOn: true,
      isOnline: true,
      primaryValue: 1200,
      liveWatts: 0,
      ratedMaxWatts: 460,
      liveAttributes: {
        machineState: 'run',
        stage: 'rinse',
        remainingMinutes: 24,
        turboWash360: true,
        ezDispenseDetergent: 82,
        ezDispenseSoftener: 68,
        steamPlus: true,
        smartPairing: true,
        dryerRemainingMinutes: 34,
      },
    },
    {
      id: 'cam_realme_360_01',
      name: 'Realme Smart Cam 360° PTZ',
      room: 'Living',
      category: 'camera',
      protocol: ConnectionProtocol.rtspOnvifCamera,
      credentials: {
        vendor: 'realme_camera',
        brand: 'realme',
        ip: '192.168.1.120',
        port: '554',
        username: 'admin',
        rtspUrl: 'rtsp://admin:realme@192.168.1.120:554/live/ch0',
      },
      isOn: true,
      isOnline: true,
      primaryValue: 1080,
      liveWatts: 0,
      ratedMaxWatts: 4.5,
      liveAttributes: {
        panAngle: 0,
        tiltAngle: 0,
        nightVision: true,
        motionTrack: true,
        patrol360: false,
        privacyMode: false,
      },
    },
    {
      id: 'light_bed_pendant_01',
      name: 'Philips WiZ Bedroom Nightstand',
      room: 'Bedroom',
      category: 'light',
      protocol: ConnectionProtocol.philipsWizUdp,
      credentials: { vendor: 'philips_wiz', ip: '192.168.1.118', mac: 'a8bb50998877' },
      isOn: true,
      isOnline: true,
      primaryValue: 45,
      liveWatts: 0,
      ratedMaxWatts: 8.5,
      liveAttributes: { temp: 2400, colorHex: '#FF9438', activeScene: 'Night Light' },
    },
  ];

  for (const dev of list) {
    computeDeviceLiveWattage(dev);
  }
  return list;
}

export function defaultScenes(): HouseScene3D[] {
  return [
    {
      id: 'bright',
      name: 'Bright',
      icon: 'sun',
      lights: { '*': { on: true, brightness: 1.0, temp: 4200 } },
    },
    {
      id: 'cozy',
      name: 'Cozy',
      icon: 'sofa',
      lights: {
        '*': { on: false },
        'living.floor': { on: true, brightness: 0.65 },
        'living.tv': { on: true, brightness: 0.7, color: '#ff7a3c' },
        'dining.pendant': { on: true, brightness: 0.45, temp: 2400 },
        'kitchen.strip': { on: true, brightness: 0.6, temp: 2700 },
        'bedroom.left': { on: true, brightness: 0.5 },
      },
    },
    {
      id: 'movie',
      name: 'Movie',
      icon: 'film',
      lights: {
        '*': { on: false },
        'living.tv': { on: true, brightness: 0.9, color: '#6a4cff' },
        'kitchen.strip': { on: true, brightness: 0.2, temp: 2400 },
      },
    },
    {
      id: 'night',
      name: 'Night',
      icon: 'moon',
      lights: {
        '*': { on: false },
        'bedroom.left': { on: true, brightness: 0.15 },
        'bath.mirror': { on: true, brightness: 0.25, temp: 2300 },
      },
      acs: { 'bedroom.ac': { sleep: true } },
    },
    {
      id: 'away',
      name: 'Away',
      icon: 'door',
      lights: { '*': { on: false } },
      acs: { '*': { on: false } },
    },
  ];
}

export function defaultApartmentLayout(): House3DTwinLayout {
  const rooms: Room3DZone[] = [
    {
      id: 'bedroom',
      name: 'Bedroom',
      gridRect: { left: 0.04, top: 0.04, width: 0.38, height: 0.42 },
      floorColor: '#94705A',
      floorType: FloorMaterialType.walnut,
      cameraZoom: 1.85,
      cameraFocus: [0.23, 0.25],
    },
    {
      id: 'bath',
      name: 'Bathroom',
      gridRect: { left: 0.44, top: 0.04, width: 0.20, height: 0.42 },
      floorColor: '#D5DADE',
      floorType: FloorMaterialType.tile,
      cameraZoom: 2.1,
      cameraFocus: [0.54, 0.25],
    },
    {
      id: 'kitchen',
      name: 'Kitchen',
      gridRect: { left: 0.66, top: 0.04, width: 0.30, height: 0.42 },
      floorColor: '#A2A7AE',
      floorType: FloorMaterialType.stone,
      cameraZoom: 1.95,
      cameraFocus: [0.81, 0.25],
    },
    {
      id: 'living',
      name: 'Living',
      gridRect: { left: 0.04, top: 0.48, width: 0.58, height: 0.48 },
      floorColor: '#C7A47C',
      floorType: FloorMaterialType.oak,
      cameraZoom: 1.75,
      cameraFocus: [0.33, 0.72],
    },
    {
      id: 'dining',
      name: 'Dining',
      gridRect: { left: 0.64, top: 0.48, width: 0.32, height: 0.48 },
      floorColor: '#C7A47C',
      floorType: FloorMaterialType.oak,
      cameraZoom: 1.85,
      cameraFocus: [0.80, 0.72],
    },
  ];

  const openings: Opening3D[] = [
    { type: 'door', from: [0.31, 0.46], to: [0.40, 0.46] },
    { type: 'door', from: [0.47, 0.46], to: [0.55, 0.46] },
    { type: 'open', from: [0.64, 0.54], to: [0.64, 0.90] },
    { type: 'open', from: [0.70, 0.46], to: [0.96, 0.46] },
    { type: 'window', from: [0.04, 0.15], to: [0.04, 0.35], sill: 0.85, head: 2.2 },
    { type: 'window', from: [0.04, 0.65], to: [0.04, 0.85], sill: 0.85, head: 2.2 },
    { type: 'window', from: [0.12, 0.04], to: [0.30, 0.04], sill: 1.5, head: 2.2 },
  ];

  const fixtures: Fixture3DNode[] = [
    {
      id: 'living.main',
      label: 'Halo Chandelier',
      fixtureType: 'ceiling',
      roomId: 'living',
      x: 0.30,
      y: 0.72,
      zHeight: 0.95,
      linkedRealDeviceId: 'light_living_chandelier_01',
      capabilities: ['brightness', 'temp'],
      kelvinTemp: 4200,
    },
    {
      id: 'living.tv',
      label: 'TV Ambilight',
      fixtureType: 'strip',
      roomId: 'living',
      x: 0.08,
      y: 0.72,
      zHeight: 0.45,
      linkedRealDeviceId: 'light_living_backlight_01',
      colorHex: '#7B5CFF',
      capabilities: ['brightness', 'color'],
    },
    {
      id: 'living.ac',
      label: 'LG DualCool AC',
      fixtureType: 'wall_ac',
      roomId: 'living',
      wall: 'west',
      x: 0.06,
      y: 0.56,
      zHeight: 0.82,
      linkedRealDeviceId: 'lg_ac_dualcool_01',
      capabilities: ['temperature'],
    },
    {
      id: 'living.camera',
      label: 'Realme 360 Cam',
      fixtureType: 'camera',
      roomId: 'living',
      x: 0.56,
      y: 0.90,
      zHeight: 0.88,
      linkedRealDeviceId: 'cam_realme_360_01',
      capabilities: ['ptz'],
    },
    {
      id: 'dining.pendant',
      label: 'Dining Pendant',
      fixtureType: 'pendant',
      roomId: 'dining',
      x: 0.80,
      y: 0.72,
      zHeight: 0.75,
      linkedRealDeviceId: 'light_living_chandelier_01',
      capabilities: ['brightness', 'temp'],
      kelvinTemp: 2700,
    },
    {
      id: 'kitchen.washer',
      label: 'Ecobubble Washer',
      fixtureType: 'washer',
      roomId: 'kitchen',
      x: 0.90,
      y: 0.14,
      zHeight: 0.28,
      linkedRealDeviceId: 'samsung_washer_ecobubble_01',
      capabilities: ['washer'],
    },
    {
      id: 'bedroom.left',
      label: 'Nightstand Lamp',
      fixtureType: 'table',
      roomId: 'bedroom',
      x: 0.14,
      y: 0.14,
      zHeight: 0.40,
      linkedRealDeviceId: 'light_bed_pendant_01',
      capabilities: ['brightness', 'temp'],
      kelvinTemp: 2400,
    },
    {
      id: 'bedroom.ac',
      label: 'WindFree AC',
      fixtureType: 'wall_ac',
      roomId: 'bedroom',
      wall: 'north',
      x: 0.30,
      y: 0.06,
      zHeight: 0.82,
      linkedRealDeviceId: 'samsung_ac_windfree_01',
      capabilities: ['temperature'],
    },
  ];

  const furniture: Furniture3DProp[] = [
    { id: 'rug.living', type: 'rug', roomId: 'living', x: 0.14, y: 0.62, width: 0.32, depth: 0.26, height: 0.01, rotationDeg: 0, colorHex: '#3B4A66' },
    { id: 'sofa.living', type: 'sofa', roomId: 'living', x: 0.36, y: 0.66, width: 0.16, depth: 0.24, height: 0.12, rotationDeg: -90, colorHex: '#8B93A7' },
    { id: 'armchair.living', type: 'armchair', roomId: 'living', x: 0.20, y: 0.54, width: 0.10, depth: 0.10, height: 0.11, rotationDeg: 12, colorHex: '#C28A5A' },
    { id: 'coffeeTable.living', type: 'coffeeTable', roomId: 'living', x: 0.24, y: 0.70, width: 0.12, depth: 0.08, height: 0.05, rotationDeg: 0 },
    { id: 'tv.living', type: 'tv', roomId: 'living', x: 0.06, y: 0.65, width: 0.05, depth: 0.18, height: 0.14, rotationDeg: 90 },
    { id: 'plant.living', type: 'plant', roomId: 'living', x: 0.08, y: 0.90, width: 0.08, depth: 0.08, height: 0.16, rotationDeg: 0 },
    { id: 'diningSet.dining', type: 'diningSet', roomId: 'dining', x: 0.72, y: 0.68, width: 0.18, depth: 0.14, height: 0.11, rotationDeg: 0, chairs: 6 },
    { id: 'island.dining', type: 'island', roomId: 'dining', x: 0.72, y: 0.48, width: 0.20, depth: 0.08, height: 0.13, rotationDeg: 0, stools: 3 },
    { id: 'kitchen.counter', type: 'kitchen', roomId: 'kitchen', x: 0.70, y: 0.06, width: 0.18, depth: 0.08, height: 0.12, rotationDeg: 0, isUpper: true },
    { id: 'fridge.kitchen', type: 'fridge', roomId: 'kitchen', x: 0.90, y: 0.06, width: 0.06, depth: 0.06, height: 0.22, rotationDeg: 0 },
    { id: 'bed.bedroom', type: 'bed', roomId: 'bedroom', x: 0.16, y: 0.14, width: 0.18, depth: 0.20, height: 0.13, rotationDeg: 0, colorHex: '#7F8FB5' },
    { id: 'bathtub.bath', type: 'bathtub', roomId: 'bath', x: 0.54, y: 0.14, width: 0.08, depth: 0.16, height: 0.10, rotationDeg: 90 },
    { id: 'vanity.bath', type: 'vanity', roomId: 'bath', x: 0.46, y: 0.06, width: 0.09, depth: 0.06, height: 0.12, rotationDeg: 0 },
  ];

  return {
    name: 'Home',
    wallHeight: 2.6,
    interiorWallHeight: 1.25,
    outdoorTemp: 29.0,
    cameraAzimuth: 34.0,
    cameraElevation: 47.0,
    rooms,
    openings,
    fixtures,
    furniture,
    scenes: defaultScenes(),
  };
}

export function studioApartmentLayout(): House3DTwinLayout {
  return {
    name: 'Studio',
    wallHeight: 2.7,
    interiorWallHeight: 1.25,
    outdoorTemp: 31.0,
    cameraAzimuth: 30.0,
    cameraElevation: 50.0,
    rooms: [
      {
        id: 'main',
        name: 'Studio',
        gridRect: { left: 0.04, top: 0.04, width: 0.64, height: 0.92 },
        floorColor: '#94705A',
        floorType: FloorMaterialType.walnut,
        cameraZoom: 1.75,
        cameraFocus: [0.36, 0.50],
      },
      {
        id: 'bath',
        name: 'Bathroom',
        gridRect: { left: 0.70, top: 0.04, width: 0.26, height: 0.48 },
        floorColor: '#D5DADE',
        floorType: FloorMaterialType.tile,
        cameraZoom: 2.0,
        cameraFocus: [0.83, 0.28],
      },
      {
        id: 'hall',
        name: 'Hall',
        gridRect: { left: 0.70, top: 0.54, width: 0.26, height: 0.42 },
        floorColor: '#A2A7AE',
        floorType: FloorMaterialType.stone,
        cameraZoom: 2.0,
        cameraFocus: [0.83, 0.75],
      },
    ],
    openings: [
      { type: 'door', from: [0.70, 0.64], to: [0.70, 0.80] },
      { type: 'window', from: [0.04, 0.24], to: [0.04, 0.72] },
    ],
    fixtures: [
      {
        id: 'main.ceiling',
        label: 'Studio Pendant',
        fixtureType: 'pendant',
        roomId: 'main',
        x: 0.36,
        y: 0.52,
        zHeight: 0.85,
        linkedRealDeviceId: 'light_living_chandelier_01',
        capabilities: ['brightness', 'temp'],
        kelvinTemp: 4200,
      },
      {
        id: 'main.ac',
        label: 'Studio AC',
        fixtureType: 'wall_ac',
        roomId: 'main',
        wall: 'north',
        x: 0.22,
        y: 0.06,
        zHeight: 0.85,
        linkedRealDeviceId: 'lg_ac_dualcool_01',
        capabilities: ['temperature'],
      },
      {
        id: 'main.shelf',
        label: 'Shelf Glow',
        fixtureType: 'strip',
        roomId: 'main',
        x: 0.08,
        y: 0.80,
        zHeight: 0.65,
        linkedRealDeviceId: 'light_living_backlight_01',
        colorHex: '#FF5FC4',
        capabilities: ['brightness', 'color'],
      },
    ],
    furniture: [
      { id: 'bed.studio', type: 'bed', roomId: 'main', x: 0.14, y: 0.16, width: 0.20, depth: 0.22, height: 0.13, rotationDeg: 0, colorHex: '#B98A7A' },
      { id: 'sofa.studio', type: 'sofa', roomId: 'main', x: 0.26, y: 0.74, width: 0.24, depth: 0.14, height: 0.12, rotationDeg: 180, colorHex: '#6F8F86' },
      { id: 'desk.studio', type: 'desk', roomId: 'main', x: 0.48, y: 0.12, width: 0.16, depth: 0.09, height: 0.11, rotationDeg: 0 },
      { id: 'vanity.studio', type: 'vanity', roomId: 'bath', x: 0.78, y: 0.10, width: 0.12, depth: 0.07, height: 0.12, rotationDeg: 0 },
    ],
    scenes: [
      { id: 'bright', name: 'Bright', icon: 'sun', lights: { '*': { on: true, brightness: 1, temp: 4200 } } },
      { id: 'work', name: 'Work', icon: 'table', lights: { '*': { on: false }, 'main.ceiling': { on: true, brightness: 0.8, temp: 4500 } } },
      { id: 'chill', name: 'Chill', icon: 'sofa', lights: { '*': { on: false }, 'main.shelf': { on: true, brightness: 0.8, color: '#ff5fc4' } } },
      { id: 'off', name: 'All off', icon: 'moon', lights: { '*': { on: false } }, acs: { '*': { on: false } } },
    ],
  };
}

export const BRAND_OAUTH_CATALOG: BrandAuthProviderConfig[] = [
  {
    id: 'samsung_smartthings',
    brandName: 'Samsung SmartThings',
    subtitle: 'Sign in with Samsung Account (Washers, WindFree ACs, The Frame TV, Family Hub)',
    brandColor: '#1428A0',
    loginUrl: 'https://account.smartthings.com/tokens',
    redirectUriPrefix: 'unifiedhome://oauth/smartthings',
    vendorType: 'smartthings',
  },
  {
    id: 'lg_thinq',
    brandName: 'LG ThinQ',
    subtitle: 'Sign in with LG Account (DualCool AC, WashTower, InstaView Fridge, AeroTower)',
    brandColor: '#A50034',
    loginUrl: 'https://connect-pat.lgthinq.com/',
    redirectUriPrefix: 'unifiedhome://oauth/lgthinq',
    vendorType: 'lg_thinq',
  },
  {
    id: 'wipro_smart_next',
    brandName: 'Wipro Next Smart Home',
    subtitle: 'Out-of-App Official Wipro Next Login & LAN Auto-Link (TCP Port 6668 AES-128)',
    brandColor: '#FF6B00',
    loginUrl: 'https://www.wiproconsumerlighting.com/login',
    redirectUriPrefix: 'unifiedhome://oauth/tuya',
    vendorType: 'wipro_tuya',
    authFlowLabel: 'Out-of-App Official Wipro Next Login & LAN Auto-Link',
  },
  {
    id: 'philips_hue',
    brandName: 'Philips Hue',
    subtitle: 'Auto-Discovery & 1-Tap Physical Pushlink Bridge Pairing (Zigbee 3.0)',
    brandColor: '#0066CC',
    loginUrl: 'https://discovery.meethue.com/',
    redirectUriPrefix: 'unifiedhome://oauth/hue',
    vendorType: 'philips_hue',
  },
  {
    id: 'philips_wiz',
    brandName: 'Philips WiZ',
    subtitle: 'Local Wi-Fi UDP Port 38899 Discovery & Direct Offline Control',
    brandColor: '#6B38FB',
    loginUrl: 'https://www.wizconnected.com',
    redirectUriPrefix: 'unifiedhome://oauth/wiz',
    vendorType: 'philips_wiz',
  },
  {
    id: 'realme_camera',
    brandName: 'Realme Smart Cam 360',
    subtitle: 'Official Realme Link Handoff & RTSP/ONVIF Stream with 360° PTZ Controls',
    brandColor: '#FFB800',
    loginUrl: 'https://www.realme.com/in/realme-link',
    redirectUriPrefix: 'unifiedhome://camera/realme',
    vendorType: 'realme_camera',
  },
  {
    id: 'philips_camera',
    brandName: 'Philips Home Camera',
    subtitle: 'Official Philips Home Safety / Access Handoff & RTSP 1080p Live Stream',
    brandColor: '#0066CC',
    loginUrl: 'https://www.philips.com',
    redirectUriPrefix: 'unifiedhome://camera/philips',
    vendorType: 'philips_camera',
  },
  {
    id: 'tplink_tapo',
    brandName: 'TP-Link Tapo / Kasa',
    subtitle: 'Sign in with TP-Link ID (Energy Monitoring Smart Plugs P110 & Bulbs)',
    brandColor: '#4ACBD6',
    loginUrl: 'https://www.tapo.com/en/login/',
    redirectUriPrefix: 'unifiedhome://oauth/tapo',
    // Fix Bug #33: Use dedicated tplink_tapo vendorType instead of smartthings
    vendorType: 'tplink_tapo',
  },
  {
    id: 'home_assistant',
    brandName: 'Home Assistant / Universal Matter Bridge',
    subtitle: 'Connect local Home Assistant server (http://IP:8123) or Matter 1.3 Thread Hub',
    brandColor: '#03A9F4',
    loginUrl: 'http://homeassistant.local:8123',
    redirectUriPrefix: 'unifiedhome://oauth/ha',
    vendorType: 'home_assistant',
  },
];

export const GOOGLE_HOME_PARTNER_CATALOG: PartnerApp[] = [
  { id: 'smartthings', name: 'Samsung SmartThings', company: 'Samsung Electronics', category: 'appliances', integrationType: 'smartThings', brandColor: '#0381FE', badge: 'Official Cloud API', description: 'Connect Samsung AI Washers, Dryers, WindFree ACs, The Frame TVs, and Family Hub.', supportedDeviceTypes: ['Washing Machine', 'Dryer', 'Smart TV', 'Air Conditioner', 'Refrigerator'], isFeatured: true },
  { id: 'lg_thinq', name: 'LG ThinQ Ecosystem', company: 'LG Electronics', category: 'climate', integrationType: 'lgThinQ', brandColor: '#A50034', badge: 'Official Cloud API', description: 'Connect LG DualCool Inverter ACs, InstaView Refrigerators, WashTower, AeroTower, and Styler.', supportedDeviceTypes: ['Air Conditioner', 'Refrigerator', 'Washer', 'Air Purifier', 'Styler'], isFeatured: true },
  { id: 'wipro_smart', name: 'Wipro Smart Next', company: 'Wipro Consumer Care', category: 'lighting', integrationType: 'wiproSmart', brandColor: '#FF9800', badge: 'Local Wi-Fi & Cloud', description: 'Connect Wipro Smart Next CCT Tunable Bulbs, RGB Strips, Smart Battens, and Plugs.', supportedDeviceTypes: ['Smart Bulbs (CCT & RGB)', 'Smart Plugs', 'LED Battens'], isFeatured: true },
  { id: 'oneplus_connect', name: 'OnePlus Connect', company: 'OnePlus Technology', category: 'entertainment', integrationType: 'oneplus', brandColor: '#F50057', badge: 'Direct LAN Protocol', description: 'Connect OnePlus TV 4K (U1S, Q-Series, Y-Series), OxygenPlay, and virtual D-Pad remote.', supportedDeviceTypes: ['OnePlus Android TV', 'OxygenPlay Media'], isFeatured: true },
  { id: 'matter', name: 'Matter Protocol', company: 'Connectivity Standards Alliance (CSA)', category: 'hubAndBridges', integrationType: 'matter', brandColor: '#00B0FF', badge: 'Local Matter 1.3', description: 'Commission any Matter-certified device over Thread or Wi-Fi using standard setup codes.', supportedDeviceTypes: ['Matter Plugs', 'Matter Lights', 'Matter Thermostats'], isFeatured: true },
  { id: 'philips_hue', name: 'Philips Hue', company: 'Signify N.V.', category: 'lighting', integrationType: 'hueBridge', brandColor: '#0072CE', badge: 'Hue Bridge / Cloud', description: 'Control Philips Hue White & Color Ambiance, Lightstrips, and Hue Play Gradient sync.', supportedDeviceTypes: ['Color Bulbs', 'Gradient Lightstrips'], isFeatured: true },
  { id: 'tuya_smart', name: 'Tuya Smart / Smart Life', company: 'Tuya Global Inc.', category: 'plugsAndEnergy', integrationType: 'tuyaGeneric', brandColor: '#FF5722', badge: 'Tuya IoT Cloud', description: 'Link thousands of smart home devices powered by Tuya and Smart Life IoT platform.', supportedDeviceTypes: ['Smart Plugs', 'Smart Switches', 'RGB Bulbs'], isFeatured: true },
  { id: 'tp_link_tapo', name: 'TP-Link Tapo & Kasa', company: 'TP-Link Technologies', category: 'plugsAndEnergy', integrationType: 'tapoCloud', brandColor: '#00A4E4', badge: 'Tapo Cloud', description: 'Connect TP-Link Tapo smart plugs (P110 energy meter), smart bulbs, and pan/tilt cams.', supportedDeviceTypes: ['Energy Plugs', 'Smart Bulbs', 'Security Cameras'], isFeatured: true },
  { id: 'mi_home', name: 'Xiaomi Mi Home', company: 'Xiaomi Inc.', category: 'appliances', integrationType: 'miHomeCloud', brandColor: '#FF6900', badge: 'Mi Cloud', description: 'Control Xiaomi Robot Vacuums, Smart Air Purifiers, Smart Standing Fans, and Desk Lamps.', supportedDeviceTypes: ['Robot Vacuum', 'Air Purifier', 'Smart Fan'], isFeatured: true },
  { id: 'google_nest', name: 'Google Nest', company: 'Google LLC', category: 'climate', integrationType: 'genericCloudAuth', brandColor: '#4285F4', badge: 'Google Nest Cloud', description: 'Nest Learning Thermostats, Nest Cam with Floodlight, Nest Audio, and Nest Protect.', supportedDeviceTypes: ['Learning Thermostat', 'Nest Cam', 'Nest Audio'], isFeatured: true },
  { id: 'roborock', name: 'Roborock', company: 'Roborock Technology', category: 'cleaning', integrationType: 'genericCloudAuth', brandColor: '#FF3366', badge: 'Roborock Cloud', description: 'Roborock S8 MaxV Ultra, Q Revo, and Dyad Pro wet/dry robot vacuums and sonic mops.', supportedDeviceTypes: ['Robot Vacuum', 'Sonic Mopping Station'] },
  { id: 'sonos', name: 'Sonos', company: 'Sonos Inc.', category: 'entertainment', integrationType: 'genericCloudAuth', brandColor: '#212121', badge: 'Wi-Fi Multiroom', description: 'Sonos Era 300, Arc soundbar, Sub (Gen 3), Move 2, and whole-home streaming audio.', supportedDeviceTypes: ['Smart Speaker', 'Dolby Atmos Soundbar'] },
  { id: 'aqara', name: 'Aqara Home', company: 'Lumi United Technology', category: 'security', integrationType: 'genericCloudAuth', brandColor: '#00ACC1', badge: 'Zigbee & Matter', description: 'Aqara Hub M3, Smart Lock U100, Door and Window Sensor P2, and Motion Sensors.', supportedDeviceTypes: ['Smart Lock', 'Door Sensor', 'Matter Hub'] },
  { id: 'ecobee', name: 'Ecobee', company: 'Ecobee Inc.', category: 'climate', integrationType: 'genericCloudAuth', brandColor: '#2E7D32', badge: 'Ecobee API', description: 'Ecobee Smart Thermostat Premium, SmartSensors, and Smart Security door sensors.', supportedDeviceTypes: ['Smart Thermostat', 'Room Sensor'] },
];

export const DEFAULT_REFLEX_RULES: CrossBrandReflexRule[] = [
  {
    id: 'reflex_cinema',
    title: 'OnePlus TV → Wipro Cinema Dimmer',
    description: 'When OnePlus TV turns ON, automatically dim Wipro & Hue Bulbs to 15%.',
    triggerCategory: 'tv',
    triggerEvent: 'power_on',
    targetCategory: 'light',
    targetPower: true,
    targetLevel: 15.0,
    isEnabled: true,
  },
  {
    id: 'reflex_cinema_ac',
    title: 'OnePlus TV → LG AC Silent Comfort',
    description: 'When OnePlus TV turns ON, set LG DualCool AC to 23°C.',
    triggerCategory: 'tv',
    triggerEvent: 'power_on',
    targetCategory: 'ac',
    targetPower: true,
    targetLevel: 23.0,
    isEnabled: true,
  },
  {
    id: 'reflex_laundry_done',
    title: 'Samsung Washer Done → Wipro Visual Alert',
    description: 'When Samsung Washer finishes its cycle, set Wipro Bulbs to 100% alert glow.',
    triggerCategory: 'washer',
    triggerEvent: 'power_off',
    targetCategory: 'light',
    targetPower: true,
    targetLevel: 100.0,
    isEnabled: true,
  },
];

export const SAMPLE_APP_OTA_MANIFEST: AppOtaManifest = {
  versionName: '1.1.0',
  versionCode: 2,
  downloadUrl: 'https://github.com/QUANTA8410/UHS/releases/download/v1.1.0/app-release.apk',
  fileSizeBytes: 100555960,
  sha256Checksum: 'D0A5E79DEC585DEE2D8D759D46534B7F5A8D17279C44709A1B53527A46FC8FDE',
  releaseDate: '2026-10-24',
  releaseNotes: [
    '3D Spatial Digital Twin with dynamic Kelvin lighting & AC airflow streamers',
    'Works with Google Home catalog (32+ partner brand ecosystems)',
    'Native OTA updater with SHA-256 cryptographic verification',
    'Matter 1.3 FOTA Cluster and Samsung AI Ecobubble™ optimization',
    '24/7 Always-On Embedded Node Server with WakeLock & WebSockets',
  ],
  isMandatory: false,
  minSupportedVersion: '1.0.0',
};

export const FLEET_FIRMWARE_UPDATES: DeviceFirmwareUpdate[] = [
  {
    deviceId: 'samsung_washer_ecobubble_01',
    deviceName: 'Samsung AI Ecobubble™ Washer',
    targetModel: 'WW90T604DLN',
    currentVersion: '3.4.1',
    availableVersion: '3.5.0',
    binarySizeBytes: 1468006,
    binarySha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
    partitionName: 'mcu_inverter_a',
    highlights: ['AI Ecobubble turbidity curve refinement', 'Spin vibration harmonic damping (-14% dB)'],
    isCritical: false,
    estimatedDurationSec: 5,
  },
  {
    deviceId: 'lg_ac_dualcool_01',
    deviceName: 'LG ThinQ DualCool™ AI AC',
    targetModel: 'PS-Q19YNZE',
    currentVersion: '2.1.8',
    availableVersion: '2.2.0',
    binarySizeBytes: 942080,
    binarySha256: '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a',
    partitionName: 'dual_inverter_dsp',
    highlights: ['Jet Cool ramp optimization', 'Active Energy Control 40% step precision'],
    isCritical: false,
    estimatedDurationSec: 5,
  },
  {
    deviceId: 'light_living_chandelier_01',
    deviceName: 'Wipro Next Halo Chandelier',
    targetModel: 'WIPRO-12W-CCT',
    currentVersion: '1.0.4',
    availableVersion: '1.1.0',
    binarySizeBytes: 524288,
    binarySha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    partitionName: 'tuya_mcu_0',
    highlights: ['Smooth 120Hz circadian Kelvin transitions', 'Local LAN TCP 6668 keep-alive hardening'],
    isCritical: false,
    estimatedDurationSec: 4,
  },
];

// ============================================================================
// 10. AUDITED HARDWARE PROTOCOL & STATE-MANAGEMENT FIXES (BUGS #1 - #39)
// ============================================================================

/**
 * Fix Bug #3: Restrict isDummy strictly to credentials['vendor'] === 'demo'
 * and strip 'vendor': 'demo' whenever real credentials (IP, token, localKey, rtspUrl, hubUrl) are attached.
 */
export function isDummyDevice(device: Pick<RealSmartDevice, 'credentials'>): boolean {
  return device.credentials?.vendor === 'demo';
}

export function sanitizeDeviceCredentials(
  credentials: Record<string, string>,
  fallbackVendor = 'custom_iot',
): Record<string, string> {
  const next = { ...credentials };
  const hasRealNetworkCreds = Boolean(
    next.ip ||
      next.token ||
      next.accessToken ||
      next.localKey ||
      next.rtspUrl ||
      next.hubUrl ||
      next.bridgeIp,
  );
  if (hasRealNetworkCreds && next.vendor === 'demo') {
    next.vendor = fallbackVendor;
  }
  if (next.localKey === 'auto_detected_lan') {
    // Fix Bug #26: Never retain 17-character 'auto_detected_lan' dummy key that crashes AES-128
    delete next.localKey;
  }
  return next;
}

/**
 * Fix Bug #4: Samsung Washer state override in SmartThings status parser.
 * Only mark device.isOn = false when switchVal === 'off', or when switchVal == null && washerState === 'stop'.
 */
export function resolveSmartThingsPowerState(params: {
  currentIsOn: boolean;
  switchVal?: string | null;
  washerState?: string | null;
}): boolean {
  const { currentIsOn, switchVal, washerState } = params;
  if (switchVal !== undefined && switchVal !== null) {
    return switchVal.toLowerCase() === 'on';
  }
  if (washerState !== undefined && washerState !== null) {
    return washerState.toLowerCase() === 'run';
  }
  return currentIsOn;
}

/**
 * Fix Bug #6: Home Assistant Bridge merges argument map into JSON payload alongside entity_id.
 */
export function buildHomeAssistantServicePayload(
  entityId: string,
  args: any[] = [],
): Record<string, any> {
  const payload: Record<string, any> = { entity_id: entityId };
  if (args.length > 0 && args[0] && typeof args[0] === 'object' && !Array.isArray(args[0])) {
    Object.assign(payload, args[0]);
  }
  return payload;
}

/**
 * Fix Bug #7: setDeviceLevel only infers isOn = newValue > 0 when category === 'light'.
 * Setting TV volume to 0 (mute) or changing AC target temperature never corrupts power state.
 */
export function computeUpdatedLevelState(
  device: Pick<RealSmartDevice, 'category' | 'isOn' | 'primaryValue'>,
  newValue: number,
): { primaryValue: number; isOn: boolean } {
  const isLight = device.category.toLowerCase() === 'light';
  return {
    primaryValue: newValue,
    isOn: isLight ? newValue > 0 : device.isOn,
  };
}

/**
 * Fix Bug #8: Tuya Cloud Direct (tuyaCloudDirect) payload builder & 120s poll rate-limit guard.
 */
export function buildTuyaCloudSkillPayload(
  deviceId: string,
  accessToken: string,
  command: string,
  args: any[] = [],
): Record<string, any> {
  const payload: Record<string, any> = {
    accessToken,
    devId: deviceId,
  };
  if (command === 'colorSet' && args.length > 0) {
    payload.color = args[0];
  } else {
    payload.value = args.length > 0 ? args[0] : 1;
  }
  return {
    header: {
      name: command,
      namespace: 'control',
      payloadVersion: 1,
    },
    payload,
  };
}

export function shouldPollTuyaCloudDevice(lastPollTimestampMs: number | undefined, nowMs = Date.now()): boolean {
  if (!lastPollTimestampMs) return true;
  return nowMs - lastPollTimestampMs >= 120_000;
}

/**
 * Fix Bug #13 & #14: Auto-bind unlinked 3D Dollhouse fixtures to real devices & deterministic IDs.
 */
export function autoBindRealDevicesToLayout(
  layout: House3DTwinLayout,
  devices: RealSmartDevice[],
): House3DTwinLayout {
  const nextFixtures = layout.fixtures.map((fixture) => {
    if (
      fixture.linkedRealDeviceId &&
      devices.some((d) => d.id === fixture.linkedRealDeviceId)
    ) {
      return fixture;
    }
    const match = devices.find((d) => {
      const sameRoom = d.room.toLowerCase().includes(fixture.roomId.toLowerCase());
      if (fixture.fixtureType === 'wall_ac') return sameRoom && d.category === 'ac';
      if (fixture.fixtureType === 'washer') return d.category === 'washer';
      if (fixture.fixtureType === 'camera') return d.category === 'camera';
      return sameRoom && d.category === 'light';
    });
    return {
      ...fixture,
      linkedRealDeviceId: match ? match.id : fixture.linkedRealDeviceId ?? null,
    };
  });
  return {
    ...layout,
    fixtures: nextFixtures,
  };
}

export function resolveDeterministicFixtureId(
  raw: {
    id?: string;
    roomId?: string;
    fixtureType?: string;
  },
  index?: number,
): string {
  if (raw.id && !raw.id.startsWith('[#')) return raw.id;
  const base = `${raw.roomId || 'living'}.${raw.fixtureType || 'ceiling'}`;
  return index !== undefined ? `${base}.${index}` : base;
}

/**
 * Fix Bug #15: Leaving Home Presence Automation exempts always-on critical appliances
 * ('fridge', 'camera', 'washer') so leaving Wi-Fi range never turns off refrigerators, cameras, or active laundry.
 */
export const EXEMPT_AWAY_CATEGORIES = new Set(['fridge', 'refrigerator', 'camera', 'washer']);

export function getDevicesToTurnOffOnLeaveHome(devices: RealSmartDevice[]): RealSmartDevice[] {
  return devices.filter(
    (d) => d.isOn && !EXEMPT_AWAY_CATEGORIES.has(d.category.toLowerCase()),
  );
}

/**
 * Fix Bug #16: Time-Based Automations fire only once per minute (prevents double-firing on 10s timer ticks).
 */
export function hasTriggeredInSameMinute(
  lastTriggeredIso: string | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!lastTriggeredIso) return false;
  const last = new Date(lastTriggeredIso);
  if (isNaN(last.getTime())) return false;
  if (now.getTime() - last.getTime() < 65_000) return true;
  return (
    last.getFullYear() === now.getFullYear() &&
    last.getMonth() === now.getMonth() &&
    last.getDate() === now.getDate() &&
    last.getHours() === now.getHours() &&
    last.getMinutes() === now.getMinutes()
  );
}

/**
 * Fix Bug #18: SmartThings Discovery checks refrigerator capabilities before thermostatCoolingSetpoint.
 */
export function classifySmartThingsCapabilities(capIds: string[], label: string): string {
  const lowerLabel = label.toLowerCase();
  const capSet = new Set(capIds);
  if (capSet.has('washerOperatingState') || lowerLabel.includes('washer')) {
    return 'washer';
  }
  if (
    capSet.has('refrigeration') ||
    lowerLabel.includes('fridge') ||
    lowerLabel.includes('refrigerator') ||
    lowerLabel.includes('family hub')
  ) {
    return 'fridge';
  }
  if (capSet.has('airConditionerMode') || capSet.has('thermostatCoolingSetpoint')) {
    return 'ac';
  }
  if (capSet.has('switchLevel') || capSet.has('colorControl')) {
    return 'light';
  }
  if (capSet.has('mediaPlayback') || capSet.has('tvChannel')) {
    return 'tv';
  }
  return 'switch';
}

/**
 * Fix Bug #25: Unescaped $ip and $direction in sendCameraPtzCommand ONVIF SOAP XML and CGI fallback.
 */
export function buildCameraPtzRequest(ip: string, direction: string): {
  onvifUrl: string;
  cgiFallbackUrl: string;
  soapBody: string;
  panVelocity: number;
  tiltVelocity: number;
} {
  const cleanIp = ip.trim() || '192.168.1.120';
  const dir = direction.toLowerCase();
  const panVelocity = dir === 'left' ? -0.5 : dir === 'right' ? 0.5 : 0.0;
  const tiltVelocity = dir === 'down' ? -0.5 : dir === 'up' ? 0.5 : 0.0;

  const soapBody = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:tptz="http://www.onvif.org/ver20/ptz/wsdl" xmlns:tt="http://www.onvif.org/ver10/schema">
  <soap:Body>
    <tptz:ContinuousMove>
      <tptz:ProfileToken>Profile_1</tptz:ProfileToken>
      <tptz:Velocity>
        <tt:PanTilt x="${panVelocity}" y="${tiltVelocity}" space="http://www.onvif.org/ver10/tptz/PanTiltSpaces/VelocityGenericSpace"/>
      </tptz:Velocity>
    </tptz:ContinuousMove>
  </soap:Body>
</soap:Envelope>`;

  return {
    onvifUrl: `http://${cleanIp}:8000/onvif/ptz_service`,
    cgiFallbackUrl: `http://${cleanIp}/cgi-bin/ptz.cgi?action=move&dir=${dir}`,
    soapBody,
    panVelocity,
    tiltVelocity,
  };
}

/**
 * Fix Bug #26: Validate 16-byte AES-128 LocalKey before attempting local Tuya TCP 6668 encryption.
 */
export function validateTuyaLocalKey(localKey?: string | null): boolean {
  if (!localKey) return false;
  if (localKey === 'auto_detected_lan') return false;
  return localKey.length === 16;
}

/**
 * Fix Bug #32: Parse all unifiedhome:// deep links including oauth/* and camera/* hosts.
 */
export function parseUnifiedHomeDeepLink(uri: string): {
  scheme: string;
  host: string;
  path: string;
  vendor?: string;
  token?: string;
  sceneName?: string;
  action?: string;
} | null {
  try {
    const trimmed = uri.trim();
    if (!trimmed.toLowerCase().startsWith('unifiedhome://')) return null;
    const withoutScheme = trimmed.slice('unifiedhome://'.length);
    const [hostAndPath, queryString] = withoutScheme.split('?');
    const parts = hostAndPath.split('/').filter(Boolean);
    const host = parts[0] || '';
    const path = parts.slice(1).join('/');
    const params = new URLSearchParams(queryString || '');

    if (host === 'oauth' || host === 'oauth-callback' || host === 'camera') {
      return {
        scheme: 'unifiedhome',
        host,
        path,
        vendor: parts[1] || params.get('vendor') || undefined,
        token: params.get('token') || params.get('code') || undefined,
        action: 'oauth_callback',
      };
    }
    if (host === 'scene') {
      return {
        scheme: 'unifiedhome',
        host,
        path,
        sceneName: params.get('name') || path || 'Movie',
        action: 'scene',
      };
    }
    return {
      scheme: 'unifiedhome',
      host,
      path,
      action: host === 'all_off' ? 'all_off' : host === 'toggle' ? 'toggle' : host,
    };
  } catch {
    return null;
  }
}

/**
 * Fix Bug #36: Accept both /ws and /api/ws for Always-On Node Server WebSocket tunnel.
 */
export function isValidWebSocketTunnelPath(path: string): boolean {
  const clean = path.split('?')[0].trim();
  return clean === '/ws' || clean === '/api/ws';
}

// ============================================================================
// 11. PART 2B & PART 3 ENHANCEMENTS: VAULT SANITIZATION, COALESCING, SCENES & REFLEX BUS
// ============================================================================

export const SENSITIVE_CREDENTIAL_KEYS = [
  'token',
  'accessToken',
  'localKey',
  'password',
  'apiKey',
] as const;

export const VAULT_SEALED_PLACEHOLDER = '[VAULT_SEALED]';

/**
 * Strips sensitive credential values before serializing devices to public localStorage
 * so plaintext tokens, passwords, and 16-byte AES keys never sit in uhs_paired_devices_v5.
 */
export function stripSecretsForPublicStorage(
  credentials: Record<string, string>,
  fallbackVendor = 'custom_iot',
): Record<string, string> {
  const sanitized = sanitizeDeviceCredentials(credentials, fallbackVendor);
  const publicCopy: Record<string, string> = { ...sanitized };
  for (const key of SENSITIVE_CREDENTIAL_KEYS) {
    if (publicCopy[key] && publicCopy[key] !== VAULT_SEALED_PLACEHOLDER) {
      publicCopy[key] = VAULT_SEALED_PLACEHOLDER;
    }
  }
  if (publicCopy.rtspUrl && publicCopy.rtspUrl.includes('@')) {
    // Redact embedded rtsp://user:password@ip credentials in public storage
    publicCopy.rtspUrl = publicCopy.rtspUrl.replace(
      /^(rtsp:\/\/)([^/:]+):([^@]+)@/i,
      `$1$2:${VAULT_SEALED_PLACEHOLDER}@`,
    );
  }
  return publicCopy;
}

/**
 * Latest-Value Command Coalescer:
 * Serializes commands per deviceId AND drops intermediate queued slider values
 * so dragging a brightness slider from 10% -> 100% only transmits the final target value
 * after the active frame settles.
 */
export class LatestValueCommandCoalescer {
  private activeLocks = new Map<string, Promise<void>>();
  private pendingLatestTask = new Map<
    string,
    {
      value: number;
      execute: (val: number) => Promise<any>;
      resolvers: Array<(res: any) => void>;
    }
  >();

  constructor(private readonly settleDelayMs = 80) {}

  async scheduleCoalesced<T>(
    deviceId: string,
    value: number,
    execute: (coalescedValue: number) => Promise<T>,
  ): Promise<T> {
    const existingPending = this.pendingLatestTask.get(deviceId);
    if (existingPending) {
      existingPending.value = value;
      existingPending.execute = execute;
      return new Promise<T>((resolve) => {
        existingPending.resolvers.push(resolve);
      });
    }

    const activeLock = this.activeLocks.get(deviceId);
    if (activeLock) {
      return new Promise<T>((resolve) => {
        this.pendingLatestTask.set(deviceId, {
          value,
          execute,
          resolvers: [resolve],
        });
      });
    }

    return this.runChain(deviceId, value, execute, []);
  }

  private async runChain<T>(
    deviceId: string,
    initialValue: number,
    initialExecute: (val: number) => Promise<T>,
    initialResolvers: Array<(res: T) => void>,
  ): Promise<T> {
    let releaseLock!: () => void;
    const lockPromise = new Promise<void>((r) => {
      releaseLock = r;
    });
    this.activeLocks.set(deviceId, lockPromise);

    try {
      const firstResult = await initialExecute(initialValue);
      initialResolvers.forEach((r) => r(firstResult));

      while (this.pendingLatestTask.has(deviceId)) {
        if (this.settleDelayMs > 0) {
          await new Promise((r) => setTimeout(r, this.settleDelayMs));
        }
        const nextPending = this.pendingLatestTask.get(deviceId);
        if (!nextPending) break;
        this.pendingLatestTask.delete(deviceId);
        const nextResult = await nextPending.execute(nextPending.value);
        nextPending.resolvers.forEach((r) => r(nextResult));
      }

      return firstResult;
    } finally {
      this.activeLocks.delete(deviceId);
      releaseLock();
    }
  }
}

/**
 * Computes the target state for a device when applying a Scene Preset, honoring
 * custom per-fixture overrides in `layout.scenes` (`lights` & `acs`) first,
 * and falling back to category heuristics for unlinked devices while protecting
 * continuous critical appliances (`fridge`, `camera`, `washer`) on `away`/`off`.
 */
export function computeSceneDeviceTargetState(
  device: RealSmartDevice,
  sceneId: string,
  layout?: House3DTwinLayout | null,
): {
  isOn: boolean;
  primaryValue: number;
  liveAttributesPatch: Record<string, any>;
  matchedFixtureId: string | null;
} {
  const lower = sceneId.toLowerCase().trim();
  const patch: Record<string, any> = {};
  let isOn = device.isOn;
  let primaryValue = device.primaryValue;
  let matchedFixtureId: string | null = null;

  // Never turn off continuous critical appliances in Away / Off scenes (Bug #15)
  if (EXEMPT_AWAY_CATEGORIES.has(device.category.toLowerCase())) {
    return { isOn: device.isOn, primaryValue: device.primaryValue, liveAttributesPatch: patch, matchedFixtureId: null };
  }

  const sceneDef = layout?.scenes?.find(
    (s) => s.id.toLowerCase() === lower || s.name.toLowerCase() === lower,
  );
  const linkedFixtures =
    layout?.fixtures?.filter((f) => f.linkedRealDeviceId === device.id) || [];

  if (sceneDef && linkedFixtures.length > 0) {
    if (device.category === 'light' && sceneDef.lights) {
      // Prefer specific fixture override over wildcard '*'
      const specificFixture = linkedFixtures.find((f) => sceneDef.lights[f.id] !== undefined);
      const rule = specificFixture
        ? sceneDef.lights[specificFixture.id]
        : sceneDef.lights['*'];

      if (rule) {
        matchedFixtureId = specificFixture ? specificFixture.id : '*';
        if (rule.on !== undefined) isOn = rule.on;
        if (rule.brightness !== undefined) {
          primaryValue =
            rule.brightness <= 1
              ? Math.round(rule.brightness * 100)
              : Math.round(rule.brightness);
        }
        if (rule.temp !== undefined) {
          patch.temp = rule.temp;
          patch.colorHex = tempToColor(rule.temp);
        }
        if (rule.color !== undefined) {
          patch.colorHex = rule.color.toUpperCase();
        }
        patch.activeScene = sceneDef.name;
        return { isOn, primaryValue, liveAttributesPatch: patch, matchedFixtureId };
      }
    }

    if ((device.category === 'ac' || device.category === 'climate') && sceneDef.acs) {
      const specificAc = linkedFixtures.find((f) => sceneDef.acs?.[f.id] !== undefined);
      const acRule = specificAc ? sceneDef.acs[specificAc.id] : sceneDef.acs['*'];
      if (acRule) {
        matchedFixtureId = specificAc ? specificAc.id : '*';
        if (acRule.on !== undefined) isOn = acRule.on;
        else if (acRule.sleep || acRule.target !== undefined) isOn = true;
        if (acRule.target !== undefined) primaryValue = acRule.target;
        else if (acRule.sleep) primaryValue = 25;
        if (acRule.sleep !== undefined) patch.goodSleep = acRule.sleep;
        return { isOn, primaryValue, liveAttributesPatch: patch, matchedFixtureId };
      }
    }
  }

  // Fallback category heuristics for unlinked devices or custom scene names
  if (lower === 'bright') {
    if (device.category === 'light') {
      isOn = true;
      primaryValue = 100;
      patch.temp = 4200;
    } else if (device.category === 'ac') {
      isOn = true;
      primaryValue = 22;
    }
  } else if (lower === 'cozy') {
    if (device.category === 'light') {
      isOn = true;
      primaryValue = 60;
      patch.temp = 2700;
    } else if (device.category === 'ac') {
      isOn = true;
      primaryValue = 24;
    }
  } else if (lower === 'movie') {
    if (device.category === 'tv') {
      isOn = true;
      patch.pictureMode = 'Cinema';
    } else if (device.category === 'light') {
      if (
        device.name.toLowerCase().includes('backlight') ||
        device.name.toLowerCase().includes('ambilight')
      ) {
        isOn = true;
        primaryValue = 85;
        patch.colorHex = '#6A4CFF';
      } else {
        isOn = false;
      }
    }
  } else if (lower === 'night') {
    if (device.category === 'tv') {
      isOn = false;
    } else if (device.category === 'light') {
      if (device.room.toLowerCase().includes('bed')) {
        isOn = true;
        primaryValue = 15;
      } else {
        isOn = false;
      }
    } else if (device.category === 'ac') {
      isOn = true;
      primaryValue = 25;
      patch.goodSleep = true;
    }
  } else if (lower === 'away' || lower === 'off') {
    if (['light', 'tv', 'ac'].includes(device.category)) {
      isOn = false;
    }
  }

  return { isOn, primaryValue, liveAttributesPatch: patch, matchedFixtureId };
}

/**
 * Evaluates Cross-Brand Reflex Rules across any power state transition
 * (whether triggered by toggleDevicePower, setDeviceLevel dimming to 0%, applyScene, or an automation).
 */
export function evaluateCrossBrandReflexes(
  prevDevices: RealSmartDevice[],
  nextDevices: RealSmartDevice[],
  reflexRules: CrossBrandReflexRule[],
): {
  devicesWithReflexes: RealSmartDevice[];
  triggeredRules: CrossBrandReflexRule[];
  hardwareMutations: Array<{
    device: RealSmartDevice;
    turnOn: boolean;
    targetLevel?: number;
  }>;
} {
  const prevMap = new Map<string, RealSmartDevice>();
  for (const d of prevDevices) {
    prevMap.set(d.id, d);
  }

  // Find all devices whose power state actually flipped in this transition
  const transitionedDevices = nextDevices.filter((d) => {
    const prev = prevMap.get(d.id);
    return prev !== undefined && prev.isOn !== d.isOn;
  });

  if (transitionedDevices.length === 0) {
    return { devicesWithReflexes: nextDevices, triggeredRules: [], hardwareMutations: [] };
  }

  const clonedDevices = nextDevices.map((d) => ({
    ...d,
    liveAttributes: { ...d.liveAttributes },
  }));
  const triggeredRules: CrossBrandReflexRule[] = [];
  const hardwareMutations: Array<{
    device: RealSmartDevice;
    turnOn: boolean;
    targetLevel?: number;
  }> = [];

  for (const toggledDev of transitionedDevices) {
    const eventType = toggledDev.isOn ? 'power_on' : 'power_off';
    for (const reflex of reflexRules) {
      if (!reflex.isEnabled) continue;
      if (
        reflex.triggerCategory === toggledDev.category &&
        reflex.triggerEvent === eventType
      ) {
        let matchedAnyTarget = false;
        for (const target of clonedDevices) {
          if (target.category === reflex.targetCategory && target.id !== toggledDev.id) {
            target.isOn = reflex.targetPower;
            target.isOnline = true;
            if (reflex.targetLevel !== undefined && reflex.targetPower) {
              target.primaryValue = reflex.targetLevel;
            }
            computeDeviceLiveWattage(target);
            hardwareMutations.push({
              device: target,
              turnOn: reflex.targetPower,
              targetLevel: reflex.targetPower ? reflex.targetLevel : undefined,
            });
            matchedAnyTarget = true;
          }
        }
        if (matchedAnyTarget && !triggeredRules.some((r) => r.id === reflex.id)) {
          triggeredRules.push(reflex);
        }
      }
    }
  }

  return {
    devicesWithReflexes: clonedDevices,
    triggeredRules,
    hardwareMutations,
  };
}


