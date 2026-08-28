'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createNewGame, createDemoGame } from '@/game/init'
import {
  advanceTime,
  previewNextEvent,
  type AdvanceMode,
} from '@/game/engine'
import { dispatchTrain } from '@/game/journeys'
import { resolveEncounter } from '@/game/journeys'
import { addWagon, removeWagon, renameTrain } from '@/game/trains'
import { startConstruction } from '@/game/cities'
import { startResearch } from '@/game/research'
import { createRecurringRoute, resolveRouteDisruption } from '@/game/routes'
import { startLoopChallenge, fundLoopSegment, prestige } from '@/game/endgame'
import { register, login, clearSession, requireUserId, setSession } from './auth'
import { createGame, getGame, recordRun, saveGame } from './repo'
import type { GameState } from '@/game/types'
import type { TechId } from '@/game/types'

type ActionError = { error: string }

async function load(ownerId: string): Promise<GameState | ActionError> {
  const state = await getGame(ownerId)
  if (!state) return { error: 'no game yet' }
  return state
}

export type ActionResult = { ok: true; state: GameState } | { ok: false; error: string }

async function run(ownerId: string, mutate: (s: GameState) => boolean | string): Promise<ActionResult> {
  const current = await load(ownerId)
  if ('error' in current) return { ok: false, error: current.error }
  const outcome = mutate(current)
  if (typeof outcome === 'string') return { ok: false, error: outcome }
  await saveGame(ownerId, current)
  revalidatePath('/game')
  return { ok: true, state: current }
}

export async function newGameAction(input: FormData): Promise<ActionResult> {
  const ownerId = await requireUserId()
  const existing = await getGame(ownerId)
  if (existing) return { ok: false, error: 'already have a game' }
  const demo = input.get('demo') === '1'
  const name = String(input.get('name') ?? 'Conductor')
  const state = demo ? createDemoGame() : createNewGame({ playerName: name })
  await createGame(ownerId, state, demo)
  revalidatePath('/game')
  return { ok: true, state }
}

export async function advanceAction(formData: FormData): Promise<ActionResult> {
  const ownerId = await requireUserId()
  const raw = String(formData.get('advance') ?? 'next-event')
  const [mode, amountStr] = raw.split(':')
  const mode2 = ['next-event', 'minutes', 'hours', 'days'].includes(mode) ? mode : 'next-event'
  const amount = Math.max(1, Number(amountStr ?? 1) || 1)
  return run(ownerId, (s) => {
    advanceTime(s, mode2 as AdvanceMode, amount)
    return true
  })
}

export async function dispatchAction(formData: FormData): Promise<ActionResult> {
  const ownerId = await requireUserId()
  const trainId = String(formData.get('trainId'))
  const contractId = String(formData.get('contractId'))
  return run(ownerId, (s) => {
    const res = dispatchTrain(s, trainId, contractId)
    if (!res.ok) return res.error ?? 'cannot dispatch'
    return true
  })
}

export async function resolveAction(formData: FormData): Promise<ActionResult> {
  const ownerId = await requireUserId()
  const journeyId = String(formData.get('journeyId'))
  const optionId = String(formData.get('optionId'))
  return run(ownerId, (s) => {
    const done = resolveEncounter(s, journeyId, optionId)
    return done
  })
}

export async function addWagonAction(formData: FormData): Promise<ActionResult> {
  const ownerId = await requireUserId()
  const trainId = String(formData.get('trainId'))
  const wagonId = String(formData.get('wagonId'))
  return run(ownerId, (s) => {
    addWagon(s, trainId, wagonId)
    return true
  })
}

export async function removeWagonAction(formData: FormData): Promise<ActionResult> {
  const ownerId = await requireUserId()
  const trainId = String(formData.get('trainId'))
  const index = Number(formData.get('index'))
  return run(ownerId, (s) => {
    removeWagon(s, trainId, index)
    return true
  })
}

export async function renameTrainAction(formData: FormData): Promise<ActionResult> {
  const ownerId = await requireUserId()
  const trainId = String(formData.get('trainId'))
  const name = String(formData.get('name'))
  return run(ownerId, (s) => {
    renameTrain(s, trainId, name)
    return true
  })
}

