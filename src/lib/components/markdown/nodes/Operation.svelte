<!--
	Operation — bloc ```operation
	=============================

	Opération posée en colonnes (addition, soustraction ; phase 0 :
	`docs/wip/operations-posees-progress.md`). Dessinée depuis
	`buildOperationScene`, la même scène que le PDF.

	- Grille HTML (pas SVG) : les cases de saisie s'y logent.
	- Carreaux de cahier, une seule couleur d'accent (les cases à remplir) ;
	  couleurs du thème uniquement.
	- Cases à remplir : AUCUNE valeur attendue dans le DOM (ni texte, ni
	  attribut), sinon la réponse se lit dans la page.
	- Bloc en erreur : messages pour le prof, cadre neutre pour l'élève (Q48).
	- `answer` (case d'une question, PR 1b) : cases du résultat saisies de
	  droite à gauche, lues comme UN nombre (`operation-answer.ts`) ; retenues
	  facultatives, jamais jugées ni gardées ; réponse fausse → chiffres faux
	  surlignés, opération résolue à côté.

	@module components/markdown/nodes/Operation
-->
<script lang="ts">
	import { untrack } from 'svelte';
	import {
		OPERATION_ARIA_LABEL,
		OPERATION_UNAVAILABLE,
		type OperationNode
	} from '$lib/ubumark/types/operation';
	import { buildOperationScene, type OperationMark } from '$lib/ubumark/utils/operation-scene';
	import {
		digitsFromAnswer,
		readOperationAnswer,
		wrongResultDigits
	} from '$lib/ubumark/utils/operation-answer';
	import { readAuthoringErrors } from '../authoring-errors';
	import Self from './Operation.svelte';

	/** La case de la question portée par le bloc */
	interface OperationAnswer {
		/** Réponse déjà saisie (LaTeX), '' sinon */
		value: string;
		/** true juste, false faux, null pas encore corrigé */
		isCorrect: boolean | null;
		disabled: boolean;
		onChange: (value: string) => void;
		/** Entrée dans une case */
		onSubmit?: () => void;
		/** Seuil des espaces de groupement de la question (« Espaces dès 4 chiffres ») */
		minDigits?: number;
	}

	interface Props {
		node: OperationNode;
		/** Forcer l'affichage des erreurs d'auteur ; sinon, contexte du renderer (élève par défaut) */
		showErrors?: boolean;
		/** Case de la question : la grille devient saisissable */
		answer?: OperationAnswer;
		class?: string;
	}

	let { node, showErrors, answer, class: className = '' }: Props = $props();

	const SIGN = { '+': '+', '-': '−' } as const;

	/** Rang d'une colonne : 0 unités, 1 dizaines… ; -1 dixièmes… */
	const PLACE_NAMES: Record<number, string> = {
		[-3]: 'millièmes',
		[-2]: 'centièmes',
		[-1]: 'dixièmes',
		0: 'unités',
		1: 'dizaines',
		2: 'centaines',
		3: 'milliers',
		4: 'dizaines de milliers',
		5: 'centaines de milliers',
		6: 'millions',
		7: 'dizaines de millions',
		8: 'centaines de millions',
		9: 'milliards',
		10: 'dizaines de milliards'
	};

	const authoring = readAuthoringErrors();
	let errorsVisible = $derived(showErrors ?? authoring());

	let scene = $derived(node.spec === null ? null : buildOperationScene(node.spec));

	/** Opération résolue, montrée à côté d'une réponse fausse */
	let solvedNode = $derived<OperationNode | null>(
		node.spec === null
			? null
			: { ...node, spec: { ...node.spec, cells: 'aucune' }, caseIndex: undefined }
	);

	// Saisie : chiffres du résultat (de gauche à droite) et petites cases d'aide
	let digits = $state<string[]>(
		untrack(() => (scene && answer ? digitsFromAnswer(scene, answer.value) : []))
	);
	/** Retenues, nouvelles valeurs (cassage), 1 de la compensation : par colonne, jamais gardées */
	let helpers = $state<Record<number, string>>({});

	let resultInputs = $state<HTMLInputElement[]>([]);

	let interactive = $derived(
		answer !== undefined && scene !== null && node.spec?.cells !== 'aucune'
	);
	let wrong = $derived(
		interactive && answer?.isCorrect === false && scene ? wrongResultDigits(scene, digits) : []
	);
	let compensation = $derived(node.spec?.operator === '-' && node.spec.method === 'compensation');

	/** Texte visible d'une petite écriture : jamais l'attendu d'une case */
	function markText(mark: OperationMark): string {
		return mark.blank ? '' : mark.text;
	}

	function placeName(c: number): string {
		if (!scene) return '';
		const place = scene.columns - scene.decimals - 1 - c;
		return PLACE_NAMES[place] ?? `rang ${place}`;
	}

	/** Case d'aide au-dessus de la colonne `c` (retenue, cassage ; compensation : le 1 du haut) */
	function helperAbove(c: number): boolean {
		if (!scene) return false;
		if (compensation) return scene.terms[0][c].mark?.blank === true;
		return scene.above[c]?.blank === true;
	}

	function helperLabel(c: number): string {
		const kind = node.spec?.operator === '-' && !compensation ? 'Nouvelle valeur' : 'Retenue';
		return `${kind}, colonne des ${placeName(c)}`;
	}

	function emit() {
		if (!scene || !answer) return;
		const options = answer.minDigits === undefined ? {} : { minDigits: answer.minDigits };
		answer.onChange(readOperationAnswer(scene, digits, options));
	}

	function focusResult(c: number) {
		resultInputs[c]?.focus();
		resultInputs[c]?.select();
	}

	/**
	 * Un chiffre tapé : il remplace celui de la case (où que soit le curseur), le curseur
	 * passe à gauche ; tout autre caractère est ignoré
	 */
	function onResultInput(event: Event & { currentTarget: HTMLInputElement }, c: number) {
		const typed = event.currentTarget.value;
		const data = event instanceof InputEvent ? (event.data ?? '') : '';
		const digit = /^\d$/.test(data) ? data : typed.replace(/\D/g, '').slice(-1);
		if (digit === '') {
			// Case vidée (effacement natif) ou caractère refusé : la case garde son chiffre
			if (typed === '') digits[c] = '';
			event.currentTarget.value = digits[c] ?? '';
			emit();
			return;
		}
		digits[c] = digit;
		event.currentTarget.value = digit;
		emit();
		if (c > 0) focusResult(c - 1);
	}

	function onResultKeydown(event: KeyboardEvent, c: number) {
		if (!scene) return;
		if (event.key === 'Enter') {
			event.preventDefault();
			answer?.onSubmit?.();
		} else if (event.key === 'Backspace' || event.key === 'Delete') {
			event.preventDefault();
			// Case pleine : on l'efface ; case vide : on revient effacer celle de droite
			if ((digits[c] ?? '') !== '') {
				digits[c] = '';
			} else if (c < scene.columns - 1) {
				digits[c + 1] = '';
				focusResult(c + 1);
			}
			emit();
		} else if (event.key === 'ArrowLeft' && c > 0) {
			event.preventDefault();
			focusResult(c - 1);
		} else if (event.key === 'ArrowRight' && c < scene.columns - 1) {
			event.preventDefault();
			focusResult(c + 1);
		}
	}

	/** Petite case : un chiffre (cassage : deux, `12`), rien d'autre */
	function onHelperInput(event: Event & { currentTarget: HTMLInputElement }, c: number) {
		const max = node.spec?.operator === '-' && !compensation ? 2 : 1;
		const value = event.currentTarget.value.replace(/\D/g, '').slice(0, max);
		helpers[c] = value;
		event.currentTarget.value = value;
	}
</script>

{#snippet helperInput(c: number)}
	<input
		class="operation-saisie-petite"
		type="text"
		inputmode="numeric"
		autocomplete="off"
		spellcheck="false"
		data-operation-cell="aide"
		aria-label={helperLabel(c)}
		value={helpers[c] ?? ''}
		disabled={answer?.disabled}
		oninput={(e) => onHelperInput(e, c)}
	/>
{/snippet}

{#if scene === null || node.errors.length > 0}
	{#if errorsVisible}
		<div
			class="operation-erreur rounded-md border border-destructive p-3 text-sm text-foreground {className}"
		>
			<p class="font-medium text-destructive">Bloc opération : opération non dessinée</p>
			<ul class="mt-1 list-disc pl-5">
				{#each node.errors as issue, i (i)}
					<li>{issue.message}</li>
				{/each}
			</ul>
		</div>
	{:else}
		<div
			class="operation-indisponible rounded-md border border-dashed border-border p-3 text-center text-sm text-muted-foreground {className}"
		>
			{OPERATION_UNAVAILABLE}
		</div>
	{/if}
{:else}
	<div
		class="operation-bloc my-2 flex flex-wrap items-start justify-center gap-6 {className}"
		data-operation-case={interactive ? node.caseIndex : undefined}
	>
		<div class="operation-defile">
			<div
				class="operation-grille"
				class:operation-grille-saisie={interactive}
				role="group"
				aria-label={OPERATION_ARIA_LABEL}
				style:--operation-colonnes={scene.columns + 1}
			>
				<!-- Au-dessus : retenues (addition), nouvelles valeurs (cassage) ; à remplir : petites cases -->
				<span class="operation-carreau"></span>
				{#each scene.above as mark, c (c)}
					<span class="operation-carreau operation-dessus">
						{#if interactive && helperAbove(c)}
							{@render helperInput(c)}
						{:else if mark}
							<span class="operation-petit" class:operation-case-petite={mark.blank}
								>{markText(mark)}</span
							>
						{/if}
					</span>
				{/each}

				{#each scene.terms as row, r (r)}
					{@const last = r === scene.terms.length - 1}
					<span class="operation-carreau operation-signe" class:operation-trait={last}
						>{last ? SIGN[scene.operator] : ''}</span
					>
					{#each row as cell, c (c)}
						<span class="operation-carreau" class:operation-trait={last}>
							{#if interactive && compensation}
								<!-- Le 1 du bas suit la case du haut de la colonne de droite (décision c) -->
								{#if r === 1 && (helpers[c + 1] ?? '') !== ''}
									<span class="operation-retenue">{helpers[c + 1]}</span>
								{/if}
							{:else if cell.mark}
								<span class="operation-retenue" class:operation-case-petite={cell.mark.blank}
									>{markText(cell.mark)}</span
								>
							{/if}
							<span class:operation-barre={cell.struck}>{cell.digit}</span>
							{#if cell.comma}<span class="operation-virgule">,</span>{/if}
						</span>
					{/each}
				{/each}

				<span class="operation-carreau"></span>
				{#each scene.result as cell, c (c)}
					<span class="operation-carreau">
						{#if interactive}
							<input
								bind:this={resultInputs[c]}
								class="operation-saisie"
								class:operation-juste={answer?.isCorrect === true}
								class:operation-faux={wrong[c] === true}
								type="text"
								inputmode="numeric"
								enterkeyhint="done"
								autocomplete="off"
								spellcheck="false"
								data-operation-cell="résultat"
								aria-label="Chiffre des {placeName(c)}"
								aria-invalid={wrong[c] === true ? 'true' : undefined}
								value={digits[c] ?? ''}
								disabled={answer?.disabled}
								onfocus={(e) => e.currentTarget.select()}
								onpointerup={(e) => e.currentTarget.select()}
								oninput={(e) => onResultInput(e, c)}
								onkeydown={(e) => onResultKeydown(e, c)}
							/>
						{:else if cell.blank}
							<span class="operation-case"></span>
						{:else}
							{cell.digit}
						{/if}
						{#if cell.comma}<span class="operation-virgule">,</span>{/if}
					</span>
				{/each}
			</div>
			{#if interactive && answer?.isCorrect != null}
				<p class="sr-only" role="status">
					{answer.isCorrect ? 'réponse juste' : 'réponse fausse'}
				</p>
			{/if}
		</div>

		{#if interactive && answer?.isCorrect === false && solvedNode}
			<div class="operation-correction">
				<p class="text-sm font-medium text-muted-foreground">Correction</p>
				<Self node={solvedNode} />
			</div>
		{/if}
	</div>
{/if}

<style>
	/* Grille trop large pour l'écran : elle défile dans son cadre, jamais la page */
	.operation-defile {
		max-width: 100%;
		overflow-x: auto;
	}

	.operation-grille {
		display: grid;
		grid-template-columns: repeat(var(--operation-colonnes), minmax(1.25rem, 2.25rem));
		max-width: 100%;
		font-size: 1.35rem;
		font-variant-numeric: tabular-nums;
		line-height: 1;
	}

	/* À remplir : carreaux d'au moins 40 px, pour le doigt */
	.operation-grille-saisie {
		grid-template-columns: repeat(var(--operation-colonnes), 2.5rem);
		max-width: none;
	}

	/* Carreaux de cahier, sur les tokens du thème */
	.operation-carreau {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		aspect-ratio: 1;
		border: 1px solid var(--color-border);
		margin: 0 -1px -1px 0;
		color: var(--color-foreground);
	}

	.operation-signe {
		font-weight: 600;
	}

	/* Le trait de l'opération, sous le dernier terme */
	.operation-trait {
		border-bottom: 2px solid var(--color-foreground);
	}

	.operation-dessus {
		align-items: flex-end;
	}

	.operation-petit,
	.operation-retenue {
		font-size: 0.6em;
		color: var(--color-muted-foreground);
	}

	/* Petit 1 de la compensation : en haut à gauche du chiffre */
	.operation-retenue {
		position: absolute;
		top: 0.1em;
		left: 0.15em;
	}

	.operation-case-petite {
		display: inline-block;
		min-width: 0.9em;
		min-height: 0.9em;
		border: 1px dashed var(--color-muted-foreground);
		border-radius: 2px;
	}

	.operation-barre {
		text-decoration: line-through;
		text-decoration-thickness: 2px;
	}

	/* Virgule posée sur le trait de droite du chiffre des unités */
	.operation-virgule {
		position: absolute;
		z-index: 1;
		right: -0.16em;
		bottom: 0.12em;
		font-size: 1.2em;
		font-weight: 700;
	}

	/* La seule couleur d'accent : les cases du résultat */
	.operation-case {
		width: 78%;
		height: 78%;
		border: 2px solid var(--color-primary);
		border-radius: 4px;
	}

	.operation-saisie,
	.operation-saisie-petite {
		padding: 0;
		text-align: center;
		color: var(--color-foreground);
		background: var(--color-background);
		border-radius: 4px;
		font: inherit;
		font-variant-numeric: tabular-nums;
	}

	.operation-saisie {
		width: 85%;
		height: 85%;
		border: 2px solid var(--color-primary);
	}

	/* Retenues : petites (≈ 28 px), en pointillés : une aide, jamais jugée */
	.operation-saisie-petite {
		width: 1.75rem;
		height: 1.75rem;
		margin-bottom: 0.1rem;
		font-size: 0.7em;
		border: 1px dashed var(--color-muted-foreground);
	}

	.operation-saisie:focus-visible,
	.operation-saisie-petite:focus-visible {
		outline: 2px solid var(--color-ring);
		outline-offset: 1px;
	}

	.operation-saisie:disabled,
	.operation-saisie-petite:disabled {
		cursor: not-allowed;
	}

	.operation-juste {
		border-color: var(--color-success);
		background: color-mix(in oklab, var(--color-success) 10%, transparent);
	}

	.operation-faux {
		border-color: var(--color-destructive);
		background: color-mix(in oklab, var(--color-destructive) 12%, transparent);
	}

	.operation-correction {
		display: flex;
		flex-direction: column;
		align-items: center;
	}
</style>
