<!--
	RangerPlacer — étiquettes à ranger (```ranger)
	==============================================

	L'élève range des étiquettes (chantier `docs/wip/reponses-a-placer-progress.md`
	§ 21, 22) : les étiquettes mélangées en haut, en dessous les places vides
	séparées du signe (`□ < □ < □`).

	- Glisser une étiquette sur une place ; ou toucher l'étiquette, puis la place.
	  Place déjà prise : les deux étiquettes s'échangent (venue d'en haut, l'autre
	  remonte). Toucher une étiquette posée la renvoie en haut ; la glisser en haut
	  aussi.
	- Clavier : Tab, Entrée (prendre, poser), flèches (d'une étiquette ou d'une place
	  à la voisine, ↑ ↓ d'une rangée à l'autre), Échap (lâcher).
	- Nom accessible : « Étiquette 2 sur 3 : … », « Place 1 sur 3, vide » — jamais
	  l'ordre juste.
	- Dans une question (`answers`, une case par place) : la réponse de chaque place
	  est la position AFFICHÉE de l'étiquette posée (`2`), `''` tant qu'elle est vide.
	  Corrigé : places fausses marquées ; avec `expected`, le rangement juste à côté.
	- Sans `answers` (cours, page d'aide, aperçu) : le même geste, rien de jugé.

	@module components/markdown/nodes/RangerPlacer
-->
<script lang="ts">
	import type { RangerNode } from '$lib/ubumark/types/ranger';
	import { displayedLabels, placedOfAnswer } from '$lib/ubumark/utils/ranger';
	import InlineMarkdown from '../InlineMarkdown.svelte';
	import type { BuildCase } from './CollectionConstruire.svelte';

	interface Props {
		node: RangerNode;
		/** Une case par place, de gauche à droite ; absentes : geste libre */
		answers?: BuildCase[];
		/** Bonne réponse de chaque place (positions affichées) : le rangement juste, si faux */
		expected?: readonly string[];
		/** false : les places seules, sans les étiquettes d'en haut (copie corrigée) */
		showControls?: boolean;
		class?: string;
	}

	let { node, answers, expected, showControls = true, class: className = '' }: Props = $props();

	/** Au-delà, un appui devient un glissement (px) */
	const DRAG_THRESHOLD = 6;

	const uid = $props.id();

	let labels = $derived(displayedLabels(node));
	let count = $derived(labels.length);
	let signText = $derived(node.sign === '>' ? '>' : '<');
	let signSpoken = $derived(node.sign === '>' ? 'plus grand que' : 'plus petit que');

	/**
	 * Étiquette posée à chaque place (position affichée), `null` : vide. Relue quand
	 * une case change (case remise à vide, composant remonté) ; réassignée à chaque
	 * geste (dérivé modifiable). Une étiquette posée deux fois ne compte qu'une fois.
	 */
	let placed = $derived.by<(number | null)[]>(() => {
		const seen: number[] = [];
		return Array.from({ length: count }, (_, k) => {
			const position = placedOfAnswer(answers?.[k]?.value ?? '', count);
			if (position === null || seen.includes(position)) return null;
			seen.push(position);
			return position;
		});
	});
	let locked = $derived(answers?.[0]?.disabled ?? false);
	/** Étiquette prise (toucher, Entrée), en attente d'une place */
	let selected = $state<number | null>(null);

	let verdicts = $derived(placed.map((_, k) => answers?.[k]?.isCorrect ?? null));
	let judged = $derived(verdicts.some((v) => v !== null));
	let allRight = $derived(judged && verdicts.every((v) => v === true));
	let solution = $derived.by(() => {
		if (!expected || expected.length !== count) return null;
		const positions = expected.map((value) => placedOfAnswer(value, count));
		return positions.every((p) => p !== null) ? (positions as number[]) : null;
	});

	/** Glissement en cours : l'étiquette, d'où elle vient, le doigt */
	let drag = $state<{
		label: number;
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

	/** Pose `label` à la place `k` : échange si elle est prise */
	function put(label: number, k: number) {
		const next = [...placed];
		const from = next.indexOf(label);
		if (from === k) return;
		const occupant = next[k];
		next[k] = label;
		// Venue d'une place : l'autre étiquette y va ; venue d'en haut : l'autre remonte
		if (from !== -1) next[from] = occupant;
		emit(next);
	}

	/** Renvoie `label` en haut */
	function lift(label: number) {
		emit(placed.map((position) => (position === label ? null : position)));
	}

	function onTrayClick(label: number) {
		if (locked || swallowClick) return;
		selected = selected === label ? null : label;
	}

	function onPlaceClick(k: number) {
		if (locked || swallowClick) return;
		if (selected !== null) {
			put(selected, k);
			selected = null;
			return;
		}
		const occupant = placed[k];
		if (occupant !== null) lift(occupant);
	}

	function onPointerDown(event: PointerEvent, label: number) {
		if (locked || event.button !== 0) return;
		swallowClick = false;
		drag = {
			label,
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
		const { label, moved } = drag;
		drag = null;
		if (!moved) return;
		// Glissé : le clic qui suit (même bouton) ne doit pas reprendre l'étiquette
		swallowClick = true;
		setTimeout(() => (swallowClick = false), 0);
		selected = null;
		const target = document.elementFromPoint(event.clientX, event.clientY);
		const place = target?.closest<HTMLElement>('[data-ranger-place]');
		if (place && root?.contains(place)) {
			put(label, Number(place.dataset.rangerPlace));
			return;
		}
		const tray = target?.closest<HTMLElement>('[data-ranger-tray]');
		if (tray && root?.contains(tray)) lift(label);
	}

	function onPointerCancel() {
		drag = null;
	}

	/** Flèches : d'un bouton à son voisin dans la rangée, ↑ ↓ d'une rangée à l'autre */
	function onKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			selected = null;
			return;
		}
		const current = event.target as HTMLElement;
		const row = current.closest<HTMLElement>('[data-ranger-row]');
		if (!row || !root) return;
		const buttons = (element: HTMLElement) => [
			...element.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')
		];
		if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
			const list = buttons(row);
			const index = list.indexOf(current as HTMLButtonElement);
			const next = list[index + (event.key === 'ArrowLeft' ? -1 : 1)];
			if (next) {
				event.preventDefault();
				next.focus();
			}
		} else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
			const rows = [...root.querySelectorAll<HTMLElement>('[data-ranger-row]')];
			const other = rows[rows.indexOf(row) + (event.key === 'ArrowUp' ? -1 : 1)];
			const first = other ? buttons(other)[0] : undefined;
			if (first) {
				event.preventDefault();
				first.focus();
			}
		}
	}

	function placeName(k: number, position: number | null): string {
		const state = position === null ? 'vide' : `étiquette ${position + 1}`;
		const verdict = verdicts[k] === true ? ', juste' : verdicts[k] === false ? ', fausse' : '';
		return `Place ${k + 1} sur ${count}, ${state}${verdict}`;
	}
</script>

{#snippet label(position: number)}
	<span class="ranger-contenu"><InlineMarkdown content={labels[position]} /></span>
{/snippet}

{#snippet places(
	filled: readonly (number | null)[],
	marks: readonly (boolean | null)[],
	live: boolean
)}
	<div
		class="ranger-places flex flex-wrap items-center justify-center gap-2"
		data-ranger-row={live ? '' : undefined}
	>
		{#each filled as position, k (k)}
			{#if k > 0}
				<span class="ranger-signe text-lg" aria-hidden="true">{signText}</span>
				<span class="sr-only">{signSpoken}</span>
			{/if}
			{#if live}
				<button
					type="button"
					class="ranger-place"
					class:ranger-place-vide={position === null}
					class:ranger-juste={marks[k] === true}
					class:ranger-faux={marks[k] === false}
					data-ranger-place={k}
					data-ranger-focus={k === 0 ? '' : undefined}
					aria-label={placeName(k, position)}
					aria-describedby={position === null ? undefined : `${uid}-place-${k}`}
					disabled={locked}
					onclick={() => onPlaceClick(k)}
					onkeydown={onKeydown}
					onpointerdown={(event) => position !== null && onPointerDown(event, position)}
				>
					{#if position !== null}
						<span id="{uid}-place-{k}">{@render label(position)}</span>
					{/if}
				</button>
			{:else}
				<span
					class="ranger-place"
					class:ranger-place-vide={position === null}
					class:ranger-juste={marks[k] === true}
					class:ranger-faux={marks[k] === false}
				>
					{#if position !== null}{@render label(position)}{/if}
				</span>
			{/if}
		{/each}
	</div>
{/snippet}

<svelte:window
	onpointermove={onPointerMove}
	onpointerup={onPointerUp}
	onpointercancel={onPointerCancel}
/>

<div
	bind:this={root}
	class="ranger my-3 flex flex-col items-center gap-3 {className}"
	role="group"
	aria-labelledby="{uid}-consigne"
>
	<p id="{uid}-consigne" class="sr-only">
		Étiquettes à ranger, du {node.sign === '>'
			? 'plus grand au plus petit'
			: 'plus petit au plus grand'}
		{selected !== null ? `; étiquette ${selected + 1} prise, choisis sa place` : ''}
	</p>

	{#if node.errors.length > 0}
		<ul class="text-sm text-destructive" role="alert">
			{#each node.errors as error (error)}
				<li>Bloc ranger : {error}</li>
			{/each}
		</ul>
	{:else}
		{#if showControls}
			<div
				class="ranger-etiquettes flex min-h-12 flex-wrap items-center justify-center gap-2"
				data-ranger-tray
				data-ranger-row
			>
				{#each labels as _, position (position)}
					{@const isPlaced = placed.includes(position)}
					<button
						type="button"
						class="ranger-etiquette"
						class:ranger-posee={isPlaced}
						class:ranger-prise={selected === position}
						class:ranger-glissee={drag?.moved && drag.label === position}
						data-ranger-focus={isPlaced ? undefined : ''}
						aria-label="Étiquette {position + 1} sur {count}{isPlaced ? ', posée' : ''}"
						aria-describedby="{uid}-etiquette-{position}"
						aria-pressed={selected === position}
						disabled={locked || isPlaced}
						tabindex={isPlaced ? -1 : undefined}
						onclick={() => onTrayClick(position)}
						onkeydown={onKeydown}
						onpointerdown={(event) => onPointerDown(event, position)}
					>
						<span id="{uid}-etiquette-{position}">{@render label(position)}</span>
					</button>
				{/each}
			</div>
		{/if}

		{@render places(placed, verdicts, showControls)}

		{#if judged}
			<p class="sr-only" role="status">{allRight ? 'réponse juste' : 'réponse fausse'}</p>
		{/if}

		{#if judged && !allRight && solution}
			<div class="ranger-correction flex flex-col items-center gap-1">
				<p class="text-sm font-medium text-muted-foreground">Correction</p>
				{@render places(solution, [], false)}
			</div>
		{/if}
	{/if}

	{#if drag?.moved}
		<!-- L'étiquette sous le doigt -->
		<span
			class="ranger-etiquette ranger-fantome"
			style:left="{drag.x}px"
			style:top="{drag.y}px"
			aria-hidden="true"
		>
			{@render label(drag.label)}
		</span>
	{/if}
</div>

<style>
	.ranger-etiquette,
	.ranger-place {
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
		/* Le doigt glisse l'étiquette, la page ne défile pas ; iPhone : ni loupe ni sélection */
		touch-action: none;
		-webkit-user-select: none;
		user-select: none;
		-webkit-touch-callout: none;
	}

	.ranger-etiquette {
		cursor: grab;
		box-shadow: 0 1px 2px color-mix(in oklab, var(--color-foreground) 15%, transparent);
	}

	.ranger-etiquette:focus-visible,
	.ranger-place:focus-visible {
		outline: 2px solid var(--color-ring);
		outline-offset: 2px;
	}

	/* Posée en bas : sa place en haut reste marquée, vide */
	.ranger-posee {
		visibility: hidden;
	}

	.ranger-prise {
		border-color: var(--color-primary);
		background: var(--color-primary);
		color: var(--color-primary-foreground);
	}

	.ranger-glissee {
		opacity: 0.3;
	}

	.ranger-fantome {
		position: fixed;
		z-index: 50;
		pointer-events: none;
		transform: translate(-50%, -50%);
		border-color: var(--color-primary);
	}

	.ranger-place {
		min-width: 3.5rem;
	}

	.ranger-place-vide {
		border-style: dashed;
		border-color: var(--color-muted-foreground);
	}

	.ranger-place:disabled {
		cursor: default;
	}

	.ranger-juste {
		border-color: var(--color-success);
		border-width: 2px;
	}

	.ranger-faux {
		border-color: var(--color-destructive);
		border-width: 2px;
	}

	.ranger-signe {
		color: var(--color-foreground);
	}
</style>
