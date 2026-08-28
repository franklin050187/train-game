import { NextResponse, type NextRequest } from 'next/server'
import { readToken } from '@/lib/auth'

const PROTECTED = ['/game']
const GUEST_ONLY = ['/login', '/register']

export default function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl

  if (PROTECTED.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    const token = request.cookies.get('tg_session')?.value
    const userId = token ? readToken(token) : null
    if (!userId) {
      const loginUrl = new URL('/login', request.url)
      return NextResponse.redirect(loginUrl)
    }
    return NextResponse.next()
  }

  if (GUEST_ONLY.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    const token = request.cookies.get('tg_session')?.value
    const userId = token ? readToken(token) : null
    if (userId) {
      const gameUrl = new URL('/game', request.url)
      return NextResponse.redirect(gameUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/game/:path*', '/login', '/register'],
}