<script lang="ts">
	/**
	 * Memory Diagram View — Python Tutor-style visualization, laid out by elkjs.
	 *
	 * Pipeline: snapshot → `buildDiagramGraph` → measure each card (hidden layer)
	 * → `layoutDiagram` (ELK layered, orthogonal routing) → render cards at
	 * absolute positions with SVG polyline edges. Cards **slide** between steps
	 * (`animate:flip`) and fade in/out, giving object-constancy as the trace
	 * advances. If ELK fails, we fall back to the previous two-column rendering so
	 * the debugger never breaks.
	 *
	 * ELK runs in-thread via a lazy import for V1 (fast on these small graphs);
	 * moving it to a Web Worker is a follow-up (swap the `getElk` instance).
	 */

	import { tick, onMount } from 'svelte';
	import { flip } from 'svelte/animate';
	import { fade } from 'svelte/transition';
	import type { DebugStackFrame, HeapObject } from '$lib/shared/python/debug/types';
	import { cn } from '$lib/utils';
	import { colorForHeapId } from './heap-utils';
	import { buildDiagramGraph } from './diagram-graph';
	import { layoutDiagram, type DiagramLayout, type ElkLike, type SizeMap } from './diagram-layout';
	import FrameCard from './FrameCard.svelte';
	import HeapCard from './HeapCard.svelte';
	import FramesPanel from './FramesPanel.svelte';
	import HeapPanel from './HeapPanel.svelte';

	interface Props {
		callStack: DebugStackFrame[];
		heap: HeapObject[];
		class?: string;
	}

	let { callStack, heap, class: className }: Props = $props();

	const CANVAS_PADDING = 24;

	// Respect the user's motion preference (disable slide/fade when reduced).
	let reducedMotion = $state(false);
	let flipDuration = $derived(reducedMotion ? 0 : 300);
	let fadeDuration = $derived(reducedMotion ? 0 : 200);

	onMount(() => {
		const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
		reducedMotion = mq.matches;
		const handler = (e: MediaQueryListEvent) => (reducedMotion = e.matches);
		mq.addEventListener('change', handler);
		return () => mq.removeEventListener('change', handler);
	});

	// Cross-panel hover highlight.
	let hoveredObjectId = $state<string | null>(null);

	// Graph derived from the snapshot; heap lookup for card rendering.
	let graph = $derived(buildDiagramGraph(callStack, heap));
	let heapById = $derived(new Map(heap.map((o) => [o.id, o])));

	// Layout result + failure flag (→ fallback rendering).
	let layout = $state<DiagramLayout | null>(null);
	let failed = $state(false);

	// Card element refs (measuring layer), keyed by node id.
	let cardEls: Record<string, HTMLElement | undefined> = {};

	// Lazy in-thread ELK instance.
	let elkInstance: ElkLike | null = null;
	async function getElk(): Promise<ElkLike> {
		if (!elkInstance) {
			const mod = (await import('elkjs/lib/elk.bundled.js')) as unknown as {
				default: new () => ElkLike;
			};
			elkInstance = new mod.default();
		}
		return elkInstance;
	}

	async function runLayout(g: typeof graph): Promise<void> {
		if (g.nodes.length === 0) {
			layout = { nodes: [], edges: [], width: 0, height: 0 };
			failed = false;
			return;
		}
		// Wait for the measuring cards to render so we can size them.
		await tick();
		const sizes: SizeMap = {};
		for (const node of g.nodes) {
			const el = cardEls[node.id];
			if (el) sizes[node.id] = { width: el.offsetWidth, height: el.offsetHeight };
		}
		try {
			const elk = await getElk();
			const result = await layoutDiagram(g, sizes, elk);
			// Guard against a stale result if the snapshot changed while awaiting.
			if (graph === g) {
				layout = result;
				failed = false;
			}
		} catch (err) {
			console.error('[MemoryDiagramView] ELK layout failed, falling back:', err);
			failed = true;
		}
	}

	// Re-layout whenever the graph (snapshot) changes.
	$effect(() => {
		const g = graph;
		void runLayout(g);
	});

	let canvasWidth = $derived((layout?.width ?? 0) + CANVAS_PADDING * 2);
	let canvasHeight = $derived((layout?.height ?? 0) + CANVAS_PADDING * 2);

	function handleVariableHover(objectId: string | null): void {
		hoveredObjectId = objectId;
	}
	function handleObjectHover(objectId: string | null): void {
		hoveredObjectId = objectId;
	}

	let isEmpty = $derived(heap.length === 0 && callStack.every((f) => f.locals.length === 0));
