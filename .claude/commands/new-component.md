---
description: Creer un nouveau composant Svelte 5 conforme aux standards UbuMaths
allowed-tools: Bash, Read, Write, Edit, Grep, Glob, Task, TodoWrite
argument-hint: [NomComposant]
---

# Creer le composant : $1

Tu crees un nouveau composant Svelte 5 en respectant TOUS les standards UbuMaths.

## Phase 1 : Preparation

### Etape 1 : Determiner l'emplacement

- Composant reutilisable : `src/lib/components/$1/`
- Composant de page : `src/routes/[route]/components/`
- Composant UI de base : `src/lib/components/ui/`

### Etape 2 : Verifier les patterns existants

Recherche des composants similaires pour suivre les memes patterns :

```bash
# Trouver des composants similaires
```

---

## Phase 2 : Structure du Composant

### Fichier principal : `$1.svelte`

```svelte
<script lang="ts">
  import type { Snippet } from 'svelte';
  // Imports necessaires

  // ============================================
  // PROPS
  // ============================================
  interface Props {
    // Props requises
    title: string;
    // Props optionnelles avec valeurs par defaut
    variant?: 'default' | 'primary' | 'secondary';
    disabled?: boolean;
    // Snippets (anciennement slots)
    children?: Snippet;
  }

  let {
    title,
    variant = 'default',
    disabled = false,
    children
  }: Props = $props();

  // ============================================
  // STATE
  // ============================================
  let isOpen = $state(false);
  let count = $state(0);

  // ============================================
  // DERIVED
  // ============================================
  let isValid = $derived(count > 0 && !disabled);
  let classes = $derived(
    `base-class ${variant === 'primary' ? 'primary-class' : ''}`
  );

  // ============================================
  // EFFECTS (seulement si necessaire)
  // ============================================
  // $effect uniquement pour side effects (API calls, subscriptions, etc.)
  // NE PAS utiliser pour updater du state reactif

  // ============================================
  // HANDLERS
  // ============================================
  function handleClick() {
    if (disabled) return;
    count++;
  }
</script>

<!-- ============================================
     TEMPLATE
     ============================================ -->
<div class={classes}>
  <h2>{title}</h2>

  <button
    type="button"
    onclick={handleClick}
    {disabled}
    class="..."
  >
    Count: {count}
  </button>

  {#if children}
    {@render children()}
  {/if}
</div>

<!-- ============================================
     STYLES (si necessaire, preferrer Tailwind)
     ============================================ -->
<style>
  /* Styles scopes si Tailwind ne suffit pas */
</style>
```

---

## Phase 3 : Standards OBLIGATOIRES

### Svelte 5 Runes

| Ancien (INTERDIT) | Nouveau (OBLIGATOIRE) |
|-------------------|----------------------|
| `export let prop` | `let { prop } = $props()` |
| `let x = 0` (reactif) | `let x = $state(0)` |
| `$: derived = x * 2` | `let derived = $derived(x * 2)` |
| `$: { sideEffect() }` | `$effect(() => { sideEffect() })` |
| `<slot />` | `{@render children()}` |
| `on:click={handler}` | `onclick={handler}` |

### TypeScript Strict

```typescript
// INTERDIT
let data: any = {};
function process(input) { }

// OBLIGATOIRE
let data: UserData = {};
function process(input: string): Result { }
```

### Composants UI

```svelte
<!-- INTERDIT : Shadcn direct ou natif -->
<Select.Root>...</Select.Root>
<select>...</select>
<input type="checkbox" />

<!-- OBLIGATOIRE : Wrappers UbuMaths -->
<MySelect type="single" bind:value={selected} {items} />
<MyCheckbox bind:checked={isEnabled} label="..." />
```

---

## Phase 4 : Fichier de Test

Cree `$1.test.ts` ou `$1.svelte.test.ts` :

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import $1 from './$1.svelte';

describe('$1', () => {
  it('should render with required props', () => {
    render($1, { props: { title: 'Test' } });
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('should handle click when not disabled', async () => {
    const { component } = render($1, { props: { title: 'Test' } });
    // Test interaction
  });

  it('should not respond when disabled', () => {
    render($1, { props: { title: 'Test', disabled: true } });
    // Test disabled state
  });
});
```

---

## Phase 5 : Export (si composant lib)

Ajoute l'export dans `src/lib/components/index.ts` :

```typescript
export { default as $1 } from './$1/$1.svelte';
```

---

## Phase 6 : Verification

1. Le composant compile sans erreur
2. Les tests passent
3. Pas de `any` dans le code
4. Runes Svelte 5 uniquement
5. MySelect/MyCheckbox si applicable

---

## Checklist Finale

- [ ] Props typees avec interface
- [ ] $state pour state reactif
- [ ] $derived pour valeurs calculees
- [ ] $effect seulement pour side effects
- [ ] Handlers en lowercase (onclick, onchange)
- [ ] {@render children()} au lieu de <slot />
- [ ] Classes Tailwind
- [ ] Tests unitaires
- [ ] Export si composant lib
