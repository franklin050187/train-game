export const CARGO_IDS = [
  'food',
  'medicine',
  'fuel',
  'coal',
  'ore',
  'timber',
  'steel',
  'machinery',
  'chemicals',
  'goods',
] as const
export type CargoId = (typeof CARGO_IDS)[number]

export interface CargoDef {
  name: string
  icon: string
  basePrice: number
  weightPerTon: number
  critical: boolean
}

export type LocomotiveId =
  | 'old-steam'
  | 'diesel-hauler'
  | 'express-diesel'
  | 'heavy-electric'
  | 'warlord-burner'

export interface LocomotiveDef {
  id: LocomotiveId
  name: string
  power: number
  speed: number
  fuelType: 'coal' | 'diesel' | 'electric'
  fuelRate: number
  fuelCap: number
  weight: number
  cost: number
  maintenancePerDay: number
  techRequired?: string
}

export type WagonId =
  | 'passenger-car'
  | 'boxcar'
  | 'flatbed'
  | 'tanker'
  | 'reefer'
  | 'livestock-car'
  | 'heavy-cargo'
  | 'armored-car'
  | 'fuel-wagon'
  | 'workshop-car'

export interface WagonDef {
  id: WagonId
  name: string
  weight: number
  cargoCap: number
  passengerSeats: number
  fuelImpact: number
  riskMod: number
  armor: number
  cost: number
  maintenancePerDay: number
  allows?: CargoId[]
  fuelBonus?: number
  techRequired?: string
}

export type TechId =
  | 'fw-lightweight'
  | 'fw-high-capacity'
  | 'fw-reefer'
  | 'fw-passenger'
  | 'fw-tank'
  | 'loco-power'
  | 'loco-speed'
  | 'loco-fuel'
  | 'loco-range'
  | 'loco-experimental'
  | 'rail-reinforced'
  | 'rail-highspeed'
  | 'rail-quickrepair'
  | 'rail-comms'
  | 'sec-armored-wagon'
  | 'sec-defense'
  | 'sec-teams'
  | 'sec-earlywarning'
  | 'sec-escort'

export interface TechDef {
  id: TechId
  name: string
  category: 'locomotives' | 'wagons' | 'railway' | 'security'
  description: string
  cost: number
  timeDays: number
  requires?: TechId[]
  perk?: Partial<TechPerks>
}

export interface TechPerks {
  fuelEfficiency: number
  speedBonus: number
  powerBonus: number
  capacityBonus: number
  maintenanceReduction: number
  securityBonus: number
  constructionSpeed: number
  rangeBonus: number
  threatReduction: number
  reputationRate: number
}

export type BuildKind =
  | 'watchtower'
  | 'patrol-station'
  | 'security-depot'
  | 'military-base'
  | 'repair-depot'
  | 'fuel-station'
  | 'cargo-terminal'
  | 'automated-loading'
  | 'hospital'
  | 'housing'
  | 'food-distribution'
  | 'water-treatment'
  | 'heating'
  | 'mine'
  | 'refinery'
  | 'factory'
  | 'agriculture'
  | 'warehouse'
  | 'station-platform'
  | 'rail-yard'
  | 'maintenance-shed'

export interface CityLevelDef {
  level: number
  name: string
  requiresInfluence: number
  unlockedBuilds: BuildKind[]
  unlockedIndustries: string[]
}

export type ReputationLevel =
  | 'hostile'
  | 'suspicious'
  | 'neutral'
  | 'cooperative'
  | 'friendly'
  | 'allied'
  | 'strategic-partner'

export interface IndustryDef {
  kind: string
  name: string
  levelRequired: number
  produces: CargoId
  producesPerDay: number
  inputs: Partial<Record<CargoId, number>>
  buildCost: number
  buildTimeDays: number
}

export interface RegionDef {
  id: string
  name: string
  banditBaseThreat: number
  banditConfederation: boolean
}

