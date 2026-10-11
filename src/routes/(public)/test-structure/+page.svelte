<!--
	Page de démonstration : la structure d'une expression au survol
	================================================================

	Reprend l'idée d'Algebria (David, Sésamath) : en promenant la souris sur une
	expression, on voit encadré le plus petit « morceau » sous le pointeur
	(nombre, terme, facteur, parenthèses, somme…). Sur un écran tactile, un toucher
	encadre, un nouveau toucher dans le cadre remonte d'un niveau.

	L'arbre vient de `$lib/mathAST/structure` (intitulés : `structure-latex.ts`) ; MathLive affiche des
	marqueurs `\class` sans effet sur le rendu ; l'encadré est dessiné PAR-DESSUS,
	à partir de la position réelle des caractères (pas de `\enclose`) : la formule
	ne bouge jamais.
-->
<script lang="ts">
	import '$lib/utils/mathlive-styles';
	import 'mathlive';
	import type { MathfieldElement } from 'mathlive';
	import { Button } from '$lib/components/ui/button';
	import MyCheckbox from '$lib/components/MyCheckbox.svelte';
	import { demoStructure, markerId, MARKER_PREFIX, type StructureInfo } from './structure-latex';

	// Types
	interface Example {
		label: string;
		latex: string;
	}

	interface Frame {
		/** Par niveau : l'encadré glisse d'un nœud à l'autre au lieu de réapparaître */
		key: string;
		left: number;
		top: number;
		width: number;
		height: number;
		/** 0 : nœud survolé ; 1, 2… : ses ancêtres */
		level: number;
	}

	// Constantes
	const EXAMPLES: Example[] = [
		{ label: 'Article Sésamath', latex: String.raw`\left(\sqrt{3}+6a\right)\times\frac{2}{7}` },
		{ label: 'Priorités', latex: String.raw`2+3\times4` },
		{ label: 'Somme algébrique', latex: '5-3+x' },
		{ label: 'Différence', latex: '2x-(3-x)' },
		{ label: 'Puissance', latex: '3(x+2)^2' },
		{ label: 'Fractions', latex: String.raw`\frac{2x+1}{3}-\frac{x}{2}` },
		{ label: 'Équation', latex: '2x+3=7' },
		{ label: 'Relatifs', latex: String.raw`-4\times(5-x)^2+1` },
		{ label: 'Racine', latex: String.raw`\sqrt{x^2+1}` }
	];
	/** Marge entre le contenu et le cadre du nœud survolé, puis en plus par niveau */
	const PADDING = 4;
	const PADDING_STEP = 5;
	/** Un nombre ou une lettre seuls : marge horizontale réduite (`6a` est serré) */
	const LEAF_PADDING_X = 1;

	// Variables
	let latex = $state(EXAMPLES[0].latex);
	let frameLeaves = $state(true);
	let showAncestors = $state(false);
	let selectedId = $state<number | null>(null);
	let frames = $state<Frame[]>([]);
	let stage = $state<HTMLDivElement>();
	let mathfield = $state<MathfieldElement>();
	/** Zones mesurées des nœuds (pas d'état réactif : un cache de mesures) */
	let rectCache: { latex: string; rects: Map<number, DOMRect> } | null = null;

	// Le signe « − » appartient à la somme (décision Q2) : plus d'option
	const result = $derived(demoStructure(latex));
	const structure = $derived(result.status === 'ok' ? result.structure : null);
	const selected = $derived(
		structure && selectedId !== null ? (structure.nodes[selectedId] ?? null) : null
	);
	const chain = $derived(selected && structure ? ancestorsOf(selected, structure.nodes) : []);

	// Fonctions
	function ancestorsOf(node: StructureInfo, nodes: readonly StructureInfo[]): StructureInfo[] {
		const result = [node];
		let current = node;
		while (current.parent !== null) {
			current = nodes[current.parent];
			result.push(current);
		}
		return result;
	}

	/**
	 * Zone occupée par chaque nœud, relative à la scène. Mesurée à la demande et
	 * gardée tant que l'expression ne change pas : relative à la scène, elle ne
	 * dépend pas du défilement.
	 */
	function nodeRects(): Map<number, DOMRect> {
		if (rectCache && structure && rectCache.latex === structure.latex) return rectCache.rects;
		const rects = new Map<number, DOMRect>();
		const root = stage?.querySelector('math-span')?.shadowRoot;
		if (!root || !stage || !structure) return rects;
		const origin = stage.getBoundingClientRect();
		for (const element of root.querySelectorAll(`[class*="${MARKER_PREFIX}"]`)) {
			const id = markerId(element);
			const rect = id === null ? null : contentRect(element);
			if (id === null || !rect) continue;
			rects.set(
				id,
				new DOMRect(rect.left - origin.left, rect.top - origin.top, rect.width, rect.height)
			);
		}
		rectCache = { latex: structure.latex, rects };
		return rects;
	}

	/**
	 * Plus petit nœud sous le pointeur : le plus profond dont la zone contient le
	 * point. Pas l'élément sous le pointeur : dans une fraction, MathLive empile
	 * numérateur et dénominateur avec des boîtes absolues qui se chevauchent.
	 */
	function nodeUnderPointer(event: PointerEvent): number | null {
		if (!stage || !structure) return null;
		const origin = stage.getBoundingClientRect();
		const x = event.clientX - origin.left;
		const y = event.clientY - origin.top;
		let best: { id: number; depth: number; area: number } | null = null;
		for (const [id, r] of nodeRects()) {
			if (x < r.left || x > r.right || y < r.top || y > r.bottom) continue;
			const depth = ancestorsOf(structure.nodes[id], structure.nodes).length;
			const area = r.width * r.height;
			if (!best || depth > best.depth || (depth === best.depth && area < best.area)) {
				best = { id, depth, area };
			}
		}
		return best?.id ?? null;
	}

	function invalidateRects() {
		// Polices chargées, fenêtre redimensionnée : les zones sont à remesurer
		rectCache = null;
	}

	/** Un nombre ou une lettre seuls ne s'encadrent pas si le réglage est décoché */
	function frameable(id: number | null): number | null {
		if (id === null || !structure) return null;
		const node = structure.nodes[id];
		if (!frameLeaves && node.isLeaf && node.parent !== null) return node.parent;
		return id;
	}

	/** Rectangle réellement occupé par les caractères et traits d'un nœud */
	function contentRect(element: Element): DOMRect | null {
		const rects: DOMRect[] = [];
		const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
		const range = document.createRange();
		while (walker.nextNode()) {
			if (!walker.currentNode.textContent?.trim()) continue;
			range.selectNodeContents(walker.currentNode);
			rects.push(...Array.from(range.getClientRects()));
		}
		for (const line of element.querySelectorAll('svg, .ML__frac-line')) {
			rects.push(line.getBoundingClientRect());
		}
		const visible = rects.filter((r) => r.width > 0 || r.height > 0);
		if (visible.length === 0) return null;
		const left = Math.min(...visible.map((r) => r.left));
		const top = Math.min(...visible.map((r) => r.top));
		const right = Math.max(...visible.map((r) => r.right));
		const bottom = Math.max(...visible.map((r) => r.bottom));
		return new DOMRect(left, top, right - left, bottom - top);
	}

	function computeFrames(id: number | null): Frame[] {
		if (id === null || !structure) return [];
		const rects = nodeRects();
		const ids = showAncestors
			? ancestorsOf(structure.nodes[id], structure.nodes).map((n) => n.id)
			: [id];
		const result: Frame[] = [];
		ids.forEach((nodeId, level) => {
			const rect = rects.get(nodeId);
			if (!rect) return;
			const pad = PADDING + level * PADDING_STEP;
			const padX = level === 0 && structure.nodes[nodeId].isLeaf ? LEAF_PADDING_X : pad;
			result.push({
				key: `niveau-${level}`,
				left: rect.left - padX,
				top: rect.top - pad,
				width: rect.width + 2 * padX,
				height: rect.height + 2 * pad,
				level
			});
		});
		return result;
	}

	function select(id: number | null) {
		selectedId = id;
		frames = computeFrames(id);
	}

	function handlePointerMove(event: PointerEvent) {
		if (event.pointerType !== 'mouse') return;
		const id = frameable(nodeUnderPointer(event));
		if (id !== selectedId) select(id);
	}

	function handlePointerLeave(event: PointerEvent) {
		if (event.pointerType === 'mouse') select(null);
	}

	/** Tactile : un toucher encadre ; un nouveau toucher dans le cadre remonte d'un niveau */
	function handlePointerDown(event: PointerEvent) {
		if (event.pointerType === 'mouse' || !structure) return;
		const touched = frameable(nodeUnderPointer(event));
		if (touched === null) return select(null);
		if (selectedId !== null) {
			const insideSelection = ancestorsOf(structure.nodes[touched], structure.nodes).some(
				(n) => n.id === selectedId
			);
			if (insideSelection) return select(structure.nodes[selectedId].parent ?? selectedId);
		}
		select(touched);
	}

	function loadExample(example: Example) {
		latex = example.latex;
		if (mathfield) mathfield.value = example.latex;
		select(null);
	}

	function handleOptionChange() {
		// Le réglage change ce qui s'encadre : l'encadré est à recalculer
		select(null);
	}

	function initMathfield(element: MathfieldElement) {
		mathfield = element;
		element.value = latex;
		const update = () => {
			latex = element.value;
			select(null);
		};
		element.addEventListener('input', update);
		// Action plutôt qu'attachment : prettier-plugin-svelte 3.3 ne lit pas `{@attach}`
		return { destroy: () => element.removeEventListener('input', update) };
	}
