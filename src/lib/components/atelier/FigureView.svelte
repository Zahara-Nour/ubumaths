<script lang="ts">
	/**
	 * La vue Géométrie (géométrie v2, lot 1 ; onglet « Géométrie » depuis la Q5
	 * révisée, identifiants `Figure*` gardés) : les points, les courbes et les
	 * fonctions affichées (𝒞f, K1) de l'atelier dans un repère orthonormé
	 * (`GeometryCanvas` de `geometry-core`).
	 *
	 * ⚠️ Une PROJECTION (invariant 1) : la vue ne détient aucun état de modèle.
	 * Elle lit l'atelier par `useAtelier()` et le reflète par `syncFigure`, à
	 * sens unique. Le glisser d'un point (lot 3, M1) ne la contredit pas : la
	 * toile le DÉLÈGUE (`pointDrag`), l'atelier réécrit la définition du point et
	 * la figure suit, comme pour un curseur. Une étape par glisser (M7).
	 *
	 * La barre d'outils (lot 3, PR 2) suit le même principe : un outil ÉCRIT la
	 * ligne qu'on aurait tapée (`write`, la console), il ne crée rien lui-même.
	 * Sans `write` (vue montée hors d'un atelier complet), pas de barre.
	 *
	 * Le repère est orthonormé par construction (F2) : la toile n'a qu'un
	 * `pixelsPerUnit`, jamais un par axe — c'est ce qui garde le cercle rond, et
	 * la raison de ne pas fusionner avec le grapheur (décision figée n° 3).
	 */
	import { useAtelier } from '$lib/atelier/context';
	import { AtelierFigure, syncFigure } from '$lib/atelier/figure-sync';
	import {
		FIGURE_TOOLS,
		FigureToolbox,
		type FigureTool,
		type ToolWriter
	} from '$lib/atelier/figure-tools.svelte';
	import { displayName } from '$lib/atelier/names';
	import { isFigureObject, isFunction } from '$lib/atelier/types';
	import { geoToNumber } from '$lib/geometry-core/compute/to-number';
	import type { Viewport } from '$lib/geometry-core/viewport/types';
	import { createTransformer } from '$lib/geometry-core/viewport/viewport';
	import type { CanvasTool } from '$lib/components/geometry/canvas-tool';
	import GeometryCanvas from '$lib/components/geometry/GeometryCanvas.svelte';
	import type { PointDrag } from '$lib/components/geometry/point-drag';
	import MyCheckbox from '$lib/components/MyCheckbox.svelte';
	import { rovingToolbar } from './roving-toolbar';

	let {
		write
	}: {
		/** Écrire une ligne dans la console ; vrai si elle a réussi. Absent : pas de barre d'outils. */
		write?: ToolWriter;
	} = $props();

	/** Unités visibles sur le plus petit côté de la toile, à l'ouverture (de −6,5 à 6,5). */
	const UNITS_ACROSS = 13;

	/** Le pas des flèches sur le point choisi (M8) : 0,1, et 1 avec Maj. */
	const ARROW_STEP = 0.1;
	const ARROW_STEP_SHIFT = 1;

	/** Le déplacement de chaque flèche, en unités (y vers le haut). */
	const ARROWS: Readonly<Record<string, readonly [number, number]>> = {
		ArrowLeft: [-1, 0],
		ArrowRight: [1, 0],
		ArrowUp: [0, 1],
		ArrowDown: [0, -1]
	};

	const atelier = useAtelier();

	// La figure se refait depuis l'atelier : elle appartient à la vue, pas au modèle
	const projection = new AtelierFigure();

	syncFigure(atelier, projection);

	/** La figure montrée, et son numéro de version pour la toile. */
	let synced = $state.raw({ figure: projection.figure, version: projection.changes });

	// Comme `syncPlots` dans `AtelierContainer` : l'effet synchronise à chaque
	// révision. Il n'écrit `synced` que si la figure a changé, et ne lit pas ce
	// qu'il écrit ; `syncFigure` est idempotente — l'effet ne boucle pas. Glisser
	// un curseur ne refait pas la figure (`moveSlider`) : `changes` avance, et la
	// toile se redessine
	$effect(() => {
		void atelier.revision;
		if (syncFigure(atelier, projection) === 'unchanged') return;
		synced = { figure: projection.figure, version: projection.changes };
	});

	/** Le point saisi à la souris, pendant un glisser. */
	let held: string | null = null;
	/** Pourquoi le dernier point visé ne se glisse pas (M2) : dit sous la barre. */
	let refusal = $state<string | null>(null);

	/** Les refus du glisser, relus à chaque révision : la toile les demande à chaque dessin. */
	let refusals = new Map<string, string | null>();
	let refusalsRevision = -1;

	function refusalOf(name: string): string | null {
		if (refusalsRevision !== atelier.revision) {
			refusals = new Map();
			refusalsRevision = atelier.revision;
		}
		if (!refusals.has(name)) refusals.set(name, atelier.dragRefusal(name));
		return refusals.get(name) ?? null;
	}

	const pointDrag: PointDrag = {
		canGrab: (id) => {
			const name = projection.nameOf(id);
			return name !== undefined && refusalOf(name) === null;
		},
		grab: (id) => {
			const name = projection.nameOf(id);
			if (name === undefined) return false;
			refusal = refusalOf(name);
			if (refusal !== null) return false;
			held = name;
			chosenPoint = name;
			return true;
		},
		holds: (id) => held !== null && projection.nameOf(id) === held,
		move: (x, y, snap) => {
			if (held === null) return;
			const done = atelier.dragPoint(held, x, y, snap);
			if (!done.ok) refusal = done.message;
		},
		release: () => {
			held = null;
			// Un refus dit EN PLEIN geste (« ne peut pas se glisser ici ») ne survit pas au relâcher
			refusal = null;
			atelier.endGesture();
		}
	};

	// svelte-ignore state_referenced_locally
	const toolbox = write === undefined ? null : new FigureToolbox(atelier, write);

	/** Où est le pointeur pendant un outil (le fantôme le suit), ou `null`. */
	let pointer = $state<{ x: number; y: number } | null>(null);

	/** Le point que déplacent les flèches (M8) : le dernier saisi ou posé à la souris. */
	let chosenPoint = $state<string | null>(null);

	/** L'outil passé à la toile : aucun avec Déplacer, le glisser reprend la main. */
	const canvasTool: CanvasTool = {
		click: (x, y, pointId, snap) => {
			if (toolbox === null) return;
			const before = new Set(atelier.names);
			const point = pointId === null ? null : (projection.nameOf(pointId) ?? null);
			toolbox.click(x, y, point, snap);
			// Un point posé (outil Point, ou extrémité) devient le point des flèches
			const created = atelier.names.find((n) => !before.has(n) && atelier.get(n)?.kind === 'point');
			if (created !== undefined) chosenPoint = created;
			else if (point !== null) chosenPoint = point;
		},
		hover: (at) => {
			pointer = at;
		}
	};

	function chooseTool(tool: FigureTool) {
		toolbox?.select(tool);
	}

	/** Échap abandonne une construction commencée (M7). */
	function handleWindowKey(event: KeyboardEvent) {
		if (event.key !== 'Escape' || toolbox === null) return;
		if (toolbox.cancel()) event.preventDefault();
	}

	/** La position dessinée du point `name`, ou `null`. */
	function drawnPosition(name: string): { x: number; y: number } | null {
		const id = projection.elementOf(name);
		const p = id === undefined ? undefined : projection.figure.getPosition(id);
		return p ? { x: geoToNumber(p.x), y: geoToNumber(p.y) } : null;
	}

	/**
	 * M8 : les flèches déplacent le point choisi (pas de 0,1 ; Maj : 1), par le
	 * MÊME chemin que le glisser — une flèche tenue fait une seule étape.
	 */
	function handleArrow(event: KeyboardEvent) {
		const move = ARROWS[event.key];
		if (move === undefined || chosenPoint === null) return;
		if (atelier.get(chosenPoint) === undefined) {
			chosenPoint = null;
			return;
		}
		const at = drawnPosition(chosenPoint);
		if (at === null) return;
		event.preventDefault();
		const step = event.shiftKey ? ARROW_STEP_SHIFT : ARROW_STEP;
		const done = atelier.dragPoint(chosenPoint, at.x + move[0] * step, at.y + move[1] * step);
		refusal = done.ok ? null : done.message;
	}

	function handleArrowUp(event: KeyboardEvent) {
		if (ARROWS[event.key] !== undefined) atelier.endGesture();
	}

	/** Le fantôme de la construction en cours (M7) : du premier point au pointeur. */
	const ghost = $derived.by(() => {
		void synced;
		if (toolbox === null || pointer === null) return null;
		const [first] = toolbox.chosen;
		if (first === undefined || toolbox.tool === 'deplacer' || toolbox.tool === 'point') return null;
		const from = drawnPosition(first);
		return from === null ? null : { tool: toolbox.tool, from, to: pointer };
	});

	/** Le point choisi des flèches, entouré tant qu'il existe et se dessine. */
	const chosenAt = $derived.by(() => {
		void synced;
		return chosenPoint === null ? null : drawnPosition(chosenPoint);
	});

	/** Ce que dit la vue sous la barre : le refus, la remarque de l'outil, ou sa consigne. */
	const message = $derived(refusal ?? toolbox?.notice ?? toolbox?.instruction ?? '');

	/** La taille de la toile, mesurée : elle suit la largeur de l'écran (téléphone). */
	let width = $state(0);
	let height = $state(0);

	/**
	 * F1 : un atelier sans point, ni courbe, ni fonction affichée — la vue dit quoi
	 * écrire. Une fonction affichée ne compte que si elle se dessine (`ok`) : en
	 * attente ou en erreur, la vue resterait vide sans le dire (revue de la PR 3).
	 */
	const empty = $derived(
		!atelier.objects.some(
			(o) => isFigureObject(o) || (isFunction(o) && o.inFigure === true && o.status === 'ok')
		)
	);
