# Guide Responsive - UbuMaths

Guide technique complet pour le developpement responsive sur UbuMaths.

---

## Table des Matieres

1. [Breakpoints](./breakpoints.md) - Systeme de breakpoints et conventions
2. [Composants](./components.md) - Store mobile et MobileNavDrawer
3. [Patterns](./patterns.md) - Patterns responsive courants
4. [Checklist](./checklist.md) - Verification avant commit

---

## Philosophie

### Mobile-First

UbuMaths adopte une approche **mobile-first** :

```svelte
<!-- Correct : base mobile, puis desktop -->
<div class="p-4 sm:p-6 md:p-8">

<!-- Incorrect : base desktop, puis mobile -->
<div class="p-8 max-sm:p-4">
```

### CSS > JavaScript

Privilegier les classes Tailwind responsive plutot que le store mobile :

```svelte
<!-- Preferer : CSS responsive -->
<div class="block md:hidden">Mobile only</div>
<div class="hidden md:block">Desktop only</div>

<!-- Eviter : JavaScript conditionnel -->
{#if mobileStore.isMobile}
	<div>Mobile only</div>
{/if}
```

Le store mobile est reserve aux cas ou la logique JavaScript est necessaire (ex: comportement different, pas juste affichage).

### Touch-First

Les cibles tactiles doivent respecter les standards :

- **Minimum** : 44x44px (iOS) / 48x48dp (Android)
- **Recommande** : 48x48px ou plus
- **Espacement** : 8px minimum entre cibles

---

## Breakpoints Principaux

| Breakpoint | Taille    | Usage                          |
| ---------- | --------- | ------------------------------ |
| (base)     | < 640px   | Mobile phones                  |
| `sm:`      | >= 640px  | Large phones, small tablets    |
| `md:`      | >= 768px  | Tablets, transition principale |
| `lg:`      | >= 1024px | Desktop                        |
| `xl:`      | >= 1280px | Large desktop                  |

Le breakpoint `md:` (768px) est le point de transition principal entre mobile et desktop.

---

## Composants Cles

### MobileNavDrawer

Drawer de navigation lateral pour mobile :

```svelte
<script>
	import MobileNavDrawer, { type NavItem } from '$lib/components/navigation/MobileNavDrawer.svelte';

	let mobileMenuOpen = $state(false);

	const navItems: NavItem[] = [
		{ href: '/dashboard', label: 'Accueil', icon: Home },
		{ href: '/exercises', label: 'Exercices', icon: BookOpen, badge: 5 }
	];
</script>

<Button onclick={() => (mobileMenuOpen = true)}>
	<Menu class="h-6 w-6" />
</Button>

<MobileNavDrawer bind:open={mobileMenuOpen} items={navItems} />
```

### Mobile Store

Pour logique JavaScript conditionnelle :

```svelte
<script>
	import { mobileStore } from '$lib/stores/mobile.svelte';

	// Utiliser pour logique, pas pour affichage
	function handleClick() {
		if (mobileStore.isMobile) {
			// Comportement mobile specifique
		}
	}
</script>
```

---

## Patterns Essentiels

### Navigation Layout

```svelte
<!-- Header avec hamburger mobile -->
<header class="flex items-center gap-4">
	<Button class="md:hidden" onclick={() => (menuOpen = true)}>
		<Menu class="h-6 w-6" />
	</Button>
	<h1>Titre</h1>
</header>

<!-- Sidebar cachee sur mobile -->
<aside class="hidden w-64 md:block">
	<!-- Navigation desktop -->
</aside>
```

### Grids Progressifs

```svelte
<!-- 1 col mobile -> 2 cols tablet -> 4 cols desktop -->
<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 md:grid-cols-4">
	<Card />
	<Card />
	<Card />
	<Card />
</div>
```

### Tables Responsives

```svelte
<table>
	<thead>
		<tr>
			<th class="px-2 py-2 sm:px-4 sm:py-3">Nom</th>
			<th class="px-2 py-2 sm:px-4 sm:py-3">Score</th>
			<th class="hidden px-2 py-2 sm:table-cell sm:px-4 sm:py-3">Details</th>
		</tr>
	</thead>
</table>
```

### Boutons Icon-Only

```svelte
<Button>
	<Download class="h-4 w-4 sm:mr-2" />
	<span class="sr-only sm:not-sr-only">Telecharger</span>
</Button>
```

---

## Quick Reference

### Classes Courantes

| Pattern            | Classes                                          |
| ------------------ | ------------------------------------------------ |
| Cacher mobile      | `hidden md:block`                                |
| Cacher desktop     | `block md:hidden` ou `md:hidden`                 |
| Flex stack mobile  | `flex flex-col sm:flex-row`                      |
| Grid responsive    | `grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4` |
| Padding responsive | `p-4 sm:p-6`                                     |
| Gap responsive     | `gap-2 sm:gap-4`                                 |
| Texte responsive   | `text-sm sm:text-base`                           |

### Icones

| Taille   | Mobile    | Desktop   |
| -------- | --------- | --------- |
| Petite   | `h-4 w-4` | `h-4 w-4` |
| Standard | `h-5 w-5` | `h-5 w-5` |
| Grande   | `h-6 w-6` | `h-6 w-6` |

---

## Voir Aussi

- [Breakpoints detailles](./breakpoints.md)
- [Composants responsive](./components.md)
- [Patterns complets](./patterns.md)
- [Checklist developpeur](./checklist.md)
