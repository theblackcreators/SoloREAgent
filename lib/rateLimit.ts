/**
 * Simple in-memory rate limiter for API routes
 * Works well for single-instance deployments and Vercel serverless
 * For production at scale, consider using Upstash Redis or similar
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store for rate limits
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean up every minute

export interface RateLimitConfig {
  windowMs: number;    // Time window in milliseconds
  maxRequests: number; // Max requests per window
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
}

// Default configs for different endpoint types
export const RATE_LIMITS = {
  // Auth endpoints (login, signup, password reset)
  auth: { windowMs: 15 * 60 * 1000, maxRequests: 10 }, // 10 per 15 min
  
  // Standard API endpoints
  api: { windowMs: 60 * 1000, maxRequests: 60 }, // 60 per minute
  
  // Admin endpoints
  admin: { windowMs: 60 * 1000, maxRequests: 30 }, // 30 per minute
  
  // Strict (email send, sensitive operations)
  strict: { windowMs: 60 * 60 * 1000, maxRequests: 5 }, // 5 per hour
};

/**
 * Check rate limit for a given identifier
 * @param identifier - Unique identifier (e.g., IP address, user ID)
 * @param config - Rate limit configuration
 * @returns RateLimitResult with success status and headers info
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const key = identifier;
  
  let entry = rateLimitStore.get(key);
  
  // If no entry or window expired, create new entry
  if (!entry || entry.resetTime < now) {
    entry = {
      count: 1,
      resetTime: now + config.windowMs,
    };
    rateLimitStore.set(key, entry);
    
    return {
      success: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - 1,
      resetTime: entry.resetTime,
    };
  }
  
  // Increment count
  entry.count++;
  
  // Check if over limit
  if (entry.count > config.maxRequests) {
    return {
      success: false,
      limit: config.maxRequests,
      remaining: 0,
      resetTime: entry.resetTime,
    };
  }
  
  return {
    success: true,
    limit: config.maxRequests,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime,
  };
}

/**
 * Get client identifier from request
 * Uses X-Forwarded-For header (Vercel/proxy) or falls back to a default
 */
export function getClientIdentifier(req: Request, suffix?: string): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";
  return suffix ? `${ip}:${suffix}` : ip;
}

/**
 * Create rate limit headers for response
 */
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetTime / 1000)),
  };
}

/**
 * Helper to apply rate limiting to an API route
 * Returns null if allowed, or a 429 Response if rate limited
 */
export function applyRateLimit(
  req: Request,
  config: RateLimitConfig,
  keySuffix?: string
): Response | null {
  const identifier = getClientIdentifier(req, keySuffix);
  const result = checkRateLimit(identifier, config);
  
  if (!result.success) {
    const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);
    return new Response(
      JSON.stringify({
        error: "Too many requests. Please try again later.",
        retryAfter,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(retryAfter),
          ...rateLimitHeaders(result),
        },
      }
    );
  }
  
  return null;
}

