export enum ConnectionProtocol {
  smartThingsCloud = 'smartThingsCloud',
  lgThinqCloud = 'lgThinqCloud',
  homeAssistantBridge = 'homeAssistantBridge',
  tuyaLocalLan = 'tuyaLocalLan',
  tuyaCloudDirect = 'tuyaCloudDirect',
  onePlusTvLan = 'onePlusTvLan',
  customHttpWebhook = 'customHttpWebhook',
  philipsHueLocal = 'philipsHueLocal',
  philipsWizUdp = 'philipsWizUdp',
  rtspOnvifCamera = 'rtspOnvifCamera',
}

export enum UniversalDeviceArchetype {
  lighting = 'lighting',
  climateAc = 'climateAc',
  fanAir = 'fanAir',
  laundry = 'laundry',
  refrigeration = 'refrigeration',
  tvMedia = 'tvMedia',
  speakerAudio = 'speakerAudio',
  robotVacuum = 'robotVacuum',
  cameraSecurity = 'cameraSecurity',
  lockAccess = 'lockAccess',
  curtainShade = 'curtainShade',
  plugEnergy = 'plugEnergy',
}

export interface RealSmartDevice {
  id: string;
  name: string;
  room: string;
  category: string; // 'light' | 'ac' | 'washer' | 'tv' | 'switch' | 'camera' | 'fridge' | 'air_purifier' | 'styler' | 'dishwasher' | 'socket' | 'plug'
  protocol: ConnectionProtocol;
  credentials: Record<string, string>;
  isOn: boolean;
  isOnline: boolean;
  primaryValue: number; // Brightness (0-100) or Temp (16-30) or Spin RPM
  liveWatts: number;
  ratedMaxWatts: number;
  liveAttributes: Record<string, any>;
  lastError?: string | null;
}

export enum FloorMaterialType {
  oak = 'oak',
  walnut = 'walnut',
  tile = 'tile',
  stone = 'stone',
}

export interface Opening3D {
  type: 'door' | 'window' | 'open';
  from: [number, number];
  to: [number, number];
  sill?: number;
  head?: number;
}

export interface Room3DZone {
  id: string;
  name: string;
  gridRect: { left: number; top: number; width: number; height: number };
  floorColor: string;
  floorType: FloorMaterialType;
  cameraZoom: number;
  cameraFocus: [number, number];
}

export interface Fixture3DNode {
  id: string;
  label: string;
  fixtureType: string; // 'ceiling' | 'floor' | 'strip' | 'pendant' | 'spots' | 'table' | 'wall_ac' | 'washer' | 'camera' | 'ceiling_light' | 'table_lamp'
  roomId: string;
  x: number;
  y: number;
  zHeight: number;
  linkedRealDeviceId?: string | null;
  capabilities: string[];
  wall?: string;
  colorHex?: string;
  length?: number;
  intensity?: number;
  kelvinTemp?: number;
}

export interface Furniture3DProp {
  id: string;
  type: string; // 'sofa' | 'armchair' | 'coffeeTable' | 'tv' | 'sideboard' | 'diningSet' | 'island' | 'kitchen' | 'fridge' | 'bed' | 'nightstand' | 'vanity' | 'bathtub' | 'toilet' | 'rug' | 'plant' | 'desk' | 'bookshelf'
  roomId: string;
  x: number;
  y: number;
  width: number;
  depth: number;
  height: number;
  rotationDeg: number;
  colorHex?: string;
  chairs?: number;
  stools?: number;
  isUpper?: boolean;
}

export interface HouseScene3D {
  id: string;
  name: string;
  icon: string;
  lights: Record<string, { on?: boolean; brightness?: number; temp?: number; color?: string }>;
  acs?: Record<string, { on?: boolean; sleep?: boolean; target?: number }>;
}

export interface House3DTwinLayout {
  name: string;
  wallHeight: number;
  interiorWallHeight: number;
  outdoorTemp: number;
  cameraAzimuth: number;
  cameraElevation: number;
  rooms: Room3DZone[];
  openings: Opening3D[];
  fixtures: Fixture3DNode[];
  furniture: Furniture3DProp[];
  scenes: HouseScene3D[];
}

export enum TriggerKind {
  timeSchedule = 'timeSchedule',
  solarEvent = 'solarEvent',
  deviceState = 'deviceState',
  thresholdAbove = 'thresholdAbove',
  thresholdBelow = 'thresholdBelow',
  wifiPresence = 'wifiPresence',
}

export enum PreconditionKind {
  none = 'none',
  onlyAtNight = 'onlyAtNight',
  onlyDaytime = 'onlyDaytime',
  onlyWhenHome = 'onlyWhenHome',
  onlyWeekdays = 'onlyWeekdays',
  onlyWeekends = 'onlyWeekends',
  deviceMustBeOn = 'deviceMustBeOn',
  deviceMustBeOff = 'deviceMustBeOff',
}

