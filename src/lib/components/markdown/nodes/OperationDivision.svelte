<!--
	OperationDivision — bloc ```operation, division posée en potence
	================================================================

	Potence à la française dessinée depuis `buildDivisionScene`, la même scène
	que le PDF (phase 0 : `docs/wip/operations-posees-progress.md` § 12, § 13).
	Le bloc sans erreur arrive d'`Operation.svelte`, qui traite les erreurs.

	- Cases à remplir : AUCUNE valeur attendue dans le DOM (ni texte, ni
	  attribut) ; noms accessibles neutres.
	- `answer` : la case du quotient, saisi de GAUCHE à droite (on l'écrit
	  dans ce sens) ; « , » ou « . » pose la virgule à droite de la case
	  (retapée : enlevée), comme au lot 2.
	- `remainder` (division euclidienne) : la case suivante de la question, le
	  reste, saisi de droite à gauche comme le résultat du lot 1.
	- Zone des étapes et carreaux libres à droite du dividende : chaque
	  carreau prend un chiffre ou le signe −, jamais jugé ni gardé (Q7).
	- Correction : chiffres faux surlignés case par case, virgule absente ou
	  mal placée surlignée ; potence résolue à côté ; zone jamais surlignée.

	@module components/markdown/nodes/OperationDivision
-->
<script lang="ts">
	import { untrack } from 'svelte';
	import { OPERATION_DIVISION_ARIA_LABEL, type OperationNode } from '$lib/ubumark/types/operation';
	import {
		buildDivisionScene,
		type DivisionCell,
		type DivisionScene
	} from '$lib/ubumark/utils/operation-division-scene';
	import {
		quotientFromAnswer,
		readQuotientAnswer,
		readRemainderAnswer,
		remainderFromAnswer,
		wrongQuotientComma,
		wrongQuotientDigits,
		wrongRemainderDigits
	} from '$lib/ubumark/utils/operation-division-answer';
	import Self from './OperationDivision.svelte';

	/** Une case de la question portée par la potence */
	interface DivisionAnswer {
		/** Réponse déjà saisie (LaTeX), '' sinon */
		value: string;
		/** true juste, false faux, null pas encore corrigé */
		isCorrect: boolean | null;
		disabled: boolean;
		onChange: (value: string) => void;
		/** Entrée dans une case */
		onSubmit?: () => void;
		/** Seuil des espaces de groupement de la question */
		minDigits?: number;
	}

	interface Props {
		/** Bloc sans erreur, division */
		node: OperationNode;
		/** Case du quotient : la potence devient saisissable */
		answer?: DivisionAnswer;
		/** Division euclidienne : case du reste (la case suivante de la question) */
		remainder?: DivisionAnswer;
		class?: string;
	}

	let { node, answer, remainder, class: className = '' }: Props = $props();

	/** Rangée du dividende (ses carreaux libres sont saisissables) */
	const ROW_DIVIDEND = 0;

	let scene = $derived<DivisionScene>(buildDivisionScene(node.spec!));
	let interactive = $derived(answer !== undefined && node.spec?.cells !== 'aucune');

	/** Potence résolue, montrée à côté d'une réponse fausse */
	let solvedNode = $derived<OperationNode>({
		...node,
		spec: { ...node.spec!, cells: 'aucune' },
		caseIndex: undefined
	});

	// Saisie : quotient (de gauche à droite) et sa virgule, reste, carreaux libres
	const initialQuotient = untrack(() =>
		answer ? quotientFromAnswer(scene, answer.value) : { digits: [], comma: null }
	);
	let quotient = $state<string[]>(initialQuotient.digits);
	/** Case suivie de la virgule posée par l'élève, null sans virgule */
	let comma = $state<number | null>(initialQuotient.comma);
	/** Chiffres du reste, sous les colonnes de la scène */
	let rest = $state<string[]>(
		untrack(() => (remainder ? remainderFromAnswer(scene, remainder.value) : []))
	);
	/** Carreaux libres (`rangée:colonne`) : jamais jugés ni gardés */
	let steps = $state<Record<string, string>>({});

	let grid = $state<HTMLElement>();

	let right = $derived(Math.max(scene.divisor.length, scene.quotient.length));
	let zoneStart = $derived(1 + scene.rows.length);
	let remainderRow = $derived(zoneStart + scene.zone);
	let rowCount = $derived(Math.max(2, remainderRow + (scene.remainder === null ? 0 : 1)));

	let quotientWrong = $derived(interactive && answer?.isCorrect === false);
	let remainderWrong = $derived(interactive && remainder?.isCorrect === false);
	let wrongDigits = $derived(
		quotientWrong && node.spec ? wrongQuotientDigits(node.spec, quotient) : []
	);
	let commaMistake = $derived(
		quotientWrong && node.spec ? wrongQuotientComma(node.spec, quotient, comma) : null
	);
	let wrongRest = $derived(
		remainderWrong && node.spec ? wrongRemainderDigits(node.spec, rest) : []
	);

	/** Colonnes écrites d'une ligne d'étape (premier, dernier chiffre) */
	function writtenSpan(cells: readonly DivisionCell[]): [number, number] {
		const written = cells.flatMap((c, i) => (c.digit === '' ? [] : [i]));
		return [written[0] ?? 0, written[written.length - 1] ?? 0];
	}

	const options = (a: DivisionAnswer | undefined) =>
		a?.minDigits === undefined ? {} : { minDigits: a.minDigits };

	function emitQuotient() {
		answer?.onChange(readQuotientAnswer(quotient, comma, options(answer)));
	}

	function emitRemainder() {
		remainder?.onChange(readRemainderAnswer(scene, rest, options(remainder)));
	}

	// ---------------------------------------------------------------- navigation

	/** Carreau saisissable de la partie gauche, rangée `row`, colonne `g` (0 : colonne des signes) */
	function cellAt(row: number, g: number): HTMLInputElement | null {
		return (
			grid?.querySelector<HTMLInputElement>(`input[data-rangee="${row}"][data-colonne="${g}"]`) ??
			null
		);
	}

	function quotientAt(c: number): HTMLInputElement | null {
		return (
			grid?.querySelector<HTMLInputElement>(
				`input[data-operation-cell="quotient"][data-colonne="${c}"]`
			) ?? null
		);
	}

	function focusInput(input: HTMLInputElement | null) {
		input?.focus();
		input?.select();
	}

	/** Flèches ↑/↓ de la partie gauche : la rangée suivante qui a un carreau dans cette colonne */
	function onVerticalKeydown(event: KeyboardEvent, row: number, g: number): boolean {
		if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return false;
		event.preventDefault();
		const step = event.key === 'ArrowUp' ? -1 : 1;
		for (let r = row + step; r >= ROW_DIVIDEND && r <= remainderRow; r += step) {
			const input = cellAt(r, g);
			if (input) {
				focusInput(input);
				break;
			}
		}
		return true;
	}

	/** Entrée : demande la validation ; true si la touche est prise */
	function onEnter(event: KeyboardEvent): boolean {
		if (event.key !== 'Enter') return false;
		event.preventDefault();
		answer?.onSubmit?.();
		return true;
	}

	/** Le caractère tapé : celui de l'événement, sinon le dernier de la case */
	function typedChar(event: Event & { currentTarget: HTMLInputElement }): string {
		const data = event instanceof InputEvent ? (event.data ?? '') : '';
		return data !== '' ? data.slice(-1) : event.currentTarget.value.slice(-1);
	}

	// ------------------------------------------------------------------ quotient

	/**
	 * Case qui reçoit la virgule tapée dans la case `c` : celle-ci si elle porte un
	 * chiffre ; vide, celle de gauche si elle en porte un (la virgule tapée dans la
	 * foulée, `1 9 6 ,`, arrive dans la case vide où le curseur est passé)
	 */
	function commaTarget(c: number): number {
		return (quotient[c] ?? '') === '' && c > 0 && (quotient[c - 1] ?? '') !== '' ? c - 1 : c;
	}

	/** Un chiffre : il remplace celui de la case, le curseur passe à droite ; « , » ou « . » : la virgule */
	function onQuotientInput(event: Event & { currentTarget: HTMLInputElement }, c: number) {
		const char = typedChar(event);
		if (/^[,.]$/.test(char)) {
			const target = commaTarget(c);
			comma = comma === target ? null : target;
		} else if (/^\d$/.test(char)) {
			quotient[c] = char;
			focusInput(quotientAt(c + 1));
		} else if (event.currentTarget.value === '') {
			quotient[c] = '';
		}
		event.currentTarget.value = quotient[c] ?? '';
		emitQuotient();
	}

	function onQuotientKeydown(event: KeyboardEvent, c: number) {
		if (onEnter(event)) return;
		if (event.key === 'Backspace' || event.key === 'Delete') {
			event.preventDefault();
			// Case pleine : on l'efface ; case vide : on revient effacer celle de gauche
			if ((quotient[c] ?? '') !== '') {
				quotient[c] = '';
			} else if (c > 0) {
				quotient[c - 1] = '';
				focusInput(quotientAt(c - 1));
			}
			emitQuotient();
		} else if (event.key === 'ArrowLeft' && c > 0) {
			event.preventDefault();
			focusInput(quotientAt(c - 1));
		} else if (event.key === 'ArrowRight' && c < scene.quotient.length - 1) {
			event.preventDefault();
			focusInput(quotientAt(c + 1));
		}
	}

	function quotientLabel(c: number): string {
		const after = comma === c ? ', virgule à sa droite' : '';
		return `Quotient, case ${c + 1} sur ${scene.quotient.length} en partant de la gauche${after}`;
	}

	// --------------------------------------------------------------------- reste

	let restColumns = $derived((scene.remainder ?? []).flatMap((cell, c) => (cell.blank ? [c] : [])));

	/** Un chiffre : il remplace celui de la case, le curseur passe à gauche */
	function onRemainderInput(event: Event & { currentTarget: HTMLInputElement }, c: number) {
		const char = typedChar(event);
		if (/^\d$/.test(char)) {
			rest[c] = char;
			focusInput(cellAt(remainderRow, c));
		} else if (event.currentTarget.value === '') {
			rest[c] = '';
		}
		event.currentTarget.value = rest[c] ?? '';
		emitRemainder();
	}

	function onRemainderKeydown(event: KeyboardEvent, c: number) {
		if (onEnter(event) || onVerticalKeydown(event, remainderRow, c + 1)) return;
		const first = restColumns[0];
		const last = restColumns[restColumns.length - 1];
		if (event.key === 'Backspace' || event.key === 'Delete') {
			event.preventDefault();
			// Case pleine : on l'efface ; case vide : on revient effacer celle de droite
			if ((rest[c] ?? '') !== '') {
				rest[c] = '';
			} else if (c < last) {
				rest[c + 1] = '';
				focusInput(cellAt(remainderRow, c + 2));
			}
			emitRemainder();
		} else if (event.key === 'ArrowLeft' && c > first) {
			event.preventDefault();
			focusInput(cellAt(remainderRow, c));
		} else if (event.key === 'ArrowRight' && c < last) {
			event.preventDefault();
			focusInput(cellAt(remainderRow, c + 2));
		}
	}

	function remainderLabel(c: number): string {
		const n = restColumns.length;
		return `Reste, case ${n - restColumns.indexOf(c)} sur ${n} en partant de la droite`;
	}

	// -------------------------------------------------------- carreaux libres

	const stepKey = (row: number, g: number) => `${row}:${g}`;

	/** Un chiffre ou le signe − : le carreau le prend, le curseur passe à droite */
	function onStepInput(event: Event & { currentTarget: HTMLInputElement }, row: number, g: number) {
		const char = typedChar(event);
		const key = stepKey(row, g);
		if (/^[\d\-−]$/.test(char)) {
			steps[key] = char === '-' ? '−' : char;
			focusInput(cellAt(row, g + 1));
		} else if (event.currentTarget.value === '') {
			steps[key] = '';
		}
		event.currentTarget.value = steps[key] ?? '';
	}

	function onStepKeydown(event: KeyboardEvent, row: number, g: number) {
		if (onEnter(event) || onVerticalKeydown(event, row, g)) return;
		if (event.key === 'Backspace' || event.key === 'Delete') {
			event.preventDefault();
			// Carreau plein : on l'efface ; vide : on revient effacer celui de gauche
			const key = stepKey(row, g);
			if ((steps[key] ?? '') !== '') {
				steps[key] = '';
			} else if (cellAt(row, g - 1)) {
				steps[stepKey(row, g - 1)] = '';
				focusInput(cellAt(row, g - 1));
			}
		} else if (event.key === 'ArrowLeft') {
			event.preventDefault();
			focusInput(cellAt(row, g - 1));
		} else if (event.key === 'ArrowRight') {
			event.preventDefault();
			focusInput(cellAt(row, g + 1));
		}
	}

	function stepLabel(row: number, g: number): string {
		if (row === ROW_DIVIDEND)
			return `Dividende, carreau libre ${g - scene.dividend.findIndex((c) => c.digit === '')}`;
		return `Étapes, rangée ${row - zoneStart + 1}, carreau ${g + 1}`;
	}
</script>

{#snippet digit(cell: DivisionCell)}
	{#if cell.blank}
		<span class="operation-case"></span>
	{:else}
		<span class:operation-ajoute={cell.added}>{cell.digit}</span>
	{/if}
	{#if cell.comma && !cell.blank}<span class="operation-virgule">,</span>{/if}
{/snippet}

{#snippet stepInput(row: number, g: number)}
	<input
		class="operation-saisie operation-saisie-aide"
		type="text"
		inputmode="numeric"
		enterkeyhint="done"
		autocomplete="off"
		spellcheck="false"
		data-operation-cell="étape"
		data-rangee={row}
		data-colonne={g}
		aria-label={stepLabel(row, g)}
		value={steps[stepKey(row, g)] ?? ''}
		disabled={answer?.disabled}
		onfocus={(e) => e.currentTarget.select()}
		onpointerup={(e) => e.currentTarget.select()}
		oninput={(e) => onStepInput(e, row, g)}
		onkeydown={(e) => onStepKeydown(e, row, g)}
	/>
{/snippet}

<!-- Partie droite d'une rangée : le diviseur, le trait, le quotient ; trait vertical sur toute la hauteur -->
{#snippet rightPart(r: number)}
	{#each Array.from({ length: right }, (_, c) => c) as c (c)}
		<span
			class="operation-carreau"
			class:operation-potence={c === 0}
			class:operation-sous-diviseur={r === 0}
		>
			{#if r === 0 && c < scene.divisor.length}
				{scene.divisor[c]}
			{:else if r === 1 && c < scene.quotient.length}
				{#if interactive}
					<input
						class="operation-saisie"
						class:operation-juste={answer?.isCorrect === true}
						class:operation-faux={wrongDigits[c] === true}
						type="text"
						inputmode="decimal"
						enterkeyhint="done"
						autocomplete="off"
						spellcheck="false"
						data-operation-cell="quotient"
						data-colonne={c}
						aria-label={quotientLabel(c)}
						aria-invalid={wrongDigits[c] === true ? 'true' : undefined}
						value={quotient[c] ?? ''}
						disabled={answer?.disabled}
						onfocus={(e) => e.currentTarget.select()}
						onpointerup={(e) => e.currentTarget.select()}
						oninput={(e) => onQuotientInput(e, c)}
						onkeydown={(e) => onQuotientKeydown(e, c)}
					/>
					<!-- Virgule posée par l'élève ; à la correction, absente ou mal placée surlignée -->
					{#if comma === c}
						<span
							class="operation-virgule"
							class:operation-virgule-faux={commaMistake?.mistake === 'mal placée'}>,</span
						>
					{:else if commaMistake?.mistake === 'absente' && c === commaMistake.at}
						<span class="operation-virgule-manquante" aria-hidden="true"></span>
					{/if}
				{:else}
					{@render digit(scene.quotient[c])}
				{/if}
			{/if}
		</span>
	{/each}
{/snippet}

<div class="operation-bloc my-2 flex flex-wrap items-start justify-center gap-6 {className}">
	<div class="operation-defile">
		<div
			bind:this={grid}
			class="operation-grille"
			class:operation-grille-saisie={interactive}
			role="group"
			aria-label={OPERATION_DIVISION_ARIA_LABEL}
			style:--operation-colonnes={scene.columns + 1 + right}
		>
			{#each Array.from({ length: rowCount }, (_, r) => r) as r (r)}
				<!-- Partie gauche : colonne des signes, puis le dividende ou une étape -->
				{#if r === ROW_DIVIDEND}
					<span class="operation-carreau"></span>
					{#each scene.dividend as cell, c (c)}
						<span class="operation-carreau">
							{#if interactive && cell.digit === ''}
								{@render stepInput(r, c + 1)}
							{:else}
								{@render digit(cell)}
							{/if}
						</span>
					{/each}
				{:else if r < zoneStart}
					{@const row = scene.rows[r - 1]}
					{@const [first, last] = writtenSpan(row.cells)}
					<span class="operation-carreau operation-signe"
						>{row.subtract && first === 0 ? '−' : ''}</span
					>
					{#each row.cells as cell, c (c)}
						<span
							class="operation-carreau"
							class:operation-signe={row.subtract && c === first - 1}
							class:operation-trait={row.subtract && c >= first && c <= last}
						>
							{#if row.subtract && c === first - 1}−{:else}{cell.digit}{/if}
						</span>
					{/each}
				{:else if r < remainderRow}
					{#each Array.from({ length: scene.columns + 1 }, (_, g) => g) as g (g)}
						<span class="operation-carreau operation-zone">
							{#if interactive}{@render stepInput(r, g)}{/if}
						</span>
					{/each}
				{:else if r === remainderRow && scene.remainder}
					<span
						class="operation-cases"
						data-operation-case={interactive && remainder && node.caseIndex !== undefined
							? node.caseIndex + 1
							: undefined}
					>
						<span class="operation-carreau"></span>
						{#each scene.remainder as cell, c (c)}
							<span class="operation-carreau">
								{#if interactive && remainder && cell.blank}
									<input
										class="operation-saisie"
										class:operation-juste={remainder.isCorrect === true}
										class:operation-faux={wrongRest[c] === true}
										type="text"
										inputmode="numeric"
										enterkeyhint="done"
										autocomplete="off"
										spellcheck="false"
										data-operation-cell="reste"
										data-rangee={r}
										data-colonne={c + 1}
										aria-label={remainderLabel(c)}
										aria-invalid={wrongRest[c] === true ? 'true' : undefined}
										value={rest[c] ?? ''}
										disabled={remainder.disabled}
										onfocus={(e) => e.currentTarget.select()}
										onpointerup={(e) => e.currentTarget.select()}
										oninput={(e) => onRemainderInput(e, c)}
										onkeydown={(e) => onRemainderKeydown(e, c)}
									/>
								{:else}
									{@render digit(cell)}
								{/if}
							</span>
						{/each}
					</span>
				{:else}
					{#each Array.from({ length: scene.columns + 1 }, (_, c) => c) as c (c)}
						<span class="operation-carreau"></span>
					{/each}
				{/if}

				{#if r === 1}
					<span
						class="operation-cases"
						data-operation-case={interactive ? node.caseIndex : undefined}
					>
						{@render rightPart(r)}
					</span>
				{:else}
					{@render rightPart(r)}
				{/if}
			{/each}
		</div>
		{#if interactive && (answer?.isCorrect != null || remainder?.isCorrect != null)}
			<p class="sr-only" role="status">
				{answer?.isCorrect === false || remainder?.isCorrect === false
					? 'réponse fausse'
					: 'réponse juste'}
			</p>
		{/if}
	</div>

	{#if quotientWrong || remainderWrong}
		<div class="operation-correction">
			<p class="text-sm font-medium text-muted-foreground">Correction</p>
			<Self node={solvedNode} />
		</div>
	{/if}
</div>

<style>
	/* Mêmes carreaux qu'`Operation.svelte` ; ici, ce que la potence emploie */

	/* Potence trop large pour l'écran : elle défile dans son cadre, jamais la page */
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

	/* Les carreaux d'une case de la question : ils restent dans la grille */
	.operation-cases {
		display: contents;
	}

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

	.operation-trait {
		border-bottom: 2px solid var(--color-foreground);
	}

	/* Le trait vertical de la potence, le trait sous le diviseur */
	.operation-potence {
		border-left: 2px solid var(--color-foreground);
	}

	.operation-sous-diviseur {
		border-bottom: 2px solid var(--color-foreground);
	}

	/* Zéros ajoutés au dividende pour continuer la division (Q5) */
	.operation-ajoute {
		color: var(--color-muted-foreground);
	}

	/* Virgule posée sur le trait de droite du chiffre */
	.operation-virgule {
		position: absolute;
		z-index: 1;
		right: -0.16em;
		bottom: 0.12em;
		font-size: 1.2em;
		font-weight: 700;
	}

	.operation-virgule-faux {
		color: var(--color-destructive);
	}

	/* Virgule oubliée : sa place, entourée, à la correction */
	.operation-virgule-manquante {
		position: absolute;
		z-index: 1;
		right: -0.28em;
		bottom: 0.05em;
		width: 0.55em;
		height: 0.55em;
		border: 2px solid var(--color-destructive);
		border-radius: 9999px;
		background: var(--color-background);
	}

	/* La seule couleur d'accent : les cases jugées */
	.operation-case {
		width: 78%;
		height: 78%;
		border: 2px solid var(--color-primary);
		border-radius: 4px;
	}

	.operation-saisie {
		width: 85%;
		height: 85%;
		padding: 0;
		text-align: center;
		color: var(--color-foreground);
		background: var(--color-background);
		border: 2px solid var(--color-primary);
		border-radius: 4px;
		font: inherit;
		font-variant-numeric: tabular-nums;
	}

	/* Zone des étapes : une aide, jamais jugée → pointillés, pas l'accent */
	.operation-saisie-aide {
		border: 1px dashed var(--color-muted-foreground);
	}

	.operation-saisie:focus-visible {
		outline: 2px solid var(--color-ring);
		outline-offset: 1px;
	}

	.operation-saisie:disabled {
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
