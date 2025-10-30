# Redis-Era Documentation Archive

**Archive Date**: 2025-10-30
**Reason**: Redis caching infrastructure removed

---

## Overview

This directory contains documentation from UbuMaths' Redis caching era (2025-10-28 to 2025-10-30).

**What was Redis used for:**

- Server-side caching layer (Upstash Redis)
- Rate limiting (atomic counters)
- Assessment results caching (5 min TTL)
- Activity polling caching (30 sec TTL)

**Why it was removed:**

1. **Architectural Complexity**: External dependency added operational overhead
2. **Scale Mismatch**: UbuMaths (~100-1000 users) didn't justify caching complexity
3. **Cost**: $20/month vs $0 for direct database queries
4. **Debugging Difficulty**: Multi-layer caching made issues harder to trace
5. **Premature Optimization**: ~50ms faster responses weren't worth the complexity

**What replaced it:**

- **Direct database queries** (~100-200ms response time)
- **Strategic database indexes** (13 indexes on hot paths)
- **Database-backed rate limiting** (Supabase `rate_limits` table)
- **Optimistic UI** for perceived instant performance

---

## Archived Files

### 1. debugging-guide-redis-era.md

**Original Location**: `docs/development/debugging-guide.md`
**Size**: 687 lines
**Content**: Comprehensive guide to debugging 3-tier cache system (Client → Redis → Database)

**Why archived**:

- Entire guide was specific to Redis cache debugging
- Covered Map serialization bugs in Redis
- Cache invalidation troubleshooting
- Redis CLI commands for inspecting cache

**Historical Value**:

- Documents lessons learned about cache serialization (Map → Object)
- Debugging patterns for multi-layer systems
- Performance metrics from Redis era

### 2. troubleshooting/env-loading-fix-redis-era.md

**Original Location**: `docs/troubleshooting/env-loading-fix.md`
**Size**: 32 lines (introduction section)
**Content**: Technical guide to lazy initialization pattern for Redis client

**Why archived**:

- Specific to Redis environment variable loading issues
- Describes workaround for Vite's env loading timing with Redis client
- No longer relevant without Redis dependency

**Historical Value**:

- Documents lazy initialization pattern
- Explains Vite environment variable loading quirks
- Useful reference if similar issues arise with other external services

---

## Lessons Learned

### Performance

**Redis (2025-10-28)**:

- Cache hit: ~50ms
- Cache miss: ~300ms
- Average (95% hit rate): ~80ms

**Direct DB (2025-10-30+)**:

- All queries: ~100-200ms
- Difference: +20-120ms

**Verdict**: 100ms is imperceptible to users, not worth complexity

### Complexity

**Redis**:

- 4 architectural layers (Client → In-memory → Redis → DB)
- Cache invalidation logic
- Redis client configuration
- Environment variable management
- Map → Object serialization
- Cache key versioning

**Direct DB**:

- 2 architectural layers (Client → DB)
- Strategic indexes
- Simple queries

**Verdict**: Simpler = easier to maintain, debug, and understand

### Cost

**Redis**:

- $20/month (Upstash Pro)
- Or 10,000 requests/day limit (free tier)

**Direct DB**:

- $0 (included in Supabase plan)
- Unlimited queries

**Verdict**: Direct DB is cheaper at UbuMaths' scale

---

## When Redis Would Make Sense

Redis caching would be justified if UbuMaths had:

✅ **10,000+ concurrent users** (high traffic)
✅ **Database queries >1s** (expensive queries)
✅ **External API calls** (slow/rate-limited)
✅ **Real-time features** (pub/sub messaging)

For now (~100-1000 users): **Direct database queries are the right choice.**

---

## Related Documentation

- [Performance Optimizations](../../architecture/performance.md) - Phase 5 explains Redis removal
- [Database Schema](../../architecture/database-schema.md) - Strategic indexes
- [Rate Limiting](../../security/rate-limiting.md) - Database-backed implementation

---

## Changelog

### 2025-10-30: Redis Infrastructure Removed

**Removed**:

- Upstash Redis client (`src/lib/server/redis.ts`)
- Redis cache helpers (`src/lib/server/cache.ts`)
- Redis-backed rate limiting (migrated to database)
- Cache invalidation logic
- Redis environment variables

**Added**:

- Direct database queries
- Database-backed rate limiting (`rate_limits` table)
- Strategic database indexes (13 total)

**Documentation**:

- Archived Redis-era debugging guides
- Updated all feature docs to reference direct queries
- Rewrote Phase 5 in performance.md

---

**Maintenu par**: L'équipe UbuMaths
**Archive Purpose**: Historical reference and lessons learned
