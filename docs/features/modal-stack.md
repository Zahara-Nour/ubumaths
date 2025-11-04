# Modal Stack System

A generic, stack-based modal navigation system for UbuMaths.

## Overview

The ModalStack system provides a flexible way to manage modal navigation flows where modals can open other modals, creating a navigation stack that users can traverse back through.

## Features

- **Stack-based navigation**: Push modals onto a stack, pop to go back
- **Return callbacks**: Execute code when returning to a modal
- **Dismissal control**: Block Escape/backdrop clicks if needed
- **Dynamic z-index**: Automatically handles stacking of multiple modals
- **Type-safe**: Full TypeScript support with proper component typing
- **Svelte 5 runes**: Uses modern reactive patterns

## Installation

The ModalStack system consists of two parts:

1. **Store**: `/src/lib/stores/modalStack.svelte.ts` - State management
2. **Renderer**: `/src/lib/components/modals/ModalStackRenderer.svelte` - UI rendering

### Setup in Root Layout

Add the renderer once in your root layout:

```svelte
<!-- src/routes/+layout.svelte -->
<script>
	import ModalStackRenderer from '$lib/components/modals/ModalStackRenderer.svelte';
</script>

<!-- Your app content -->
<slot />

<!-- Modal renderer (place at end) -->
<ModalStackRenderer />
```

## Basic Usage

### Simple Modal

```svelte
<script lang="ts">
	import { modalStack } from '$lib/stores/modalStack.svelte';
	import ConfirmDialog from './ConfirmDialog.svelte';

	function openConfirmation() {
		modalStack.push({
			component: ConfirmDialog,
			props: {
				title: 'Confirmer la suppression',
				message: 'Êtes-vous sûr de vouloir supprimer cet élément ?',
				onConfirm: () => {
					console.log('Confirmed!');
					modalStack.pop();
				},
				onCancel: () => {
					modalStack.pop();
				}
			}
		});
	}
</script>

<Button onclick={openConfirmation}>Supprimer</Button>
```

### Nested Modals (Modal Navigation)

```svelte
<script lang="ts">
	import { modalStack } from '$lib/stores/modalStack.svelte';
	import StudentListModal from './StudentListModal.svelte';
	import StudentDetailModal from './StudentDetailModal.svelte';

	function openStudentList() {
		modalStack.push({
			component: StudentListModal,
			props: {
				onSelectStudent: (studentId: string) => {
					// Push detail modal on top of list modal
					modalStack.push({
						component: StudentDetailModal,
						props: {
							studentId,
							onClose: () => modalStack.pop()
						}
					});
				}
			}
		});
	}
</script>
```

### Blocking Dismissal

```svelte
<script lang="ts">
	import { modalStack } from '$lib/stores/modalStack.svelte';
	import FormModal from './FormModal.svelte';

	function openFormWithUnsavedChanges() {
		modalStack.push({
			component: FormModal,
			props: {
				onSave: async (data) => {
					await saveData(data);
					modalStack.pop();
				}
			},
			canDismiss: false // Prevent accidental closure
		});
	}
</script>
```

### Return Callbacks

```svelte
<script lang="ts">
	import { modalStack } from '$lib/stores/modalStack.svelte';
	import ListModal from './ListModal.svelte';
	import EditModal from './EditModal.svelte';

	function openListWithRefresh() {
		const listModalId = modalStack.push({
			component: ListModal,
			props: {
				items: fetchItems(),
				onEdit: (itemId: string) => {
					modalStack.push({
						component: EditModal,
						props: {
							itemId,
							onSave: () => {
								// After saving, pop back to list
								modalStack.popTo(listModalId);
							}
						}
					});
				}
			},
			onReturn: () => {
				// Refresh list when returning to it
				console.log('Returned to list - refreshing...');
				// fetchItems() again
			}
		});
	}
</script>
```

## API Reference

### ModalStack Store

#### `push(entry: Omit<ModalEntry, 'id'>): string`

Push a new modal onto the stack.

**Parameters:**

- `entry.component` (Component): Svelte component to render
- `entry.props` (Record<string, unknown>): Props to pass to component
- `entry.onReturn?` (function): Called when returning to this modal
- `entry.canDismiss?` (boolean): If false, blocks Escape/backdrop clicks

**Returns:** UUID string identifying this modal instance

**Example:**

```typescript
const modalId = modalStack.push({
	component: MyModal,
	props: { userId: '123' },
	canDismiss: true,
	onReturn: () => console.log('Returned!')
});
```

#### `pop(): ModalEntry | undefined`

Remove the top modal from the stack. Calls `onReturn` of the new top modal if exists.

**Returns:** The popped modal entry, or undefined if stack was empty

**Example:**

```typescript
modalStack.pop(); // Close current modal
```

#### `popTo(id: string): void`

Pop modals until reaching the modal with the given ID. That modal remains as the new top. Calls `onReturn` of the target modal.

**Parameters:**

- `id` (string): UUID of the modal to return to

**Example:**

```typescript
const firstModalId = modalStack.push({ ... });
modalStack.push({ ... }); // Second modal
modalStack.push({ ... }); // Third modal

modalStack.popTo(firstModalId); // Back to first modal
```

#### `clear(): void`

Remove all modals from the stack.

**Example:**

```typescript
modalStack.clear(); // Close all modals
```

#### `current: ModalEntry | null` (getter)

Get the current (top) modal from the stack.

**Returns:** Current modal entry, or null if stack is empty

**Example:**

