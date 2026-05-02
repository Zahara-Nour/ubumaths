<script lang="ts">
	/**
	 * Memory Diagram View — Python Tutor-style visualization.
	 *
	 * Layout: Frames on the left, Heap on the right, with cubic-Bezier SVG
	 * arrows drawn from each variable bound to a heap object to its target
	 * card. Aliases (e.g. `b = a`) naturally show two arrows landing on the
	 * same card.
	 *
	 * The arrow geometry is recomputed on snapshot change, container resize
	 * (ResizeObserver), and internal scroll. Each objectId gets a stable
	 * color from `colorForHeapId`, shared with FramesPanel and HeapPanel.
	 */

	import type { DebugStackFrame, HeapObject } from '$lib/shared/python/debug/types';
	import { cn } from '$lib/utils';
	import { colorForHeapId } from './heap-utils';
	import FramesPanel from './FramesPanel.svelte';
	import HeapPanel from './HeapPanel.svelte';

	interface Props {
		callStack: DebugStackFrame[];
		heap: HeapObject[];
		class?: string;
	}

	let { callStack, heap, class: className }: Props = $props();

	// Hover state lives here so it can highlight on both sides.
	let hoveredObjectId = $state<string | null>(null);

	// DOM refs for geometry computation
	let containerEl: HTMLDivElement | null = $state(null);
	let framesEl: HTMLDivElement | null = $state(null);
	let heapEl: HTMLDivElement | null = $state(null);

	interface Arrow {
		key: string;
		fromObjectId: string;
		path: string;
		strokeClass: string;
		strokeWidth: number;
	}

	let arrows = $state<Arrow[]>([]);
	// Snapshot key: changes when the snapshot meaningfully changes (callStack
	// shape, heap shape). Used as a $effect dependency to trigger a recompute.
	let snapshotKey = $derived(
		callStack.map((f) => `${f.functionName}:${f.locals.length}`).join('|') +
			'#' +
			heap.map((o) => `${o.id}:${o.length}`).join(',')
	);

	function computeArrows(): void {
		if (!containerEl || !framesEl || !heapEl) {
			arrows = [];
			return;
		}

		const containerRect = containerEl.getBoundingClientRect();

		// Map each heap object id to its left-anchor point (left edge, vertical center).
		const heapAnchors = new Map<string, { x: number; y: number }>();
		const heapCards = heapEl.querySelectorAll<HTMLElement>('[data-heap-id]');
		for (const card of heapCards) {
			const id = card.dataset.heapId;
			if (!id) continue;
			const r = card.getBoundingClientRect();
			heapAnchors.set(id, {
				x: r.left - containerRect.left,
				y: r.top - containerRect.top + r.height / 2
			});
		}

		// For each variable bound to a heap object, compute right-anchor.
		const newArrows: Arrow[] = [];
		const refButtons = framesEl.querySelectorAll<HTMLElement>('[data-heap-ref]');
		let arrowIndex = 0;
		for (const btn of refButtons) {
			const objectId = btn.dataset.heapRef;
			if (!objectId) continue;
			const target = heapAnchors.get(objectId);
			if (!target) continue;

			const r = btn.getBoundingClientRect();
			const sx = r.right - containerRect.left;
			const sy = r.top - containerRect.top + r.height / 2;

			// Cubic bezier with horizontal control points so the curve flows
			// nicely between the two columns regardless of vertical distance.
			const dx = target.x - sx;
			const cx1 = sx + Math.max(40, dx * 0.4);
			const cx2 = target.x - Math.max(40, dx * 0.4);
			const path = `M ${sx} ${sy} C ${cx1} ${sy}, ${cx2} ${target.y}, ${target.x} ${target.y}`;

			const color = colorForHeapId(objectId);
			const isHighlighted = hoveredObjectId === objectId;

			newArrows.push({
				key: `${objectId}-${arrowIndex++}-${btn.dataset.frameVar ?? ''}`,
				fromObjectId: objectId,
				path,
				strokeClass: color.stroke,
				strokeWidth: isHighlighted ? 2.5 : 1.5
			});
		}

		arrows = newArrows;
	}

	let resizeObserver: ResizeObserver | null = null;
	let rafId: number | null = null;

	function scheduleRecompute(): void {
		if (rafId !== null) return;
		rafId = requestAnimationFrame(() => {
			rafId = null;
			computeArrows();
		});
	}

	$effect(() => {
		// Re-run whenever the snapshot shape changes or the hover changes
		// (hover only affects stroke width, but we keep both in one pass for
		// simplicity).
		void snapshotKey;
		void hoveredObjectId;
		scheduleRecompute();
	});

	$effect(() => {
		if (!containerEl) return;

		resizeObserver = new ResizeObserver(() => scheduleRecompute());
		resizeObserver.observe(containerEl);

		const onScroll = () => scheduleRecompute();
		containerEl.addEventListener('scroll', onScroll, { passive: true });

		// Recompute once after mount to grab initial positions.
		scheduleRecompute();

		return () => {
			resizeObserver?.disconnect();
			resizeObserver = null;
			containerEl?.removeEventListener('scroll', onScroll);
			if (rafId !== null) {
				cancelAnimationFrame(rafId);
				rafId = null;
			}
		};
	});

	function handleVariableHover(objectId: string | null): void {
		hoveredObjectId = objectId;
	}

	function handleObjectHover(objectId: string | null): void {
		hoveredObjectId = objectId;
	}
</script>

<div
	bind:this={containerEl}
	class={cn('relative h-full overflow-auto', className)}
	role="region"
	aria-label="Diagramme mémoire Python"
>
	<!-- SVG overlay with arrows. pointer-events-none so it never steals
	     hovers from the panels. -->
	<svg
		class="pointer-events-none absolute inset-0 z-10 h-full w-full"
		aria-hidden="true"
		xmlns="http://www.w3.org/2000/svg"
	>
		<defs>
			<!-- Generic arrowhead. We tint via the parent <path> currentColor
			     to keep marker definitions to a minimum. -->
			<marker
				id="heap-arrowhead"
				viewBox="0 0 10 10"
				refX="9"
				refY="5"
				markerWidth="6"
				markerHeight="6"
				orient="auto-start-reverse"
			>
				<path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
			</marker>
		</defs>
		{#each arrows as arrow (arrow.key)}
			<path
				d={arrow.path}
				class={cn('fill-none transition-[stroke-width]', arrow.strokeClass)}
				style="color: currentColor"
				stroke-width={arrow.strokeWidth}
				marker-end="url(#heap-arrowhead)"
			/>
		{/each}
	</svg>

	<!-- The two columns -->
	<div class="grid min-h-full grid-cols-2 gap-12 p-4">
		<div bind:this={framesEl}>
			<FramesPanel {callStack} {hoveredObjectId} onVariableHover={handleVariableHover} />
		</div>
		<div bind:this={heapEl}>
			<HeapPanel {heap} {hoveredObjectId} onObjectHover={handleObjectHover} />
		</div>
	</div>

	{#if heap.length === 0 && callStack.every((f) => f.locals.length === 0)}
		<div class="absolute inset-0 flex items-center justify-center">
			<p class="text-sm text-muted-foreground italic">
				Aucune variable, aucun objet. Lancez le débogueur pour voir le diagramme.
			</p>
		</div>
	{/if}
</div>
