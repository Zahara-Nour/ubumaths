# Redis Cache E2E Tests

Comprehensive end-to-end tests for Redis cache implementation in UbuMaths.

## Test Files

### 1. `rate-limiting.spec.ts` (7 tests)

Tests for rate limiting functionality using Redis:

- **Login Rate Limiting by IP** (2 tests)
  - Blocks login after 5 failed attempts from same IP
  - Allows different IPs to have separate rate limits

- **Login Rate Limiting by Email** (2 tests)
  - Blocks login after 3 failed attempts for same email
  - Allows login with correct password even after failed attempts

- **Signup Rate Limiting** (1 test)
  - Blocks signup after 3 attempts from same IP (1 hour TTL)

- **Chatbot Rate Limiting** (1 test)
  - Blocks chatbot requests after 5 attempts in 15 minutes

### 2. `assessment-results.spec.ts` (5 tests)

Tests for assessment results caching with 5-minute TTL:

- **Cache Performance** (2 tests)
  - Assessment results load faster on second visit (cache hit)
  - Multiple page views benefit from cached results

- **Cache Invalidation** (2 tests)
  - Cache updates after student submits assessment
  - Cache respects TTL and expires after 5 minutes (skipped in CI)

- **Edge Cases** (1 test)
  - Handles cache gracefully when Redis is unavailable

### 3. `activity-polling.spec.ts` (8 tests)

Tests for activity polling cache with 30-second TTL:

- **Polling Cache** (2 tests)
  - Polling requests use cache for repeated requests within TTL
  - Cache reduces number of database queries for activity counts

- **Cache Invalidation** (2 tests)
  - Activity count updates after receiving new notification
  - Polling stops when user navigates away from dashboard

- **Performance** (2 tests)
  - Polling does not impact page responsiveness
  - Multiple tabs share polling cache

- **Edge Cases** (2 tests)
  - Handles polling errors gracefully
  - Polling works with slow network conditions

## Total Test Count

- **20 E2E tests** across 3 test files
- Tests cover rate limiting, caching, and polling scenarios
- Includes performance, invalidation, and edge case tests

## Running Tests

### Run all Redis cache tests

```bash
npx playwright test e2e/redis-cache
```

### Run specific test file

```bash
npx playwright test e2e/redis-cache/rate-limiting.spec.ts
npx playwright test e2e/redis-cache/assessment-results.spec.ts
npx playwright test e2e/redis-cache/activity-polling.spec.ts
```

### Run with UI mode (interactive)

```bash
npx playwright test e2e/redis-cache --ui
```

### Run with debug mode

```bash
npx playwright test e2e/redis-cache --debug
```

## Test Configuration

### Timeouts

- Global timeout: **120 seconds** (extended for polling tests)
- Rate limiting tests: **90 seconds**
- Assessment results tests: **120 seconds**
- Activity polling tests: **120 seconds**

### Test Environment

- Base URL: `http://localhost:4173` (production build)
- Browsers: Chromium, Firefox, WebKit
- Parallel execution: Enabled
- Retries in CI: 2 attempts

## Redis Configuration

### Test Mode Behavior

Tests are designed to work in multiple scenarios:

1. **With Redis configured**: Full cache functionality tested
2. **Without Redis**: Tests gracefully skip or pass (fallback mode)
3. **Redis unavailable**: Tests verify graceful degradation

### Environment Variables (Optional)

```bash
# Upstash Redis (for testing)
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token
```

If not configured, tests will:

- Log warnings about missing Redis
- Skip rate limiting tests
- Skip cache performance tests
- Still verify application functionality without cache

## Test Features

### Graceful Skipping

Tests use `test.skip()` to gracefully handle scenarios where:

- Redis is not configured
- Required features are not implemented
- Test data is unavailable
- Timing constraints cannot be met (e.g., 5-minute TTL tests)

### Intelligent Logging

Tests log detailed information:

- Polling request timestamps
- Load times (cache hit vs miss)
- Rate limit triggers
- Performance improvements

### Error Handling

Tests verify:

- Application works even when Redis fails
- No critical errors when cache is unavailable
- Graceful fallback to database queries

## CI/CD Considerations

### Skipped in CI

Some tests are skipped in CI due to practical constraints:

- **5-minute TTL test**: Takes too long (skipped with `process.env.CI === 'true'`)
- **Long polling tests**: May be unreliable in CI environment

### Recommended CI Setup

1. Configure Redis for CI (optional but recommended)
2. Use shorter TTLs in test mode for faster execution
3. Run tests with retries enabled (configured: 2 retries)
4. Monitor test duration and adjust timeouts if needed

## Performance Benchmarks

### Expected Results (with Redis)

- **Cache hit improvement**: 30-90% faster load times
- **Polling interval**: ~30 seconds between requests
- **Rate limiting**: Effective blocking after threshold

### Without Redis

- Tests should still pass (graceful degradation)
- No performance improvements logged
- Rate limiting may not be enforced

## Troubleshooting

### Tests are skipping

- Check if Redis is configured (environment variables)
- Verify test data exists (users, assessments)
- Check application logs for errors

### Tests are failing

- Verify Redis connection is working
- Check if TTLs match test expectations
- Ensure test users exist in database

### Tests are slow

- Check network conditions
- Verify Redis response times
- Consider running tests serially (not parallel)

## Future Improvements

1. **Mock Redis**: Add mock Redis for tests (redis-memory-server)
2. **Test Mode TTLs**: Shorter TTLs for faster test execution
3. **Metrics Collection**: Track cache hit rates during tests
4. **Load Testing**: Add tests with multiple concurrent users
5. **Cache Warming**: Test cache pre-population strategies

## Related Documentation

- Main E2E tests: `/e2e/README.md`
- Redis implementation: `/src/lib/server/cache/redis.ts`
- Rate limiting: `/src/lib/server/utils/rate-limit.ts`
- Activity polling: `/src/routes/(protected)/dashboard/+page.svelte`
