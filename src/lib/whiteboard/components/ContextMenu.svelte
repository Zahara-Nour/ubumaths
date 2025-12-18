<script lang="ts">
	/**
	 * ContextMenu - Right-click menu for whiteboard elements
	 *
	 * Shows copy/cut/paste and z-order operations when elements are selected
	 */

	import { whiteboardStore } from '../stores/whiteboard.svelte';
	import {
		ArrowUpToLine,
		ArrowDownToLine,
		ArrowUp,
		ArrowDown,
		Trash2,
		Copy,
		Scissors,
		ClipboardPaste
	} from 'lucide-svelte';

	// ==========================================================================
	// State
	// ==========================================================================

	let visible = $state(false);
	let position = $state({ x: 0, y: 0 });

	// Get selected element IDs
	let selectedIds = $derived(Array.from(whiteboardStore.selectedIds));
	let hasSelection = $derived(selectedIds.length > 0);
	let hasClipboard = $derived(whiteboardStore.hasClipboard);

	// ==========================================================================
	// Methods
	// ==========================================================================

	export function show(x: number, y: number): void {
		// Show menu if there's a selection OR if clipboard has content (for paste)
		if (!hasSelection && !hasClipboard) return;

		// Menu dimensions (approximate)
		const menuWidth = 180;
		const menuHeight = 320; // Increased for additional items
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

	// ==========================================================================
	// Clipboard Handlers
	// ==========================================================================

	function handleCopy() {
		whiteboardStore.copySelected();
		hide();
	}

	function handleCut() {
		whiteboardStore.cutSelected();
		hide();
	}

	function handlePaste() {
		whiteboardStore.paste();
		hide();
	}

	// ==========================================================================
	// Z-Order Handlers
	// ==========================================================================

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

{#if visible && (hasSelection || hasClipboard)}
	<div
		class="context-menu fixed z-[100] min-w-[180px] rounded-md border border-border bg-popover p-1 shadow-lg"
		style="left: {position.x}px; top: {position.y}px;"
		onclick={(e) => e.stopPropagation()}
		onkeydown={(e) => e.key === 'Escape' && hide()}
		oncontextmenu={(e) => e.preventDefault()}
		role="menu"
		tabindex="-1"
	>
		<!-- Clipboard operations -->
		<button
			type="button"
			class="context-menu-item flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm {hasSelection
				? 'hover:bg-accent'
				: 'cursor-not-allowed opacity-50'}"
			onclick={handleCopy}
			disabled={!hasSelection}
		>
			<Copy class="h-4 w-4" />
			<span class="flex-1">Copier</span>
			<span class="text-xs text-muted-foreground">Ctrl+C</span>
		</button>

		<button
			type="button"
			class="context-menu-item flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm {hasSelection
				? 'hover:bg-accent'
				: 'cursor-not-allowed opacity-50'}"
			onclick={handleCut}
			disabled={!hasSelection}
		>
			<Scissors class="h-4 w-4" />
			<span class="flex-1">Couper</span>
			<span class="text-xs text-muted-foreground">Ctrl+X</span>
		</button>

		<button
			type="button"
			class="context-menu-item flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm {hasClipboard
				? 'hover:bg-accent'
				: 'cursor-not-allowed opacity-50'}"
			onclick={handlePaste}
			disabled={!hasClipboard}
		>
			<ClipboardPaste class="h-4 w-4" />
			<span class="flex-1">Coller</span>
			<span class="text-xs text-muted-foreground">Ctrl+V</span>
		</button>

		{#if hasSelection}
			<div class="my-1 h-px bg-border"></div>

			<!-- Z-Order operations -->
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
				<span>Arriere-plan</span>
			</button>

			<div class="my-1 h-px bg-border"></div>

			<button
				type="button"
				class="context-menu-item flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10"
				onclick={handleDelete}
			>
				<Trash2 class="h-4 w-4" />
				<span class="flex-1">Supprimer</span>
				<span class="text-xs text-muted-foreground">Suppr</span>
			</button>
		{/if}
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