export interface SmartTrigger {
  kind: TriggerKind;
  value: string;
  sourceDeviceId?: string;
  sourceDeviceName?: string;
  weekdays: number[]; // 1=Mon ... 7=Sun
}

export interface SmartPrecondition {
  kind: PreconditionKind;
  checkDeviceId?: string;
  checkDeviceName?: string;
}

export interface SmartActionStep {
  targetDeviceId: string;
  targetDeviceName: string;
  turnOn: boolean;
  targetLevel?: number | null;
  delaySecondsBefore: number;
}

export interface MultiConditionAutomationRule {
  id: string;
  name: string;
  isEnabled: boolean;
  trigger: SmartTrigger;
  preconditions: SmartPrecondition[];
  actions: SmartActionStep[];
  lastTriggeredAt?: string | null;
  executionCount: number;
}

export interface SmartAutomationRule {
  id: string;
  name: string;
  isEnabled: boolean;
  triggerType: 'time' | 'device_state';
  triggerValue: string;
  targetDeviceId: string;
  targetPowerState: boolean;
  targetLevel?: number | null;
  lastTriggeredAt?: string | null;
}

export interface AutomationExecutionLog {
  id: string;
  ruleId: string;
  ruleName: string;
  timestamp: string;
  summary: string;
  success: boolean;
  errorMessage?: string;
}

export interface CrossBrandReflexRule {
  id: string;
  title: string;
  description: string;
  triggerCategory: string;
  triggerEvent: string;
  targetCategory: string;
  targetPower: boolean;
  targetLevel?: number;
  isEnabled: boolean;
}

export enum GarmentType {
  shirtsDaily = 'shirtsDaily',
  jeansDenim = 'jeansDenim',
  towels = 'towels',
  delicates = 'delicates',
  bedding = 'bedding',
  babyWear = 'babyWear',
  gymActivewear = 'gymActivewear',
}

export interface LaundryRecipeResult {
  recommendedCycle: string;
  recommendedTempC: number;
  recommendedSpin: string;
  rinseCount: number;
  enableEcoBubble: boolean;
  enableBubbleSoak: boolean;
  advice: string;
}

export interface ComponentHealthCheck {
  componentName: string;
  healthScore: number;
  status: 'good' | 'warning' | 'fault';
  metricDetail: string;
}

export interface DiagnosticReport {
  deviceId: string;
  timestamp: string;
  overallHealth: 'good' | 'warning' | 'fault';
  activeErrorCode?: string | null;
  errorSummary: string;
  resolutionSteps: string[];
  componentChecks: ComponentHealthCheck[];
}

export enum OtaStage {
  idle = 'idle',
  checking = 'checking',
  downloading = 'downloading',
  verifying = 'verifying',
  flashing = 'flashing',
  rebooting = 'rebooting',
  completed = 'completed',
  failed = 'failed',
}

export interface AppOtaManifest {
  versionName: string;
  versionCode: number;
  downloadUrl: string;
  fileSizeBytes: number;
  sha256Checksum: string;
  releaseDate: string;
  releaseNotes: string[];
  isMandatory: boolean;
  minSupportedVersion: string;
}

export interface DeviceFirmwareUpdate {
  deviceId: string;
  deviceName: string;
  targetModel: string;
  currentVersion: string;
  availableVersion: string;
  binarySizeBytes: number;
  binarySha256: string;
  partitionName: string;
  highlights: string[];
  isCritical: boolean;
  estimatedDurationSec: number;
}

export interface BrandAuthProviderConfig {
  id: string;
  brandName: string;
  subtitle: string;
  brandColor: string;
  loginUrl: string;
  redirectUriPrefix: string;
  vendorType: string;
  authFlowLabel?: string;
}

export interface PartnerApp {
  id: string;
  name: string;
  company: string;
  category: 'appliances' | 'climate' | 'lighting' | 'entertainment' | 'security' | 'plugsAndEnergy' | 'cleaning' | 'hubAndBridges';
  integrationType: string;
  brandColor: string;
  badge: string;
  description: string;
  supportedDeviceTypes: string[];
  isFeatured?: boolean;
}

export interface CopilotAction {
  toolName: string;
  targetDevice: string;
  parameters: Record<string, any>;
  humanDescription: string;
}

export interface CopilotMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: string;
  executedActions: CopilotAction[];
}

export interface HardwareCommandPacket {
  id: string;
  timestamp: string;
  deviceId: string;
  deviceName: string;
  protocol: ConnectionProtocol;
  transport: string;
  endpoint: string;
  method: string;
  payloadSummary: string;
  status: 'dispatched' | 'verified' | 'relayed_ws' | 'throttled_guard';
  latencyMs: number;
}

export interface BugAuditItem {
  bugNumber: number;
  title: string;
  category: 'provider' | 'protocol' | 'ui_qr' | 'android_native';
  fileLocation: string;
  rootCause: string;
  fixApplied: string;
  codeSnippet: string;
}

