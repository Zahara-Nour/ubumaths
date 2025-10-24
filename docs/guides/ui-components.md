# 🎨 Composants UI

Guide d'utilisation des composants Shadcn-svelte dans UbuMaths.

**Status** : 📝 Documentation en cours

---

## 🎯 Vue d'ensemble

UbuMaths utilise [Shadcn-svelte](https://www.shadcn-svelte.com/) pour les composants UI.

**Avantages** :
- Composants accessibles (ARIA)
- Personnalisables (Tailwind CSS)
- Type-safe (TypeScript)
- Dark mode intégré

---

## 📦 Composants disponibles

### Button

```svelte
<script lang="ts">
  import { Button } from '$lib/components/ui/button';
</script>

<!-- Variants -->
<Button>Default</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Cancel</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="link">Link</Button>

<!-- Sizes -->
<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>
<Button size="icon">🔍</Button>

<!-- States -->
<Button disabled>Disabled</Button>
```

### Input

```svelte
<script lang="ts">
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';

  let email = $state('');
</script>

<div class="grid gap-2">
  <Label for="email">Email</Label>
  <Input
    id="email"
    type="email"
    placeholder="email@example.com"
    bind:value={email}
  />
</div>
```

### Textarea

```svelte
<script lang="ts">
  import { Textarea } from '$lib/components/ui/textarea';
  import { Label } from '$lib/components/ui/label';

  let description = $state('');
</script>

<div class="grid gap-2">
  <Label for="description">Description</Label>
  <Textarea
    id="description"
    placeholder="Enter description..."
    bind:value={description}
  />
</div>
```

### ⚠️ Select (DO NOT USE)

**Important** : NE PAS utiliser Shadcn Select - utiliser `<select>` natif :

```svelte
<script lang="ts">
  let category = $state('');
</script>

<!-- ✅ BON : Select natif -->
<select
  bind:value={category}
  class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
>
  <option value="">Choisir une catégorie</option>
  <option value="algebra">Algèbre</option>
  <option value="geometry">Géométrie</option>
</select>

<!-- ❌ MAUVAIS : Shadcn Select -->
<!-- Cause problèmes avec Svelte 5 -->
```

### Card

```svelte
<script lang="ts">
  import * as Card from '$lib/components/ui/card';
</script>

<Card.Root>
  <Card.Header>
    <Card.Title>Card Title</Card.Title>
    <Card.Description>Card description goes here.</Card.Description>
  </Card.Header>
  <Card.Content>
    <p>Main content of the card.</p>
  </Card.Content>
  <Card.Footer>
    <Button>Action</Button>
  </Card.Footer>
</Card.Root>
```

### Dialog

```svelte
<script lang="ts">
  import * as Dialog from '$lib/components/ui/dialog';
  import { Button } from '$lib/components/ui/button';

  let open = $state(false);
</script>

<Dialog.Root bind:open>
  <Dialog.Trigger>
    <Button>Open Dialog</Button>
  </Dialog.Trigger>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Are you sure?</Dialog.Title>
      <Dialog.Description>
        This action cannot be undone.
      </Dialog.Description>
    </Dialog.Header>
    <Dialog.Footer>
      <Button variant="outline" onclick={() => open = false}>Cancel</Button>
      <Button variant="destructive">Delete</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
```

### Dropdown Menu

```svelte
<script lang="ts">
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
  import { Button } from '$lib/components/ui/button';
</script>

<DropdownMenu.Root>
  <DropdownMenu.Trigger>
    <Button variant="outline">Options</Button>
  </DropdownMenu.Trigger>
  <DropdownMenu.Content>
    <DropdownMenu.Label>Actions</DropdownMenu.Label>
    <DropdownMenu.Separator />
    <DropdownMenu.Item>
      <a href="/dashboard/edit">Edit</a>
    </DropdownMenu.Item>
    <DropdownMenu.Item>Duplicate</DropdownMenu.Item>
    <DropdownMenu.Separator />
    <DropdownMenu.Item class="text-destructive">Delete</DropdownMenu.Item>
  </DropdownMenu.Content>
</DropdownMenu.Root>
```

### Tabs

```svelte
<script lang="ts">
  import * as Tabs from '$lib/components/ui/tabs';
</script>

<Tabs.Root value="account">
  <Tabs.List>
    <Tabs.Trigger value="account">Account</Tabs.Trigger>
    <Tabs.Trigger value="password">Password</Tabs.Trigger>
  </Tabs.List>
  <Tabs.Content value="account">
    <p>Account settings content</p>
  </Tabs.Content>
  <Tabs.Content value="password">
    <p>Password settings content</p>
  </Tabs.Content>
</Tabs.Root>
```

### Avatar

```svelte
<script lang="ts">
  import * as Avatar from '$lib/components/ui/avatar';
</script>

<Avatar.Root>
  <Avatar.Image src="https://github.com/shadcn.png" alt="Avatar" />
  <Avatar.Fallback>CN</Avatar.Fallback>
</Avatar.Root>
```

---

## 🎨 Styling

### Classes sémantiques

Utiliser classes Tailwind sémantiques :

```svelte
<!-- ✅ BON : Sémantique -->
<div class="bg-background text-foreground border-border">
  <h1 class="text-primary">Title</h1>
  <p class="text-muted-foreground">Description</p>
</div>

<!-- ❌ MAUVAIS : Hardcodé -->
<div class="bg-white text-black border-gray-300">
  <h1 class="text-blue-600">Title</h1>
  <p class="text-gray-500">Description</p>
</div>
```

### Dark mode automatique

Classes s'adaptent automatiquement :

```css
/* Défini dans theme.css */
:root {
  --background: 0 0% 100%;    /* Blanc */
  --foreground: 222 47% 11%;  /* Noir */
}

.dark {
  --background: 224 71% 4%;   /* Noir foncé */
  --foreground: 213 31% 91%;  /* Blanc cassé */
}
```

### Utility: cn()

Combiner classes conditionnellement :

```svelte
<script lang="ts">
  import { cn } from '$lib/utils';

  let { variant = 'default', className = '' }: {
    variant?: 'default' | 'danger';
    className?: string;
  } = $props();
</script>

<div class={cn(
  'rounded-lg p-4',
  variant === 'danger' && 'bg-destructive text-destructive-foreground',
  variant === 'default' && 'bg-background',
  className
)}>
  Slot
</div>
```

---

## 🔔 Toast Notifications

```svelte
<script lang="ts">
  import { toaster } from '$lib/stores/toaster.svelte';

  function handleSuccess() {
    toaster.success('Operation successful!');
  }

  function handleError() {
    toaster.error('Something went wrong.');
  }

  function handleWarning() {
    toaster.warning('Warning message.');
  }

  function handleInfo() {
    toaster.info('Info message.');
  }
</script>

<Button onclick={handleSuccess}>Success</Button>
<Button onclick={handleError} variant="destructive">Error</Button>
<Button onclick={handleWarning}>Warning</Button>
<Button onclick={handleInfo}>Info</Button>
```

**Configuration** : Toaster dans `+layout.svelte` :

```svelte
<script lang="ts">
  import { Toaster } from '$lib/components/Toaster.svelte';
</script>

<Toaster />
<slot />
```

---

## 📝 Forms

### Pattern standard

```svelte
<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';

  let { form } = $props(); // From +page.server.ts actions

  let title = $state(form?.title || '');
</script>

<form method="POST">
  <div class="grid gap-4">
    <div class="grid gap-2">
      <Label for="title">Title</Label>
      <Input
        id="title"
        name="title"
        bind:value={title}
        required
      />
      {#if form?.error}
        <p class="text-sm text-destructive">{form.error}</p>
      {/if}
    </div>

    <Button type="submit">Submit</Button>
  </div>
</form>
```

---

## 🎯 Ajouter nouveau composant

```bash
npx shadcn-svelte@latest add <component-name>
```

Exemples :
```bash
npx shadcn-svelte@latest add badge
npx shadcn-svelte@latest add checkbox
npx shadcn-svelte@latest add radio-group
npx shadcn-svelte@latest add switch
```

---

## 🔗 Ressources

- [Shadcn-svelte Docs](https://www.shadcn-svelte.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [CLAUDE.md](../../CLAUDE.md) - Patterns du projet

---

[← Retour aux guides](README.md)
