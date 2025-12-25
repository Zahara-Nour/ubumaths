# Responsive Design Guidelines

Guide pour le développement mobile-first dans UbuMaths.

---

## Breakpoints

UbuMaths utilise les breakpoints Tailwind CSS standard avec une convention spécifique :

| Breakpoint | Taille   | Usage                                        |
| ---------- | -------- | -------------------------------------------- |
| (default)  | < 768px  | **Mobile** - Layout mobile par défaut        |
| `md:`      | ≥ 768px  | **Tablet/Desktop** - Transition vers desktop |
| `lg:`      | ≥ 1024px | Desktop large (sidebars permanentes)         |
| `xl:`      | ≥ 1280px | Desktop extra-large                          |

### Convention principale

```
md: (768px) = point de transition mobile → desktop
```

- **Mobile** : < 768px (téléphones)
- **Desktop** : ≥ 768px (tablettes portrait et plus)

Cette convention permet aux tablettes en portrait d'avoir l'expérience desktop, ce qui est important pour l'usage en classe.

---

## Store Mobile

Le store `mobile.svelte.ts` fournit une détection réactive de la taille d'écran.

### Import

```typescript
import { mobileStore } from '$lib/stores/mobile.svelte';
// ou pour les tests
import { createMobileStore } from '$lib/stores/mobile.svelte';
```

### Propriétés

| Propriété     | Type      | Description                    |
| ------------- | --------- | ------------------------------ |
| `isMobile`    | `boolean` | `true` si < 768px              |
| `isTablet`    | `boolean` | `true` si 768px - 1023px       |
| `isDesktop`   | `boolean` | `true` si ≥ 1024px             |
| `windowWidth` | `number`  | Largeur actuelle de la fenêtre |

### Usage

```svelte
<script>
	import { mobileStore } from '$lib/stores/mobile.svelte';
</script>

{#if mobileStore.isMobile}
	<MobileNav />
{:else}
	<DesktopSidebar />
{/if}
```

### Quand utiliser le store vs CSS

| Situation                         | Solution                       |
| --------------------------------- | ------------------------------ |
| Afficher/masquer un élément       | CSS (`hidden md:block`)        |
| Changer de layout                 | CSS (`flex-col md:flex-row`)   |
| Logique JavaScript différente     | Store (`mobileStore.isMobile`) |
| Charger des composants différents | Store + `{#if}`                |

**Préférer CSS** quand possible pour de meilleures performances.

**Important** : Ne pas utiliser le destructuring (`const { isMobile } = mobileStore`) car cela casse la réactivité. Toujours accéder via `mobileStore.isMobile`.

---

## MobileNavDrawer

Composant de navigation mobile utilisant Sheet (drawer latéral).

### Import

```typescript
import MobileNavDrawer, { type NavItem } from '$lib/components/navigation/MobileNavDrawer.svelte';
```

### Props

| Prop         | Type                 | Default | Description               |
| ------------ | -------------------- | ------- | ------------------------- |
| `open`       | `boolean` (bindable) | `false` | État ouvert/fermé         |
| `items`      | `NavItem[]`          | `[]`    | Items de navigation       |
| `onNavigate` | `() => void`         | -       | Callback après navigation |

### NavItem Type

```typescript
type NavItem = {
	label: string; // Texte affiché
	href: string; // URL de destination
	icon: ComponentType; // Icône Lucide
	roles?: string[]; // Rôles autorisés (optionnel)
	badge?: number; // Badge de notification (optionnel)
};
```

### Usage

```svelte
<script>
	import MobileNavDrawer from '$lib/components/navigation/MobileNavDrawer.svelte';
	import { Home, Settings } from 'lucide-svelte';

	let menuOpen = $state(false);

	const navItems = [
		{ label: 'Accueil', href: '/', icon: Home },
		{ label: 'Paramètres', href: '/settings', icon: Settings, badge: 3 }
	];
</script>

<!-- Hamburger button -->
<button class="md:hidden" onclick={() => (menuOpen = true)}>
	<Menu class="h-6 w-6" />
</button>

<!-- Drawer -->
<MobileNavDrawer bind:open={menuOpen} items={navItems} />
```

---

## Patterns Responsive

### 1. Navigation

```svelte
<!-- Sidebar desktop, drawer mobile -->
<aside class="hidden w-64 md:block">
	<DesktopSidebar />
</aside>

<button class="md:hidden" onclick={() => (drawerOpen = true)}>
	<Menu />
</button>
<MobileNavDrawer bind:open={drawerOpen} items={navItems} />
```

### 2. Layouts Flex

```svelte
<!-- Vertical sur mobile, horizontal sur desktop -->
<div class="flex flex-col gap-4 md:flex-row md:items-center">
	<Input />
	<Button>Envoyer</Button>
</div>
```

### 3. Grilles

```svelte
<!-- 1 colonne mobile, 2 tablette, 3 desktop -->
<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
	{#each items as item}
		<Card>{item.name}</Card>
	{/each}
</div>
```

### 4. Tables → Cards

```svelte
<!-- Table sur desktop -->
<div class="hidden md:block">
	<Table>...</Table>
</div>

<!-- Cards sur mobile -->
<div class="space-y-4 md:hidden">
	{#each items as item}
		<Card>...</Card>
	{/each}
</div>
```

### 5. Texte conditionnel

```svelte
<!-- Icône seule sur mobile, icône + texte sur desktop -->
<Button>
	<Icon class="h-4 w-4" />
	<span class="ml-2 hidden md:inline">Enregistrer</span>
</Button>
```

---

## Touch Targets

### Taille minimale

Les éléments interactifs doivent avoir une taille minimale de **44x44 pixels** pour le touch.

```svelte
<!-- Bon -->
<button class="h-11 w-11 p-3">
	<Icon class="h-5 w-5" />
</button>

<!-- Mauvais -->
<button class="h-6 w-6">
	<Icon class="h-4 w-4" />
</button>
```

### Espacement

Prévoir un espacement suffisant entre les éléments cliquables :

```svelte
<div class="flex gap-2 md:gap-1">
	<Button>Action 1</Button>
	<Button>Action 2</Button>
</div>
```

---

## États Touch vs Hover

Sur mobile, les états `hover:` ne fonctionnent pas comme attendu. Utiliser `active:` pour le feedback tactile :

```svelte
<button
	class="
  <!--
  Desktop hover --> <!-- Touch
  feedback --> bg-primary hover:bg-primary/90 active:bg-primary/80
"
>
	Cliquer
</button>
```

---

## Checklist Responsive

Avant chaque commit impliquant de l'UI :

- [ ] Layout fonctionne sur mobile (< 768px)
- [ ] Touch targets ≥ 44px
- [ ] Navigation accessible sur mobile
- [ ] Pas de scroll horizontal non voulu
- [ ] Texte lisible (pas de troncature critique)
- [ ] Images responsive (`max-w-full`)

---

## Ressources

- [Tailwind Responsive Design](https://tailwindcss.com/docs/responsive-design)
- [Store mobile](../lib/stores/mobile.svelte.ts)
- [MobileNavDrawer](../lib/components/navigation/MobileNavDrawer.svelte)