export interface SegmentDef {
  id: string
  a: string
  b: string
  km: number
  region: string
  baseQuality: number
  loop?: boolean
  loopName?: string
}

export interface CityDef {
  id: string
  name: string
  region: string
  level: number
  population: number
  x: number
  y: number
  produces: CargoId[]
  needs: CargoId[]
  industries: string[]
  consumePerDay: Partial<Record<CargoId, number>>
  storageCap: Partial<Record<CargoId, number>>
  influence: number
  securityLevel: number
  reputation: ReputationLevel
}

export interface Factor {
  speed?: number
  fuel?: number
  damage?: number
  guardsCost?: number
  threat?: number
  delayHours?: number
  reputation?: number
  rewardBonus?: number
}

export interface JourneyOption {
  id: string
  label: string
  description: string
  effects: Factor
  cost?: number
}

export type EncounterKind =
  | 'bandit-ambush'
  | 'bandit-raider'
  | 'track-sabotage'
  | 'breakdown'
  | 'weather'
  | 'inspection'
  | 'signal'

export interface JourneyEncounter {
  id: string
  kind: EncounterKind
  atMinutes: number
  title: string
  text: string
  threat: number
  options: JourneyOption[]
  resolved: boolean
  note?: string
}

export interface CargoLoad {
  kind: CargoId
  tons: number
}

export type JourneyStatus = 'enroute' | 'awaiting-decision' | 'arrived' | 'failed' | 'lost'

export interface Journey {
  id: string
  trainId: string
  contractId: string
  kind: 'contract' | 'recursive-route'
  from: string
  to: string
  dispatchAt: number
  distanceKm: number
  speedMod: number
  cargo: CargoLoad[]
  passengers: number
  reward: number
  reputationReward: number
  deadlineAt: number
  arrivalAt: number
  encounterSeq: number
  encounters: JourneyEncounter[]
  status: JourneyStatus
  damageTaken: number
  guardsSpent: number
  fuelUnitsUsed: number
  armor: number
  security: number
  fuelCost: number
  result?: string
}

export interface WagonInstance {
  defId: WagonId
  condition: number
}

export type TrainStatus = 'yard' | 'transit' | 'awaiting-decision' | 'lost'

export interface TrainState {
  id: string
  name: string
  locoId: LocomotiveId
  wagons: WagonInstance[]
  status: TrainStatus
  journey?: Journey
  location: string
  maintenanceDays: number
}

export interface ContractState {
  id: string
  from: string
  to: string
  title: string
  cargo: CargoLoad[]
  passengers: number
  reward: number
  reputationReward: number
  deadlineAt: number
  type: 'freight' | 'passenger' | 'combined' | 'emergency' | 'recurring'
  riskLabel: 'low' | 'medium' | 'high'
  expired: boolean
  fulfilled?: boolean
  warned?: boolean
}

export interface RecurringRouteState {
  id: string
  name: string
  from: string
  to: string
  cargo: CargoLoad[]
  trainsPerWeek: number
  weeklyRevenue: number
  weeklyCosts: number
  nextPayAt: number
  status: 'active' | 'disrupted' | 'paused'
  disruptions: number
  disruptionNote?: string
}

export interface CityIndustryState {
  kind: string
  level: number
  operational: boolean
  lastCheckDay: number
}

export interface CityBuildState {
  kind: BuildKind
  level: number
}

export interface ConstructionState {
  id: string
  cityId: string
  kind: string
  name: string
  cost: number
  startAt: number
  finishAt: number
  applied: boolean
}

export interface CityState {
  id: string
  population: number
  level: number
  influence: number
  reputation: ReputationLevel
  securityLevel: number
  inventory: Partial<Record<CargoId, number>>
  industries: CityIndustryState[]
  builds: CityBuildState[]
  constructions: ConstructionState[]
  supply: number
}

export interface SegmentState {
  id: string
  quality: number
  securityLevel: number
  traffic: number
}

