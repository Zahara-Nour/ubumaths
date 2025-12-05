<script lang="ts">
	// Props
	let {
		onDrag,
		onDoubleClick
	}: {
		onDrag: (deltaX: number) => void;
		onDoubleClick?: () => void;
	} = $props();

	// State
	let isDragging = $state(false);
	let startX = $state(0);

	// Functions
	function handlePointerDown(e: PointerEvent) {
		isDragging = true;
		startX = e.clientX;
		(e.target as HTMLElement).setPointerCapture(e.pointerId);
	}

	function handlePointerMove(e: PointerEvent) {
		if (!isDragging) return;
		const deltaX = e.clientX - startX;
		startX = e.clientX;
		onDrag(deltaX);
	}

	function handlePointerUp(e: PointerEvent) {
		isDragging = false;
		(e.target as HTMLElement).releasePointerCapture(e.pointerId);
	}

	function handleDoubleClick() {
		onDoubleClick?.();
	}
</script>

<div
	class="splitter"
	class:dragging={isDragging}
	onpointerdown={handlePointerDown}
	onpointermove={handlePointerMove}
	onpointerup={handlePointerUp}
	ondblclick={handleDoubleClick}
	role="separator"
	aria-orientation="vertical"
	aria-label="Redimensionner les panneaux"
	tabindex="0"
></div>

<style>
	.splitter {
		width: 6px;
		cursor: ew-resize;
		background: hsl(var(--border));
		transition: background 0.15s;
		touch-action: none;
		flex-shrink: 0;
	}

	.splitter:hover,
	.splitter.dragging {
		background: hsl(var(--primary) / 0.5);
	}

	.splitter:focus-visible {
		outline: 2px solid hsl(var(--primary));
		outline-offset: -2px;
	}
</style>
