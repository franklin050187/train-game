import 'server-only'

import { cookies } from 'next/headers'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { compare, hash } from 'bcryptjs'
import { db } from './db'

const SECRET = process.env.SESSION_SECRET ?? ''
const COOKIE = 'tg_session'
const MAX_AGE = 60 * 60 * 24 * 30

export function sign(value: string): string {
  return createHmac('sha256', SECRET).update(value).digest('base64url')
}

export function hkSessions() {
  return SECRET.length >= 32
}

export function makeToken(userId: string): string {
  return `${userId}.${sign(userId)}`
}

export function readToken(token: string): string | null {
  const dot = token.indexOf('.')
  if (dot <= 0) return null
  const userId = token.slice(0, dot)
  const mac = token.slice(dot + 1)
  const expected = sign(userId)
  const a = Buffer.from(mac)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return null
  return timingSafeEqual(a, b) ? userId : null
}

export async function register(email: string, password: string, name: string) {
  const passwordHash = await hash(password, 10)
  const user = await db.user.create({ data: { email, passwordHash, name } })
  return user
}

export async function login(email: string, password: string): Promise<string | null> {
  const user = await db.user.findUnique({ where: { email } })
  if (!user) return null
  const ok = await compare(password, user.passwordHash)
  return ok ? user.id : null
}

export async function setSession(userId: string) {
  const cookieStore = await cookies()
  cookieStore.set(COOKIE, makeToken(userId), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE,
    secure: process.env.NODE_ENV === 'production',
  })
}

export async function clearSession() {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE)
}

export async function currentUserId(): Promise<string | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE)?.value
  if (!token) return null
  return readToken(token)
}

export async function requireUserId(): Promise<string> {
  const id = await currentUserId()
  if (!id) throw new Error('not authenticated')
  return id
}