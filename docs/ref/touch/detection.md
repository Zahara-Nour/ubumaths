# Detection des capacites d'input

## Le store `inputCapability`

### Fichier source

`src/lib/stores/input-capability.svelte.ts`

### API

```typescript
import { inputCapability } from '$lib/stores/input-capability.svelte';

// Proprietes (toutes readonly et reactives)
inputCapability.hasTouch; // boolean - appareil a un input tactile
inputCapability.hasMouse; // boolean - appareil a une souris/trackpad
inputCapability.canHover; // boolean - au moins un input peut hover
inputCapability.primaryIsTouch; // boolean - input principal est tactile
```

### Type

```typescript
export type InputCapability = {
	readonly hasTouch: boolean; // (any-pointer: coarse)
	readonly hasMouse: boolean; // (any-pointer: fine)
	readonly canHover: boolean; // (any-hover: hover)
	readonly primaryIsTouch: boolean; // (pointer: coarse)
};
```

---

## Comportement par type d'appareil

### Smartphones / Tablettes (touch only)

```typescript
{
  hasTouch: true,
  hasMouse: false,
  canHover: false,
  primaryIsTouch: true
}
```

### Desktop avec souris

```typescript
{
  hasTouch: false,
  hasMouse: true,
  canHover: true,
  primaryIsTouch: false
}
```

### Laptop avec ecran tactile

```typescript
{
  hasTouch: true,       // Ecran tactile disponible
  hasMouse: true,       // Trackpad disponible
  canHover: true,       // Trackpad peut hover
  primaryIsTouch: false // Trackpad est l'input principal
}
```

### Tablette avec souris Bluetooth

```typescript
{
  hasTouch: true,       // Ecran tactile
  hasMouse: true,       // Souris Bluetooth
  canHover: true,       // Souris peut hover
  primaryIsTouch: true  // Tactile reste l'input principal (OS decision)
}
```

---

## Implementation interne

### Media queries utilisees

```typescript
const hasTouch = matchMedia('(any-pointer: coarse)').matches;
const hasMouse = matchMedia('(any-pointer: fine)').matches;
const canHover = matchMedia('(any-hover: hover)').matches;
const primaryIsTouch = matchMedia('(pointer: coarse)').matches;
```

### Reactivite aux changements

Le store ecoute les changements de media queries pour reagir quand :

- L'utilisateur connecte/deconnecte une souris Bluetooth
- L'utilisateur passe du mode tablette au mode laptop (2-en-1)
- L'emulateur de device change dans DevTools

```typescript
window.matchMedia('(any-pointer: coarse)').addEventListener('change', (e) => {
	hasTouch = e.matches;
});
```

### SSR Safety

En mode SSR (serveur), `window` n'existe pas. Le store retourne des valeurs desktop par defaut :

```typescript
const isBrowser = typeof window !== 'undefined';

let hasMouse = $state(isBrowser ? matchesMedia('(any-pointer: fine)') : true);
let canHover = $state(isBrowser ? matchesMedia('(any-hover: hover)') : true);
```

---

## Quand utiliser le store vs CSS

### Utiliser le store JavaScript quand :

- Logique conditionnelle complexe
- Choix entre composants differents
- Messages/instructions contextuels
- Comportements JavaScript differents

```svelte
<script>
	import { inputCapability } from '$lib/stores/input-capability.svelte';
</script>

<!-- Composant different selon les capacites -->
{#if inputCapability.canHover}
	<Tooltip content="Information detaillee">
		<Button>Aide</Button>
	</Tooltip>
{:else}
	<Popover>
		<PopoverTrigger>
			<Button>Aide</Button>
		</PopoverTrigger>
		<PopoverContent>Information detaillee</PopoverContent>
	</Popover>
{/if}

<!-- Instructions contextuelles -->
<p class="help-text">
	{#if inputCapability.hasTouch && !inputCapability.canHover}
		Appuyez longuement pour selectionner plusieurs elements
	{:else}
		Maintenez Ctrl et cliquez pour selectionner plusieurs elements
	{/if}
</p>
```

### Utiliser CSS `@media` quand :

- Ajustement de tailles/espacements
- Styles visuels adaptatifs
- Pas de logique, juste du style

```css
.btn {
	height: 40px;
}

@media (pointer: coarse) {
	.btn {
		min-height: 44px;
	}
}
```

---

## Difference avec mobileStore

| Aspect          | mobileStore                  | inputCapability                    |
| --------------- | ---------------------------- | ---------------------------------- |
| **Detecte**     | Taille de la fenetre         | Capacites d'input                  |
| **Usage**       | Layout, colonnes, navigation | Taille des cibles, hover, feedback |
| **Media query** | `min-width`, `max-width`     | `pointer`, `hover`, `any-pointer`  |
| **Reactif a**   | Redimensionnement fenetre    | Connexion/deconnexion d'input      |

### Exemple combine

```svelte
<script>
	import { mobileStore } from '$lib/stores/mobile.svelte';
	import { inputCapability } from '$lib/stores/input-capability.svelte';
</script>

<!-- Layout base sur la taille d'ecran -->
{#if mobileStore.isMobile}
	<MobileNav />
{:else}
	<DesktopSidebar />
{/if}

<!-- Comportement base sur les capacites d'input -->
<Button class={inputCapability.hasTouch ? 'touch-friendly' : ''}>
	{inputCapability.canHover ? 'Survolez pour info' : 'Appuyez pour info'}
</Button>
```

---

## Pourquoi ne pas utiliser User-Agent ?

### Problemes du User-Agent

1. **Facilement falsifiable** - Extensions, modes incognito
2. **Incomplet** - Ne detecte pas les souris Bluetooth sur tablettes
3. **Statique** - Ne change pas si l'utilisateur connecte un peripherique
4. **Deprecie** - Chrome reduit les infos du User-Agent (Client Hints)

### Avantages des media queries

1. **Fiable** - Reflete les vraies capacites du hardware
2. **Dynamique** - Change quand les peripheriques changent
3. **Standard** - W3C, supporte par tous les navigateurs modernes
4. **Precis** - Distingue `pointer` de `any-pointer`

---

## Factory function pour les tests

```typescript
import { createInputCapabilityStore } from '$lib/stores/input-capability.svelte';

// Dans un test
const store = createInputCapabilityStore();

// Le store utilise les media queries mockees
expect(store.hasTouch).toBe(true);
```

Voir [testing.md](testing.md) pour les details sur les mocks.
