<!--
	AssocierEtiquettes — associer deux colonnes en posant des étiquettes
	====================================================================

	Geste `geste: étiquettes` d'un ```associer (le défaut, `relier`, est
	`AssocierRelier.svelte` ; `AssocierPlacer.svelte` choisit).

	L'élève associe chaque élément de gauche à une étiquette (chantier
	`docs/wip/associer-progress.md`) : les étiquettes mélangées en haut, chacune
	une fois, puis une rangée par élément, « élément | place ».

	- Glisser une étiquette sur une place ; ou toucher l'étiquette, puis la place.
	  Une étiquette reste en haut une fois posée : elle peut servir à plusieurs
	  éléments. Une étiquette posée se glisse vers une autre place (échange si elle
	  est prise) ; glissée en haut, ou touchée, elle est retirée.
	- Clavier : Tab, Entrée (prendre, poser), flèches (← → dans les étiquettes,
	  ↑ ↓ d'une place à l'autre et vers les étiquettes), Échap (lâcher).
	- Nom accessible : « Étiquette 2 sur 3 », « Place de l'élément 1 sur 3, vide » —
	  jamais la bonne étiquette.
	- Dans une question (`answers`, une case par élément) : la réponse de chaque
	  place est la position AFFICHÉE de l'étiquette posée (`2`), `''` tant qu'elle
	  est vide. Corrigé : places justes en vert, fausses en rouge, et avec
	  `expected`, la bonne étiquette sous une place fausse.
	- Sans `answers` (cours, page d'aide, aperçu) : le même geste, rien de jugé.

	@module components/markdown/nodes/AssocierEtiquettes
-->
<script lang="ts">
	import type { AssocierNode } from '$lib/ubumark/types/associer';
	import { associerPlacedOf, displayedAssocierLabels } from '$lib/ubumark/utils/associer';
	import InlineMarkdown from '../InlineMarkdown.svelte';
	import AssocierContenu from './AssocierContenu.svelte';
	import { associerItemHasBlock } from '$lib/ubumark/parser/associer-parser';
	import type { BuildCase } from './CollectionConstruire.svelte';

	interface Props {
		node: AssocierNode;
		/** Une case par élément, de haut en bas ; absentes : geste libre */
		answers?: BuildCase[];
		/** Bonne réponse de chaque élément (positions affichées) : la bonne étiquette sous une place fausse */
		expected?: readonly string[];
		/** false : les rangées seules, sans les étiquettes d'en haut (copie corrigée) */
		showControls?: boolean;
		class?: string;
	}

	let { node, answers, expected, showControls = true, class: className = '' }: Props = $props();

	/** Au-delà, un appui devient un glissement (px) */
	const DRAG_THRESHOLD = 6;

	const uid = $props.id();

	let labels = $derived(displayedAssocierLabels(node));
	let labelCount = $derived(labels.length);
	let count = $derived(node.items.length);
	/** Un élément contient une courbe : la colonne des éléments prend plus de place */
	let withBlocks = $derived(node.items.some(associerItemHasBlock));

	/**
	 * Étiquette posée à chaque place (position affichée), `null` : vide. Relue quand
	 * une case change ; réassignée à chaque geste (dérivé modifiable).
	 */
	let placed = $derived.by<(number | null)[]>(() =>
		Array.from({ length: count }, (_, k) => associerPlacedOf(answers?.[k]?.value ?? '', labelCount))
	);
	let locked = $derived(answers?.[0]?.disabled ?? false);
	/** Étiquette prise (toucher, Entrée), en attente d'une place */
	let selected = $state<number | null>(null);

	let verdicts = $derived(placed.map((_, k) => answers?.[k]?.isCorrect ?? null));
	let judged = $derived(verdicts.some((v) => v !== null));
	let allRight = $derived(judged && verdicts.every((v) => v === true));
	let solution = $derived.by(() => {
		if (!expected || expected.length !== count) return null;
		return expected.map((value) => associerPlacedOf(value, labelCount));
	});

	/** Glissement en cours : l'étiquette, la place d'où elle vient (`null` : d'en haut), le doigt */
	let drag = $state<{
		label: number;
		from: number | null;
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

	function emit(next: (number | null)[]) {
		next.forEach((position, k) => {
			if (position !== placed[k]) answers?.[k]?.onChange(position === null ? '' : String(position));
		});
		placed = next;
	}

	/** Pose `label` à la place `k` ; venue d'une autre place : échange avec l'occupante */
	function put(label: number, k: number, from: number | null) {
		if (from === k) return;
		const next = [...placed];
		if (from !== null) next[from] = next[k];
		next[k] = label;
		emit(next);
	}

	/** Vide la place `k` */
	function clear(k: number) {
		emit(placed.map((position, j) => (j === k ? null : position)));
	}

	function onTrayClick(label: number) {
		if (locked || swallowClick) return;
		selected = selected === label ? null : label;
	}

	function onPlaceClick(k: number) {
		if (locked || swallowClick) return;
		if (selected !== null) {
			put(selected, k, null);
			selected = null;
			return;
		}
		if (placed[k] !== null) clear(k);
	}

	function onPointerDown(event: PointerEvent, label: number, from: number | null) {
		if (locked || event.button !== 0) return;
		swallowClick = false;
		drag = {
			label,
			from,
			pointerId: event.pointerId,
			startX: event.clientX,
			startY: event.clientY,
			x: event.clientX,
			y: event.clientY,
			moved: false
		};
		(event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
	}

	function onPointerMove(event: PointerEvent) {
		if (!drag || event.pointerId !== drag.pointerId) return;
		const moved =
			drag.moved ||
			Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > DRAG_THRESHOLD;
		drag = { ...drag, x: event.clientX, y: event.clientY, moved };
		if (moved) event.preventDefault();
	}

	function onPointerUp(event: PointerEvent) {
		if (!drag || event.pointerId !== drag.pointerId) return;
		const { label, from, moved } = drag;
		drag = null;
		if (!moved) return;
		// Glissé : le clic qui suit (même bouton) ne doit pas reprendre l'étiquette
		swallowClick = true;
		setTimeout(() => (swallowClick = false), 0);
		selected = null;
		const target = document.elementFromPoint(event.clientX, event.clientY);
		const place = target?.closest<HTMLElement>('[data-associer-place]');
		if (place && root?.contains(place)) {
			put(label, Number(place.dataset.associerPlace), from);
			return;
		}
		const tray = target?.closest<HTMLElement>('[data-associer-tray]');
		if (from !== null && tray && root?.contains(tray)) clear(from);
	}

	function onPointerCancel(event: PointerEvent) {
		if (drag && event.pointerId === drag.pointerId) drag = null;
	}

	/** Flèches : ← → dans les étiquettes, ↑ ↓ d'une place à l'autre et vers les étiquettes */
	function onKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			selected = null;
			return;
		}
		if (!root) return;
		const current = event.target as HTMLElement;
		const trayButtons = [
			...root.querySelectorAll<HTMLButtonElement>('[data-associer-tray] button:not(:disabled)')
		];
		const placeButtons = [
			...root.querySelectorAll<HTMLButtonElement>('button[data-associer-place]:not(:disabled)')
		];
		const inTray = trayButtons.indexOf(current as HTMLButtonElement);
		const inPlaces = placeButtons.indexOf(current as HTMLButtonElement);
		let next: HTMLButtonElement | undefined;
		if (inTray !== -1) {
			if (event.key === 'ArrowLeft') next = trayButtons[inTray - 1];
			else if (event.key === 'ArrowRight') next = trayButtons[inTray + 1];
			else if (event.key === 'ArrowDown') next = placeButtons[0];
		} else if (inPlaces !== -1) {
			if (event.key === 'ArrowUp') next = placeButtons[inPlaces - 1] ?? trayButtons[0];
			else if (event.key === 'ArrowDown') next = placeButtons[inPlaces + 1];
		}
		if (next) {
			event.preventDefault();
			next.focus();
		}
	}

	function placeName(k: number, position: number | null): string {
		const state = position === null ? 'vide' : `étiquette ${position + 1}`;
		const verdict = verdicts[k] === true ? ', juste' : verdicts[k] === false ? ', fausse' : '';
		return `Place de l’élément ${k + 1} sur ${count}, ${state}${verdict}`;
	}
</script>

{#snippet label(position: number)}
	<span class="associer-contenu"><InlineMarkdown content={labels[position]} /></span>
{/snippet}

<svelte:window
	onpointermove={onPointerMove}
	onpointerup={onPointerUp}
	onpointercancel={onPointerCancel}
/>

<div
	bind:this={root}
	class="associer my-3 flex flex-col gap-3 {className}"
	role="group"
	aria-labelledby="{uid}-consigne"
>
	<p id="{uid}-consigne" class="sr-only">
		Associer chaque élément à une étiquette ; une étiquette peut servir plusieurs fois
		{selected !== null ? `; étiquette ${selected + 1} prise, choisis sa place` : ''}
	</p>

	{#if node.errors.length > 0}
		<ul class="text-sm text-destructive" role="alert">
			{#each node.errors as error, i (i)}
				<li>Bloc associer : {error}</li>
			{/each}
		</ul>
	{:else}
		{#if showControls}
			<div
				class="associer-etiquettes flex min-h-12 flex-wrap items-center justify-center gap-2"
				data-associer-tray
			>
				{#each labels as _, position (position)}
					<button
						type="button"
						class="associer-etiquette"
						class:associer-prise={selected === position}
						class:associer-glissee={drag?.moved && drag.from === null && drag.label === position}
						data-associer-focus={position === 0 ? '' : undefined}
						aria-label="Étiquette {position + 1} sur {labelCount}"
						aria-describedby="{uid}-etiquette-{position}"
						aria-pressed={selected === position}
						disabled={locked}
						onclick={() => onTrayClick(position)}
						onkeydown={onKeydown}
						onpointerdown={(event) => onPointerDown(event, position, null)}
					>
						<span id="{uid}-etiquette-{position}">{@render label(position)}</span>
					</button>
				{/each}
			</div>
		{/if}

		<div class="associer-rangees" class:associer-avec-blocs={withBlocks}>
			{#each node.items as item, k (k)}
				{@const position = placed[k]}
				{@const correct = solution?.[k] ?? null}
				<div class="associer-element" id="{uid}-element-{k}">
					<AssocierContenu content={item} />
				</div>
				<div class="associer-cellule">
					{#if showControls}
						<button
							type="button"
							class="associer-place"
							class:associer-place-vide={position === null}
							class:associer-juste={verdicts[k] === true}
							class:associer-faux={verdicts[k] === false}
							data-associer-place={k}
							aria-label={placeName(k, position)}
							aria-describedby="{uid}-element-{k}{position === null ? '' : ` ${uid}-place-${k}`}"
							disabled={locked}
							onclick={() => onPlaceClick(k)}
							onkeydown={onKeydown}
							onpointerdown={(event) => position !== null && onPointerDown(event, position, k)}
						>
							{#if position !== null}
								<span id="{uid}-place-{k}">{@render label(position)}</span>
							{/if}
						</button>
					{:else}
						<span
							class="associer-place"
							class:associer-place-vide={position === null}
							class:associer-juste={verdicts[k] === true}
							class:associer-faux={verdicts[k] === false}
						>
							{#if position !== null}{@render label(position)}{/if}
						</span>
					{/if}
					{#if verdicts[k] === false && correct !== null}
						<span class="associer-correction text-sm">
							<span class="text-muted-foreground">Correction :</span>
							{@render label(correct)}
						</span>
					{/if}
				</div>
			{/each}
		</div>

		{#if judged}
			<p class="sr-only" role="status">{allRight ? 'réponse juste' : 'réponse fausse'}</p>
		{/if}
	{/if}

	{#if drag?.moved}
		<!-- L'étiquette sous le doigt -->
		<span
			class="associer-etiquette associer-fantome"
			style:left="{drag.x}px"
			style:top="{drag.y}px"
			aria-hidden="true"
		>
			{@render label(drag.label)}
		</span>
	{/if}
</div>

<style>
	.associer-etiquette,
	.associer-place {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 3rem;
		min-height: 2.75rem;
		padding: 0.25rem 0.75rem;
		border: 1px solid var(--color-border);
		border-radius: 0.5rem;
		background: var(--color-background);
		color: var(--color-foreground);
		overflow-wrap: anywhere;
		/* Le doigt glisse l'étiquette, la page ne défile pas ; iPhone : ni loupe ni sélection */
		touch-action: none;
		-webkit-user-select: none;
		user-select: none;
		-webkit-touch-callout: none;
	}

	.associer-etiquette {
		cursor: grab;
		box-shadow: 0 1px 2px color-mix(in oklab, var(--color-foreground) 15%, transparent);
	}

	.associer-etiquette:focus-visible,
	.associer-place:focus-visible {
		outline: 2px solid var(--color-ring);
		outline-offset: 2px;
	}

	.associer-prise {
		border-color: var(--color-primary);
		background: var(--color-primary);
		color: var(--color-primary-foreground);
	}

	.associer-glissee {
		opacity: 0.3;
	}

	.associer-fantome {
		position: fixed;
		z-index: 50;
		pointer-events: none;
		transform: translate(-50%, -50%);
		border-color: var(--color-primary);
	}

	/* Une rangée par élément : l'élément, puis sa place ; colonnes égales, même au téléphone */
	.associer-rangees {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
		align-items: center;
		gap: 0.5rem 1rem;
	}

	/* Courbes à gauche : la courbe garde sa place à côté de la place à remplir */
	.associer-avec-blocs {
		grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
	}

	.associer-element {
		min-width: 0;
		text-align: right;
		overflow-wrap: anywhere;
	}

	.associer-cellule {
		display: flex;
		min-width: 0;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.25rem;
	}

	.associer-place {
		width: 100%;
		max-width: 16rem;
		justify-content: flex-start;
	}

	.associer-place-vide {
		border-style: dashed;
		border-color: var(--color-muted-foreground);
	}

	.associer-place:disabled {
		cursor: default;
	}

	.associer-juste {
		border-color: var(--color-success);
		border-width: 2px;
	}

	.associer-faux {
		border-color: var(--color-destructive);
		border-width: 2px;
	}

	.associer-correction {
		display: inline-flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.25rem;
	}
</style>
