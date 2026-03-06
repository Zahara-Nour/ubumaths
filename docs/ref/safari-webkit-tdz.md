# Safari/WebKit TDZ Bug - Root Layout Fix

## The Problem

On iPad/Safari (all iOS browsers use WebKit), users get an intermittent **500 error** with:

```
Cannot access 'universal' before initialization
```

This error does NOT appear in Vercel server logs because it's a **client-side** error during hydration.

## Root Cause

This is a **known WebKit bug** ([webkit.org #242740](https://bugs.webkit.org/show_bug.cgi?id=242740)) related to ES module initialization order.

### How SvelteKit compiles route modules

SvelteKit generates a route entry module for each layout/page:

```js
// .svelte-kit/generated/client/nodes/0.js (root layout)
import * as universal from '../../../../src/routes/+layout.ts';
export { universal };
export { default as component } from '../../../../src/routes/+layout.svelte';
```

The `universal` variable holds the load function namespace. In production, Vite bundles this entry module + all static dependencies into a **single chunk**.

### Why it fails on WebKit

When `+layout.ts` statically imports heavy libraries like `@supabase/ssr` (which pulls in the entire Supabase client, realtime, auth, etc.), the resulting chunk becomes massive (231KB). Within this chunk:

1. The `universal` export is a `const` declared mid-chunk (after all dependencies)
2. The component code is also in the same chunk
3. WebKit/JavaScriptCore may initialize module bindings in a different order than V8 (Chrome)
4. If the component's initialization runs before `universal` is assigned, **TDZ error**

V8 (Chrome, Edge) handles this correctly. JavaScriptCore (Safari, all iOS browsers) does not.

### Why it's intermittent

The error depends on module initialization timing, which varies with:

- Network speed (slower = different chunk loading order)
- Device performance (iPad vs desktop)
- Browser cache state

## The Fix

**Dynamic import of heavy dependencies** in `src/routes/+layout.ts`:

```typescript
// BEFORE (broken on Safari):
import { createBrowserClient, createServerClient, isBrowser } from '@supabase/ssr';

// AFTER (works everywhere):
const { createBrowserClient, createServerClient, isBrowser } = await import('@supabase/ssr');
```

This reduced the root layout chunk from **231KB to 49KB** because `@supabase/ssr` and its dependency tree are no longer statically linked into the route entry module.

### Why it works

- The `universal` export object (`Object.freeze({ load: fn })`) is created immediately
- The load **function reference** exists right away (it's just a function definition)
- The heavy dependencies are only loaded when the function is **called** (via `await import()`)
- No complex static dependency chain = no TDZ race condition

## Related Fixes in This Codebase

| File                        | Fix                                   | Why                                                           |
| --------------------------- | ------------------------------------- | ------------------------------------------------------------- |
| `src/routes/+layout.ts`     | `await import('@supabase/ssr')`       | Main fix: removes heavy static dependency                     |
| `src/routes/+layout.ts`     | `await import('$app/navigation')`     | Prevents `invalidate` from creating circular chunk references |
| `src/routes/+layout.svelte` | Dynamic import of `@vercel/analytics` | Brave blocks these; also reduces static dependency chain      |
| `src/hooks.client.ts`       | `handleError` with detailed message   | Shows actual error on 500 page for easier debugging           |

## Rules for Future Development

### DO NOT add static imports of heavy libraries in `+layout.ts`

Any static import in the root `+layout.ts` becomes part of the route entry module's dependency chain. If the dependency tree is large enough, WebKit will fail.

**Safe static imports** (small, no transitive deps):

- `$env/static/public` (compile-time constants)
- Type imports (`import type { ... }`)

**Must be dynamic imports** (heavy, large dep trees):

- `@supabase/ssr`, `@supabase/supabase-js`
- Any library that transitively imports many modules
- `$app/navigation` (can create circular chunk references)

### How to verify

After changing imports in `+layout.ts`, build and check the chunk size:

```bash
pnpm build
wc -c .svelte-kit/output/client/_app/immutable/nodes/0.*.js
# Should be <100KB. If it's >150KB, investigate static imports.
```

## Debugging Tips

- The error only appears on **Safari/iOS** (all iOS browsers use WebKit, including Chrome and Brave on iOS)
- It does NOT appear in Vercel server logs (it's client-side)
- To see the error: `src/hooks.client.ts` `handleError` displays it on the 500 page
- To see the console on iPad: Settings > Safari > Advanced > Web Inspector, then connect via Mac Safari DevTools
