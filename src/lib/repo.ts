import 'server-only'

import type { GameState } from '@/game/types'
import { computeScore } from '@/game/scoring'
import { findPath } from '@/game/network'
import { db } from './db'

export class RepoError extends Error {}

export async function getGame(ownerId: string): Promise<GameState | null> {
  const row = await db.game.findUnique({ where: { ownerId } })
  if (!row) return null
  return parseState(row.stateJson)
}

export function parseState(json: string): GameState {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch (e) {
    throw new RepoError(`corrupt game state: ${(e as Error).message}`)
  }
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    typeof (parsed as GameState).minutes !== 'number'
  ) {
    throw new RepoError('game state failed structural validation')
  }
  const state = parsed as GameState
  const version = state.schemaVersion as number
  if (version === 1) {
    state.fleet = []
    state.revealedCities = []
    state.revealedSegments = []
  } else if (version === 2) {
    state.fleet = []
  }
  state.schemaVersion = 3
  return state
}

export async function saveGame(ownerId: string, state: GameState): Promise<void> {
  const score = computeScore(state).total
  await db.game.update({
    where: { ownerId },
    data: { stateJson: JSON.stringify(state), score },
  })
}

export async function createGame(ownerId: string, state: GameState, demo = false): Promise<void> {
  await db.game.create({
    data: {
      ownerId,
      stateJson: JSON.stringify(state),
      score: computeScore(state).total,
      demo,
    },
  })
}

export async function recordRun(gameId: string, playerName: string, state: GameState): Promise<void> {
  const summary = summarize(state)
  await db.leaderboardSnapshot.upsert({
    where: { gameId },
    create: {
      gameId,
      playerName,
      legacy: state.legacy,
      score: computeScore(state).total,
      summary,
    },
    update: {
      playerName,
      legacy: state.legacy,
      score: computeScore(state).total,
      summary,
    },
  })
}

function summarize(state: GameState): string {
  const days = Math.floor(state.minutes / (24 * 60))
  const runs = state.prestigeHistory.length + 1
  const cities = Object.values(state.cities).filter(
    (c) => c.id === 'new-lyon' || findPath(state, 'new-lyon', c.id).ok,
  ).length
  const research = state.research.completed.length
  const loop = state.loop.started ? 'loop-started' : 'no-loop'
  return `Day ${days} • ${cities} cities • ${research} techs • run ${runs} • ${loop}`
}

export async function leaderboard(): Promise<
  { playerName: string; score: number; legacy: number; summary: string }[]
> {
  const rows = await db.leaderboardSnapshot.findMany({
    orderBy: [{ score: 'desc' }, { createdAt: 'asc' }],
    take: 20,
  })
  return rows.map((r) => ({
    playerName: r.playerName,
    score: r.score,
    legacy: r.legacy,
    summary: r.summary,
  }))
}