export interface ResearchProgressState {
  techId: TechId
  remainingDays: number
  finishAt: number
}

export interface LoopSegmentProgress {
  id: string
  progress: number
}

export interface Milestone {
  id: string
  at: number
  label: string
  value?: number
}

export interface Notification {
  id: string
  at: number
  kind: 'success' | 'warning' | 'danger' | 'info'
  title: string
  body: string
  critical: boolean
}

export interface PlayerStats {
  totalRevenue: number
  totalProfit: number
  cargoTons: number
  passengers: number
  citiesConnected: number
  industriesRestored: number
  railwayKmBuilt: number
  trainsOperated: number
  contractsCompleted: number
  contractsFailed: number
  emergencyContracts: number
  banditAttacksSurvived: number
  banditBasesDestroyed: number
  securityInvestment: number
  researchCompleted: number
  populationSupported: number
  repairsSpent: number
  freeplayYears: number
}

export interface PrestigeRecord {
  id: string
  at: number
  legacy: number
  finalScore: number
  summary: string
}

export interface TechPerkState {
  fuelEfficiency: number
  speedBonus: number
  powerBonus: number
  capacityBonus: number
  maintenanceReduction: number
  securityBonus: number
  constructionSpeed: number
  rangeBonus: number
  threatReduction: number
  reputationRate: number
}

export interface LoopState {
  segments: Record<string, LoopSegmentProgress>
  started: boolean
  completeAt?: number
}

export interface NetworkEdge {
  a: string
  b: string
  km: number
  region: string
  baseQuality: number
  loop: boolean
  loopName?: string
}

export interface WorldConfig {
  cities: CityDef[]
  segments: SegmentDef[]
  regions: RegionDef[]
}

export interface GameState {
  schemaVersion: 2
  id: string
  seed: number
  createdAt: number
  playerName: string
  minutes: number
  credits: number
  reputation: number
  influenceTotal: number
  legacy: number
  mode: 'campaign' | 'freeplay'
  freeplayStart?: number
  threatLevel: number
  loop: LoopState
  cities: Record<string, CityState>
  segments: Record<string, SegmentState>
  trains: TrainState[]
  contracts: ContractState[]
  routes: RecurringRouteState[]
  research: { completed: TechId[]; progress: ResearchProgressState[]; points: number }
  perks: TechPerkState
  stats: PlayerStats
  notifications: Notification[]
  milestones: Milestone[]
  achievements: string[]
  prestigeHistory: PrestigeRecord[]
  careerId: number
  tutorial: { step: number; done: boolean }
  eventCounter: number
  secretCounter: number
  revealedCities: string[]
  revealedSegments: string[]
}

export const CARGO: Record<CargoId, CargoDef> = {
  food: { name: 'Food', icon: 'icon-food', basePrice: 60, weightPerTon: 1, critical: true },
  medicine: { name: 'Medicine', icon: 'icon-medicine', basePrice: 420, weightPerTon: 1, critical: true },
  fuel: { name: 'Fuel', icon: 'icon-fuel', basePrice: 220, weightPerTon: 1, critical: true },
  coal: { name: 'Coal', icon: 'icon-coal', basePrice: 40, weightPerTon: 1, critical: false },
  ore: { name: 'Ore', icon: 'icon-ore', basePrice: 55, weightPerTon: 1, critical: false },
  timber: { name: 'Timber', icon: 'icon-timber', basePrice: 70, weightPerTon: 1, critical: false },
  steel: { name: 'Steel', icon: 'icon-steel', basePrice: 180, weightPerTon: 1, critical: false },
  machinery: { name: 'Machinery', icon: 'icon-machinery', basePrice: 340, weightPerTon: 1, critical: false },
  chemicals: { name: 'Chemicals', icon: 'icon-chemicals', basePrice: 260, weightPerTon: 1, critical: false },
  goods: { name: 'Goods', icon: 'icon-goods', basePrice: 120, weightPerTon: 1, critical: false },
}