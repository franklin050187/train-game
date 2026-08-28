import { requireUserId } from '@/lib/auth'
import { getGame, type RepoError } from '@/lib/repo'
import { GameShell } from '@/components/game-shell'
import { Onboard } from '@/components/onboard'

export const dynamic = 'force-dynamic'

export default async function GamePage() {
  const ownerId = await requireUserId()
  let state
  try {
    state = await getGame(ownerId)
  } catch (e) {
    state = null
    console.error('load game failed:', (e as RepoError).message)
  }
  if (!state) return <Onboard />
  return <GameShell state={state} />
}