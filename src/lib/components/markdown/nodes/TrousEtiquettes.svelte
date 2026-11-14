<!--
	TrousEtiquettes — texte à trous à étiquettes (```trous)
	=======================================================

	Même mécanique que le geste `étiquettes` d'un ```associer
	(`AssocierEtiquettes.svelte`), mais les places sont DANS le texte (chantier
	`docs/wip/trous-etiquettes-progress.md`) : la réserve en haut, chaque étiquette
	une fois, mélangée ; puis le texte, chaque trou étant une place en ligne, de la
	largeur de la plus longue étiquette, qui suit le texte quand il revient à la ligne.

	- Glisser une étiquette sur une place ; ou toucher l'étiquette, puis la place.
	  Une étiquette reste en haut une fois posée : elle peut servir à plusieurs
	  trous. Une étiquette posée se glisse vers une autre place (échange si elle
	  est prise) ; glissée en haut, ou touchée, elle est retirée.
	- Clavier : Tab, Entrée (prendre, poser), flèches (← → dans les étiquettes,
	  ↓ vers le premier trou ; d'un trou à l'autre, ↑ du premier trou vers les
	  étiquettes), Échap (lâcher).
	- Nom accessible : « Étiquette 2 sur 5 », « Trou 1 sur 4, vide » — jamais la
	  bonne étiquette.
	- Dans une question (`answers`, une case par trou) : la réponse de chaque place
	  est la position AFFICHÉE de l'étiquette posée (`2`), `''` tant qu'elle est vide.
	  Corrigé : places justes en vert, fausses en rouge, et avec `expected`, la bonne
	  étiquette sous une place fausse.
	- Sans `answers` (cours, page d'aide, aperçu) : le même geste, rien de jugé.

	@module components/markdown/nodes/TrousEtiquettes
-->
<script lang="ts">
	import type { TrousNode } from '$lib/ubumark/types/trous';
	import { displayedTrousLabels, trousPieces, trousPlacedOf } from '$lib/ubumark/utils/trous';
	import InlineMarkdown from '../InlineMarkdown.svelte';
	import type { BuildCase } from './CollectionConstruire.svelte';

	interface Props {
		node: TrousNode;
		/** Une case par trou, dans l'ordre du texte ; absentes : geste libre */
		answers?: BuildCase[];
		/** Bonne réponse de chaque trou (positions affichées) : la bonne étiquette sous une place fausse */
		expected?: readonly string[];
		/** false : le texte seul, sans la réserve (copie corrigée, bonne réponse) */
		showControls?: boolean;
		class?: string;
	}

	let { node, answers, expected, showControls = true, class: className = '' }: Props = $props();

	/** Au-delà, un appui devient un glissement (px) */
	const DRAG_THRESHOLD = 6;

	const uid = $props.id();

	let labels = $derived(displayedTrousLabels(node));
	let labelCount = $derived(labels.length);
	let count = $derived(node.answers.length);
	/** Lignes du texte, la ponctuation qui suit un trou collée à lui */
	let rows = $derived(node.lines.map(trousPieces));

	/**
	 * Étiquette posée à chaque place (position affichée), `null` : vide. Relue quand
	 * une case change ; réassignée à chaque geste (dérivé modifiable).
	 */
	let placed = $derived.by<(number | null)[]>(() =>
		Array.from({ length: count }, (_, k) => trousPlacedOf(answers?.[k]?.value ?? '', labelCount))
	);
	let locked = $derived(answers?.[0]?.disabled ?? false);
	/** Étiquette prise (toucher, Entrée), en attente d'une place */
	let selected = $state<number | null>(null);

	let verdicts = $derived(placed.map((_, k) => answers?.[k]?.isCorrect ?? null));
	let judged = $derived(verdicts.some((v) => v !== null));
	let allRight = $derived(judged && verdicts.every((v) => v === true));
	let solution = $derived.by(() => {
		if (!expected || expected.length !== count) return null;
		return expected.map((value) => trousPlacedOf(value, labelCount));
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
		const place = target?.closest<HTMLElement>('[data-trous-place]');
		if (place && root?.contains(place)) {
			put(label, Number(place.dataset.trousPlace), from);
			return;
		}
		const tray = target?.closest<HTMLElement>('[data-trous-tray]');
		if (from !== null && tray && root?.contains(tray)) clear(from);
	}

	function onPointerCancel(event: PointerEvent) {
		if (drag && event.pointerId === drag.pointerId) drag = null;
	}

	/** Flèches : ← → dans les étiquettes, ↓ vers les trous ; d'un trou à l'autre, ↑ vers les étiquettes */
	function onKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			selected = null;
			return;
		}
		if (!root) return;
		const current = event.target as HTMLElement;
		const trayButtons = [
			...root.querySelectorAll<HTMLButtonElement>('[data-trous-tray] button:not(:disabled)')
		];
		const placeButtons = [
			...root.querySelectorAll<HTMLButtonElement>('button[data-trous-place]:not(:disabled)')
		];
		const inTray = trayButtons.indexOf(current as HTMLButtonElement);
		const inPlaces = placeButtons.indexOf(current as HTMLButtonElement);
		let next: HTMLButtonElement | undefined;
		if (inTray !== -1) {
			if (event.key === 'ArrowLeft') next = trayButtons[inTray - 1];
			else if (event.key === 'ArrowRight') next = trayButtons[inTray + 1];
			else if (event.key === 'ArrowDown') next = placeButtons[0];
		} else if (inPlaces !== -1) {
			if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
				next = placeButtons[inPlaces - 1] ?? (event.key === 'ArrowUp' ? trayButtons[0] : undefined);
			} else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
				next = placeButtons[inPlaces + 1];
			}
		}
		if (next) {
			event.preventDefault();
			next.focus();
		}
	}

	function placeName(k: number, position: number | null): string {
		const state = position === null ? 'vide' : `étiquette ${position + 1}`;
		const verdict = verdicts[k] === true ? ', juste' : verdicts[k] === false ? ', fausse' : '';
		return `Trou ${k + 1} sur ${count}, ${state}${verdict}`;
	}
