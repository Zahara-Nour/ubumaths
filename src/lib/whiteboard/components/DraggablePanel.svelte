<script lang="ts">
	/**
	 * DraggablePanel - A reusable draggable panel container
	 *
	 * Features:
	 * - Draggable by header
	 * - Saves position to localStorage
	 * - Double-click header to reset position
	 * - Close button
	 */

	import { GripVertical, X } from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button';
	import type { Snippet } from 'svelte';

	// ==========================================================================
	// Props
	// ==========================================================================

	interface Props {
		/** Panel title */
		title: string;
		/** Whether the panel is open */
		open: boolean;
		/** Callback when panel is closed */
		onclose: () => void;
		/** LocalStorage key for saving position */
		storageKey: string;
		/** Initial position (default: center-right) */
		initialPosition?: { x: number; y: number };
		/** Panel content */
		children: Snippet;
		/** Optional class for styling */
		class?: string;
	}

	let {
		title,
		open,
		onclose,
		storageKey,
		initialPosition = { x: -20, y: 100 },
		children,
		class: className = ''
	}: Props = $props();

	// ==========================================================================
	// State
	// ==========================================================================

	let position = $state({ ...initialPosition });
	let isDragging = $state(false);
	let dragStart = $state({ x: 0, y: 0 });
	let hasCustomPosition = $state(false);

	// ==========================================================================
	// Lifecycle
	// ==========================================================================

	// Load saved position on mount and cleanup on destroy
	$effect(() => {
		const saved = localStorage.getItem(storageKey);
		if (saved) {
			try {
				const pos = JSON.parse(saved);
				if (typeof pos.x === 'number' && typeof pos.y === 'number') {
					position = pos;
					hasCustomPosition = true;
				}
			} catch {
				// Ignore parse errors
			}
		}

		// Cleanup on destroy
		return () => {
			if (isDragging) {
				window.removeEventListener('pointermove', handleDragMove);
				window.removeEventListener('pointerup', handleDragEnd);
			}
		};
	});

	// ==========================================================================
	// Drag Handlers
	// ==========================================================================

	function handleDragStart(e: PointerEvent) {
		e.preventDefault();
		isDragging = true;
		dragStart = {
			x: e.clientX - position.x,
			y: e.clientY - position.y
		};
		// Attach move and end handlers to window for reliable tracking
		window.addEventListener('pointermove', handleDragMove);
		window.addEventListener('pointerup', handleDragEnd);
	}

	function handleDragMove(e: PointerEvent) {
		if (!isDragging) return;

		position = {
			x: e.clientX - dragStart.x,
			y: e.clientY - dragStart.y
		};
		hasCustomPosition = true;
	}

	function handleDragEnd() {
		if (isDragging) {
			isDragging = false;
			// Remove window listeners
			window.removeEventListener('pointermove', handleDragMove);
			window.removeEventListener('pointerup', handleDragEnd);
			// Save position to localStorage
			if (hasCustomPosition) {
				localStorage.setItem(storageKey, JSON.stringify(position));
			}
		}
	}

	function handleDoubleClick() {
		// Reset to initial position
		position = { ...initialPosition };
		hasCustomPosition = false;
		localStorage.removeItem(storageKey);
	}

	function handleClose() {
		onclose();
	}
</script>

{#if open}
	<div
		class="draggable-panel fixed z-50 flex flex-col rounded-lg border border-border bg-background/95 shadow-lg backdrop-blur-sm {className}"
		class:transition-transform={!isDragging}
		style="right: {-position.x}px; top: {position.y}px;"
	>
		<!-- Header (draggable) -->
		<div
			class="flex cursor-grab items-center justify-between gap-2 border-b border-border px-3 py-2 active:cursor-grabbing"
			onpointerdown={handleDragStart}
			ondblclick={handleDoubleClick}
		>
			<div class="flex items-center gap-2">
				<GripVertical class="h-4 w-4 text-muted-foreground" />
				<span class="text-sm font-medium">{title}</span>
			</div>
			<Button
				type="button"
				variant="ghost"
				size="sm"
				onclick={handleClose}
				title="Fermer"
				aria-label="Fermer"
				class="h-6 w-6 p-0"
			>
				<X class="h-4 w-4" />
			</Button>
		</div>

		<!-- Content -->
		<div class="p-3">
			{@render children()}
		</div>
	</div>
{/if}
