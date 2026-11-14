<!--
	AssocierRelier — associer deux colonnes en traçant des traits
	=============================================================

	Geste `geste: relier` (défaut) d'un ```associer (`AssocierPlacer.svelte` choisit ;
	l'autre geste est `AssocierEtiquettes.svelte`). Chantier `docs/wip/associer-progress.md`,
	décisions 6-7.

	Les éléments à gauche, un point au bout ; les étiquettes à droite (mélangées,
	chacune une fois), un point devant. Les traits sont tracés dans un SVG posé
	par-dessus, entre les centres des points mesurés à l'écran.

	- Glisser d'un point à l'autre (le trait suit le doigt), dans les deux sens ; ou
	  toucher une case puis une case de l'autre colonne.
	- Un trait par élément (un nouveau remplace l'ancien) ; plusieurs traits possibles
	  vers une même étiquette.
	- Toucher un trait, ou la case d'un élément relié (rien de pris), efface son trait.
	  Les cases sont au-dessus des traits : la zone d'un trait ne masque jamais un point.
	- Clavier : Tab, flèches (↑ ↓ dans une colonne, ← → d'une colonne à l'autre),
	  Entrée (prendre, relier ; un élément relié est repris, pas effacé), Suppr ou
	  Retour arrière (effacer le trait de l'élément), Échap (lâcher). Chaque changement
	  est dit dans une région `role="status"` toujours présente.
	- Nom accessible : « Élément 1 sur 3, relié à l'étiquette 2 » — jamais la bonne
	  étiquette.
	- Dans une question (`answers`, une case par élément) : la réponse de chaque élément
	  est la position AFFICHÉE de l'étiquette reliée (`2`), `''` sans trait. Corrigé :
	  trait juste en vert, faux en rouge, et avec `expected`, le bon trait en pointillés
	  verts sous un élément faux.
	- Sans `answers` (cours, page d'aide, aperçu) : le même geste, rien de jugé.

	@module components/markdown/nodes/AssocierRelier
-->
<script lang="ts">
	import type { AssocierNode } from '$lib/ubumark/types/associer';
	import { associerPlacedOf, displayedAssocierLabels } from '$lib/ubumark/utils/associer';
	import InlineMarkdown from '../InlineMarkdown.svelte';
	import AssocierContenu from './AssocierContenu.svelte';
	import { associerItemHasBlock } from '$lib/ubumark/parser/associer-parser';
	import type { BuildCase } from './CollectionConstruire.svelte';

	// Types
	type Side = 'item' | 'label';
	interface Point {
		x: number;
		y: number;
	}

	interface Props {
		node: AssocierNode;
		/** Une case par élément, de haut en bas ; absentes : geste libre */
		answers?: BuildCase[];
		/** Bonne réponse de chaque élément (positions affichées) : le bon trait en pointillés */
		expected?: readonly string[];
		/** false : traits figés, rien à toucher (copie corrigée) */
		showControls?: boolean;
		class?: string;
	}

	let { node, answers, expected, showControls = true, class: className = '' }: Props = $props();

	// Constantes
	/** Au-delà, un appui devient un glissement (px) : un doigt bouge un peu en touchant */
	const DRAG_THRESHOLD = 10;

	const uid = $props.id();

	// Variables
	let labels = $derived(displayedAssocierLabels(node));
	let labelCount = $derived(labels.length);
	let count = $derived(node.items.length);
	/** Un élément contient une courbe : la colonne de gauche prend plus de place */
	let withBlocks = $derived(node.items.some(associerItemHasBlock));

	/**
	 * Étiquette reliée à chaque élément (position affichée), `null` : pas de trait.
	 * Relue quand une case change ; réassignée à chaque geste (dérivé modifiable).
	 */
	let links = $derived.by<(number | null)[]>(() =>
		Array.from({ length: count }, (_, k) => associerPlacedOf(answers?.[k]?.value ?? '', labelCount))
	);
	let locked = $derived((answers?.[0]?.disabled ?? false) || !showControls);
	/** Case prise (toucher, Entrée), en attente d'une case de l'autre colonne */
	let selected = $state<{ side: Side; index: number } | null>(null);
	/** La case prise, si elle compte encore (ni verrouillé, ni hors du bloc après une modification) */
	let active = $derived.by(() => {
		if (locked || !selected) return null;
		const limit = selected.side === 'item' ? count : labelCount;
		return selected.index < limit ? selected : null;
	});
	/** Dernier changement, lu par un lecteur d'écran (région toujours présente) */
	let announce = $state('');

	let verdicts = $derived(links.map((_, k) => answers?.[k]?.isCorrect ?? null));
	let judged = $derived(verdicts.some((v) => v !== null));
	let allRight = $derived(judged && verdicts.every((v) => v === true));
	let solution = $derived.by(() => {
		if (!expected || expected.length !== count) return null;
		return expected.map((value) => associerPlacedOf(value, labelCount));
	});

	/** Glissement en cours : la case de départ, le doigt (coordonnées du cadre) */
	let drag = $state<{
		side: Side;
		index: number;
		pointerId: number;
		startX: number;
		startY: number;
		x: number;
		y: number;
		moved: boolean;
	} | null>(null);
	/** Un glissement vient de finir : le clic qui suit ne compte pas */
	let swallowClick = false;

	let root: HTMLElement | undefined = $state();
	let frame: HTMLElement | undefined;
	/** Centres des points, dans le repère du cadre ; taille du cadre */
	let itemAnchors = $state<Point[]>([]);
	let labelAnchors = $state<Point[]>([]);
	let size = $state({ width: 0, height: 0 });

	/** Traits à dessiner : ceux de l'élève, puis les bons traits sous un élément faux */
	let lines = $derived.by(() => {
		const drawn: {
			key: string;
			item: number;
			from: Point;
			to: Point;
			kind: 'eleve' | 'juste' | 'faux' | 'solution';
		}[] = [];
		links.forEach((label, k) => {
			const from = itemAnchors[k];
			if (!from) return;
			if (label !== null && labelAnchors[label]) {
				const kind = verdicts[k] === true ? 'juste' : verdicts[k] === false ? 'faux' : 'eleve';
				drawn.push({ key: `e${k}`, item: k, from, to: labelAnchors[label], kind });
			}
			const correct = solution?.[k] ?? null;
			if (verdicts[k] === false && correct !== null && correct !== label && labelAnchors[correct]) {
				drawn.push({ key: `s${k}`, item: k, from, to: labelAnchors[correct], kind: 'solution' });
			}
		});
		return drawn;
	});

	/** Trait qui suit le doigt */
	let rubber = $derived.by(() => {
		if (!drag?.moved) return null;
		const anchor = drag.side === 'item' ? itemAnchors[drag.index] : labelAnchors[drag.index];
		return anchor ? { from: anchor, to: { x: drag.x, y: drag.y } } : null;
	});

	// Functions

	/** Mesure les points : au montage, et à chaque changement de taille (formules, polices) */
	function measure() {
		if (!frame) return;
		const box = frame.getBoundingClientRect();
		// Sous un ancêtre mis à l'échelle (aperçu), l'écran mesure en pixels affichés, le SVG dessine en pixels de mise en page
		const scale = box.width / (frame.offsetWidth || box.width || 1) || 1;
		const centerOf = (dot: Element): Point => {
			const r = dot.getBoundingClientRect();
			return {
				x: (r.left + r.width / 2 - box.left) / scale,
				y: (r.top + r.height / 2 - box.top) / scale
			};
		};
		itemAnchors = [...frame.querySelectorAll('[data-relier-point="item"]')].map(centerOf);
		labelAnchors = [...frame.querySelectorAll('[data-relier-point="label"]')].map(centerOf);
		size = { width: frame.offsetWidth, height: frame.offsetHeight };
	}

	/** Attachement du cadre : mesure, puis remesure à chaque changement de taille */
	function watchFrame(element: HTMLElement) {
		frame = element;
		// Relu quand le bloc change (nombre de cases)
		void count;
		void labelCount;
		measure();
		const observer = new ResizeObserver(measure);
		observer.observe(element);
		for (const cell of element.querySelectorAll('[data-relier-case]')) observer.observe(cell);
		return () => observer.disconnect();
	}

	function emit(next: (number | null)[]) {
		next.forEach((label, k) => {
			if (label !== links[k]) answers?.[k]?.onChange(label === null ? '' : String(label));
		});
		links = next;
	}

	/** Relie l'élément `k` à l'étiquette `label` (remplace son trait) */
	function link(k: number, label: number) {
		if (k >= count || label >= labelCount) return;
		emit(links.map((current, j) => (j === k ? label : current)));
		announce = `Élément ${k + 1} relié à l’étiquette ${label + 1}`;
	}

	/** Efface le trait de l'élément `k` */
	function unlink(k: number) {
		emit(links.map((current, j) => (j === k ? null : current)));
		announce = `Trait de l’élément ${k + 1} effacé`;
	}

	/** Relie deux cases de colonnes différentes ; même colonne : rien */
	function join(a: { side: Side; index: number }, b: { side: Side; index: number }): boolean {
		if (a.side === b.side) return false;
		const item = a.side === 'item' ? a.index : b.index;
		const label = a.side === 'label' ? a.index : b.index;
		link(item, label);
		return true;
	}

	/** Toucher ou Entrée ; `keyboard` : Entrée sur un élément relié le prend (l'effacer : Suppr) */
	function onCaseClick(side: Side, index: number, keyboard = false) {
		if (locked || swallowClick) return;
		const current = active;
		if (current && current.side !== side) {
			join(current, { side, index });
			selected = null;
			return;
		}
		if (current && current.side === side && current.index === index) {
			selected = null;
			announce = '';
			return;
		}
		if (!current && side === 'item' && links[index] !== null && !keyboard) {
			unlink(index);
			return;
		}
		selected = { side, index };
		announce =
			side === 'item'
				? `Élément ${index + 1} pris, choisis son étiquette`
				: `Étiquette ${index + 1} prise, choisis un élément`;
	}

	function onLineClick(item: number) {
		if (locked) return;
		unlink(item);
		selected = null;
	}

	function framePoint(event: PointerEvent): Point {
		if (!frame) return { x: event.clientX, y: event.clientY };
		const box = frame.getBoundingClientRect();
		const scale = box.width / (frame.offsetWidth || box.width || 1) || 1;
		return { x: (event.clientX - box.left) / scale, y: (event.clientY - box.top) / scale };
	}

	function onPointerDown(event: PointerEvent, side: Side, index: number) {
		if (locked || event.button !== 0) return;
		swallowClick = false;
		const { x, y } = framePoint(event);
		drag = {
			side,
			index,
			pointerId: event.pointerId,
			startX: event.clientX,
			startY: event.clientY,
			x,
			y,
			moved: false
		};
		(event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
	}

	function onPointerMove(event: PointerEvent) {
		if (!drag || event.pointerId !== drag.pointerId) return;
		const moved =
			drag.moved ||
			Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > DRAG_THRESHOLD;
		drag = { ...drag, ...framePoint(event), moved };
		if (moved) event.preventDefault();
	}

	function onPointerUp(event: PointerEvent) {
		if (!drag || event.pointerId !== drag.pointerId) return;
		const { side, index, moved } = drag;
		drag = null;
		if (!moved) return;
		const target = document
			.elementFromPoint(event.clientX, event.clientY)
			?.closest<HTMLElement>('[data-relier-case]');
		// Lâché sur la case de départ : un toucher qui a un peu bougé, le clic qui suit compte
		if (target?.dataset.relierCase === `${side}:${index}`) return;
		// Glissé : le clic qui suit (même bouton) ne doit pas reprendre la case
		swallowClick = true;
		setTimeout(() => (swallowClick = false), 0);
		selected = null;
		if (!target || !root?.contains(target)) return;
		const [targetSide, targetIndex] = (target.dataset.relierCase ?? '').split(':');
		if (targetSide !== 'item' && targetSide !== 'label') return;
		join({ side, index }, { side: targetSide, index: Number(targetIndex) });
	}

	function onPointerCancel(event: PointerEvent) {
		if (drag && event.pointerId === drag.pointerId) drag = null;
	}

	/** Flèches : ↑ ↓ dans une colonne, ← → vers l'autre colonne (même rang, ou le dernier) */
	function onKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			selected = null;
			return;
		}
		if (!root) return;
		const current = event.target as HTMLButtonElement;
		const [side, rank] = (current.dataset.relierCase ?? '').split(':');
		if ((event.key === 'Delete' || event.key === 'Backspace') && side === 'item') {
			event.preventDefault();
			if (!locked && links[Number(rank)] !== null) unlink(Number(rank));
			return;
		}
		const column = (side: Side) => [
			...root!.querySelectorAll<HTMLButtonElement>(
				`button[data-relier-case^="${side}:"]:not(:disabled)`
			)
		];
		const items = column('item');
		const labelButtons = column('label');
		const inItems = items.indexOf(current);
		const inLabels = labelButtons.indexOf(current);
		const list = inItems !== -1 ? items : labelButtons;
		const other = inItems !== -1 ? labelButtons : items;
		const at = inItems !== -1 ? inItems : inLabels;
		if (at === -1) return;
		let next: HTMLButtonElement | undefined;
		if (event.key === 'ArrowUp') next = list[at - 1];
		else if (event.key === 'ArrowDown') next = list[at + 1];
		else if (event.key === (inItems !== -1 ? 'ArrowRight' : 'ArrowLeft'))
			next = other[Math.min(at, other.length - 1)];
		if (next) {
			event.preventDefault();
			next.focus();
		}
	}

	function itemName(k: number): string {
		const label = links[k];
		const state = label === null ? 'pas relié' : `relié à l’étiquette ${label + 1}`;
		const verdict = verdicts[k] === true ? ', juste' : verdicts[k] === false ? ', faux' : '';
		return `Élément ${k + 1} sur ${count}, ${state}${verdict}`;
	}

	function isSelected(side: Side, index: number): boolean {
		return active?.side === side && active.index === index;
	}
</script>

<svelte:window
	onpointermove={onPointerMove}
	onpointerup={onPointerUp}
	onpointercancel={onPointerCancel}
/>

<div
	bind:this={root}
	class="associer associer-relier my-3 {className}"
	role="group"
	aria-labelledby="{uid}-consigne"
>
	<p id="{uid}-consigne" class="sr-only">
		Relier chaque élément à une étiquette ; une étiquette peut servir plusieurs fois ; Entrée sur un
		élément relié le reprend, Suppr efface son trait
	</p>

	{#if node.errors.length > 0}
		<ul class="text-sm text-destructive" role="alert">
			{#each node.errors as error, i (i)}
				<li>Bloc associer : {error}</li>
			{/each}
		</ul>
	{:else}
		<div {@attach watchFrame} class="relier-cadre" class:relier-avec-blocs={withBlocks}>
			<div class="relier-colonne relier-elements">
				{#each node.items as item, k (k)}
					<button
						type="button"
						class="relier-case relier-element"
						class:relier-prise={isSelected('item', k)}
						class:relier-juste={verdicts[k] === true}
						class:relier-faux={verdicts[k] === false}
						data-relier-case="item:{k}"
						data-associer-focus={k === 0 ? '' : undefined}
						aria-label={itemName(k)}
						aria-describedby="{uid}-element-{k}"
						aria-pressed={isSelected('item', k)}
						disabled={locked}
						onclick={(event) => onCaseClick('item', k, event.detail === 0)}
						onkeydown={onKeydown}
						onpointerdown={(event) => onPointerDown(event, 'item', k)}
					>
						<span id="{uid}-element-{k}" class="relier-contenu"
							><AssocierContenu content={item} /></span
						>
						<span class="relier-point" data-relier-point="item" aria-hidden="true"></span>
					</button>
				{/each}
			</div>

			<div class="relier-colonne relier-etiquettes">
				{#each labels as text, position (position)}
					<button
						type="button"
						class="relier-case relier-etiquette"
						class:relier-prise={isSelected('label', position)}
						data-relier-case="label:{position}"
						aria-label="Étiquette {position + 1} sur {labelCount}"
						aria-describedby="{uid}-etiquette-{position}"
						aria-pressed={isSelected('label', position)}
						disabled={locked}
						onclick={(event) => onCaseClick('label', position, event.detail === 0)}
						onkeydown={onKeydown}
						onpointerdown={(event) => onPointerDown(event, 'label', position)}
					>
						<span class="relier-point" data-relier-point="label" aria-hidden="true"></span>
						<span id="{uid}-etiquette-{position}" class="relier-contenu"
							><InlineMarkdown content={text} /></span
						>
					</button>
				{/each}
			</div>

			<svg
				class="relier-traits"
				width={size.width}
				height={size.height}
				viewBox="0 0 {size.width} {size.height}"
				aria-hidden="true"
			>
				{#each lines as line (line.key)}
					<line
						class="relier-trait relier-trait-{line.kind}"
						x1={line.from.x}
						y1={line.from.y}
						x2={line.to.x}
						y2={line.to.y}
					/>
					{#if line.kind !== 'solution' && !locked}
						<!-- Zone large pour toucher le trait et l'effacer -->
						<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
						<line
							class="relier-trait-zone"
							data-relier-trait={line.item}
							x1={line.from.x}
							y1={line.from.y}
							x2={line.to.x}
							y2={line.to.y}
							onclick={() => onLineClick(line.item)}
						/>
					{/if}
				{/each}
				{#if rubber}
					<line
						class="relier-trait relier-trait-suivi"
						x1={rubber.from.x}
						y1={rubber.from.y}
						x2={rubber.to.x}
						y2={rubber.to.y}
					/>
				{/if}
			</svg>
		</div>

		<!-- Toujours présente : une région insérée avec son texte est souvent muette -->
		<p class="sr-only" role="status">
			{judged ? (allRight ? 'réponse juste' : 'réponse fausse') : announce}
		</p>
	{/if}
</div>

<style>
	/* Deux colonnes, même au téléphone ; l'espace du milieu reçoit les traits */
	.relier-cadre {
		position: relative;
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
		align-items: center;
		column-gap: clamp(2rem, 12vw, 6rem);
	}

	/* Courbes à gauche : au téléphone, la courbe garde ~130 px à côté de son point */
	.relier-avec-blocs {
		grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
	}

	.relier-colonne {
		display: flex;
		min-width: 0;
		flex-direction: column;
		gap: 0.5rem;
	}

	/* Au-dessus des traits : la zone d'un trait ne masque jamais le point (cases transparentes) */
	.relier-case {
		position: relative;
		z-index: 1;
		display: flex;
		min-width: 0;
		min-height: 2.75rem;
		align-items: center;
		gap: 0.5rem;
		padding: 0.25rem 0.5rem;
		border: 1px solid transparent;
		border-radius: 0.5rem;
		background: transparent;
		color: var(--color-foreground);
		overflow-wrap: anywhere;
		/* Le doigt trace le trait, la page ne défile pas ; iPhone : ni loupe ni sélection */
		touch-action: none;
		-webkit-user-select: none;
		user-select: none;
		-webkit-touch-callout: none;
		cursor: pointer;
	}

	.relier-element {
		justify-content: flex-end;
		text-align: right;
	}

	.relier-etiquette {
		justify-content: flex-start;
		text-align: left;
	}

	.relier-contenu {
		min-width: 0;
		/* Une courbe (lot 2) se réduit à la case plutôt que de passer sous le point */
		flex: 0 1 auto;
	}

	.relier-case:focus-visible {
		outline: 2px solid var(--color-ring);
		outline-offset: 2px;
	}

	.relier-case:disabled {
		cursor: default;
	}

	.relier-prise {
		border-color: var(--color-primary);
		background: color-mix(in oklab, var(--color-primary) 12%, transparent);
	}

	.relier-point {
		flex: none;
		width: 0.75rem;
		height: 0.75rem;
		border-radius: 9999px;
		background: var(--color-foreground);
	}

	.relier-prise .relier-point {
		background: var(--color-primary);
		box-shadow: 0 0 0 4px color-mix(in oklab, var(--color-primary) 30%, transparent);
	}

	.relier-juste .relier-point {
		background: var(--color-success);
	}

	.relier-faux .relier-point {
		background: var(--color-destructive);
	}

	.relier-traits {
		position: absolute;
		z-index: 0;
		inset: 0;
		overflow: visible;
		pointer-events: none;
	}

	.relier-trait {
		stroke: var(--color-foreground);
		stroke-width: 2.5;
		stroke-linecap: round;
	}

	.relier-trait-suivi {
		stroke: var(--color-primary);
	}

	.relier-trait-juste {
		stroke: var(--color-success);
	}

	.relier-trait-faux {
		stroke: var(--color-destructive);
	}

	.relier-trait-solution {
		stroke: var(--color-success);
		stroke-dasharray: 6 5;
	}

	.relier-trait-zone {
		stroke: transparent;
		stroke-width: 18;
		stroke-linecap: round;
		pointer-events: stroke;
		cursor: pointer;
	}
</style>