</script>

{#snippet cardFor(node: { kind: 'frame' | 'heap'; frameIndex?: number; objectId?: string })}
	{#if node.kind === 'frame' && node.frameIndex !== undefined && callStack[node.frameIndex]}
		<FrameCard
			frame={callStack[node.frameIndex]}
			{hoveredObjectId}
			onVariableHover={handleVariableHover}
		/>
	{:else if node.kind === 'heap' && node.objectId && heapById.get(node.objectId)}
		<HeapCard
			obj={heapById.get(node.objectId)!}
			highlighted={hoveredObjectId === node.objectId}
			onHover={handleObjectHover}
		/>
	{/if}
{/snippet}

<div
	class={cn('relative h-full overflow-auto', className)}
	role="region"
	aria-label="Diagramme mémoire Python"
>
	{#if failed}
		<!-- Fallback: previous two-column rendering (ELK unavailable). -->
		<div class="grid min-h-full grid-cols-2 gap-12 p-4">
			<FramesPanel {callStack} {hoveredObjectId} onVariableHover={handleVariableHover} />
			<HeapPanel {heap} {hoveredObjectId} onObjectHover={handleObjectHover} />
		</div>
	{:else}
		<!-- Measuring layer: hidden cards rendered at natural size to size ELK nodes. -->
		<div class="invisible absolute top-0 left-0" aria-hidden="true">
			{#each graph.nodes as node (node.id)}
				<div bind:this={cardEls[node.id]} class="absolute top-0 left-0">
					{@render cardFor(node)}
				</div>
			{/each}
		</div>

		<!-- Visible layer: cards positioned by ELK, sliding between steps. -->
		{#if layout}
			<div class="relative" style="width: {canvasWidth}px; height: {canvasHeight}px;">
				<!-- Edges (orthogonal polylines from ELK) -->
				<svg
					class="pointer-events-none absolute z-10"
					style="left: {CANVAS_PADDING}px; top: {CANVAS_PADDING}px;"
					width={layout.width}
					height={layout.height}
					aria-hidden="true"
					xmlns="http://www.w3.org/2000/svg"
				>
					<defs>
						<marker
							id="elk-arrowhead"
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
					{#each layout.edges as edge (edge.id)}
						{@const color = colorForHeapId(edge.toObjectId)}
						{@const isHighlighted = hoveredObjectId === edge.toObjectId}
						<polyline
							points={edge.points.map((p) => `${p.x},${p.y}`).join(' ')}
							class={cn('fill-none', color.stroke)}
							style="color: currentColor"
							stroke-width={isHighlighted ? 2.5 : 1.5}
							marker-end="url(#elk-arrowhead)"
						/>
					{/each}
				</svg>

				<!-- Node cards, absolutely positioned per ELK layout -->
				{#each layout.nodes as ln (ln.id)}
					<div
						class="absolute"
						style="left: {CANVAS_PADDING + ln.x}px; top: {CANVAS_PADDING + ln.y}px;"
						animate:flip={{ duration: flipDuration }}
						in:fade={{ duration: fadeDuration }}
						out:fade={{ duration: fadeDuration }}
					>
						{@render cardFor(ln)}
					</div>
				{/each}
			</div>
		{/if}
	{/if}

	{#if isEmpty}
		<div class="absolute inset-0 flex items-center justify-center">
			<p class="text-sm text-muted-foreground italic">
				Aucune variable, aucun objet. Lancez le débogueur pour voir le diagramme.
			</p>
		</div>
	{/if}
</div>