</script>

{#snippet label(position: number)}
	<span class="trous-contenu"><InlineMarkdown content={labels[position]} /></span>
{/snippet}

{#snippet text(content: string)}
	<!-- Espaces de bord gardés : le parseur les retirerait, « est » collerait au trou -->
	{#if /^\s/.test(content)}{' '}{/if}{#if content.trim() !== ''}<InlineMarkdown
			content={content.trim()}
		/>{/if}{#if /\s$/.test(content) && content.trim() !== ''}{' '}{/if}
{/snippet}

{#snippet sizer()}
	<!-- Toutes les étiquettes, invisibles, empilées : la place prend la largeur de la plus longue -->
	<span class="trous-gabarit" aria-hidden="true">
		{#each labels as _, position (position)}
			{@render label(position)}
		{/each}
	</span>
{/snippet}

<svelte:window
	onpointermove={onPointerMove}
	onpointerup={onPointerUp}
	onpointercancel={onPointerCancel}
/>

<div
	bind:this={root}
	class="trous my-3 flex flex-col gap-3 {className}"
	role="group"
	aria-labelledby="{uid}-consigne"
>
	<p id="{uid}-consigne" class="sr-only">
		Poser une étiquette dans chaque trou du texte ; une étiquette peut servir plusieurs fois
		{selected !== null ? `; étiquette ${selected + 1} prise, choisis son trou` : ''}
	</p>

	{#if node.errors.length > 0}
		<ul class="text-sm text-destructive" role="alert">
			{#each node.errors as error, i (i)}
				<li>Bloc trous : {error}</li>
			{/each}
		</ul>
	{:else}
		{#if showControls}
			<div
				class="trous-etiquettes flex min-h-12 flex-wrap items-center justify-center gap-2"
				data-trous-tray
			>
				{#each labels as _, position (position)}
					<button
						type="button"
						class="trous-etiquette"
						class:trous-prise={selected === position}
						class:trous-glissee={drag?.moved && drag.from === null && drag.label === position}
						data-trous-focus={position === 0 ? '' : undefined}
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

		<div class="trous-texte">
			{#each rows as line, l (l)}
				<p class="trous-ligne">
					{#each line as segment, s (s)}
						{#if segment.kind === 'text'}
							{@render text(segment.text)}
						{:else}
							{@const k = segment.hole}
							{@const position = placed[k] ?? null}
							{@const correct = solution?.[k] ?? null}
							<span class="trous-attache"
								><span class="trous-cellule">
									{#if showControls}
										<button
											type="button"
											class="trous-place"
											class:trous-place-vide={position === null}
											class:trous-juste={verdicts[k] === true}
											class:trous-faux={verdicts[k] === false}
											data-trous-place={k}
											aria-label={placeName(k, position)}
											aria-describedby={position === null ? undefined : `${uid}-place-${k}`}
											disabled={locked}
											onclick={() => onPlaceClick(k)}
											onkeydown={onKeydown}
											onpointerdown={(event) =>
												position !== null && onPointerDown(event, position, k)}
										>
											{@render sizer()}
											{#if position !== null}
												<span class="trous-pose" id="{uid}-place-{k}"
													>{@render label(position)}</span
												>
											{/if}
										</button>
									{:else}
										<span
											class="trous-place"
											class:trous-place-vide={position === null}
											class:trous-juste={verdicts[k] === true}
											class:trous-faux={verdicts[k] === false}
										>
											{@render sizer()}
											{#if position !== null}
												<span class="trous-pose">{@render label(position)}</span>
											{/if}
										</span>
									{/if}
									{#if verdicts[k] === false && correct !== null}
										<span class="trous-correction text-sm">
											<span class="text-muted-foreground">Correction :</span>
											{@render label(correct)}
										</span>
									{/if}
								</span>{segment.glue}</span
							>
						{/if}
					{/each}
				</p>
			{/each}
		</div>

		{#if judged}
			<p class="sr-only" role="status">{allRight ? 'réponse juste' : 'réponse fausse'}</p>
		{/if}
	{/if}

	{#if drag?.moved}
		<!-- L'étiquette sous le doigt -->
		<span
			class="trous-etiquette trous-fantome"
			style:left="{drag.x}px"
			style:top="{drag.y}px"
			aria-hidden="true"
		>
			{@render label(drag.label)}
		</span>
	{/if}
</div>

<style>
	.trous-etiquette,
	.trous-place {
		align-items: center;
		min-height: 2.5rem;
		padding: 0.2rem 0.6rem;
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

	.trous-etiquette {
		display: inline-flex;
		justify-content: center;
		min-width: 3rem;
		cursor: grab;
		box-shadow: 0 1px 2px color-mix(in oklab, var(--color-foreground) 15%, transparent);
	}

	.trous-etiquette:focus-visible,
	.trous-place:focus-visible {
		outline: 2px solid var(--color-ring);
		outline-offset: 2px;
	}

	.trous-prise {
		border-color: var(--color-primary);
		background: var(--color-primary);
		color: var(--color-primary-foreground);
	}

	.trous-glissee {
		opacity: 0.3;
	}

	.trous-fantome {
		position: fixed;
		z-index: 50;
		pointer-events: none;
		transform: translate(-50%, -50%);
		border-color: var(--color-primary);
	}

	/* Le texte : les places coulent dedans, et reviennent à la ligne avec lui */
	.trous-ligne {
		margin: 0;
		line-height: 2.9rem;
	}

	.trous-ligne + .trous-ligne {
		margin-top: 0.25rem;
	}

	/* Le trou et la ponctuation qui le suit : jamais séparés par un retour à la ligne */
	.trous-attache {
		display: inline-block;
		max-width: 100%;
		white-space: nowrap;
	}

	.trous-cellule {
		white-space: normal;
		display: inline-flex;
		max-width: 100%;
		flex-direction: column;
		align-items: flex-start;
		vertical-align: middle;
		line-height: normal;
	}

	/* La place : la plus longue étiquette (invisible) et l'étiquette posée, superposées */
	.trous-place {
		display: inline-grid;
		max-width: 100%;
		min-width: 3rem;
		vertical-align: middle;
		justify-items: center;
	}

	.trous-place > :global(*),
	.trous-gabarit > :global(*) {
		grid-area: 1 / 1;
	}

	.trous-gabarit {
		display: grid;
		visibility: hidden;
	}

	.trous-place-vide {
		border-style: dashed;
		border-color: var(--color-muted-foreground);
	}

	.trous-place:disabled {
		cursor: default;
	}

	.trous-juste {
		border-color: var(--color-success);
		border-width: 2px;
	}

	.trous-faux {
		border-color: var(--color-destructive);
		border-width: 2px;
	}

	.trous-correction {
		display: inline-flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.25rem;
	}
</style>
