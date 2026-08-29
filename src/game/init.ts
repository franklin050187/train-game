import { BALANCE } from './balance'
import { CITIES, CITY_BY_ID, REGIONS, SEGMENTS, SEGMENT_BY_ID } from './world'
import { LOCOMOTIVES } from './catalogs'
import { generateContractsForCity } from './contracts'
import { rngFor } from './rng'
import { neighbors } from './network'
import type { GameState, CityState, SegmentState } from './types'

export interface NewGameOptions {
  seed?: number
  playerName?: string
  careerId?: number
  legacy?: number
}

export function createNewGame(opts: NewGameOptions = {}): GameState {
  const seed = opts.seed ?? Math.floor(Math.random() * 0xffffffff)
  const rng = rngFor(seed, 'init', 'world')
  const careerId = opts.careerId ?? 1
  const legacy = opts.legacy ?? 0
  const now = Math.floor(Date.now())

  const cities: Record<string, CityState> = {}
  for (const def of CITIES) {
    const stock: CityState['inventory'] = {}
    for (const [kind, cap] of Object.entries(def.storageCap)) {
      stock[kind as keyof CityState['inventory']] = Math.round((cap as number) * (def.population > 20000 ? 0.5 : 0.3))
    }
    cities[def.id] = {
      id: def.id,
      population: def.population,
      level: def.level,
      influence: def.influence,
      reputation: def.reputation,
      securityLevel: def.securityLevel,
      inventory: stock,
      industries: def.industries.map((k) => ({ kind: k, level: 1, operational: true, lastCheckDay: 0 })),
      builds: [],
      constructions: [],
      supply: 100,
    }
  }

  for (const [id, def] of Object.entries(CITY_BY_ID)) {
    const nearEmpty = def.id === 'toulouse-c' || def.id === 'bordeaux-est' || def.id === 'lille-st'
    if (nearEmpty) {
      const c = cities[id]
      c.inventory.medicine = Math.round((def.storageCap.medicine ?? 10) * 0.18)
      c.inventory.fuel = Math.round((def.storageCap.fuel ?? 60) * 0.2)
      c.supply = 40
    }
  }

  const segments: Record<string, SegmentState> = {}
  for (const def of SEGMENTS) {
    segments[def.id] = {
      id: def.id,
      quality: def.baseQuality,
      securityLevel: 0,
      traffic: 0,
    }
  }

  const namePool = [...BALANCE.trainNamePool]
  const pickName = (): string => {
    if (namePool.length === 0) return `Train ${Math.floor(rng() * 999)}`
    return namePool.splice(Math.floor(rng() * namePool.length), 1)[0]
  }

  const state: GameState = {
    schemaVersion: 3,
    id: `g-${careerId}-${legacy}`,
    seed,
    createdAt: now,
    playerName: opts.playerName ?? 'Conductor',
    minutes: 0,
    credits: Math.round(BALANCE.startCredits * (1 + legacy * 0.25)),
    reputation: BALANCE.startReputation + legacy * 8,
    influenceTotal: 0,
    legacy,
    mode: 'campaign',
    threatLevel: 1,
    loop: { segments: {}, started: false },
    cities,
    segments,
    trains: [
      {
        id: 'tr-1',
        name: pickName(),
        locoId: 'old-steam',
        wagons: [
          { defId: 'flatbed', condition: 100 },
          { defId: 'boxcar', condition: 100 },
        ],
        status: 'yard',
        location: 'new-lyon',
        maintenanceDays: 0,
      },
    ],
    fleet: [],
    contracts: [],
    routes: [],
    research: { completed: [], progress: [], points: 0 },
    perks: {
      fuelEfficiency: 0,
      speedBonus: 0,
      powerBonus: 0,
      capacityBonus: 0,
      maintenanceReduction: 0,
      securityBonus: 0,
      constructionSpeed: 0,
      rangeBonus: 0,
      threatReduction: 0,
      reputationRate: 0,
    },
    stats: {
      totalRevenue: 0,
      totalProfit: 0,
      cargoTons: 0,
      passengers: 0,
      citiesConnected: 0,
      industriesRestored: 0,
      railwayKmBuilt: 0,
      trainsOperated: 0,
      contractsCompleted: 0,
      contractsFailed: 0,
      emergencyContracts: 0,
      banditAttacksSurvived: 0,
      banditBasesDestroyed: 0,
      securityInvestment: 0,
      researchCompleted: 0,
      populationSupported: 0,
      repairsSpent: 0,
      freeplayYears: 0,
    },
    notifications: [],
    milestones: [],
    achievements: [],
    prestigeHistory: [],
    careerId,
    tutorial: { step: 0, done: false },
    eventCounter: 0,
    secretCounter: 0,
    revealedCities: ['new-lyon'],
    revealedSegments: [],
  }

  // Reveal segments connected to starting city
  const startNeighbors = neighbors('new-lyon')
  for (const n of startNeighbors) {
    state.revealedCities.push(n.city)
    state.revealedSegments.push(n.seg)
  }

  void SEGMENT_BY_ID
  void REGIONS
  void LOCOMOTIVES

  generateContractsForCity(state, 'new-lyon', rng, 4)
  // Only generate for revealed cities
  for (const cityId of state.revealedCities) {
    if (cityId !== 'new-lyon') {
      generateContractsForCity(state, cityId, rng, 2)
    }
  }

  milestone(state, 0, 'The rails woke')
  milestone(state, 1440, 'Day 2, Year 1')
  return state
}

export function createDemoGame(seed = 0x5eed): GameState {
  const state = createNewGame({ seed, playerName: 'Demo', careerId: 7, legacy: 1 })
  state.credits = 180000
  state.reputation = 75
  state.research.completed.push('fw-lightweight')
  state.research.completed.push('loco-power')
  state.perks.speedBonus = 0.08
  state.perks.powerBonus = 0.12
  state.stats.contractsCompleted = 6

  const rng = rngFor(seed, 'demo', 'fleet')
  state.trains.push({
    id: 'tr-2',
    name: 'Warden',
    locoId: 'diesel-hauler',
    wagons: [
      { defId: 'flatbed', condition: 100 },
      { defId: 'flatbed', condition: 100 },
      { defId: 'tanker', condition: 100 },
    ],
    status: 'yard',
    location: 'new-lyon',
    maintenanceDays: 0,
  })
  state.fleet.push({ defId: 'boxcar', condition: 100 })
  state.fleet.push({ defId: 'flatbed', condition: 88 })

  state.cities['paris-valo'].builds.push({ kind: 'cargo-terminal', level: 1 })
  state.cities['new-lyon'].builds.push({ kind: 'station-platform', level: 1 })

  void rng

  state.notifications.unshift({
    id: 'n-demo',
    at: 0,
    kind: 'info',
    title: 'Demo run',
    body: 'Seeded state. Dispatch a train, hit NEXT EVENT, and ride an encounter.',
    critical: true,
  })
  return state
}

function milestone(gs: GameState, at: number, label: string): void {
  gs.milestones.push({ id: `ms-${gs.eventCounter++}`, at, label })
}