</script>

<svelte:window onkeydown={handleWindowKey} />

{#snippet toolIcon(tool: FigureTool)}
	<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" class="icone">
		{#if tool === 'deplacer'}
			<path d="M5 3l14 8-6 1.5L10 19z" class="plein" />
		{:else if tool === 'point'}
			<circle cx="12" cy="12" r="3.5" class="plein" />
		{:else if tool === 'segment'}
			<line x1="5" y1="17" x2="19" y2="7" /><circle cx="5" cy="17" r="2.2" class="plein" /><circle
				cx="19"
				cy="7"
				r="2.2"
				class="plein"
			/>
		{:else if tool === 'droite'}
			<line x1="1" y1="20" x2="23" y2="4" /><circle cx="8" cy="15" r="2.2" class="plein" /><circle
				cx="16"
				cy="9.2"
				r="2.2"
				class="plein"
			/>
		{:else if tool === 'demi-droite'}
			<line x1="5" y1="17" x2="23" y2="4" /><circle cx="5" cy="17" r="2.2" class="plein" /><circle
				cx="14"
				cy="10.5"
				r="2.2"
				class="plein"
			/>
		{:else}
			<circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="1.8" class="plein" /><circle
				cx="20"
				cy="12"
				r="2.2"
				class="plein"
			/>
		{/if}
	</svg>
{/snippet}

{#snippet layer({
	viewport,
	width: w,
	height: h
}: {
	viewport: Viewport;
	width: number;
	height: number;
})}
	{@const t = createTransformer(viewport, w, h)}
	{#if chosenAt !== null}
		{@const c = t.mathToSvg(chosenAt.x, chosenAt.y)}
		<circle class="choisi" cx={c.x} cy={c.y} r="9" />
	{/if}
	{#if ghost !== null}
		{@const a = t.mathToSvg(ghost.from.x, ghost.from.y)}
		{@const b = t.mathToSvg(ghost.to.x, ghost.to.y)}
		{#if ghost.tool === 'cercle'}
			<circle class="fantome" cx={a.x} cy={a.y} r={Math.hypot(b.x - a.x, b.y - a.y)} />
		{:else}
			{@const dx = b.x - a.x}
			{@const dy = b.y - a.y}
			{@const far = (w + h) * 4}
			{@const length = Math.hypot(dx, dy) || 1}
			{@const ux = dx / length}
			{@const uy = dy / length}
			<line
				class="fantome"
				x1={ghost.tool === 'droite' ? a.x - ux * far : a.x}
				y1={ghost.tool === 'droite' ? a.y - uy * far : a.y}
				x2={ghost.tool === 'segment' ? b.x : a.x + ux * far}
				y2={ghost.tool === 'segment' ? b.y : a.y + uy * far}
			/>
		{/if}
	{/if}
{/snippet}

<section class="figure" aria-label="Géométrie">
	<div class="barre-figure">
		{#if toolbox !== null}
			<div class="outils" role="toolbar" aria-label="Outils de géométrie" {@attach rovingToolbar}>
				{#each FIGURE_TOOLS as tool (tool.id)}
					<button
						type="button"
						class="outil"
						aria-label={tool.label}
						aria-pressed={toolbox.tool === tool.id}
						title={tool.label}
						onclick={() => chooseTool(tool.id)}
					>
						{@render toolIcon(tool.id)}
					</button>
				{/each}
			</div>
		{/if}
		<MyCheckbox
			bind:checked={() => atelier.figureFrame, (shown) => atelier.setFigureFrame(shown)}
			label="Repère"
		/>
		<p class="refus" role="status">{message}</p>
	</div>
	{#if empty}
		<p class="vide">
			Dans la console, écris un point A = (1 ; 2) ou une courbe d : y = 3x − 2, ou affiche une
			fonction depuis sa carte.
		</p>
	{/if}
	<!-- Focalisable : les flèches y déplacent le point choisi (M8), comme le
	     glisser — une zone de manipulation (`application`), pas un contrôle -->
	<!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
	<div
		class="toile"
		bind:clientWidth={width}
		bind:clientHeight={height}
		tabindex="0"
		role="application"
		aria-label={chosenPoint === null
			? 'Figure'
			: `Figure : les flèches déplacent ${displayName(chosenPoint)}`}
		onkeydown={handleArrow}
		onkeyup={handleArrowUp}
	>
		{#if width > 0 && height > 0}
			<!-- Hors du flux : la toile ne fait pas grandir la boîte qu'on mesure -->
			<div class="cadre">
				<GeometryCanvas
					figure={synced.figure}
					externalVersion={synced.version}
					width={Math.floor(width)}
					height={Math.floor(height)}
					pixelsPerUnit={Math.min(width, height) / UNITS_ACROSS}
					objectsMovable={false}
					{pointDrag}
					canvasTool={toolbox !== null && toolbox.tool !== 'deplacer' ? canvasTool : undefined}
					overlay={layer}
					showGrid={atelier.figureFrame}
					showGraduations={atelier.figureFrame}
				/>
			</div>
		{/if}
	</div>
</section>

<style>
	.figure {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-width: 0;
		min-height: 0;
	}
	.barre-figure {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.75rem;
		padding: 0.5rem 0.75rem;
	}
	.outils {
		display: flex;
		gap: 0.125rem;
	}
	.outil {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2.25rem;
		height: 2.25rem;
		border-radius: 0.375rem;
		color: var(--color-foreground);
	}
	.outil:hover {
		background: var(--color-muted);
	}
	.outil[aria-pressed='true'] {
		background: var(--color-primary);
		color: var(--color-primary-foreground);
	}
	.outil:focus-visible {
		outline: 2px solid var(--color-ring);
		outline-offset: 1px;
	}
	.icone {
		fill: none;
		stroke: currentColor;
		stroke-width: 1.8;
		stroke-linecap: round;
	}
	.icone :global(.plein) {
		fill: currentColor;
		stroke: none;
	}
	.toile:focus-visible {
		outline: 2px solid var(--color-ring);
		outline-offset: -2px;
	}
	.toile :global(.fantome) {
		fill: none;
		stroke: var(--color-primary);
		stroke-width: 1.5;
		stroke-dasharray: 6 4;
		pointer-events: none;
	}
	.toile :global(.choisi) {
		fill: none;
		stroke: var(--color-primary);
		stroke-width: 1.5;
		pointer-events: none;
	}
	.refus {
		margin: 0;
		/* La ligne est réservée : la consigne d'un outil ne fait pas sauter la toile */
		min-height: 1.25rem;
		line-height: 1.25rem;
		font-size: 0.875rem;
		color: var(--color-muted-foreground);
	}
	.vide {
		margin: 0;
		padding: 0 0.75rem 0.5rem;
		font-size: 0.875rem;
		color: var(--color-muted-foreground);
	}
	.toile {
		position: relative;
		flex: 1;
		/* Sur un téléphone, la vue passe sous le panneau : une toile toujours utilisable */
		min-height: 18rem;
		overflow: hidden;
	}
	.cadre {
		position: absolute;
		inset: 0;
	}
</style>
