const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

const CLEANUP_INTERVAL = 60 * 1000
let cleanupTimer: ReturnType<typeof setInterval> | null = null

function startCleanup() {
  if (cleanupTimer) return
  cleanupTimer = setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of rateLimitStore) {
      if (now > entry.resetTime) {
        rateLimitStore.delete(key)
      }
    }
  }, CLEANUP_INTERVAL)
  if (typeof cleanupTimer === 'object' && 'unref' in cleanupTimer) {
    cleanupTimer.unref()
  }
}

startCleanup()

export interface RateLimitConfig {
  interval: number
  maxRequests: number
}

export class RateLimiter {
  private config: RateLimitConfig

  constructor(config: RateLimitConfig) {
    this.config = config
  }

  check(key: string): { allowed: boolean; remaining: number; resetIn: number } {
    const now = Date.now()
    const entry = rateLimitStore.get(key)

    if (!entry || now > entry.resetTime) {
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + this.config.interval,
      })
      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetIn: this.config.interval,
      }
    }

    if (entry.count >= this.config.maxRequests) {
      const resetIn = Math.ceil((entry.resetTime - now) / 1000)
      return {
        allowed: false,
        remaining: 0,
        resetIn,
      }
    }

    entry.count++
    const resetIn = Math.ceil((entry.resetTime - now) / 1000)
    return {
      allowed: true,
      remaining: this.config.maxRequests - entry.count,
      resetIn,
    }
  }

  reset(key: string) {
    rateLimitStore.delete(key)
  }
}

export const loginLimiter = new RateLimiter({
  interval: 15 * 60 * 1000,
  maxRequests: 10,
})

export const registerLimiter = new RateLimiter({
  interval: 60 * 60 * 1000,
  maxRequests: 5,
})

export const uploadLimiter = new RateLimiter({
  interval: 60 * 60 * 1000,
  maxRequests: 30,
})