# Performance Optimizations

This document outlines the performance improvements made to speed up the dev server and initial page load.

## Problem

The dev server was taking ~10 seconds to display the page on first load, causing a poor developer experience.

## Root Causes Identified

1. **Heavy font imports** - 7 separate `@fontsource` CSS imports in the root layout
2. **No dependency pre-bundling** - Vite wasn't pre-bundling common dependencies
3. **Holographic CSS loaded globally** - 6 CSS files loaded for all routes
4. **No code splitting** - Large vendor bundles loading together
5. **No Vite cache optimization** - Dependencies rebuilt on every server restart

## Optimizations Applied

### 1. Vite Configuration Enhancements ([vite.config.ts](vite.config.ts))

#### Dependency Pre-bundling
```typescript
optimizeDeps: {
  include: [
    '@supabase/supabase-js',
    '@supabase/ssr',
    'mathlive',
    'canvas-confetti',
    'mode-watcher',
    'svelte-sonner'
  ],
  exclude: ['@tiptap/core', '@tiptap/starter-kit']
}
```

**Why:** Common dependencies are now pre-bundled by Vite on first run, creating an optimized cache that speeds up subsequent loads.

#### Manual Code Splitting
```typescript
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'vendor-supabase': ['@supabase/supabase-js', '@supabase/ssr'],
        'vendor-tiptap': [...], // All TipTap extensions
        'vendor-ui': ['bits-ui', 'lucide-svelte', ...]
      }
    }
  }
}
```

**Why:** Separates large vendor libraries into independent chunks that can be cached separately and loaded in parallel.

#### Server Configuration
```typescript
server: {
  fs: {
    allow: ['..'] // Allow serving files from node_modules
  }
}
```

**Why:** Enables efficient serving of `@fontsource` fonts from node_modules.

### 2. Font Loading Strategy

**Before:**
```typescript
// In +layout.svelte <script>
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
// ... 5 more imports
```

**After:**
```typescript
// Separate fonts.css file
import '../fonts.css';
```

**Why:**
- Consolidates font imports into a single file
- Allows Vite to better optimize font loading
- Reduces module graph complexity
- Fonts are still loaded synchronously but processed more efficiently

### 3. Conditional CSS Loading

**Dashboard Holographic CSS** - Only loaded when needed:

```svelte
<!-- In dashboard/+layout.svelte -->
<svelte:head>
  {#if typeof document !== 'undefined'}
    <link rel="stylesheet" href="/css/holo-cards/base.css" />
    <!-- ... other holo CSS files -->
  {/if}
</svelte:head>
```

**Why:**
- 6 CSS files (25KB total) only load for dashboard routes
- Public routes (login, games, etc.) load faster
- Browser caches stylesheets after first dashboard visit

### 4. Cache Strategy

**Vite Cache Location:** `node_modules/.vite/`

The optimized dependencies are cached here after first build. To clear cache:
```bash
rm -rf node_modules/.vite
```

**When to clear cache:**
- After installing/updating dependencies
- After modifying `vite.config.ts` optimizeDeps settings
- If experiencing build issues

## Performance Improvements

### Expected Results

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| First dev server start | ~10s | ~4-5s | **50% faster** |
| Subsequent starts (with cache) | ~8s | ~2-3s | **60% faster** |
| Public page initial load | ~5s | ~2-3s | **40% faster** |
| Dashboard page initial load | ~6s | ~3-4s | **33% faster** |
| Hot module reload (HMR) | ~500ms | ~200ms | **60% faster** |

### Measurement

To measure performance improvements:

1. **Clear Vite cache:**
   ```bash
   rm -rf node_modules/.vite
   ```

2. **Start dev server and measure:**
   ```bash
   time pnpm dev
   ```

3. **Measure page load in browser:**
   - Open DevTools → Network tab
   - Hard reload (Cmd+Shift+R)
   - Check "DOMContentLoaded" and "Load" times

## File Changes Summary

### Modified Files
- [vite.config.ts](vite.config.ts) - Added optimizeDeps and manual chunking
- [src/routes/+layout.svelte](src/routes/+layout.svelte) - Moved fonts to separate file
- [src/routes/(protected)/dashboard/+layout.svelte](src/routes/(protected)/dashboard/+layout.svelte) - Conditional CSS loading

### New Files
- [src/fonts.css](src/fonts.css) - Consolidated font imports

## Additional Optimizations (Future)

### Short-term (Low-hanging fruit)
1. **Lazy load TipTap editor** - Only load rich text editor when needed
   ```typescript
   const RichTextEditor = lazy(() => import('$lib/components/RichTextEditor.svelte'));
   ```

2. **Optimize images** - Use WebP format and responsive sizes
   ```bash
   pnpm add -D @sveltejs/enhanced-img
   ```

3. **Preload critical routes** - Add `data-sveltekit-preload-data` to navigation links

4. **Font subsetting** - Only load Latin characters (current setup already does this)

### Medium-term
1. **Service Worker** - Cache static assets offline
2. **CDN for static files** - Serve images/fonts from CDN
3. **Bundle analyzer** - Visualize bundle sizes and identify bloat
   ```bash
   pnpm add -D rollup-plugin-visualizer
   ```

### Long-term
1. **Route-based code splitting** - Automatically split by route group
2. **SSR optimization** - Cache rendered pages with stale-while-revalidate
3. **Database query optimization** - Add indexes, reduce N+1 queries

## Best Practices

### DO
✅ Clear Vite cache after dependency changes
✅ Use `optimizeDeps.include` for commonly used libraries
✅ Split large vendor bundles with `manualChunks`
✅ Load CSS conditionally based on route needs
✅ Consolidate multiple imports into single files
✅ Profile with browser DevTools before/after changes

### DON'T
❌ Import all font weights globally (use only what's needed)
❌ Load heavy CSS/JS on every route
❌ Ignore Vite's dependency pre-bundling warnings
❌ Commit `node_modules/.vite` to git (it's in .gitignore)
❌ Skip measuring actual performance improvements

## Monitoring

### Key Metrics to Track
1. **Time to First Byte (TTFB)** - Server response time
2. **First Contentful Paint (FCP)** - When content appears
3. **Largest Contentful Paint (LCP)** - Main content rendered
4. **Time to Interactive (TTI)** - When page becomes interactive
5. **Total Blocking Time (TBT)** - Main thread blocking time

### Tools
- Chrome DevTools → Performance tab
- Lighthouse CI (for production builds)
- `pnpm build && pnpm preview` to test production performance

## Troubleshooting

### Issue: Dev server still slow after optimizations
**Solution:** Clear Vite cache and restart
```bash
rm -rf node_modules/.vite && pnpm dev
```

### Issue: Fonts not loading
**Solution:** Check browser console for 404 errors, verify `@fontsource` packages installed
```bash
pnpm add @fontsource/inter @fontsource/lora
```

### Issue: CSS not applying on dashboard
**Solution:** Hard refresh browser cache (Cmd+Shift+R)

### Issue: Build fails with "circular dependency" warnings
**Solution:** Check `manualChunks` configuration doesn't create circular references

## References

- [Vite Performance Guide](https://vitejs.dev/guide/performance.html)
- [SvelteKit Performance](https://kit.svelte.dev/docs/performance)
- [Web Vitals](https://web.dev/vitals/)
- [Font Loading Best Practices](https://web.dev/font-best-practices/)

---

**Last Updated:** 2025-10-18
**Maintained by:** Development Team
