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
	 * La barre d'outils (lot 3, PR 2 et 3) suit le même principe : un outil ÉCRIT
	 * la ligne qu'on aurait tapée (`write`, la console), il ne crée rien lui-même.
	 * La toile lui dit ce qui est proche du clic (point, objets : M5).
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
		// Un premier point de construction annulé ou supprimé : la construction tombe
		toolbox?.forgetVanished();
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
		move: (x, y, snap, pixel) => {
			if (held === null) return;
			const done = atelier.dragPoint(held, x, y, snap, pixel);
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
		click: (x, y, pointId, snap, near) => {
			if (toolbox === null) return;
			const before = new Set(atelier.names);
			const point = pointId === null ? null : (projection.nameOf(pointId) ?? null);
			// Les objets proches, par leur nom (un élément sans nom — un texte — ne compte pas)
			const objects = [...new Set(near.elementIds.flatMap((id) => projection.nameOf(id) ?? []))];
			refusal = null;
			toolbox.click(x, y, point, snap, { objects, radius: near.radius, pixel: near.pixel });
			// Un point posé (outil Point, ou extrémité) devient le point des flèches ; un
			// point visé aussi, s'il se glisse (un point construit ne bouge pas aux flèches)
			const created = atelier.names.find((n) => !before.has(n) && atelier.get(n)?.kind === 'point');
			if (created !== undefined) chosenPoint = created;
			else if (point !== null && atelier.dragRefusal(point) === null) chosenPoint = point;
		},
		hover: (at) => {
			pointer = at;
		}
	};

	function chooseTool(tool: FigureTool) {
		refusal = null;
		toolbox?.select(tool);
	}

	/**
	 * Échap abandonne une construction commencée (M7) — sauf s'il a déjà servi
	 * (la console qu'il ferme, une liste, une fenêtre) ou vient d'un champ.
	 */
	function handleWindowKey(event: KeyboardEvent) {
		if (event.key !== 'Escape' || toolbox === null || event.defaultPrevented) return;
		const target = event.target;
		if (
			target instanceof Element &&
			target.closest('input, textarea, math-field, [role="dialog"]')
		) {
			return;
		}
		if (toolbox.cancel()) event.preventDefault();
	}

	/** La toile focalisable, où les flèches déplacent le point choisi (M8). */
	let canvasBox = $state<HTMLDivElement | null>(null);

	/**
	 * Un appui sur la toile lui donne le focus : la toile annule le `pointerdown`
	 * (glisser, outils), et le navigateur ne le donnait donc pas — les flèches
	 * parcouraient la barre d'outils ou faisaient défiler la vue (David, 2026-10-22).
	 * En capture : un appui sur une étiquette (propagation arrêtée) compte aussi.
	 */
	function focusCanvas() {
		if (document.activeElement !== canvasBox) canvasBox?.focus({ preventScroll: true });
	}

	/** Une flèche est tenue sur le point choisi : son geste attend d'être fermé. */
	let arrowGesture = false;

	/** Fermer le geste des flèches : au relâcher, où qu'il arrive, ou à la perte du focus. */
	function endArrowGesture() {
		if (!arrowGesture) return;
		arrowGesture = false;
		atelier.endGesture();
	}

	function handleWindowKeyUp(event: KeyboardEvent) {
		if (ARROWS[event.key] !== undefined) endArrowGesture();
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
		arrowGesture = true;
		const done = atelier.dragPoint(chosenPoint, at.x + move[0] * step, at.y + move[1] * step);
		refusal = done.ok ? null : done.message;
	}

	/**
	 * Le fantôme de la construction en cours (M7) : du premier point au pointeur
	 * (segment, droite, demi-droite, cercle, milieu), ou la parallèle et la
	 * perpendiculaire qui passent par le pointeur, une fois leur droite choisie.
	 */
	const ghost = $derived.by(() => {
		void synced;
		void atelier.revision;
		if (toolbox === null || pointer === null) return null;
		const direction = toolbox.ghostDirection;
		if (direction !== null) return { tool: 'direction' as const, at: pointer, direction };
		const first = toolbox.chosenPoint;
		if (first === null) return null;
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

<svelte:window onkeydown={handleWindowKey} onkeyup={handleWindowKeyUp} onblur={endArrowGesture} />

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
		{:else if tool === 'cercle'}
			<circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="1.8" class="plein" /><circle
				cx="20"
				cy="12"
				r="2.2"
				class="plein"
			/>
		{:else if tool === 'milieu'}
			<line x1="3" y1="17" x2="21" y2="7" /><circle cx="3" cy="17" r="2" class="plein" /><circle
				cx="21"
				cy="7"
				r="2"
				class="plein"
			/><circle cx="12" cy="12" r="3" class="plein" />
		{:else if tool === 'intersection'}
			<line x1="2" y1="20" x2="22" y2="4" /><line x1="2" y1="6" x2="22" y2="18" /><circle
				cx="12"
				cy="12"
				r="3"
				class="plein"
			/>
		{:else if tool === 'point-sur'}
			<circle cx="12" cy="12" r="8" /><circle cx="17.7" cy="6.3" r="3" class="plein" />
		{:else if tool === 'parallele'}
			<line x1="2" y1="16" x2="22" y2="4" /><line x1="2" y1="21" x2="22" y2="9" /><circle
				cx="12"
				cy="15"
				r="2.2"
				class="plein"
			/>
		{:else}
			<line x1="2" y1="18" x2="22" y2="18" /><line x1="12" y1="3" x2="12" y2="21" /><path
				d="M12 13.5h4.5v4.5"
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
	{#if ghost !== null && ghost.tool === 'direction'}
		{@const a = t.mathToSvg(ghost.at.x, ghost.at.y)}
		{@const b = t.mathToSvg(ghost.at.x + ghost.direction.dx, ghost.at.y + ghost.direction.dy)}
		{@const length = Math.hypot(b.x - a.x, b.y - a.y) || 1}
		{@const far = (w + h) * 4}
		<line
			class="fantome"
			x1={a.x - ((b.x - a.x) / length) * far}
			y1={a.y - ((b.y - a.y) / length) * far}
			x2={a.x + ((b.x - a.x) / length) * far}
			y2={a.y + ((b.y - a.y) / length) * far}
		/>
	{:else if ghost !== null && ghost.tool === 'milieu'}
		{@const a = t.mathToSvg(ghost.from.x, ghost.from.y)}
		{@const b = t.mathToSvg(ghost.to.x, ghost.to.y)}
		<line class="fantome" x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
		<circle class="fantome-point" cx={(a.x + b.x) / 2} cy={(a.y + b.y) / 2} r="4" />
	{:else if ghost !== null}
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
	</div>
	<p class="refus" role="status">{message}</p>
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
		bind:this={canvasBox}
		bind:clientWidth={width}
		bind:clientHeight={height}
		tabindex="0"
		role="application"
		aria-label={chosenPoint === null
			? 'Figure'
			: `Figure : les flèches déplacent ${displayName(chosenPoint)}`}
		onkeydown={handleArrow}
		onfocusout={endArrowGesture}
		onpointerdowncapture={focusCanvas}
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
					viewGestures
					neutralLabels
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
		position: relative;
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
		flex-wrap: wrap;
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
	.toile :global(.fantome-point) {
		fill: var(--color-primary);
		opacity: 0.6;
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
		/* Une ligne à elle, réservée : la consigne d'un outil, courte ou longue, ne fait
		   ni passer la barre sur deux lignes ni sauter la toile (onze outils, lot 3) */
		padding: 0 0.75rem 0.375rem;
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
	/* Au doigt, des boutons de 44 px */
	@media (pointer: coarse) {
		.outil {
			width: 2.75rem;
			height: 2.75rem;
		}
	}
	/* Sur un téléphone, debout ou couché (M6) : la toile prend la vue, la barre d'outils passe dessous,
	   sur une rangée qui défile de côté ; consigne et invite se posent sur la toile */
	@media (max-width: 640px), (max-height: 480px) {
		.barre-figure {
			order: 1;
			flex-wrap: nowrap;
			overflow-x: auto;
			gap: 0.5rem;
			padding: 0.25rem 0.5rem;
			border-top: 1px solid var(--color-border);
			/* Une ombre du côté où la rangée défile encore : les calques `local` (couleur du
			   fond) la recouvrent quand on est au bout */
			background:
				linear-gradient(to right, var(--color-background) 30%, transparent) left / 2rem 100%
					no-repeat local,
				linear-gradient(to left, var(--color-background) 30%, transparent) right / 2rem 100%
					no-repeat local,
				radial-gradient(
						farthest-side at 0 50%,
						color-mix(in oklab, var(--color-foreground) 30%, transparent),
						transparent
					)
					left / 1rem 100% no-repeat scroll,
				radial-gradient(
						farthest-side at 100% 50%,
						color-mix(in oklab, var(--color-foreground) 30%, transparent),
						transparent
					)
					right / 1rem 100% no-repeat scroll,
				var(--color-background);
		}
		.outils {
			flex-wrap: nowrap;
		}
		.barre-figure > :global(*) {
			flex: none;
		}
		/* Un plancher sous les ~250 px qu'offre un iPhone 13, jamais une toile nulle */
		.toile {
			min-height: 10rem;
		}
		.refus,
		.vide {
			position: absolute;
			left: 0;
			right: 0;
			z-index: 1;
			padding: 0.25rem 0.75rem;
			background: color-mix(in oklab, var(--color-background) 60%, transparent);
			pointer-events: none;
		}
		.refus {
			top: 0;
		}
		/* Vide, elle reste rendue (sans fond) : un lecteur d'écran l'entend changer */
		.refus:empty {
			padding: 0;
			background: none;
		}
		.vide {
			top: 1.75rem;
		}
	}
	/* Téléphone couché : l'en-tête et les barres de l'atelier ne laissent qu'environ
	   190 px, la barre d'outils doit rester à l'écran */
	@media (max-height: 480px) {
		.toile {
			min-height: 6rem;
		}
	}
</style>
