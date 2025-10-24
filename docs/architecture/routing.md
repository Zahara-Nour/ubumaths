# 🛣️ Routing

Guide du système de routing SvelteKit dans UbuMaths.

---

## 📖 Principes de base

SvelteKit utilise **file-based routing** : la structure des fichiers dans `src/routes/` définit les URLs.

```
src/routes/
├── +page.svelte              → /
├── about/
│   └── +page.svelte          → /about
└── dashboard/
    ├── +page.svelte          → /dashboard
    └── settings/
        └── +page.svelte      → /dashboard/settings
```

---

## 📁 Fichiers spéciaux

### `+page.svelte`

Définit une **page**.

```svelte
<!-- src/routes/dashboard/+page.svelte -->
<script lang="ts">
  let { data } = $props();
</script>

<h1>Dashboard</h1>
<p>Welcome, {data.user.name}</p>
```

### `+page.server.ts`

Fonction **load** côté serveur pour data fetching.

```typescript
// src/routes/dashboard/+page.server.ts
import type { PageServerLoad } from './$types';
import { requireAuth } from '$lib/server/auth';

export const load: PageServerLoad = async ({ locals: { safeGetSession, supabase } }) => {
  const { user } = await safeGetSession();
  requireAuth(user);

  const { data: stats } = await supabase
    .from('user_stats')
    .select('*')
    .eq('user_id', user.id)
    .single();

  return {
    user,
    stats
  };
};
```

### `+layout.svelte`

**Layout** partagé pour routes enfants.

```svelte
<!-- src/routes/dashboard/+layout.svelte -->
<script lang="ts">
  import { Sidebar } from '$lib/components';
</script>

<div class="flex">
  <Sidebar />
  <main class="flex-1">
    <slot />  <!-- Pages enfants rendues ici -->
  </main>
</div>
```

### `+layout.server.ts`

Load data partagée pour layout.

```typescript
// src/routes/(protected)/+layout.server.ts
export const load: LayoutServerLoad = async ({ locals: { safeGetSession } }) => {
  const { session, user } = await safeGetSession();

  if (!session) {
    throw redirect(303, '/auth/login');
  }

  return { user };
};
```

### `+server.ts`

**API endpoint** (pas de UI).

```typescript
// src/routes/api/questions/+server.ts
import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ url, locals: { supabase } }) => {
  const limit = Number(url.searchParams.get('limit')) || 10;

  const { data, error: err } = await supabase
    .from('questions')
    .select('*')
    .limit(limit);

  if (err) throw error(500, err.message);

  return json(data);
};

export const POST: RequestHandler = async ({ request, locals: { safeGetSession, supabase } }) => {
  const { user } = await safeGetSession();
  if (!user) throw error(401, 'Unauthorized');

  const body = await request.json();

  const { data, error: err } = await supabase
    .from('questions')
    .insert(body)
    .select()
    .single();

  if (err) throw error(500, err.message);

  return json(data, { status: 201 });
};
```

---

## 🔐 Route Groups

Grouper routes sans affecter l'URL avec `(name)`.

### Structure

```
routes/
├── (public)/              # Pas d'auth required
│   ├── +layout.svelte
│   ├── demo/              → /demo
│   └── games/             → /games
└── (protected)/           # Auth required
    ├── +layout.server.ts  # Auth check
    ├── +layout.svelte
    └── dashboard/         → /dashboard
```

### Exemple : Protected Routes

```typescript
// src/routes/(protected)/+layout.server.ts
import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals: { safeGetSession }, url }) => {
  const { session, user } = await safeGetSession();

  // Redirect si pas connecté
  if (!session) {
    throw redirect(303, `/auth/login?redirectTo=${url.pathname}`);
  }

  return {
    session,
    user
  };
};
```

---

## 🔀 Dynamic Routes

Routes avec paramètres dynamiques : `[param]`.

### Simple param

```
src/routes/questions/[id]/
├── +page.svelte           → /questions/123
└── +page.server.ts
```