</script>

<svelte:window onresize={invalidateRects} />

<svelte:head>
	<title>Structure d'une expression</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="mx-auto max-w-4xl space-y-6 px-4 py-8">
	<header class="space-y-2">
		<h1 class="text-2xl font-bold">La structure d'une expression</h1>
		<p class="text-muted-foreground">
			Promenez la souris sur l'expression : le plus petit « morceau » sous le pointeur est encadré
			(nombre, terme, facteur, parenthèses…). Sur un écran tactile, touchez l'expression, puis
			touchez à nouveau dans le cadre pour remonter d'un niveau.
		</p>
	</header>

	<section class="space-y-3">
		<div class="space-y-1">
			<span id="structure-input-label" class="text-sm font-medium">Expression</span>
			<math-field use:initMathfield aria-labelledby="structure-input-label" class="structure-input"
			></math-field>
		</div>
		<div class="flex flex-wrap gap-2">
			{#each EXAMPLES as example (example.label)}
				<Button variant="outline" size="sm" onclick={() => loadExample(example)}>
					{example.label}
				</Button>
			{/each}
		</div>
		<div class="flex flex-wrap gap-x-6 gap-y-2">
			<MyCheckbox
				bind:checked={frameLeaves}
				onCheckedChange={handleOptionChange}
				label="Encadrer aussi un nombre ou une lettre seuls"
			/>
			<MyCheckbox
				bind:checked={showAncestors}
				onCheckedChange={handleOptionChange}
				label="Montrer aussi les niveaux englobants"
			/>
		</div>
	</section>

	{#if structure}
		<div
			bind:this={stage}
			class="structure-stage"
			role="application"
			aria-label="Expression à explorer"
			onpointerenter={invalidateRects}
			onpointermove={handlePointerMove}
			onpointerleave={handlePointerLeave}
			onpointerdown={handlePointerDown}
		>
			{#key structure.latex}
				<math-span class="structure-math">{structure.latex}</math-span>
			{/key}
			{#each frames as frame (frame.key)}
				<div
					class="structure-frame"
					class:ancestor={frame.level > 0}
					style:left="{frame.left}px"
					style:top="{frame.top}px"
					style:width="{frame.width}px"
					style:height="{frame.height}px"
					style:opacity={frame.level === 0 ? 1 : Math.max(0.25, 0.7 - 0.15 * frame.level)}
				></div>
			{/each}
		</div>

		<div class="structure-info" aria-live="polite">
			{#if selected}
				<!-- Des div, pas des p : `main p` impose sa taille de police (!important) -->
				<div class="text-lg font-semibold">
					{selected.label}
					{#if selected.role}
						<span class="font-normal text-muted-foreground">— {selected.role}</span>
					{/if}
				</div>
				<div class="selected-math"><math-span>{selected.latex}</math-span></div>
				<ol class="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
					{#each [...chain].reverse() as node, i (node.id)}
						<li>
							{#if i > 0}<span aria-hidden="true">›</span>{/if}
							<span class:font-semibold={node.id === selected.id}>{node.label}</span>
						</li>
					{/each}
				</ol>
			{:else}
				<p class="text-muted-foreground">Survolez l'expression.</p>
			{/if}
		</div>
	{:else if result.status === 'unrecognized'}
		<p class="text-muted-foreground">Expression non reconnue ou incomplète.</p>
	{/if}
</div>

<style>
	.structure-input {
		width: 100%;
		font-size: 1.5rem;
		padding: 0.25rem 0.5rem;
	}

	.structure-stage {
		position: relative;
		padding: 2.5rem 1.5rem;
		border-radius: 0.75rem;
		background: var(--color-muted);
		font-size: 2.75rem;
		text-align: center;
		touch-action: manipulation;
		overflow-x: auto;
	}

	.structure-frame {
		position: absolute;
		pointer-events: none;
		border: 2px dashed light-dark(var(--color-amber-600, #d97706), var(--color-amber-400, #fbbf24));
		border-radius: 0.5rem;
		background: light-dark(rgb(251 191 36 / 0.12), rgb(251 191 36 / 0.1));
		transition:
			left 80ms ease-out,
			top 80ms ease-out,
			width 80ms ease-out,
			height 80ms ease-out;
	}

	.structure-frame.ancestor {
		border-style: dotted;
		border-color: var(--color-muted-foreground);
		background: transparent;
	}

	@media (prefers-reduced-motion: reduce) {
		.structure-frame {
			transition: none;
		}
	}

	.structure-info {
		min-height: 7rem;
	}

	.selected-math {
		font-size: 1.5rem;
	}
</style>
