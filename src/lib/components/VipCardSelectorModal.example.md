# VipCardSelectorModal Component

A Svelte 5 modal component for selecting VIP cards from a visual gallery with responsive grid layout.

## Features

- **Responsive Grid**: 2 columns (mobile) → 3 (tablet) → 4 (desktop)
- **Smart Sorting**: Cards sorted by rarity (legendary → epic → rare → common)
- **Interactive**: Hover scale effect, click to select
- **Accessible**: Keyboard navigation, ARIA labels, focus management
- **Shadcn-svelte Dialog**: Built with shadcn-svelte Dialog component
- **Empty State**: Shows friendly message when no cards available

## Props

| Prop             | Type                       | Default  | Description                            |
| ---------------- | -------------------------- | -------- | -------------------------------------- |
| `open`           | `boolean`                  | `false`  | Dialog open/close state (bindable)     |
| `availableCards` | `VipCardTemplate[]`        | required | Array of VIP card templates to display |
| `onSelect`       | `(cardId: string) => void` | required | Callback when a card is selected       |

## Usage

```svelte
<script lang="ts">
	import VipCardSelectorModal from '$lib/components/VipCardSelectorModal.svelte';
	import { vipCardTemplates, getEnabledTemplates } from '$lib/stores/vipCardTemplates.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';

	// State
	let modalOpen = $state(false);

	// Get all enabled templates
	const availableCards = $derived(getEnabledTemplates($vipCardTemplates));

	/**
	 * Handle card selection
	 */
	function handleCardSelect(cardId: string) {
		console.log('Selected card:', cardId);
		toaster.success(`Carte ${cardId} sélectionnée !`);
		// Your custom logic here (e.g., award card to student)
	}
</script>

<Button onclick={() => (modalOpen = true)}>Ouvrir la galerie de cartes</Button>

<VipCardSelectorModal bind:open={modalOpen} {availableCards} onSelect={handleCardSelect} />
```

## Advanced Usage - Filtering Cards

```svelte
<script lang="ts">
	import VipCardSelectorModal from '$lib/components/VipCardSelectorModal.svelte';
	import { vipCardTemplates, getTemplatesByRarity } from '$lib/stores/vipCardTemplates.svelte';

	let modalOpen = $state(false);

	// Only show rare and epic cards
	const availableCards = $derived(
		$vipCardTemplates.filter((t) => t.is_enabled && (t.rarity === 'rare' || t.rarity === 'epic'))
	);

	function handleCardSelect(cardId: string) {
		// Custom logic here
	}
</script>

<VipCardSelectorModal bind:open={modalOpen} {availableCards} onSelect={handleCardSelect} />
```

## Behavior

1. **Card Selection**: Click on any card → `onSelect(cardId)` is called → Modal closes automatically
2. **Close Modal**: Click outside modal OR press Escape key → Modal closes
3. **No Cancel Button**: Clicking outside the modal is sufficient (follows UX best practices)
4. **Empty State**: Shows friendly message with icon when `availableCards` is empty

## Accessibility

- ✅ Keyboard navigation (Tab to navigate, Enter/Space to select)
- ✅ Focus management (focus trap when modal open)
- ✅ ARIA labels on all interactive elements
- ✅ Screen reader friendly descriptions
- ✅ Visible focus indicators

## Styling

Uses Tailwind CSS with:

- Responsive breakpoints (`md:`, `lg:`)
- Semantic color tokens (`text-muted-foreground`, `ring-ring`)
- Transform animations (`hover:scale-105`)
- Focus rings for accessibility

## Technical Details

### Svelte 5 Runes Used

- `$props()` - Component props with TypeScript types
- `$bindable()` - Two-way binding for `open` prop
- `$derived.by()` - Reactive sorted cards computation

### Dependencies

- `$lib/components/ui/dialog` - Shadcn-svelte Dialog component
- `$lib/components/VipCard.svelte` - VIP card display component
- `$lib/stores/vipCardTemplates.svelte` - VIP card templates store
- `$lib/utils` - `cn()` utility for conditional classes

### Card Sorting Logic

Cards are sorted by rarity priority (descending):

- Legendary: 4 (highest)
- Epic: 3
- Rare: 2
- Common: 1 (lowest)

Null/undefined rarities are treated as 0 (lowest priority).

## Component Structure

```
VipCardSelectorModal.svelte
├── Dialog.Root (bind:open)
│   └── Dialog.Content (max-w-4xl)
│       ├── Dialog.Header
│       │   ├── Dialog.Title
│       │   └── Dialog.Description
│       └── Cards Grid Container (scrollable)
│           ├── Empty State (if no cards)
│           └── Grid (2/3/4 columns)
│               └── Card Buttons (hover:scale-105)
│                   └── VipCard (size="sm")
```

## File Location

`/Users/david/Coding/js/ubumaths/src/lib/components/VipCardSelectorModal.svelte`