```typescript
// +page.server.ts
export const load: PageServerLoad = async ({ params, locals: { supabase } }) => {
  const { data: question } = await supabase
    .from('questions')
    .select('*')
    .eq('id', params.id)
    .single();

  if (!question) {
    throw error(404, 'Question not found');
  }

  return { question };
};
```

### Multiple params

```
src/routes/classes/[classId]/students/[studentId]/
└── +page.svelte           → /classes/abc/students/xyz
```

```typescript
export const load: PageServerLoad = async ({ params }) => {
  const { classId, studentId } = params;
  // ...
};
```

### Rest params

Capture tous segments restants : `[...rest]`.

```
src/routes/docs/[...path]/
└── +page.svelte           → /docs/features/questions/architecture
```

```typescript
export const load: PageServerLoad = async ({ params }) => {
  // params.path = "features/questions/architecture"
  const docPath = params.path.split('/');
};
```

---

## 📤 Form Actions

Gérer soumissions de formulaires côté serveur.

```typescript
// src/routes/questions/create/+page.server.ts
import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions: Actions = {
  default: async ({ request, locals: { safeGetSession, supabase } }) => {
    const { user } = await safeGetSession();
    if (!user) return fail(401, { message: 'Unauthorized' });

    const formData = await request.formData();
    const title = formData.get('title') as string;

    // Validation
    if (!title || title.length < 3) {
      return fail(400, {
        title,
        error: 'Title must be at least 3 characters'
      });
    }

    // Insert
    const { error: err } = await supabase
      .from('questions')
      .insert({ title, user_id: user.id });

    if (err) {
      return fail(500, { error: err.message });
    }

    // Success
    return { success: true };
  }
};
```

**Dans le component** :

```svelte
<script lang="ts">
  import { enhance } from '$app/forms';

  let { form } = $props();
</script>

<form method="POST" use:enhance>
  <input name="title" value={form?.title || ''} />
  {#if form?.error}
    <p class="text-destructive">{form.error}</p>
  {/if}
  <button type="submit">Create</button>
</form>
```

### Named actions

Plusieurs actions dans un fichier :

```typescript
export const actions: Actions = {
  create: async ({ request }) => {
    // ...
  },

  update: async ({ request }) => {
    // ...
  },

  delete: async ({ request }) => {
    // ...
  }
};
```

```svelte
<form method="POST" action="?/create">...</form>
<form method="POST" action="?/update">...</form>
<form method="POST" action="?/delete">...</form>
```

---

## 🧭 Navigation

### Liens

```svelte
<script>
  import { page } from '$app/state';
</script>

<!-- Lien simple -->
<a href="/dashboard">Dashboard</a>

<!-- Lien actif -->
<a
  href="/dashboard/questions"
  class:active={page.url.pathname === '/dashboard/questions'}
>
  Questions
</a>
```

### Navigation programmatique

```svelte
<script lang="ts">
  import { goto } from '$app/navigation';

  function handleRedirect() {
    goto('/dashboard/questions');
  }

  function handleGoBack() {
    goto(-1); // Back
  }
</script>

<button onclick={handleRedirect}>Go to Questions</button>
<button onclick={handleGoBack}>Back</button>
```

### Preloading

```svelte
<a href="/dashboard" data-sveltekit-preload-data="hover">
  Dashboard
</a>
```

Options :
- `hover` : Preload on hover
- `tap` : Preload on tap (mobile)
- `off` : Disable preloading

---

## 🔄 Data Revalidation

Recharger data après mutations.

### invalidate()

```svelte
<script lang="ts">
  import { invalidate } from '$app/navigation';

  async function handleDelete(id: string) {
    await fetch(`/api/questions/${id}`, { method: 'DELETE' });

    // Recharge tous les load functions qui dépendent de cette URL
    await invalidate('/api/questions');
  }
</script>
```

### invalidateAll()