export async function buildAction(formData: FormData): Promise<ActionResult> {
  const ownerId = await requireUserId()
  const cityId = String(formData.get('cityId'))
  const kind = String(formData.get('kind'))
  return run(ownerId, (s) => {
    const res = startConstruction(s, cityId, kind)
    if (!res.ok) return res.error ?? 'cannot build'
    return true
  })
}

export async function researchAction(formData: FormData): Promise<ActionResult> {
  const ownerId = await requireUserId()
  const techId = String(formData.get('techId'))
  const points = Number(formData.get('points') ?? 0)
  return run(ownerId, (s) => {
    const res = startResearch(s, techId as TechId, points)
    if (!res.ok) return res.error ?? 'cannot research'
    return true
  })
}

export async function addRouteAction(formData: FormData): Promise<ActionResult> {
  const ownerId = await requireUserId()
  const from = String(formData.get('from'))
  const to = String(formData.get('to'))
  const tons = Number(formData.get('tons'))
  const trainsPerWeek = Number(formData.get('trainsPerWeek'))
  return run(ownerId, (s) => {
    const res = createRecurringRoute(s, from, to, tons, trainsPerWeek)
    if (!res.ok) return res.error ?? 'cannot add route'
    return true
  })
}

export async function routeChoiceAction(formData: FormData): Promise<ActionResult> {
  const ownerId = await requireUserId()
  const routeId = String(formData.get('routeId'))
  const choice = String(formData.get('choice')) as 'repair' | 'pause' | 'resume'
  return run(ownerId, (s) => {
    const res = resolveRouteDisruption(s, routeId, choice)
    if (!res.ok) return res.error ?? 'invalid choice'
    return true
  })
}

export async function loopStartAction(): Promise<ActionResult> {
  const ownerId = await requireUserId()
  return run(ownerId, (s) => {
    const res = startLoopChallenge(s)
    if (!res.ok) return res.error ?? 'cannot start loop'
    return true
  })
}

export async function loopFundAction(formData: FormData): Promise<ActionResult> {
  const ownerId = await requireUserId()
  const segId = String(formData.get('segId'))
  return run(ownerId, (s) => {
    const res = fundLoopSegment(s, segId)
    if (!res.ok) return res.error ?? 'cannot fund segment'
    return true
  })
}

export async function prestigeAction(): Promise<ActionResult> {
  const ownerId = await requireUserId()
  const current = await load(ownerId)
  if ('error' in current) return { ok: false, error: current.error }
  const res = prestige(current)
  if (!res.ok || !res.newState) return { ok: false, error: res.error ?? 'cannot prestige' }
  await saveGame(ownerId, res.newState)
  await recordRun(ownerId, res.newState.playerName, current)
  revalidatePath('/game')
  return { ok: true, state: res.newState }
}

export async function previewAction(): Promise<{ preview: string } | ActionError> {
  const ownerId = await requireUserId()
  const state = await load(ownerId)
  if ('error' in state) return { error: state.error }
  const p = previewNextEvent(state)
  return { preview: p ? `D+${Math.floor(p.time / 1440)} ${fmtClock(p.time)}` : 'nothing scheduled' }
}

export async function registerAction(_prev: string | null | undefined, input: FormData): Promise<string | undefined> {
  const email = String(input.get('email'))
  const password = String(input.get('password'))
  const name = String(input.get('name'))
  if (email.length < 3 || password.length < 6) {
    return 'Email and a 6+ character password are required.'
  }
  let user
  try {
    user = await register(email, password, name)
  } catch {
    return 'That email is already registered.'
  }
  await setSession(user.id)
  redirect('/game')
}

export async function loginAction(_prev: string | null | undefined, input: FormData): Promise<string | undefined> {
  const email = String(input.get('email'))
  const password = String(input.get('password'))
  const userId = await login(email, password)
  if (!userId) return 'Invalid email or password.'
  await setSession(userId)
  redirect('/game')
}

export async function logoutAction(): Promise<void> {
  await clearSession()
  redirect('/login')
}

function fmtClock(minutes: number): string {
  const h = Math.floor((minutes % 1440) / 60)
  const m = Math.floor(minutes % 60)
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}