<script lang="ts">
	/**
	 * ContextMenu - Right-click menu for whiteboard elements
	 *
	 * Shows z-order operations when elements are selected
	 */

	import { whiteboardStore } from '../stores/whiteboard.svelte';
	import { ArrowUpToLine, ArrowDownToLine, ArrowUp, ArrowDown, Trash2 } from 'lucide-svelte';

	// ==========================================================================
	// State
	// ==========================================================================

	let visible = $state(false);
	let position = $state({ x: 0, y: 0 });

	// Get selected element IDs
	let selectedIds = $derived(Array.from(whiteboardStore.selectedIds));
	let hasSelection = $derived(selectedIds.length > 0);

	// ==========================================================================
	// Methods
	// ==========================================================================

	export function show(x: number, y: number): void {
		if (!hasSelection) return;

		// Menu dimensions (approximate)
		const menuWidth = 180;
		const menuHeight = 200;
		const padding = 8;

		// Adjust position to keep menu within viewport
		const viewportWidth = window.innerWidth;
		const viewportHeight = window.innerHeight;

		let adjustedX = x;
		let adjustedY = y;

		// Prevent overflow on right
		if (x + menuWidth + padding > viewportWidth) {
			adjustedX = x - menuWidth;
		}

		// Prevent overflow on bottom
		if (y + menuHeight + padding > viewportHeight) {
			adjustedY = y - menuHeight;
		}

		// Ensure not negative
		adjustedX = Math.max(padding, adjustedX);
		adjustedY = Math.max(padding, adjustedY);

		position = { x: adjustedX, y: adjustedY };
		visible = true;
	}

	export function hide(): void {
		visible = false;
	}

	function handleBringToFront() {
		whiteboardStore.bringToFront(selectedIds);
		hide();
	}

	function handleSendToBack() {
		whiteboardStore.sendToBack(selectedIds);
		hide();
	}

	function handleBringForward() {
		whiteboardStore.bringForward(selectedIds);
		hide();
	}

	function handleSendBackward() {
		whiteboardStore.sendBackward(selectedIds);
		hide();
	}

	function handleDelete() {
		whiteboardStore.deleteSelected();
		hide();
	}

	function handleClickOutside() {
		if (visible) {
			hide();
		}
	}
</script>

<svelte:window onclick={handleClickOutside} />

{#if visible && hasSelection}
	<div
		class="context-menu fixed z-[100] min-w-[180px] rounded-md border border-border bg-popover p-1 shadow-lg"
		style="left: {position.x}px; top: {position.y}px;"
		onclick={(e) => e.stopPropagation()}
		onkeydown={(e) => e.key === 'Escape' && hide()}
		oncontextmenu={(e) => e.preventDefault()}
		role="menu"
		tabindex="-1"
	>
		<button
			type="button"
			class="context-menu-item flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
			onclick={handleBringToFront}
		>
			<ArrowUpToLine class="h-4 w-4" />
			<span>Premier plan</span>
		</button>

		<button
			type="button"
			class="context-menu-item flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
			onclick={handleBringForward}
		>
			<ArrowUp class="h-4 w-4" />
			<span>Avancer</span>
		</button>

		<button
			type="button"
			class="context-menu-item flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
			onclick={handleSendBackward}
		>
			<ArrowDown class="h-4 w-4" />
			<span>Reculer</span>
		</button>

		<button
			type="button"
			class="context-menu-item flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
			onclick={handleSendToBack}
		>
			<ArrowDownToLine class="h-4 w-4" />
			<span>Arrière-plan</span>
		</button>

		<div class="my-1 h-px bg-border"></div>

		<button
			type="button"
			class="context-menu-item flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10"
			onclick={handleDelete}
		>
			<Trash2 class="h-4 w-4" />
			<span>Supprimer</span>
		</button>
	</div>
{/if}

<style>
	.context-menu {
		animation: fadeIn 0.1s ease-out;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: scale(0.95);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}
</style>
