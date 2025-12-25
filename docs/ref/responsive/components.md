# Composants Responsive

Documentation des composants dedies au responsive dans UbuMaths.

---

## Mobile Store

### Emplacement

```
src/lib/stores/mobile.svelte.ts
```

### API

```typescript
import { mobileStore } from '$lib/stores/mobile.svelte';

// Proprietes reactives (lecture seule)
mobileStore.isMobile; // boolean - < 768px
mobileStore.isTablet; // boolean - 768px - 1023px
mobileStore.isDesktop; // boolean - >= 1024px
mobileStore.windowWidth; // number - largeur actuelle

// Constantes exportees
import { MOBILE_BREAKPOINT, DESKTOP_BREAKPOINT } from '$lib/stores/mobile.svelte';
// MOBILE_BREAKPOINT = 768
// DESKTOP_BREAKPOINT = 1024
```

### Utilisation

```svelte
<script>
	import { mobileStore } from '$lib/stores/mobile.svelte';

	// Reactif : se met a jour au resize
	let greeting = $derived(mobileStore.isMobile ? 'Salut!' : 'Bienvenue sur UbuMaths!');

	// Pour logique conditionnelle
	function openPanel() {
		if (mobileStore.isMobile) {
			openDrawer();
		} else {
			openSidebar();
		}
	}
</script>

<p>{greeting}</p>
```

### Quand l'utiliser

| Cas                          | Store | CSS                  |
| ---------------------------- | ----- | -------------------- |
| Cacher/afficher element      | ❌    | ✅ `hidden md:block` |
| Style different              | ❌    | ✅ `p-4 md:p-6`      |
| Logique JS differente        | ✅    | ❌                   |
| Composant lourd conditionnel | ✅    | ❌                   |
| Event handler different      | ✅    | ❌                   |

### SSR Safety

Le store est SSR-safe :

```typescript
// Valeurs par defaut cote serveur
isMobile: false,
isTablet: false,
isDesktop: true,
windowWidth: 1024
```

### Tests

```typescript
// src/lib/stores/__tests__/mobile.test.ts
import { createMobileStore } from '$lib/stores/mobile.svelte';

// Mock window.innerWidth pour les tests
Object.defineProperty(window, 'innerWidth', { value: 500 });

const store = createMobileStore();
expect(store.isMobile).toBe(true);
```

---

## MobileNavDrawer

### Emplacement

```
src/lib/components/navigation/MobileNavDrawer.svelte
```

### Props

```typescript
type NavItem = {
	label: string; // Texte affiche
	href: string; // Lien de navigation
	icon: Component; // Composant icone Lucide
	roles?: string[]; // Roles autorises (optionnel)
	badge?: number; // Badge numerique (optionnel)
};

interface Props {
	open?: boolean; // Etat ouvert/ferme (bindable)
	items: NavItem[]; // Items de navigation
	onNavigate?: () => void; // Callback apres navigation
	isActive?: (href: string) => boolean; // Fonction active personnalisee
}
```

### Utilisation Basique

```svelte
<script>
	import MobileNavDrawer, { type NavItem } from '$lib/components/navigation/MobileNavDrawer.svelte';
	import { Home, BookOpen, Settings } from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button';
	import { Menu } from 'lucide-svelte';

	let mobileMenuOpen = $state(false);

	const navItems: NavItem[] = [
		{ href: '/dashboard', label: 'Accueil', icon: Home },
		{ href: '/exercises', label: 'Exercices', icon: BookOpen },
		{ href: '/settings', label: 'Parametres', icon: Settings }
	];
</script>

<!-- Bouton hamburger -->
<Button
	variant="ghost"
	size="icon"
	class="md:hidden"
	onclick={() => (mobileMenuOpen = true)}
	aria-label="Ouvrir le menu"
>
	<Menu class="h-6 w-6" />
</Button>

<!-- Drawer -->
<MobileNavDrawer bind:open={mobileMenuOpen} items={navItems} />
```

### Avec Badge

```svelte
<script>
	import { privateMessages } from '$lib/stores/privateMessages.svelte';

	const navItems: NavItem[] = [
		{
			href: '/messages/inbox',
			label: 'Messages',
			icon: Inbox,
			badge: privateMessages.unreadCount > 0 ? privateMessages.unreadCount : undefined
		}
	];
</script>
```

### Avec isActive Personnalise

Pour les routes complexes ou le matching par defaut ne suffit pas :

```svelte
<script>
	import { page } from '$app/state';

	// Fonction personnalisee pour routes complexes
	function isActive(href: string): boolean {
		const pathname = page.url.pathname;

		// Cas special : /dashboard match /dashboard/student/*
		if (href === '/dashboard') {
			return (
				pathname === '/dashboard' ||
				pathname.startsWith('/dashboard/student') ||
				pathname.startsWith('/dashboard/teacher')
			);
		}

		// Matching standard
		return pathname === href || pathname.startsWith(href + '/');
	}
</script>

<MobileNavDrawer bind:open={mobileMenuOpen} items={navItems} {isActive} />
```

### Comportement

1. **Ouverture** : Slide depuis la gauche
2. **Fermeture** : Click sur lien, click overlay, swipe gauche
3. **Active state** : Lien actif surligne en primary
4. **Badge** : Affiche compteur (max 99+)

### Accessibilite

- `aria-label` sur le bouton hamburger
- Navigation au clavier dans le drawer
- Focus trap quand ouvert
- `role="navigation"` sur la liste

---

## Sheet (Base du Drawer)

Le MobileNavDrawer utilise le composant Sheet de shadcn-svelte.

### Emplacement

```
src/lib/components/ui/sheet/
```

### Utilisation Directe

Pour des drawers personnalises :

```svelte
<script>
	import * as Sheet from '$lib/components/ui/sheet';

	let open = $state(false);
</script>

<Sheet.Root bind:open>
	<Sheet.Trigger asChild let:builder>
		<Button builders={[builder]}>Ouvrir</Button>
	</Sheet.Trigger>

	<Sheet.Content side="left" class="w-72">
		<Sheet.Header>
			<Sheet.Title>Titre</Sheet.Title>
		</Sheet.Header>

		<div class="p-4">Contenu du drawer</div>
	</Sheet.Content>
</Sheet.Root>
```

### Sides Disponibles

```svelte
<Sheet.Content side="left">   <!-- Defaut pour nav -->
<Sheet.Content side="right">  <!-- Pour panels -->
<Sheet.Content side="top">    <!-- Pour notifications -->
<Sheet.Content side="bottom"> <!-- Pour actions -->
```

---

## Composants UI Responsifs

### Button avec Texte Conditionnel

```svelte
<Button>
	<Download class="h-4 w-4 sm:mr-2" />
	<span class="sr-only sm:not-sr-only">Telecharger</span>
</Button>
```

### Tabs Responsifs

```svelte
<Tabs.List class="flex h-auto w-full flex-wrap justify-start gap-1">
	<Tabs.Trigger value="tab1" class="flex items-center gap-1">
		<Icon class="h-4 w-4" />
		<span class="hidden sm:inline">Label</span>
	</Tabs.Trigger>
</Tabs.List>
```

### Card Responsive

```svelte
<Card.Root>
	<Card.Header class="p-4 sm:p-6">
		<Card.Title class="text-lg sm:text-xl">Titre</Card.Title>
	</Card.Header>
	<Card.Content class="p-4 sm:p-6">Contenu</Card.Content>
</Card.Root>
```

---

## Voir Aussi

- [Index](./index.md)
- [Breakpoints](./breakpoints.md)
- [Patterns](./patterns.md)
