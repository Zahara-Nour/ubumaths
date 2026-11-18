<!--
	RobotCode.svelte
	================

	Bloc ```robot (chantier `suite-fleches`, journal `docs/wip/suite-fleches-progress.md`).
	Sans `produire:` : le quadrillage seul. Avec `produire: oui` : l'élève compose le code qui
	mène le robot à la case verte (CE1-080), avec des cartes.

	- Réserve jamais épuisée : `←` `↑` `→` `↓` (flèches) ; « avance de … », « pivote à
	  gauche », « pivote à droite » (avance-pivote). Bande « Mon code », de gauche à droite.
	- Toucher une carte de la réserve l'ajoute au bout du code ; la glisser l'insère où on la
	  lâche. Toucher une carte posée la retire ; la glisser la déplace ; la glisser sur la
	  réserve la retire. « Effacer la dernière », « Tout effacer ».
	- Clavier : ← → d'un bouton à l'autre d'une rangée ; Alt + ← → déplace la carte posée qui a
	  le focus. Le focus ne se perd jamais : il suit la carte, ou va à sa voisine, au premier
	  chiffre quand la rangée de chiffres s'ouvre, à la réserve quand la bande se vide.
	- « avance de » : une rangée de chiffres 1 à 9 s'ouvre sous le code ; toucher la carte
	  plus tard la rouvre (avec « Retirer »). Tant qu'un « avance de » n'a pas son chiffre, la
	  réponse est vide (et l'élève voit pourquoi).
	- 15 cartes au plus : la réserve se grise, « 15 instructions au plus ».
	- Réponse de la case : le code en notation texte (`ecrireCode`), jugé par le serveur en le
	  rejouant. Pas de bouton « Essayer » (phase 0, Q4) : le trajet se voit après la validation,
	  vert s'il arrive, rouge sinon, le trajet d'un code juste en pointillés.
	- Hors question (aperçu, cours) : le geste libre, rien de jugé.

	@module components/markdown/nodes/RobotCode
-->
<script module lang="ts">
	import { ROBOT_MAX_INSTRUCTIONS as MAX } from '#lib/ubumark/types/robot.ts';

	export const ROBOT_TROP_DE_CARTES = `${MAX} instructions au plus.`;
	export const ROBOT_CHIFFRE_MANQUANT = 'Choisis de combien de cases avance le robot.';
</script>

<script lang="ts">
	import { tick } from 'svelte';
	import { readExpectedRobotAnswer } from '#lib/ubumark/utils/robot-answer.ts';
	import { ecrireCode, lireCode, simuler } from '#lib/ubumark/utils/robot-moteur.ts';
	import {
		ROBOT_MAX_AVANCE,
		ROBOT_MAX_INSTRUCTIONS,
		ROBOT_UNAVAILABLE,
		type Instruction,
		type RobotNode,
		type Sens
	} from '#lib/ubumark/types/robot.ts';
	import { readAuthoringErrors } from '../authoring-errors';
	import type { BuildCase } from './CollectionConstruire.svelte';
	import RobotQuadrillage from './RobotQuadrillage.svelte';

	// =============================================================================
	// Types
	// =============================================================================

	/** Une carte : une instruction, « avance de » peut attendre son chiffre */
	type Modele =
		| { kind: 'flèche'; sens: Sens }
		| { kind: 'avance'; pas: number | null }
		| { kind: 'pivote'; cote: 'gauche' | 'droite' };

	type Carte = Modele & { id: number };

	interface Props {
		node: RobotNode;
		/** La case de la question ; absente : geste libre, rien de jugé */
		answer?: BuildCase;
		/** Réponse attendue de la case (`<scène> | <code>`) : le trajet juste en pointillés */
		expected?: string;
		/** Forcer l'affichage des erreurs d'auteur ; sinon, contexte du renderer */
		showErrors?: boolean;
		class?: string;
	}

	// =============================================================================
	// Constantes
	// =============================================================================

	/** Au-delà, un appui devient un glissement (px) */
	const DRAG_THRESHOLD = 6;

	const FLECHE: Record<Sens, string> = { haut: '↑', droite: '→', bas: '↓', gauche: '←' };
	const FLECHE_DITE: Record<Sens, string> = {
		haut: 'flèche vers le haut',
		droite: 'flèche vers la droite',
		bas: 'flèche vers le bas',
		gauche: 'flèche vers la gauche'
	};

	const RESERVE_FLECHES: Modele[] = (['gauche', 'haut', 'droite', 'bas'] as const).map((sens) => ({
		kind: 'flèche',
		sens
	}));
	const RESERVE_AVANCE_PIVOTE: Modele[] = [
		{ kind: 'avance', pas: null },
		{ kind: 'pivote', cote: 'gauche' },
		{ kind: 'pivote', cote: 'droite' }
	];
	const CHIFFRES = Array.from({ length: ROBOT_MAX_AVANCE }, (_, i) => i + 1);

	// =============================================================================
	// Props
	// =============================================================================

	let { node, answer, expected, showErrors, class: className = '' }: Props = $props();

	const uid = $props.id();
	const authoring = readAuthoringErrors();
	let errorsVisible = $derived(showErrors ?? authoring());

	// =============================================================================
	// Variables
	// =============================================================================

	let prochainId = 0;
	/** Code du geste libre (sans case) */
	let libre = $state('');
	/**
	 * Les cartes du dernier geste et la réponse qu'elles ont donnée (pas un état : lu quand la
	 * case change) : gardées si la case dit cette réponse — un « avance de » sans chiffre donne
	 * une réponse vide, il ne doit pas disparaître ; sinon, les cartes sont relues de la case.
	 */
	let dernierGeste: { valeur: string; cartes: Carte[] } | null = null;
	/** « avance de » dont la rangée de chiffres est ouverte */
	let choix = $state<number | null>(null);
	let drag = $state<{
		source: { from: 'reserve'; modele: Modele } | { from: 'code'; id: number };
		pointerId: number;
		startX: number;
		startY: number;
		x: number;
		y: number;
		moved: boolean;
	} | null>(null);
	/**
	 * Un glissement vient de finir : le clic souris qui suit ne compte pas. Remis à faux au
	 * prochain appui (jamais par un minuteur : le clic peut arriver après) ; un clic clavier
	 * (`detail === 0`) n'est jamais avalé.
	 */
	let swallowClick = false;
	let root: HTMLElement | undefined = $state();

	// =============================================================================
	// État dérivé
	// =============================================================================

	let spec = $derived(node.spec);
	let valeur = $derived(answer ? answer.value : libre);
	/** Relues quand la case change ; réassignées à chaque geste (dérivé modifiable) */
	let cartes = $derived.by((): Carte[] => {
		if (dernierGeste !== null && dernierGeste.valeur === valeur) return dernierGeste.cartes;
		if (spec === null || valeur === '') return [];
		const lu = lireCode(valeur, spec.codage);
		return lu.ok ? lu.instructions.map((i) => ({ ...i, id: prochainId++ })) : [];
	});
	let reserve = $derived(
		spec?.codage === 'avance-pivote' ? RESERVE_AVANCE_PIVOTE : RESERVE_FLECHES
	);
	let verdict = $derived(answer?.isCorrect ?? null);
	let verrouille = $derived((answer?.disabled ?? false) || verdict !== null);
	let plein = $derived(cartes.length >= ROBOT_MAX_INSTRUCTIONS);
	let chiffreManquant = $derived(cartes.some((c) => c.kind === 'avance' && c.pas === null));
	let carteChoisie = $derived(cartes.find((c) => c.id === choix) ?? null);
	/** La carte sous le doigt, pendant un glissement */
	let carteGlissee = $derived.by((): Modele | null => {
		if (!drag?.moved) return null;
		const source = drag.source;
		if (source.from === 'reserve') return source.modele;
		return cartes.find((c) => c.id === source.id) ?? null;
	});

	/** Après la validation : le trajet de l'élève */
	let trajet = $derived.by(() => {
		if (verdict === null || spec === null) return null;
		const lu = lireCode(valeur, spec.codage);
		return lu.ok ? simuler(spec, lu.instructions) : null;
	});
	/** Faux : le trajet d'un code juste (la réponse attendue, sinon le bloc) */
	let attendu = $derived.by(() => {
		if (verdict !== false || spec === null) return null;
		const solution =
			(expected !== undefined ? readExpectedRobotAnswer(expected)?.solution : undefined) ??
			(spec.solution ? ecrireCode(spec.solution, spec.codage) : null);
		if (solution === null) return null;
		const lu = lireCode(solution, spec.codage);
		return lu.ok ? simuler(spec, lu.instructions).chemin : null;
	});

	// =============================================================================
	// Fonctions
	// =============================================================================

	function instructionDe(carte: Carte): Instruction | null {
		if (carte.kind === 'flèche') return { kind: 'flèche', sens: carte.sens };
		if (carte.kind === 'pivote') return { kind: 'pivote', cote: carte.cote };
		return carte.pas === null ? null : { kind: 'avance', pas: carte.pas };
	}

	/** Pose les cartes et donne la réponse : vide tant qu'un « avance de » attend son chiffre */
	function emit(next: Carte[]) {
		if (spec === null) return;
		const instructions = next.map(instructionDe);
		const texte = instructions.some((i) => i === null)
			? ''
			: ecrireCode(instructions as Instruction[], spec.codage);
		dernierGeste = { valeur: texte, cartes: next };
		cartes = next;
		if (answer) answer.onChange(texte);
		else libre = texte;
		if (choix !== null && !next.some((c) => c.id === choix)) choix = null;
	}

	function nouvelle(modele: Modele): Carte {
		return { ...modele, id: prochainId++ };
	}

	/** Après le rendu : le focus sur l'élément visé, si le focus était dans le bloc */
	async function focusSur(selecteur: string) {
		const avait = root?.contains(document.activeElement) ?? false;
		await tick();
		if (avait) root?.querySelector<HTMLElement>(selecteur)?.focus();
	}

	/** Le focus sur une carte posée, sinon sur le premier bouton actif de la réserve */
	function focusCarte(id: number | undefined) {
		void focusSur(
			id === undefined ? '[data-robot-reserve] button:not(:disabled)' : `[data-robot-id="${id}"]`
		);
	}

	/** Ouvre la rangée de chiffres d'un « avance de », le focus sur le chiffre posé ou le premier */
	function ouvrirChiffres(id: number) {
		choix = id;
		const carte = cartes.find((c) => c.id === id);
		const pas = carte?.kind === 'avance' ? carte.pas : null;
		void focusSur(pas === null ? '.robot-chiffre' : '.robot-chiffre[aria-pressed="true"]');
	}

	/** Ajoute une carte de la réserve à la place `at` (au bout par défaut) */
	function ajouter(modele: Modele, at = cartes.length) {
		if (verrouille || plein) return;
		const carte = nouvelle(modele);
		emit([...cartes.slice(0, at), carte, ...cartes.slice(at)]);
		if (carte.kind === 'avance') ouvrirChiffres(carte.id);
		else {
			choix = null;
			// 15e carte : la réserve se grise, le focus passe à la carte posée
			if (plein) focusCarte(carte.id);
		}
	}

	/** Retire une carte ; le focus va à sa voisine (la suivante, sinon la précédente) */
	function retirer(id: number) {
		const k = cartes.findIndex((c) => c.id === id);
		const reste = cartes.filter((c) => c.id !== id);
		emit(reste);
		focusCarte((reste[k] ?? reste[k - 1])?.id);
	}

	function deplacer(id: number, at: number) {
		const from = cartes.findIndex((c) => c.id === id);
		if (from < 0) return;
		const reste = cartes.filter((c) => c.id !== id);
		const cible = at > from ? at - 1 : at;
		emit([...reste.slice(0, cible), cartes[from], ...reste.slice(cible)]);
	}

	function poserChiffre(pas: number) {
		if (choix === null) return;
		const id = choix;
		emit(cartes.map((c) => (c.id === id && c.kind === 'avance' ? { ...c, pas } : c)));
		choix = null;
		// La rangée de chiffres disparaît : le focus revient à la carte
		focusCarte(id);
	}

	/** Un clic souris juste après un glissement ne compte pas ; un clic clavier toujours */
	function clicAvale(event: MouseEvent): boolean {
		return swallowClick && event.detail !== 0;
	}

	function onReserveClick(event: MouseEvent, modele: Modele) {
		if (clicAvale(event)) return;
		ajouter(modele);
	}

	function onCarteClick(event: MouseEvent, carte: Carte) {
		if (verrouille || clicAvale(event)) return;
		if (carte.kind === 'avance') {
			if (choix === carte.id) choix = null;
			else ouvrirChiffres(carte.id);
			return;
		}
		retirer(carte.id);
	}

	function onPointerDown(event: PointerEvent, source: NonNullable<typeof drag>['source']) {
		if (verrouille || event.button !== 0) return;
		swallowClick = false;
		drag = {
			source,
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

	/** Où la carte lâchée s'insère : avant ou après la carte sous le doigt, sinon au bout */
	function placeSous(target: Element | null, clientX: number): number | null {
		const carte = target?.closest<HTMLElement>('[data-robot-pos]');
		if (carte && root?.contains(carte)) {
			const pos = Number(carte.dataset.robotPos);
			const rect = carte.getBoundingClientRect();
			return clientX > rect.left + rect.width / 2 ? pos + 1 : pos;
		}
		const bande = target?.closest<HTMLElement>('[data-robot-bande]');
		return bande && root?.contains(bande) ? cartes.length : null;
	}

	function onPointerUp(event: PointerEvent) {
		if (!drag || event.pointerId !== drag.pointerId) return;
		const { source, moved } = drag;
		drag = null;
		if (!moved) return;
		swallowClick = true;
		const target = document.elementFromPoint(event.clientX, event.clientY);
		const at = placeSous(target, event.clientX);
		if (source.from === 'reserve') {
			if (at !== null) ajouter(source.modele, at);
			return;
		}
		if (at !== null) {
			deplacer(source.id, at);
			return;
		}
		const versReserve = target?.closest<HTMLElement>('[data-robot-reserve]');
		if (versReserve && root?.contains(versReserve)) retirer(source.id);
	}

	function onPointerCancel(event: PointerEvent) {
		if (drag && event.pointerId === drag.pointerId) drag = null;
	}

	/**
	 * Flèches ← → : d'un bouton à son voisin dans la rangée. Alt + ← → sur une carte posée : la
	 * déplace d'un cran (le focus la suit).
	 */
	function onKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			if (choix !== null) focusCarte(choix);
			choix = null;
			return;
		}
		if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
		const current = event.target as HTMLElement;
		const id = current.dataset.robotId;
		if (event.altKey && id !== undefined) {
			event.preventDefault();
			const from = cartes.findIndex((c) => c.id === Number(id));
			const at = event.key === 'ArrowLeft' ? from - 1 : from + 2;
			if (verrouille || from < 0 || at < 0 || at > cartes.length) return;
			deplacer(Number(id), at);
			focusCarte(Number(id));
			return;
		}
		const row = current.closest<HTMLElement>('[data-robot-row]');
		if (!row) return;
		const list = [...row.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];
		const next =
			list[list.indexOf(current as HTMLButtonElement) + (event.key === 'ArrowLeft' ? -1 : 1)];
		if (next) {
			event.preventDefault();
			next.focus();
		}
	}

	function texteCarte(modele: Modele): string {
		if (modele.kind === 'flèche') return FLECHE[modele.sens];
		if (modele.kind === 'pivote') return `pivote à ${modele.cote}`;
		return `avance de ${modele.pas ?? '…'}`;
	}

	function nomCarte(modele: Modele): string {
		if (modele.kind === 'flèche') return FLECHE_DITE[modele.sens];
		if (modele.kind === 'pivote') return `pivote à ${modele.cote}`;
		return modele.pas === null ? 'avance de, chiffre à choisir' : `avance de ${modele.pas}`;
	}
</script>

<svelte:window
	onpointermove={onPointerMove}
	onpointerup={onPointerUp}
	onpointercancel={onPointerCancel}
/>

{#if spec === null || node.errors.length > 0}
	{#if errorsVisible}
		<div class="rounded-md border border-destructive p-3 text-sm text-foreground {className}">
			<p class="font-medium text-destructive">Bloc robot : question non affichée</p>
			<ul class="mt-1 list-disc pl-5">
				{#each node.errors as issue, i (i)}
					<li>{issue.message}</li>
				{/each}
			</ul>
		</div>
	{:else}
		<div
			class="rounded-md border border-dashed border-border p-3 text-center text-sm text-muted-foreground {className}"
		>
			{ROBOT_UNAVAILABLE}
		</div>
	{/if}
{:else if !spec.produire}
	<div class="robot my-3 {className}">
		<RobotQuadrillage scene={spec} />
	</div>
{:else}
	<div
		bind:this={root}
		class="robot my-3 flex flex-col items-stretch gap-3 rounded-md border-2 p-2 {verdict === true
			? 'robot-juste'
			: verdict === false
				? 'robot-faux'
				: 'border-transparent'} {className}"
		role="group"
		aria-labelledby="{uid}-consigne"
	>
		<p id="{uid}-consigne" class="sr-only">Compose le code qui mène le robot sur la case verte.</p>
		<div class="mx-auto w-full max-w-md">
			<RobotQuadrillage
				scene={spec}
				chemin={trajet?.chemin ?? null}
				bute={trajet?.bute ?? null}
				{verdict}
				{attendu}
			/>
		</div>

		{#if !verrouille}
			<div
				class="robot-reserve flex flex-wrap items-center justify-center gap-2"
				data-robot-reserve
				data-robot-row
				role="group"
				aria-label="Cartes à ajouter"
			>
				{#each reserve as modele, k (k)}
					<button
						type="button"
						class="robot-carte"
						class:robot-carte-fleche={modele.kind === 'flèche'}
						data-robot-focus={k === 0 ? '' : undefined}
						aria-label="Ajouter : {nomCarte(modele)}"
						disabled={plein}
						onclick={(event) => onReserveClick(event, modele)}
						onkeydown={onKeydown}
						onpointerdown={(event) => !plein && onPointerDown(event, { from: 'reserve', modele })}
					>
						{texteCarte(modele)}
					</button>
				{/each}
			</div>
			{#if plein}
				<p class="text-center text-sm text-muted-foreground" role="status">
					{ROBOT_TROP_DE_CARTES}
				</p>
			{/if}
		{/if}

		<div class="flex flex-col gap-1">
			<p id="{uid}-bande" class="text-sm font-medium text-muted-foreground">Mon code</p>
			<div
				class="robot-bande flex min-h-14 flex-wrap items-center gap-2 rounded-md border border-dashed p-2"
				data-robot-bande
				data-robot-row
				role="group"
				aria-labelledby="{uid}-bande"
			>
				{#each cartes as carte, k (carte.id)}
					<button
						type="button"
						class="robot-carte robot-posee"
						class:robot-carte-fleche={carte.kind === 'flèche'}
						class:robot-choisie={choix === carte.id}
						class:robot-incomplete={carte.kind === 'avance' && carte.pas === null}
						class:robot-glissee={drag?.moved &&
							drag.source.from === 'code' &&
							drag.source.id === carte.id}
						data-robot-pos={k}
						data-robot-id={carte.id}
						aria-label="Instruction {k + 1} sur {cartes.length} : {nomCarte(carte)}{verrouille
							? ''
							: carte.kind === 'avance'
								? ', toucher pour changer le chiffre'
								: ', toucher pour la retirer'}"
						aria-keyshortcuts={verrouille ? undefined : 'Alt+ArrowLeft Alt+ArrowRight'}
						disabled={verrouille}
						onclick={(event) => onCarteClick(event, carte)}
						onkeydown={onKeydown}
						onpointerdown={(event) => onPointerDown(event, { from: 'code', id: carte.id })}
					>
						{texteCarte(carte)}
					</button>
				{:else}
					<span class="text-sm text-muted-foreground">
						{verrouille ? 'Aucune instruction.' : 'Touche une carte pour l’ajouter.'}
					</span>
				{/each}
			</div>
		</div>

		{#if carteChoisie !== null && !verrouille}
			<div
				class="robot-chiffres flex flex-wrap items-center justify-center gap-1"
				data-robot-row
				role="group"
				aria-label="De combien de cases avance le robot ?"
			>
				{#each CHIFFRES as pas (pas)}
					<button
						type="button"
						class="robot-chiffre"
						aria-pressed={carteChoisie.kind === 'avance' && carteChoisie.pas === pas}
						onclick={() => poserChiffre(pas)}
						onkeydown={onKeydown}
					>
						{pas}
					</button>
				{/each}
				<button
					type="button"
					class="robot-action"
					onclick={() => carteChoisie && retirer(carteChoisie.id)}
					onkeydown={onKeydown}
				>
					Retirer
				</button>
			</div>
		{/if}

		{#if chiffreManquant && carteChoisie === null && !verrouille}
			<p class="text-center text-sm text-destructive" role="status">{ROBOT_CHIFFRE_MANQUANT}</p>
		{/if}

		{#if !verrouille}
			<div class="flex flex-wrap justify-center gap-2" data-robot-row>
				<button
					type="button"
					class="robot-action"
					disabled={cartes.length === 0}
					onclick={() => retirer(cartes[cartes.length - 1].id)}
					onkeydown={onKeydown}
				>
					Effacer la dernière
				</button>
				<button
					type="button"
					class="robot-action"
					disabled={cartes.length === 0}
					onclick={() => {
						emit([]);
						focusCarte(undefined);
					}}
					onkeydown={onKeydown}
				>
					Tout effacer
				</button>
			</div>
		{/if}

		{#if verdict !== null}
			<p class="sr-only" role="status">{verdict ? 'réponse juste' : 'réponse fausse'}</p>
		{/if}

		{#if drag && carteGlissee}
			<!-- La carte sous le doigt -->
			<span
				class="robot-carte robot-fantome"
				class:robot-carte-fleche={carteGlissee.kind === 'flèche'}
				style:left="{drag.x}px"
				style:top="{drag.y}px"
				aria-hidden="true"
			>
				{texteCarte(carteGlissee)}
			</span>
		{/if}
	</div>
{/if}

<style>
	.robot-juste {
		border-color: var(--color-success);
	}

	.robot-faux {
		border-color: var(--color-destructive);
	}

	.robot-carte,
	.robot-chiffre,
	.robot-action {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 2.75rem;
		border: 1px solid var(--color-border);
		border-radius: 0.5rem;
		background: var(--color-background);
		color: var(--color-foreground);
		-webkit-user-select: none;
		user-select: none;
		-webkit-touch-callout: none;
	}

	.robot-carte {
		min-width: 2.75rem;
		padding: 0.25rem 0.75rem;
		cursor: grab;
		box-shadow: 0 1px 2px color-mix(in oklab, var(--color-foreground) 15%, transparent);
		/* Le doigt glisse la carte, la page ne défile pas */
		touch-action: none;
		white-space: nowrap;
	}

	.robot-carte-fleche {
		font-size: 1.4rem;
		line-height: 1;
	}

	.robot-chiffre {
		min-width: 2.75rem;
		font-variant-numeric: tabular-nums;
	}

	.robot-action {
		padding: 0.25rem 0.75rem;
		font-size: 0.875rem;
	}

	.robot-carte:disabled,
	.robot-chiffre:disabled,
	.robot-action:disabled {
		cursor: default;
		opacity: 0.5;
	}

	.robot-posee:disabled {
		opacity: 1;
	}

	.robot-carte:focus-visible,
	.robot-chiffre:focus-visible,
	.robot-action:focus-visible {
		outline: 2px solid var(--color-ring);
		outline-offset: 2px;
	}

	.robot-choisie,
	.robot-chiffre[aria-pressed='true'] {
		border-color: var(--color-primary);
		background: var(--color-primary);
		color: var(--color-primary-foreground);
	}

	.robot-incomplete:not(.robot-choisie) {
		border-style: dashed;
		border-color: var(--color-destructive);
	}

	.robot-bande {
		border-color: var(--color-muted-foreground);
	}

	.robot-glissee {
		opacity: 0.3;
	}

	.robot-fantome {
		position: fixed;
		z-index: 50;
		pointer-events: none;
		transform: translate(-50%, -50%);
		border-color: var(--color-primary);
	}
</style>