```svelte
<script lang="ts">
  import { invalidateAll } from '$app/navigation';

  async function handleUpdate() {
    await fetch('/api/profile', { method: 'PATCH', body: ... });

    // Recharge TOUS les load functions
    await invalidateAll();
  }
</script>
```

---

## 🎯 Route Matching

### Pattern matching

SvelteKit match routes par ordre de spécificité :

```
1. Static > Dynamic
   /questions/create    (static)
   /questions/[id]      (dynamic)

2. Moins de params > Plus de params
   /[a]                 (1 param)
   /[a]/[b]             (2 params)

3. Rest params en dernier
   /docs/[category]/[slug]
   /docs/[...path]
```

### Matcher personnalisé

Contraindre params avec matchers.

```typescript
// src/params/uuid.ts
export function match(param: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(param);
}
```

```
src/routes/questions/[id=uuid]/
└── +page.svelte           → /questions/<valid-uuid>
```

---

## ⚡ Hooks

Intercepter requests/responses avec hooks.

### `src/hooks.server.ts`

```typescript
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  // Before request
  console.log('Request:', event.url.pathname);

  // Process request
  const response = await resolve(event);

  // After response
  console.log('Response:', response.status);

  return response;
};
```

### Authentication hook

```typescript
export const handle: Handle = async ({ event, resolve }) => {
  const session = await getSession(event.cookies);

  event.locals.user = session?.user || null;

  return resolve(event);
};
```

---

## 📊 Examples pratiques

### Pagination

```typescript
// +page.server.ts
export const load: PageServerLoad = async ({ url, locals: { supabase } }) => {
  const page = Number(url.searchParams.get('page')) || 1;
  const perPage = 20;
  const offset = (page - 1) * perPage;

  const { data: questions, count } = await supabase
    .from('questions')
    .select('*', { count: 'exact' })
    .range(offset, offset + perPage - 1);

  return {
    questions,
    pagination: {
      page,
      perPage,
      total: count || 0,
      pages: Math.ceil((count || 0) / perPage)
    }
  };
};
```

### Search + Filters

```typescript
export const load: PageServerLoad = async ({ url, locals: { supabase } }) => {
  const search = url.searchParams.get('q') || '';
  const category = url.searchParams.get('category');
  const difficulty = url.searchParams.get('difficulty');

  let query = supabase.from('questions').select('*');

  if (search) {
    query = query.ilike('title', `%${search}%`);
  }

  if (category) {
    query = query.eq('category', category);
  }

  if (difficulty) {
    query = query.eq('difficulty', difficulty);
  }

  const { data } = await query;

  return { questions: data || [] };
};
```

---

## 💡 Best Practices

### 1. Server vs Client Load

- **Server** (`+page.server.ts`) : Database queries, secrets, auth
- **Client** (`+page.ts`) : Public APIs, transformations

### 2. Error Handling

```typescript
import { error, redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, locals: { supabase } }) => {
  const { data } = await supabase
    .from('questions')
    .select('*')
    .eq('id', params.id)
    .single();

  if (!data) {
    throw error(404, {
      message: 'Question not found',
      hint: 'Check the question ID'
    });
  }

  return { question: data };
};
```

### 3. Progressive Enhancement

```svelte
<form method="POST" use:enhance>
  <!-- Fonctionne même sans JS -->
</form>
```

### 4. Optimistic UI

```svelte
<script lang="ts">
  import { enhance } from '$app/forms';

  let optimisticCount = $state(0);
</script>

<form
  method="POST"
  use:enhance={() => {
    optimisticCount++;

    return async ({ result, update }) => {
      if (result.type === 'success') {
        await update();
      } else {
        optimisticCount--;
      }
    };
  }}
>
  <button>Like ({optimisticCount})</button>
</form>
```

---

## 🔗 Ressources

- [SvelteKit Routing Docs](https://kit.svelte.dev/docs/routing)
- [SvelteKit Load Docs](https://kit.svelte.dev/docs/load)
- [SvelteKit Form Actions](https://kit.svelte.dev/docs/form-actions)

---

[← Retour à l'architecture](README.md)
