# Troubleshooting Guide

> Common issues and solutions for UbuMaths development and deployment

**Last Updated**: 2025-10-28
**Target Audience**: Developers, DevOps

---

## Table of Contents

1. [Recent Bug Fixes](#recent-bug-fixes) 🆕
2. [Environment & Configuration](#environment--configuration)
3. [Database Issues](#database-issues)
4. [Build & Deployment](#build--deployment)
5. [Testing Issues](#testing-issues)
6. [Performance Issues](#performance-issues)

---

## Recent Bug Fixes

> 🆕 2025-10-29

For recently fixed bugs and their solutions, see [Bug Fixes - 2025-10-29](./bug-fixes-2025-10-29.md).

**Quick Links**:

- **Activity Polling 401 Errors**: Fixed race condition during dashboard load
- **Color Input Validation**: Fixed empty string handling in HTML5 color inputs
- **TypeScript Form Errors**: Added proper type guards for form.errors access

---

## Environment & Configuration

### Environment Variables Not Loading

**Symptoms**:

- Environment validation errors on startup
- "undefined" values in `process.env` despite correct `.env` file
- Supabase connection failures with valid credentials

**Solution**: Use lazy initialization for environment-dependent resources

**Quick Fix**:

```typescript
// Use lazy initialization pattern for any resources using env vars
let resource: Resource | null = null;

function getResource(): Resource {
	if (!resource) {
		const config = process.env.CONFIG_VAR;
		if (!config) throw new Error('CONFIG_VAR missing in .env');
		resource = new Resource(config);
	}
	return resource;
}
```

**Prevention**:

- Never initialize resources at module level
- Always use lazy initialization for clients/connections
- Explicitly load env vars in `vite.config.ts`:
  ```typescript
  const env = loadEnv(mode, process.cwd(), '');
  Object.assign(process.env, env);
  ```

**References**:

- [Environment Variables Guide](../development/environment-variables.md)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)

---

### .env File Not Found

**Symptoms**: "Cannot find .env file" errors

**Solution**:

1. Check file exists in project root:

   ```bash
   ls -la /Users/david/Coding/js/ubumaths/.env
   ```

2. Verify file has correct permissions:

   ```bash
   chmod 600 .env
   ```

3. Check file is not accidentally named `.env.txt` or similar:

   ```bash
   file .env
   # Should output: .env: ASCII text
   ```

4. Ensure `.env` is in `.gitignore`:
   ```bash
   grep "^\.env$" .gitignore
   ```

---

## Database Issues

### Supabase Connection Failed

**Symptoms**: "Failed to connect to database" errors

**Solutions**:

1. **Check credentials in `.env`**:

   ```bash
   PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

2. **Verify Supabase project is active**: Check dashboard.supabase.com

3. **Check network connectivity**:
   ```bash
   curl https://your-project.supabase.co/rest/v1/
   ```

---

### Migration Failed

**Symptoms**: "Migration X failed" errors

**Solutions**:

1. **Check migration syntax**:

   ```bash
   cd supabase/migrations
   cat YOUR_MIGRATION.sql
   ```

2. **Test migration locally**:

   ```bash
   pnpm db:start  # Start local Supabase
   pnpm db:migrate  # Apply migrations
   ```

3. **Rollback if needed**:

   ```bash
   pnpm db:reset  # Reset local database
   ```

4. **Check for conflicts**: Ensure migration order is correct (timestamp-based)

**References**:

- [Database Schema](../architecture/database-schema.md)
- [Migration Guide](../development/database-migrations.md)

---

## Build & Deployment

### Build Failed on Vercel

**Symptoms**: Build errors in Vercel logs

**Common Causes**:

1. **TypeScript errors**:

   ```bash
   # Fix locally first
   pnpm check
   pnpm lint
   ```

2. **Missing dependencies**:

   ```bash
   # Ensure all deps in package.json
   pnpm install
   git add package.json pnpm-lock.yaml
   git commit -m "chore: update dependencies"
   ```

3. **Environment variables missing**: Add in Vercel project settings

4. **Build timeout**: Optimize build in `vite.config.ts`

---

### "Cannot find module" Error

**Symptoms**: Import errors during build

**Solutions**:

1. **Check import paths**:

   ```typescript
   // ✅ Use $lib alias
   import { Button } from '$lib/components/ui/button';

   // ❌ Avoid relative paths
   import { Button } from '../../../components/ui/button';
   ```

2. **Verify file exists**:

   ```bash
   ls src/lib/components/ui/button.ts
   ```

3. **Check tsconfig.json paths**:
   ```json
   {
   	"compilerOptions": {
   		"paths": {
   			"$lib": ["./src/lib"],
   			"$lib/*": ["./src/lib/*"]
   		}
   	}
   }
   ```

---

## Testing Issues

### Tests Failing Locally

**Symptoms**: Tests pass in CI but fail locally (or vice versa)

**Solutions**:

1. **Clear cache**:

   ```bash
   rm -rf node_modules/.vite
   pnpm install
   ```

2. **Check Node version**:

   ```bash
   node --version  # Should be 18+
   ```

3. **Run tests with verbose output**:
   ```bash
   pnpm test:unit --reporter=verbose
   ```

---

### Playwright Tests Timeout

**Symptoms**: E2E tests timeout after 30s

**Solutions**:

1. **Increase timeout**:

   ```typescript
   // playwright.config.ts
   export default defineConfig({
   	timeout: 60000 // 60 seconds
   });
   ```

2. **Check if dev server is running**:

   ```bash
   pnpm dev -- --port 5175
   ```

3. **Run in headed mode for debugging**:
   ```bash
   npx playwright test --headed
   ```

---

## Performance Issues

### Slow Page Load Times

**Symptoms**: Pages take > 2s to load

**Diagnosis**:

1. **Check database query count**:
   - Open browser DevTools → Network tab
   - Filter by "api" or "supabase"
   - Look for excessive queries (N+1 problem)

2. **Check cache hit rate**:
   ```bash
   # Development logs
   grep "Cache hit\|Cache miss" logs.txt
   ```

**Solutions**:

1. **Add caching** to expensive queries:

   ```typescript
   import { getCached, CACHE_KEYS, TTL } from '$lib/server/cache';

   const data = await getCached(CACHE_KEYS.MY_DATA(id), TTL.MY_DATA, () => fetchFromDB(id));
   ```

2. **Optimize database queries**:
   - Add indexes for frequently queried columns
   - Use `select()` to limit columns fetched
   - Combine multiple queries with `Promise.all()`

3. **Add database indexes**: Check `docs/architecture/database-schema.md` for required indexes

---

### High Database Query Count

**Symptoms**: Exceeding Supabase free tier (2M queries/month)

**Diagnosis**: Check Supabase dashboard → Usage → Database queries

**Solutions**:

1. **Add strategic database indexes**: See [Performance Guide](../architecture/performance.md)

2. **Reduce polling frequency**:

   ```typescript
   // In activityStore.svelte.ts
   startPolling(60000); // 60s instead of 30s
   ```

3. **Add database indexes**:

   ```sql
   CREATE INDEX idx_user_id ON table_name(user_id);
   ```

4. **Optimize N+1 queries**: Fetch related data in single query

**References**:

- [Performance Optimizations](../architecture/performance.md)
- [Database Optimization Guide](../development/database-optimization.md)

---

## Getting Help

### Before Asking for Help

1. **Check this troubleshooting guide** for common issues
2. **Search existing issues**: GitHub Issues
3. **Check documentation**: [docs/README.md](../README.md)
4. **Review error logs**: Full error messages with stack traces
5. **Try to reproduce**: Minimal reproducible example

### What to Include in Issue Reports

1. **Environment**:
   - Node version: `node --version`
   - pnpm version: `pnpm --version`
   - OS: macOS/Linux/Windows
   - Branch: `git branch --show-current`

2. **Steps to reproduce**:
   - Exact commands run
   - Expected vs actual behavior
   - Screenshots/logs if relevant

3. **Error messages**:
   - Full error output (not truncated)
   - Stack traces
   - Browser console errors (if frontend issue)

4. **Already tried**:
   - Solutions you've already attempted
   - What worked/didn't work

---

## Quick Reference

### Common Commands

```bash
# Development
pnpm dev -- --port 5175        # Start dev server on Claude's port
pnpm build                      # Build for production
pnpm preview                    # Preview production build

# Testing
pnpm test:unit                  # Run unit tests
npx playwright test             # Run E2E tests
npx playwright test --ui        # Playwright UI mode

# Code Quality
pnpm check                      # TypeScript check
pnpm lint                       # ESLint + Prettier
pnpm format                     # Format code

# Database
pnpm db:start                   # Start local Supabase
pnpm db:stop                    # Stop local Supabase
pnpm db:migrate                 # Apply migrations
pnpm db:reset                   # Reset local database

# Cache
curl http://localhost:5175/api/health  # Check health status
```

### Environment Variables Checklist

Required in `.env`:

- [ ] `PUBLIC_SUPABASE_URL`
- [ ] `PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `OPENAI_API_KEY` (for AI chatbot)

### Useful Links

- [Main Documentation](../README.md)
- [Architecture Docs](../architecture/)
- [Development Guides](../development/)
- [Setup Guides](../guides/)
- [Project CLAUDE.md](../../CLAUDE.md)

---

**Last Updated**: 2025-10-29
**Maintained By**: Development Team
**Contributions**: See [Contributing Guide](../contributing/README.md)
