<script lang="ts">
	/**
	 * Recursion / call tree view — the whole recorded trace as a tidy top-down
	 * tree of calls (`f(args) → result`), laid out by elkjs (mrtree). Duplicate
	 * `(function, args)` subproblems are tinted (memoization insight), and the
	 * call active at the current scrubber step is highlighted.
	 */

	import { tick, onMount } from 'svelte';
	import { flip } from 'svelte/animate';
	import { fade } from 'svelte/transition';
	import type { DebugSnapshot } from '$lib/shared/python/debug/types';
	import { cn } from '$lib/utils';
	import {
		parseVariableValue,
		isHeapRef,
		formatInline,
		colorForHeapId,
		shortHeapId
	} from './heap-utils';
	import { buildCallTree, pruneTree, type CallTreeNode } from './call-tree';
	import {
		flattenTree,
		layoutCallTree,
		type CallTreeLayout,
		type TreeLaidOutNode
	} from './call-tree-layout';
	import type { ElkLike, SizeMap } from './diagram-layout';

	interface Props {
		trace: DebugSnapshot[];
		/** Current scrubber step, to highlight the active call. */
		currentStepIndex?: number;
	}

	let { trace, currentStepIndex = 0 }: Props = $props();

	const PADDING = 20;

	let reducedMotion = $state(false);
	let flipDuration = $derived(reducedMotion ? 0 : 300);
	onMount(() => {
		const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
		reducedMotion = mq.matches;
		const handler = (e: MediaQueryListEvent) => (reducedMotion = e.matches);
		mq.addEventListener('change', handler);
		return () => mq.removeEventListener('change', handler);
	});

	// The tree BUILDS UP as the scrubber advances: only calls started by the
	// current step are shown, and a call's return value appears once it unwinds.
	let fullTree = $derived(buildCallTree(trace));
	let tree = $derived(pruneTree(fullTree, currentStepIndex));
	let nodes = $derived(flattenTree(tree));
	let nodeById = $derived(new Map(nodes.map((n) => [n.id, n])));

	function nodeKey(n: CallTreeNode): string {
		return n.functionName + '(' + n.args.map((a) => a.value).join(',') + ')';
	}

	// Duplicate (function, args) pairs → tint (teaches memoization).
	let dupKeys = $derived.by(() => {
		const counts = new Map<string, number>();
		for (const n of nodes) {
			const k = nodeKey(n);
			counts.set(k, (counts.get(k) ?? 0) + 1);
		}
		return new Set([...counts].filter(([, c]) => c > 1).map(([k]) => k));
	});

	let layout = $state<CallTreeLayout | null>(null);
	let cardEls: Record<string, HTMLElement | undefined> = {};

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

	async function runLayout(t: typeof tree): Promise<void> {
		if (t.length === 0) {
			layout = { nodes: [], edges: [], width: 0, height: 0 };
			return;
		}
		await tick();
		const sizes: SizeMap = {};
		for (const n of flattenTree(t)) {
			const el = cardEls[n.id];
			if (el) sizes[n.id] = { width: el.offsetWidth, height: el.offsetHeight };
		}
		try {
			const elk = await getElk();
			const result = await layoutCallTree(t, sizes, elk);
			if (tree === t) layout = result;
		} catch (err) {
			console.error('[RecursionTreeView] layout failed:', err);
		}
	}

	$effect(() => {
		const t = tree;
		void runLayout(t);
	});

	let canvasW = $derived((layout?.width ?? 0) + PADDING * 2);
	let canvasH = $derived((layout?.height ?? 0) + PADDING * 2);

	// Positioned nodes paired with their tree node (animate:flip needs the card to
	// be the only child of the keyed each, so we filter here rather than inline).
	let positioned = $derived(
		(layout?.nodes ?? [])
			.map((ln) => ({ ln, node: nodeById.get(ln.id) }))
			.filter((p): p is { ln: TreeLaidOutNode; node: CallTreeNode } => p.node !== undefined)
	);

	// A call is "active" at the current step if the step lies within [call, return].
	function isActive(n: CallTreeNode): boolean {
		if (currentStepIndex < n.callStepIndex) return false;
		if (n.returnStepIndex === undefined) return true;
		return currentStepIndex <= n.returnStepIndex;
	}

	function formatArg(value: string): string {
		const parsed = parseVariableValue(value);
		if (!parsed) return value;
		if (isHeapRef(parsed)) return shortHeapId(parsed.objectId);
		return formatInline(parsed);
	}
	function argsLabel(n: CallTreeNode): string {
		return n.args.map((a) => formatArg(a.value)).join(', ');
	}
</script>

{#snippet nodeCard(n: CallTreeNode)}
	{@const active = isActive(n)}
	{@const tint = dupKeys.has(nodeKey(n)) ? colorForHeapId(nodeKey(n)) : null}
	<div
		class={cn(
			'rounded-lg border bg-card px-3 py-1.5 font-mono text-sm whitespace-nowrap',
			tint?.bg,
			tint?.dark,
			active && 'ring-2 ring-primary'
		)}
	>
		<span class="font-semibold text-foreground">{n.functionName}</span>(<span>{argsLabel(n)}</span>)
		{#if n.raisedException}
			<span class="text-red-500">✗ exception</span>
		{:else if n.returnValue !== undefined}
			<span class="text-muted-foreground">→</span>
			<span class="text-foreground">{n.returnValue}</span>
		{:else}
			<span class="text-muted-foreground">…</span>
		{/if}
	</div>
{/snippet}

<div class="relative h-full overflow-auto" role="region" aria-label="Arbre des appels">
	{#if tree.length === 0}
		<div class="flex h-full items-center justify-center">
			<p class="text-sm text-muted-foreground italic">Aucun appel de fonction dans cette trace.</p>
		</div>
	{:else}
		<!-- Measuring layer (hidden, natural size) -->
		<div class="invisible absolute top-0 left-0" aria-hidden="true">
			{#each nodes as n (n.id)}
				<div bind:this={cardEls[n.id]} class="absolute top-0 left-0">{@render nodeCard(n)}</div>
			{/each}
		</div>

		{#if layout}
			<div class="relative" style="width: {canvasW}px; height: {canvasH}px;">
				<svg
					class="pointer-events-none absolute z-0"
					style="left: {PADDING}px; top: {PADDING}px;"
					width={layout.width}
					height={layout.height}
					aria-hidden="true"
					xmlns="http://www.w3.org/2000/svg"
				>
					{#each layout.edges as edge (edge.id)}
						<polyline
							points={edge.points.map((p) => `${p.x},${p.y}`).join(' ')}
							class="fill-none stroke-current text-muted-foreground/60"
							stroke-width="1.5"
						/>
					{/each}
				</svg>

				{#each positioned as p (p.ln.id)}
					<div
						class="absolute z-10"
						style="left: {PADDING + p.ln.x}px; top: {PADDING + p.ln.y}px;"
						animate:flip={{ duration: flipDuration }}
						in:fade={{ duration: reducedMotion ? 0 : 150 }}
						out:fade={{ duration: reducedMotion ? 0 : 150 }}
					>
						{@render nodeCard(p.node)}
					</div>
				{/each}
			</div>
		{/if}
	{/if}
</div>