```typescript
const currentModal = modalStack.current;
if (currentModal) {
	console.log('Current component:', currentModal.component);
}
```

#### `depth: number` (getter)

Get the current depth of the modal stack.

**Returns:** Number of modals in the stack

**Example:**

```typescript
console.log('Modals open:', modalStack.depth);
```

#### `isEmpty: boolean` (getter)

Check if the modal stack is empty.

**Returns:** True if no modals are open

**Example:**

```typescript
if (modalStack.isEmpty) {
	console.log('No modals open');
}
```

### ModalEntry Interface

```typescript
interface ModalEntry {
	id: string; // UUID (auto-generated)
	component: Component; // Svelte component to render
	props: Record<string, unknown>; // Props to pass to component
	onReturn?: () => void; // Called when returning to this modal
	canDismiss?: boolean; // If false, block Escape/backdrop
}
```

## Patterns & Best Practices

### Pattern 1: Wizard Flow

```typescript
// Step 1
const wizardId = modalStack.push({
	component: WizardStep1,
	props: {
		onNext: (data1) => {
			// Step 2
			modalStack.push({
				component: WizardStep2,
				props: {
					data: data1,
					onNext: (data2) => {
						// Step 3
						modalStack.push({
							component: WizardStep3,
							props: {
								data: { ...data1, ...data2 },
								onFinish: async (finalData) => {
									await submit(finalData);
									modalStack.clear(); // Close all wizard modals
								}
							}
						});
					}
				}
			});
		}
	}
});
```

### Pattern 2: Master-Detail Navigation

```typescript
// List modal
const listId = modalStack.push({
	component: ItemList,
	props: {
		onSelect: (itemId) => {
			// Detail modal
			modalStack.push({
				component: ItemDetail,
				props: {
					itemId,
					onEdit: () => {
						// Edit modal
						modalStack.push({
							component: ItemEdit,
							props: {
								itemId,
								onSave: () => {
									// Return to detail after saving
									modalStack.pop();
								}
							}
						});
					}
				}
			});
		}
	},
	onReturn: () => {
		// Refresh list when returning from detail
		refreshList();
	}
});
```

### Pattern 3: Confirmation Flow

```typescript
function deleteWithConfirmation(itemId: string) {
	modalStack.push({
		component: ConfirmDialog,
		props: {
			title: 'Confirmer la suppression',
			message: 'Cette action est irréversible.',
			onConfirm: async () => {
				try {
					await deleteItem(itemId);
					modalStack.pop();
					toaster.success('Élément supprimé');
				} catch (error) {
					toaster.error('Erreur lors de la suppression');
				}
			},
			onCancel: () => {
				modalStack.pop();
			}
		}
	});
}
```

### Best Practices

1. **Always provide close mechanism**: Ensure modals have a way to close (button, callback)
2. **Use canDismiss carefully**: Only block dismissal when truly necessary (unsaved changes)
3. **Keep props serializable**: Avoid passing functions/objects that can't be serialized
4. **Handle errors gracefully**: Wrap async operations in try/catch
5. **Clean up on unmount**: Use `modalStack.clear()` when navigating away
6. **Use return callbacks sparingly**: Only when you need to refresh/update when returning
7. **Prefer popTo over multiple pops**: For multi-level navigation, use `popTo(id)`

## Accessibility

The ModalStackRenderer component includes:

- `role="dialog"` on modal container
- `aria-modal="true"` attribute
- Escape key support (when canDismiss !== false)
- Backdrop click support (when canDismiss !== false)

## Styling

The renderer uses minimal inline styles for positioning. You can customize the modal appearance by styling your modal components directly.

Default backdrop styles:

- Semi-transparent black overlay (rgba(0, 0, 0, 0.5))
- Full viewport coverage (position: fixed, inset: 0)
- Centered content (flexbox)
- Dynamic z-index (1000 + stack depth)

## Testing

The modal stack system includes comprehensive unit tests. See `/tests/unit/modalStack.test.ts` for examples.

```bash
# Run tests
pnpm test:unit tests/unit/modalStack.test.ts
```

## Migration Guide

### From Shadcn Dialog

**Before:**

```svelte
<script>
	let open = $state(false);
</script>

<Dialog.Root bind:open>
	<Dialog.Trigger>
		<Button>Open</Button>
	</Dialog.Trigger>
	<Dialog.Content>
		<!-- content -->
	</Dialog.Content>
</Dialog.Root>
```

**After:**

```svelte
<script>
	import { modalStack } from '$lib/stores/modalStack.svelte';
	import MyModalContent from './MyModalContent.svelte';

	function openModal() {
		modalStack.push({
			component: MyModalContent,
			props: {}
		});
	}
</script>

<Button onclick={openModal}>Open</Button>
```

## Troubleshooting

### Modal not appearing

- Ensure `ModalStackRenderer` is in your root layout
- Check browser console for errors
- Verify component import is correct

### Escape key not working

- Check if `canDismiss` is set to `false`
- Ensure no other event handlers are preventing default

### Z-index conflicts

- The renderer uses `1000 + depth` as z-index
- Adjust if your app uses higher z-index values elsewhere

### Props not updating

- Remember props are passed once when modal is pushed
- Use reactive state within the modal component
- Use `onReturn` callback to refresh when returning to modal

## Related

- [UI Components Documentation](../claude/ui-components.md)
- [Svelte 5 Runes Best Practices](../claude/best-practices.md)
- [Dialog Component](../claude/ui-components.md#dialog)
