# Systeme de Breakpoints

Documentation complete du systeme de breakpoints utilise dans UbuMaths.

---

## Breakpoints Tailwind

UbuMaths utilise les breakpoints par defaut de Tailwind CSS :

| Prefix | Min-width | Devices                         |
| ------ | --------- | ------------------------------- |
| (none) | 0px       | Mobile phones (iPhone SE, etc.) |
| `sm:`  | 640px     | Large phones, small tablets     |
| `md:`  | 768px     | Tablets (iPad Mini, etc.)       |
| `lg:`  | 1024px    | Laptops, desktops               |
| `xl:`  | 1280px    | Large desktops                  |
| `2xl:` | 1536px    | Extra large screens             |

---

## Breakpoint Principal : `md:` (768px)

Le breakpoint `md:` est le point de transition principal entre mobile et desktop :

- **< 768px** : Interface mobile (hamburger, drawer, layouts empiles)
- **>= 768px** : Interface desktop (sidebar visible, layouts horizontaux)

### Pourquoi 768px ?

1. **iPad Mini** : 768px de large en portrait
2. **Tablettes Android** : Generalement >= 768px
3. **Convention commune** : Standard de l'industrie

---

## Utilisation Mobile-First

### Principe

Toujours definir le style mobile en base, puis ajouter les variantes desktop :

```svelte
<!-- CORRECT : Mobile-first -->
<div class="p-4 md:p-6 lg:p-8">
	<!-- p-4 sur mobile, p-6 sur tablet, p-8 sur desktop -->
</div>

<!-- INCORRECT : Desktop-first -->
<div class="p-8 max-md:p-4">
	<!-- Eviter les prefixes max-* -->
</div>
```

### Cascade des Breakpoints

Les breakpoints s'appliquent de maniere cumulative :

```svelte
<div class="
  text-sm        /* Base : toutes tailles */
  sm:text-base   /* >= 640px */
  md:text-lg     /* >= 768px */
  lg:text-xl     /* >= 1024px */
">
```

---

## Patterns par Breakpoint

### Mobile (base, < 640px)

```svelte
<!-- Navigation -->
<Button class="md:hidden">Hamburger</Button>

<!-- Layout empile -->
<div class="flex flex-col">

<!-- Padding compact -->
<div class="p-4">

<!-- Texte petit -->
<p class="text-sm">
```

### Small (sm:, >= 640px)

```svelte
<!-- Transition vers 2 colonnes -->
<div class="grid grid-cols-1 sm:grid-cols-2">

<!-- Plus d'espace -->
<div class="gap-2 sm:gap-4">

<!-- Texte plus grand -->
<p class="text-sm sm:text-base">
```

### Medium (md:, >= 768px)

```svelte
<!-- Sidebar visible -->
<aside class="hidden md:block">

<!-- Layout horizontal -->
<div class="flex flex-col md:flex-row">

<!-- 3-4 colonnes -->
<div class="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
```

### Large (lg:, >= 1024px)

```svelte
<!-- Split layouts -->
<div class="hidden lg:flex">
  <div class="w-[60%]">Main</div>
  <div class="w-[40%]">Sidebar</div>
</div>

<!-- Max-width containers -->
<div class="max-w-4xl lg:max-w-6xl">
```

---

## Tailles d'Ecran Cibles

### Phones

| Device             | Width | Breakpoint |
| ------------------ | ----- | ---------- |
| iPhone SE          | 375px | (base)     |
| iPhone 14          | 390px | (base)     |
| iPhone 14 Pro Max  | 430px | (base)     |
| Samsung Galaxy S21 | 360px | (base)     |

### Tablets

| Device         | Width (Portrait) | Breakpoint |
| -------------- | ---------------- | ---------- |
| iPad Mini      | 768px            | md:        |
| iPad Air       | 820px            | md:        |
| iPad Pro 11"   | 834px            | md:        |
| iPad Pro 12.9" | 1024px           | lg:        |

### Desktop

| Size          | Width  | Breakpoint |
| ------------- | ------ | ---------- |
| Small laptop  | 1280px | xl:        |
| Desktop       | 1440px | xl:        |
| Large desktop | 1920px | 2xl:       |

---

## Store Mobile vs CSS

### Quand utiliser le CSS (prefere)

```svelte
<!-- Affichage conditionnel -->
<div class="hidden md:block">Desktop only</div>
<div class="md:hidden">Mobile only</div>

<!-- Styles responsifs -->
<div class="p-4 md:p-6">
<div class="grid-cols-1 md:grid-cols-2">
```

### Quand utiliser le Store Mobile

```svelte
<script>
	import { mobileStore } from '$lib/stores/mobile.svelte';

	// 1. Logique de comportement differente
	function handleClick() {
		if (mobileStore.isMobile) {
			openDrawer();
		} else {
			openModal();
		}
	}

	// 2. Rendu conditionnel de composants lourds
	// (evite de charger le composant inutilement)
</script>

{#if !mobileStore.isMobile}
	<HeavyDesktopComponent />
{/if}
```

---

## Container Queries (Futur)

Pour les cas ou le parent determine le layout (pas le viewport) :

```svelte
<!-- Non supporte actuellement, mais prevu -->
<div class="@container">
  <div class="@md:flex-row flex-col">
</div>
```

---

## Debug Responsive

### Indicateur de Breakpoint

Pour le developpement, ajouter un indicateur :

```svelte
{#if dev}
	<div class="fixed bottom-0 left-0 z-50 bg-black p-2 text-xs text-white">
		<span class="sm:hidden">XS</span>
		<span class="hidden sm:inline md:hidden">SM</span>
		<span class="hidden md:inline lg:hidden">MD</span>
		<span class="hidden lg:inline xl:hidden">LG</span>
		<span class="hidden xl:inline">XL</span>
	</div>
{/if}
```

### Chrome DevTools

1. Ouvrir DevTools (F12)
2. Toggle Device Toolbar (Ctrl+Shift+M)
3. Selectionner device ou dimensions personnalisees

---

## Voir Aussi

- [Index](./index.md)
- [Composants](./components.md)
- [Patterns](./patterns.md)
