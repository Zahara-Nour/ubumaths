# UI Components

Comprehensive guide to UI components in UbuMaths, including Shadcn-svelte components and the custom MySelect component built for SSR compatibility.

---

## Shadcn-svelte Components

Shadcn-svelte provides a library of accessible, customizable UI components built on Bits UI primitives.

**Documentation**: https://www.shadcn-svelte.com/docs

**Location**: `src/lib/components/ui/`

**Available Components**: Button, Input, Textarea, Dropdown Menu, Avatar, Tabs, Separator

### Adding New Components

To add a new Shadcn-svelte component to the project:

```bash
npx shadcn-svelte@latest add <component-name>
```

This will install the component into `src/lib/components/ui/` with proper styling and accessibility features.

---

## MySelect Component (Select Dropdowns)

The custom MySelect component is the standard for all dropdown/select functionality in UbuMaths.

**Location**: `src/lib/components/MySelect.svelte`

**Built on**: Bits UI Select (SSR-compatible)

### Why MySelect?

The custom MySelect component was created because Shadcn-svelte's Select component is not compatible with server-side rendering (SSR). MySelect provides:

- Full SSR compatibility (works with SvelteKit's server-side rendering)
- Consistent API across the entire codebase
- Built on Bits UI Select (stable, well-tested foundation)
- Full keyboard navigation and accessibility support
- Svelte 5 runes compatibility

### Never Use

**NEVER use the Shadcn-svelte Select component** for new code:

```typescript
// ERROR: Do not import Shadcn Select
import * as Select from '$lib/components/ui/select';
```

**NEVER use native HTML select elements**:

```svelte
<!-- ERROR: Do not use native HTML select -->
<select>
	<option value="option1">Option 1</option>
	<option value="option2">Option 2</option>
</select>
```

### Usage Example

Here's a complete example of using MySelect:

```svelte
<script>
	import MySelect from '$lib/components/MySelect.svelte';

	// Two-way binding with Svelte 5 $state
	let selectedValue = $state('option1');

	const items = [
		{ value: 'option1', label: 'Option 1' },
		{ value: 'option2', label: 'Option 2' },
		{ value: 'option3', label: 'Option 3', disabled: true }
	];
</script>

<MySelect
	type="single"
	bind:value={selectedValue}
	{items}
	placeholder="Select an option"
	triggerClass="h-9 w-40 rounded-md border"
/>
```

### Props

- **`type`** (required): `"single"` or `"multiple"` - Determines if one or multiple values can be selected (uses Bits UI Select API)
- **`value`** (required): Bindable value using `bind:value` - The currently selected value(s)
- **`items`** (required): Array of `{ value: string, label: string, disabled?: boolean }` - Options to display in the dropdown
- **`placeholder`** (optional): String - Placeholder text when nothing is selected (default: "Select...")
- **`triggerClass`** (optional): String - Custom CSS classes for the trigger/button element
- **`contentProps`** (optional): Object - Additional props passed to Select.Content (Bits UI)

### SSR Compatibility

When using MySelect in a route component, you must disable prerendering in the corresponding `+page.ts` file:

```typescript
// src/routes/my-page/+page.ts
export const prerender = false;
```

This ensures the component renders on the server with proper state management.

### Standardization

As of October 27, 2025, all 20 files using Shadcn Select or native select elements have been refactored to use MySelect for consistency and SSR compatibility.

### Reference

For a real-world example, see:

- **File**: `src/routes/(public)/games/mathemo/+page.svelte`
- **Lines**: 26, 262-267

See also: [Component Architecture](../architecture/components.md)

---

## Avatar Component (User Profile Pictures)

The Avatar component displays user profile pictures with a robust multi-level fallback system.

**Location**: `src/lib/components/ui/avatar/`

**Utility**: `src/lib/utils/avatar.ts`

### Why Use getAvatarUrl()?

Google OAuth stores avatars in `user_metadata.picture`, not `avatar_url`. Without proper fallback logic, Google avatars won't display if database sync fails. The `getAvatarUrl()` utility handles all fallback scenarios automatically.

### Standard Usage

```svelte
<script lang="ts">
	import * as Avatar from '$lib/components/ui/avatar';
	import { getAvatarUrl, getAvatarInitials } from '$lib/utils/avatar';

	let { profile, user } = $props();
</script>

<Avatar.Root class="h-10 w-10">
	<Avatar.Image
		src={getAvatarUrl(
			{
				avatar_url: profile.avatar_url,
				role: profile.role,
				gender: profile.gender
			},
			user // Pass user session for OAuth fallback
		)}
		alt={profile.email || 'User'}
	/>
	<Avatar.Fallback>
		{getAvatarInitials(profile.firstname, profile.lastname) || '?'}
	</Avatar.Fallback>
</Avatar.Root>
```

### Without User Session

When displaying avatars for other users (friends, students):

```svelte
<Avatar.Root class="h-10 w-10">
	<Avatar.Image
		src={getAvatarUrl({
			avatar_url: student.avatar_url,
			role: student.role,
			gender: student.gender
		})}
		alt={student.firstname}
	/>
	<Avatar.Fallback>
		{getAvatarInitials(student.firstname, student.lastname)}
	</Avatar.Fallback>
</Avatar.Root>
```

### Fallback Chain

1. `profile.avatar_url` - Database stored
2. `user.user_metadata.picture` - Google OAuth (**critical!**)
3. `user.user_metadata.avatar_url` - Other OAuth providers
4. Role/gender-based default image
5. Initials (Avatar.Fallback)

### Best Practices

- ✅ **Always use `getAvatarUrl()`** for URL resolution
- ✅ **Pass user session** when available (own profile)
- ✅ **Include Avatar.Fallback** with initials
- ❌ **Never check `avatar_url` directly** without fallback logic
- ❌ **Never create custom avatar resolution functions**

### Complete Documentation

See [Avatar System](../architecture/avatar-system.md) for:

- Complete API reference
- Database integration details
- Implementation coverage
- Troubleshooting guide

---

## Common UI Patterns

### Event Handlers

Event handlers in Svelte 5 use lowercase (different from traditional HTML):

```svelte
<!-- Correct: lowercase event handler -->
<Button onclick={handleClick}>Click me</Button>

<!-- Do NOT use onuppercase or on:event -->
```

### Import Patterns

Standard patterns for importing UI components:

```typescript
// Individual component import
import { Button } from '$lib/components/ui/button';

// Namespace import for components with subcomponents
import * as DropdownMenu from '$lib/components/ui/dropdown-menu';

// Custom components
import MySelect from '$lib/components/MySelect.svelte';
```

### Toast Notifications

Use the toaster store for user feedback messages:

```typescript
import { toaster } from '$lib/stores/toaster.svelte';

// Success notification
toaster.success('Action completed successfully');

// Error notification
toaster.error('An error occurred');

// Warning notification
toaster.warning('Please review this');

// Info notification
toaster.info('Here is some information');
```

The toaster automatically handles display and dismissal of notifications with visual feedback.

---

## VipCardSelector Component (Visual Card Selection)

The VipCardSelector component provides a visual, user-friendly interface for selecting VIP cards in the rewards dashboard.

**Location**: `src/lib/components/VipCardSelector.svelte`

**Built with**: VipCardSelectorModal, VipCard, Lucide icons

### Why VipCardSelector?

VipCardSelector was created to replace dropdown-based card selection (MySelect) with a more engaging visual gallery interface:

- Visual preview of cards before selection
- Better UX for browsing card options
- Shows card artwork and rarity at a glance
- Two-way binding for seamless integration
- Full keyboard and accessibility support

### When to Use

**✅ Use VipCardSelector when**:

- Selecting VIP cards in teacher dashboards
- Users need to see card artwork/rarity before selecting
- Visual presentation enhances user experience
- Working with VIP card templates

**❌ Use MySelect when**:

- Simple text-based options
- No visual representation needed
- Non-card selection dropdowns
- Performance is critical (many items)

### Usage Example

Here's a complete example of using VipCardSelector:

```svelte
<script>
	import VipCardSelector from '$lib/components/VipCardSelector.svelte';
	import type { VipCardTemplate } from '$lib/stores/vipCardTemplates.svelte';

	// Two-way binding with Svelte 5 $state
	let selectedCardId = $state<string | null>(null);

	// Available cards from your data source
	const availableCards: VipCardTemplate[] = [
		{
			id: 'bonus',
			name: 'Bonus',
			description: '+25% points on next assignment',
			rarity: 'common',
			image: '/images/cards/bonus.png'
		},
		{
			id: 'fortune',
			name: 'Roue de la Fortune',
			description: 'Exchange 5 cards for 5 random new cards',
			rarity: 'legendary',
			image: '/images/cards/fortune.png'
		}
	];
</script>

<!-- Bindable card selection -->
<VipCardSelector bind:selectedCardId {availableCards} />

<!-- Access selected value -->
{#if selectedCardId}
	<p>Selected card: {selectedCardId}</p>
{/if}
```

### Props

- **`selectedCardId`** (required, bindable): Currently selected card ID (`string | null`)
  - Use `bind:selectedCardId` for two-way binding
  - Set to `null` to clear selection
  - Updates automatically when user selects a card from modal

- **`availableCards`** (required): Array of `VipCardTemplate` objects
  - Each card must have: `id`, `name`, `description`, `rarity`, `image`
  - These are the cards shown in the selection modal
  - Cards are automatically sorted by rarity in the modal

### Component States

#### Empty State (No Card Selected)

When `selectedCardId` is `null`:

```svelte
<!-- Visual appearance -->
<div class="border-dashed border-gray-300">
	<CreditCard icon />
	<!-- Placeholder icon -->
	<p>Sélectionner une carte VIP</p>
</div>
```

- Dashed border
- Large card icon placeholder
- French text: "Sélectionner une carte VIP"
- Clickable to open modal

#### Selected State (Card Chosen)

When `selectedCardId` has a value:

```svelte
<!-- Visual appearance -->
<div class="border-solid border-border">
	<VipCard card={selectedCard} size="sm" />
</div>
```

- Solid border
- Displays full VipCard component
- Shows card artwork, name, rarity
- Clickable to change selection

### Behavior

1. **Click anywhere** → Opens VipCardSelectorModal
2. **Select card in modal** → Updates `selectedCardId` → Modal auto-closes
3. **Hover** → Scale up + border color change
4. **Keyboard**: Enter/Space → Opens modal
5. **Focus**: Ring outline for accessibility

### Integration with VipCardSelectorModal

VipCardSelector automatically manages the VipCardSelectorModal:

```svelte
<!-- Internal implementation (automatic) -->
<VipCardSelectorModal bind:open={modalOpen} {availableCards} onSelect={handleCardSelect} />
```

You don't need to manage the modal manually - VipCardSelector handles:

- Modal open/close state
- Passing availableCards to modal
- Updating selectedCardId when user selects
- Closing modal after selection

### Accessibility Features

- **Keyboard Navigation**: Full support for Enter/Space to open modal
- **ARIA Labels**: Dynamic labels based on state
  - Empty: "Sélectionner une carte VIP"
  - Selected: "Carte sélectionnée : [Card Name]. Cliquer pour changer"
- **Focus Management**: Clear focus ring on keyboard navigation
- **Screen Reader Support**: All interactive elements properly labeled

### Real-World Example

From the teacher rewards dashboard:

```svelte
<script>
	import VipCardSelector from '$lib/components/VipCardSelector.svelte';
	import { vipCardTemplates } from '$lib/stores/vipCardTemplates.svelte';

	let selectedCardId = $state<string | null>(null);

	// Filter to only show available cards for rewards
	const rewardCards = $derived(vipCardTemplates.filter((card) => card.rarity !== 'legendary'));

	async function handleSaveReward() {
		if (!selectedCardId) {
			toaster.error('Veuillez sélectionner une carte');
			return;
		}

		const response = await fetch('/api/rewards/create', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ cardId: selectedCardId })
		});

		if (response.ok) {
			toaster.success('Récompense créée');
		}
	}
</script>

<form>
	<label>Choisir une carte VIP</label>
	<VipCardSelector bind:selectedCardId availableCards={rewardCards} />

	<Button onclick={handleSaveReward}>Créer la récompense</Button>
</form>
```

### Best Practices

**✅ DO**:

```svelte
<!-- Use two-way binding -->
<VipCardSelector bind:selectedCardId {availableCards} />

<!-- Check for null before using -->
{#if selectedCardId}
	<p>Selected: {selectedCardId}</p>
{/if}

<!-- Filter available cards as needed -->
const commonCards = cards.filter(c => c.rarity === 'common');
<VipCardSelector bind:selectedCardId availableCards={commonCards} />
```

**❌ DON'T**:

```svelte
<!-- Don't use without binding -->
<VipCardSelector selectedCardId={myId} {availableCards} />

<!-- Don't forget null check -->
<p>Selected: {selectedCardId.toUpperCase()}</p>
<!-- Runtime error if null -->

<!-- Don't use MySelect for card selection -->
<MySelect bind:value={cardId} items={cardOptions} />
<!-- Less engaging UX -->
```

### Performance Considerations

- Cards are only rendered when modal is open
- Modal uses lazy loading pattern
- VipCard components use optimized rendering
- Grid layout is responsive with CSS (no JS resize listeners)

### TypeScript Types

```typescript
interface Props {
	selectedCardId?: string | null; // Bindable
	availableCards: VipCardTemplate[]; // Required
}

interface VipCardTemplate {
	id: string;
	name: string;
	description: string;
	rarity: 'common' | 'rare' | 'epic' | 'legendary';
	image: string;
	// ... other fields
}
```

### Common Pitfalls

1. **Forgetting to bind**: Use `bind:selectedCardId`, not just `selectedCardId`
2. **Not handling null**: Always check if `selectedCardId` is null before using
3. **Empty availableCards**: Component handles this gracefully, shows "no cards" in modal
4. **Wrong type**: Make sure availableCards contains `VipCardTemplate[]`, not just strings

### Migration from MySelect

If migrating from MySelect to VipCardSelector:

```svelte
<!-- BEFORE (MySelect) -->
<script>
	let selectedValue = $state('');
	const items = cards.map(c => ({ value: c.id, label: c.name }));
</script>
<MySelect bind:value={selectedValue} {items} />

<!-- AFTER (VipCardSelector) -->
<script>
	let selectedCardId = $state<string | null>(null);
	// Use cards directly, no mapping needed
</script>
<VipCardSelector bind:selectedCardId availableCards={cards} />
```

### Reference

- **Implementation**: `src/lib/components/VipCardSelector.svelte` (124 lines)
- **Modal Component**: `src/lib/components/VipCardSelectorModal.svelte` (118 lines)
- **Example Usage**: Teacher rewards dashboard
- **Related**: See VipCardSelectorModal section below

---

## VipCardSelectorModal Component (Card Gallery Modal)

The VipCardSelectorModal component displays VIP cards in a responsive visual gallery for selection.

**Location**: `src/lib/components/VipCardSelectorModal.svelte`

**Built with**: Shadcn Dialog, VipCard component, responsive grid

### Purpose

VipCardSelectorModal is used internally by VipCardSelector, but can also be used standalone when you need a modal card selection interface.

### Features

- Responsive grid layout (2/3/4 columns based on screen size)
- Cards automatically sorted by rarity (legendary → common)
- Click any card to select it
- Hover effect on cards (scale transform)
- Empty state when no cards available
- Full keyboard and accessibility support

### Usage Example

```svelte
<script>
	import VipCardSelectorModal from '$lib/components/VipCardSelectorModal.svelte';
	import type { VipCardTemplate } from '$lib/stores/vipCardTemplates.svelte';

	let modalOpen = $state(false);

	const availableCards: VipCardTemplate[] = [
		// Your VIP card templates
	];

	function handleSelect(cardId: string) {
		console.log('Selected card:', cardId);
		// Modal auto-closes after selection
	}
</script>

<Button onclick={() => (modalOpen = true)}>Choose Card</Button>

<VipCardSelectorModal bind:open={modalOpen} {availableCards} onSelect={handleSelect} />
```

### Props

- **`open`** (required, bindable): Modal open/close state (`boolean`)
  - Use `bind:open` for two-way binding
  - Set to `true` to open modal, `false` to close
  - Automatically set to `false` when user selects a card

- **`availableCards`** (required): Array of `VipCardTemplate` objects
  - Cards displayed in the modal
  - Automatically sorted by rarity (legendary first)
  - Each card must have: `id`, `name`, `rarity`, `image`

- **`onSelect`** (required): Callback function `(cardId: string) => void`
  - Called when user clicks on a card
  - Receives the selected card's ID
  - Modal automatically closes after this is called

### Card Sorting

Cards are automatically sorted by rarity priority:

```typescript
// Priority mapping (highest to lowest)
legendary: 4;
epic: 3;
rare: 2;
common: 1;
```

This means legendary cards always appear first, followed by epic, rare, then common.

### Responsive Grid Layout

The modal uses a responsive CSS Grid:

- **Mobile** (< 768px): 2 columns
- **Tablet** (768px - 1024px): 3 columns
- **Desktop** (> 1024px): 4 columns

```css
/* Responsive grid classes */
grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4
```

### Empty State

When `availableCards` is empty:

```svelte
<!-- Visual appearance -->
<div class="py-12 text-center">
	<div class="text-6xl opacity-50">📦</div>
	<p>Aucune carte disponible</p>
</div>
```

### Behavior

1. **Click on card** → Calls `onSelect(cardId)` → Auto-closes modal
2. **Click outside modal** → Closes modal (no selection)
3. **Press Escape** → Closes modal (no selection)
4. **Hover card** → Scale up effect (hover:scale-105)
5. **Keyboard navigation** → Full support for Tab/Enter/Space

### Accessibility Features

- **Dialog Component**: Uses Shadcn Dialog (built on Radix UI)
- **ARIA Labels**: Each card button has descriptive label
  - Example: "Sélectionner la carte Bonus"
- **Keyboard Support**: Tab through cards, Enter/Space to select
- **Focus Management**: Proper focus trapping in modal
- **Screen Reader**: Title and description properly announced

### Dialog Structure

```svelte
<Dialog.Root bind:open>
	<Dialog.Content class="max-w-4xl">
		<Dialog.Header>
			<Dialog.Title>Sélectionner une carte VIP</Dialog.Title>
			<Dialog.Description>
				Cliquez sur une carte pour la sélectionner. Les cartes les plus rares sont affichées en
				premier.
			</Dialog.Description>
		</Dialog.Header>

		<!-- Scrollable cards grid -->
		<div class="max-h-[60vh] overflow-y-auto">
			<!-- Grid with cards -->
		</div>
	</Dialog.Content>
</Dialog.Root>
```

### Real-World Integration

VipCardSelectorModal is typically used with VipCardSelector:

```svelte
<!-- VipCardSelector.svelte (simplified) -->
<script>
	let modalOpen = $state(false);
	let { selectedCardId = $bindable(null), availableCards } = $props();

	function handleCardSelect(cardId: string) {
		selectedCardId = cardId; // Update parent binding
		// Modal auto-closes via VipCardSelectorModal
	}
</script>

<!-- Trigger button -->
<button onclick={() => (modalOpen = true)}>
	{#if selectedCardId}
		<VipCard card={selectedCard} />
	{:else}
		<p>Sélectionner une carte</p>
	{/if}
</button>

<!-- Modal -->
<VipCardSelectorModal bind:open={modalOpen} {availableCards} onSelect={handleCardSelect} />
```

### Best Practices

**✅ DO**:

```svelte
<!-- Use bind:open for two-way binding -->
<VipCardSelectorModal bind:open={isOpen} {availableCards} onSelect={handleSelect} />

<!-- Provide callback for selection -->
function handleSelect(cardId: string) {
	// Handle selection
	console.log('Selected:', cardId);
	// Modal auto-closes, no need to set open = false
}

<!-- Filter cards before passing -->
const availableCards = allCards.filter(c => !c.isUsed);
```

**❌ DON'T**:

```svelte
<!-- Don't forget to bind open -->
<VipCardSelectorModal open={isOpen} {availableCards} onSelect={handleSelect} />

<!-- Don't manually close in onSelect (auto-closes) -->
function handleSelect(cardId: string) {
	selectedCard = cardId;
	open = false; // ❌ Unnecessary, modal auto-closes
}

<!-- Don't pass huge arrays without filtering -->
<VipCardSelectorModal {allCards} /> <!-- Could be slow with 100+ cards -->
```

### Performance

- **Lazy Rendering**: Cards only rendered when modal is open
- **Scrollable Content**: Uses `max-h-[60vh]` with overflow-y-auto
  - Prevents layout issues with many cards
  - Maintains smooth scrolling
- **Efficient Sorting**: Sorting happens in $derived (reactive)
- **CSS Transforms**: Uses GPU-accelerated transforms for hover effects

### TypeScript Types

```typescript
interface Props {
	open?: boolean; // Bindable
	availableCards: VipCardTemplate[];
	onSelect: (cardId: string) => void;
}

interface VipCardTemplate {
	id: string;
	name: string;
	description: string;
	rarity: 'common' | 'rare' | 'epic' | 'legendary';
	image: string;
}
```

### Common Use Cases

1. **With VipCardSelector** (automatic, recommended):

   ```svelte
   <VipCardSelector bind:selectedCardId {availableCards} />
   ```

2. **Standalone modal** (advanced):

   ```svelte
   <Button onclick={() => (modalOpen = true)}>Browse Cards</Button>
   <VipCardSelectorModal bind:open={modalOpen} {availableCards} onSelect={handleSelect} />
   ```

3. **Filtered selection**:
   ```svelte
   const rareCards = cards.filter(c => c.rarity === 'rare' || c.rarity === 'epic');
   <VipCardSelectorModal bind:open {availableCards: rareCards} onSelect={handleSelect} />
   ```

### Styling Customization

The modal uses Shadcn Dialog with Tailwind classes:

```svelte
<!-- Customize Dialog.Content size -->
<Dialog.Content class="max-w-4xl"> <!-- Default -->
<Dialog.Content class="max-w-6xl"> <!-- Larger -->

<!-- Customize grid gap -->
<div class="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
<!-- Change gap-4 to gap-6 for more spacing -->

<!-- Customize max height -->
<div class="max-h-[60vh] overflow-y-auto">
<!-- Change 60vh to 70vh for taller modal -->
```

### Reference

- **Implementation**: `src/lib/components/VipCardSelectorModal.svelte` (118 lines)
- **Used By**: VipCardSelector component
- **Dependencies**: Shadcn Dialog, VipCard component
- **Related**: See VipCardSelector section above

---

## Sidebar Component

Le composant Sidebar affiche la navigation principale sur les routes non-dashboard.

**Location**: `src/lib/components/Sidebar.svelte`

### Props

```typescript
type NavItem = {
  label: string;
  href: string;
  icon: ComponentType;
  roles?: string[];  // Optional: restrict to specific roles
};

let {
  profile = null,        // User profile for role-based filtering
  items = [...]          // Navigation items with optional role restrictions
}: {
  profile?: Tables<'profiles'> | null;
  items?: NavItem[];
} = $props();
```

### Role-Based Navigation

Les items peuvent être restreints à certains rôles via la propriété `roles` :

```svelte
<script>
	const items = [
		{ label: 'Accueil', href: '/', icon: Home }, // Visible à tous
		{
			label: 'Calculatrice',
			href: '/calculatrice',
			icon: Calculator,
			roles: ['student', 'teacher']
		} // Student/Teacher uniquement
	];
</script>

<Sidebar profile={data.profile} {items} />
```

Si `roles` est défini mais l'utilisateur n'est pas connecté (`profile = null`), l'item est masqué.

---

[← Back to Claude Docs](./README.md)
