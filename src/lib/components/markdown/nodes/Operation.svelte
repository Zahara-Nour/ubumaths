<!--
	Operation — bloc ```operation
	=============================

	Opération posée en colonnes (addition, soustraction, multiplication ;
	phase 0 : `docs/wip/operations-posees-progress.md`). Dessinée depuis
	`buildOperationScene`, la même scène que le PDF. Division (lot 3) :
	potence dessinée depuis `buildDivisionScene` ; affichage seulement en
	PR 3a (sa saisie arrive en PR 3b).

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
	- Multiplication (PR 2b, § 11) : l'élève pose la virgule du résultat (« , »
	  ou « . » dans une case : à droite de cette case ; retapée : enlevée) ;
	  produits partiels et retenues de leur addition saisissables, jamais
	  jugés ; noms accessibles neutres (« chiffre des unités » dirait où est la
	  virgule) ; correction : virgule absente ou mal placée surlignée.
	- Flèches ↑/↓ : d'une rangée de cases à l'autre.

	@module components/markdown/nodes/Operation
-->
<script lang="ts">
	import { untrack } from 'svelte';
	import {
		OPERATION_ARIA_LABEL,
		OPERATION_DIVISION_ARIA_LABEL,
		OPERATION_UNAVAILABLE,
		type OperationNode
	} from '$lib/ubumark/types/operation';
	import { buildOperationScene, type OperationMark } from '$lib/ubumark/utils/operation-scene';
	import {
		buildDivisionScene,
		type DivisionCell,
		type DivisionScene
	} from '$lib/ubumark/utils/operation-division-scene';
	import {
		commaFromAnswer,
		digitsFromAnswer,
		readOperationAnswer,
		wrongComma,
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

	const SIGN = { '+': '+', '-': '−', '×': '×' } as const;

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

	/** Rangées de cases, de haut en bas (flèches ↑/↓) : retenues, retenues de l'addition, produits partiels, résultat */
	const ROW_ABOVE = 0;
	const ROW_PARTIAL_CARRIES = 1;
	const partialRow = (r: number) => 2 + r;

	const authoring = readAuthoringErrors();
	let errorsVisible = $derived(showErrors ?? authoring());

	let division = $derived(node.spec?.operator === '÷');
	let scene = $derived(node.spec === null || division ? null : buildOperationScene(node.spec));
	let divisionScene = $derived(
		node.spec !== null && division ? buildDivisionScene(node.spec) : null
	);

	/** Opération résolue, montrée à côté d'une réponse fausse */
	let solvedNode = $derived<OperationNode | null>(
		node.spec === null
			? null
			: { ...node, spec: { ...node.spec, cells: 'aucune' }, caseIndex: undefined }
	);

	let multiplication = $derived(node.spec?.operator === '×');

	// Saisie : chiffres du résultat (de gauche à droite) et petites cases d'aide
	let digits = $state<string[]>(
		untrack(() => (scene && answer ? digitsFromAnswer(scene, answer.value) : []))
	);
	/** Multiplication : case suivie de la virgule posée par l'élève, null sans virgule */
	let comma = $state<number | null>(
		untrack(() => (scene && answer && multiplication ? commaFromAnswer(scene, answer.value) : null))
	);
	/** Retenues, nouvelles valeurs (cassage), 1 de la compensation : par colonne, jamais gardées */
	let helpers = $state<Record<number, string>>({});
	/** Multiplication : retenues de l'addition des produits partiels, par colonne */
	let partialHelpers = $state<Record<number, string>>({});
	/** Multiplication : chiffres des produits partiels (`rangée:colonne`), jamais jugés ni gardés */
	let partialDigits = $state<Record<string, string>>({});

	let grid = $state<HTMLElement>();

	let interactive = $derived(
		answer !== undefined && scene !== null && node.spec?.cells !== 'aucune'
	);
	/** La virgule lue : celle de l'élève (multiplication), sinon celle de la grille */
	let readComma = $derived(multiplication ? comma : undefined);
	let corrected = $derived(interactive && answer?.isCorrect === false && scene !== null);
	let wrong = $derived(corrected && scene ? wrongResultDigits(scene, digits, readComma) : []);
	let commaMistake = $derived(
		corrected && scene && multiplication ? wrongComma(scene, comma) : null
	);
	/** Case suivie de la virgule attendue (surlignée quand l'élève l'a oubliée) */
	let expectedComma = $derived(scene ? scene.columns - scene.decimals - 1 : -1);
	let compensation = $derived(node.spec?.operator === '-' && node.spec.method === 'compensation');

	let resultRow = $derived(partialRow(scene?.partials.length ?? 0));

	/** Division : colonnes de la partie droite (diviseur, quotient) */
	function rightColumns(s: DivisionScene): number {
		return Math.max(s.divisor.length, s.quotient.length);
	}

	/** Division : rangées de la partie gauche, au moins deux (diviseur, quotient à droite) */
	function divisionRowCount(s: DivisionScene): number {
		return Math.max(2, 1 + s.rows.length + s.zone + (s.remainder === null ? 0 : 1));
	}

	/** Division : colonnes écrites d'une ligne d'étape (premier, dernier chiffre) */
	function writtenSpan(cells: readonly DivisionCell[]): [number, number] {
		const written = cells.flatMap((c, i) => (c.digit === '' ? [] : [i]));
		return [written[0] ?? 0, written[written.length - 1] ?? 0];
	}

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

	/** Multiplication : rang compté depuis la droite, sans dire où est la virgule */
	function fromRight(c: number): string {
		return `case ${(scene?.columns ?? 0) - c} en partant de la droite`;
	}

	function helperLabel(c: number, row: number): string {
		if (multiplication) {
			const kind = row === ROW_PARTIAL_CARRIES ? 'Retenue de l’addition' : 'Retenue';
			return `${kind}, ${fromRight(c)}`;
		}
		const kind = node.spec?.operator === '-' && !compensation ? 'Nouvelle valeur' : 'Retenue';
		return `${kind}, colonne des ${placeName(c)}`;
	}

	function resultLabel(c: number): string {
		if (!multiplication) return `Chiffre des ${placeName(c)}`;
		const after = comma === c ? ', virgule à sa droite' : '';
		return `Résultat, case ${(scene?.columns ?? 0) - c} sur ${scene?.columns ?? 0} en partant de la droite${after}`;
	}

	function emit() {
		if (!scene || !answer) return;
		const options = answer.minDigits === undefined ? {} : { minDigits: answer.minDigits };
		answer.onChange(readOperationAnswer(scene, digits, options, readComma));
	}

	/** La case de la rangée `row`, colonne `c` (null : pas de case là) */
	function cellAt(row: number, c: number): HTMLInputElement | null {
		return (
			grid?.querySelector<HTMLInputElement>(`input[data-rangee="${row}"][data-colonne="${c}"]`) ??
			null
		);
	}

	function focusCell(row: number, c: number) {
		const input = cellAt(row, c);
		input?.focus();
		input?.select();
	}

	/** ↑/↓ : la rangée suivante qui a une case dans cette colonne */
	function focusVertical(row: number, c: number, step: -1 | 1): void {
		for (let r = row + step; r >= ROW_ABOVE && r <= resultRow; r += step) {
			if (cellAt(r, c)) {
				focusCell(r, c);
				return;
			}
		}
	}

	/** Flèches ↑/↓, communes à toutes les cases ; true si la touche est prise */
	function onVerticalKeydown(event: KeyboardEvent, row: number, c: number): boolean {
		if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return false;
		event.preventDefault();
		focusVertical(row, c, event.key === 'ArrowUp' ? -1 : 1);
		return true;
	}

	// Grandes cases : le résultat (jugé) et les produits partiels (aide)
	const partialKey = (row: number, c: number) => `${row}:${c}`;

	function readCell(row: number, c: number): string {
		return row === resultRow ? (digits[c] ?? '') : (partialDigits[partialKey(row, c)] ?? '');
	}

	function writeCell(row: number, c: number, digit: string) {
		if (row === resultRow) digits[c] = digit;
		else partialDigits[partialKey(row, c)] = digit;
	}

	/** Première case à remplir de la rangée (un produit partiel ne couvre pas toute la grille) */
	function firstColumn(row: number): number {
		if (!scene || row === resultRow) return 0;
		return Math.max(
			0,
			scene.partials[row - partialRow(0)].findIndex((cell) => cell.blank)
		);
	}

	function afterChange(row: number) {
		if (row === resultRow) emit();
	}

	/**
	 * Un chiffre tapé : il remplace celui de la case (où que soit le curseur), le curseur
	 * passe à gauche ; multiplication, résultat : « , » ou « . » pose ou enlève la
	 * virgule à droite de la case ; tout autre caractère est ignoré
	 */
	function onDigitInput(
		event: Event & { currentTarget: HTMLInputElement },
		row: number,
		c: number
	) {
		const typed = event.currentTarget.value;
		const data = event instanceof InputEvent ? (event.data ?? '') : '';
		if (row === resultRow && multiplication && /^[,.]$/.test(data || typed.replace(/\d/g, ''))) {
			comma = comma === c ? null : c;
			event.currentTarget.value = readCell(row, c);
			emit();
			return;
		}
		const digit = /^\d$/.test(data) ? data : typed.replace(/\D/g, '').slice(-1);
		if (digit === '') {
			// Case vidée (effacement natif) ou caractère refusé : la case garde son chiffre
			if (typed === '') writeCell(row, c, '');
			event.currentTarget.value = readCell(row, c);
			afterChange(row);
			return;
		}
		writeCell(row, c, digit);
		event.currentTarget.value = digit;
		afterChange(row);
		if (c > firstColumn(row)) focusCell(row, c - 1);
	}

	function onDigitKeydown(event: KeyboardEvent, row: number, c: number) {
		if (!scene || onVerticalKeydown(event, row, c)) return;
		if (event.key === 'Enter') {
			event.preventDefault();
			answer?.onSubmit?.();
		} else if (event.key === 'Backspace' || event.key === 'Delete') {
			event.preventDefault();
			// Case pleine : on l'efface ; case vide : on revient effacer celle de droite
			if (readCell(row, c) !== '') {
				writeCell(row, c, '');
			} else if (c < scene.columns - 1) {
				writeCell(row, c + 1, '');
				focusCell(row, c + 1);
			}
			afterChange(row);
		} else if (event.key === 'ArrowLeft' && c > firstColumn(row)) {
			event.preventDefault();
			focusCell(row, c - 1);
		} else if (event.key === 'ArrowRight' && c < scene.columns - 1) {
			event.preventDefault();
			focusCell(row, c + 1);
		}
	}

	/** Petite case : un chiffre (cassage : deux, `12`), rien d'autre */
	function onHelperInput(
		event: Event & { currentTarget: HTMLInputElement },
		c: number,
		row: number
	) {
		const max = node.spec?.operator === '-' && !compensation ? 2 : 1;
		const value = event.currentTarget.value.replace(/\D/g, '').slice(0, max);
		if (row === ROW_PARTIAL_CARRIES) partialHelpers[c] = value;
		else helpers[c] = value;
		event.currentTarget.value = value;
	}
</script>

{#snippet helperInput(c: number, row: number)}
	<input
		class="operation-saisie-petite"
		type="text"
		inputmode="numeric"
		autocomplete="off"
		spellcheck="false"
		data-operation-cell="aide"
		data-rangee={row}
		data-colonne={c}
		aria-label={helperLabel(c, row)}
		value={(row === ROW_PARTIAL_CARRIES ? partialHelpers[c] : helpers[c]) ?? ''}
		disabled={answer?.disabled}
		oninput={(e) => onHelperInput(e, c, row)}
		onkeydown={(e) => onVerticalKeydown(e, row, c)}
	/>
{/snippet}

{#snippet divisionDigit(cell: DivisionCell)}
	{#if cell.blank}
		<span class="operation-case"></span>
	{:else}
		<span class:operation-ajoute={cell.added}>{cell.digit}</span>
	{/if}
	{#if cell.comma && !cell.blank}<span class="operation-virgule">,</span>{/if}
{/snippet}

<!-- Division : potence à la française ; à remplir, aucune valeur attendue dans le DOM -->
{#snippet potence(s: DivisionScene)}
	{@const right = rightColumns(s)}
	{@const zoneStart = 1 + s.rows.length}
	{@const remainderRow = zoneStart + s.zone}
	<div class="operation-defile">
		<div
			class="operation-grille"
			role="group"
			aria-label={OPERATION_DIVISION_ARIA_LABEL}
			style:--operation-colonnes={s.columns + 1 + right}
		>
			{#each Array.from({ length: divisionRowCount(s) }, (_, r) => r) as r (r)}
				<!-- Partie gauche : colonne des signes, puis le dividende ou une étape -->
				{#if r === 0}
					<span class="operation-carreau"></span>
					{#each s.dividend as cell, c (c)}
						<span class="operation-carreau">{@render divisionDigit(cell)}</span>
					{/each}
				{:else if r < zoneStart}
					{@const row = s.rows[r - 1]}
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
					{#each Array.from({ length: s.columns + 1 }, (_, c) => c) as c (c)}
						<span class="operation-carreau operation-zone"></span>
					{/each}
				{:else if r === remainderRow && s.remainder}
					<span class="operation-carreau"></span>
					{#each s.remainder as cell, c (c)}
						<span class="operation-carreau">{@render divisionDigit(cell)}</span>
					{/each}
				{:else}
					{#each Array.from({ length: s.columns + 1 }, (_, c) => c) as c (c)}
						<span class="operation-carreau"></span>
					{/each}
				{/if}

				<!-- Partie droite : le diviseur, le trait, le quotient ; trait vertical sur toute la hauteur -->
				{#each Array.from({ length: right }, (_, c) => c) as c (c)}
					<span
						class="operation-carreau"
						class:operation-potence={c === 0}
						class:operation-sous-diviseur={r === 0}
					>
						{#if r === 0 && c < s.divisor.length}
							{s.divisor[c]}
						{:else if r === 1 && c < s.quotient.length}
							{@render divisionDigit(s.quotient[c])}
						{/if}
					</span>
				{/each}
			{/each}
		</div>
	</div>
{/snippet}

{#if node.spec === null || node.errors.length > 0}
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
{:else if divisionScene}
	<div class="operation-bloc my-2 flex flex-wrap items-start justify-center gap-6 {className}">
		{@render potence(divisionScene)}
	</div>
{:else if scene}
	<div
		class="operation-bloc my-2 flex flex-wrap items-start justify-center gap-6 {className}"
		data-operation-case={interactive ? node.caseIndex : undefined}
	>
		<div class="operation-defile">
			<div
				bind:this={grid}
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
							{@render helperInput(c, ROW_ABOVE)}
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

				<!-- Multiplication : retenues de l'addition, puis les produits partiels (aide, jamais jugés) -->
				{#if scene.partialCarries}
					<span class="operation-carreau"></span>
					{#each scene.partialCarries as mark, c (c)}
						<span class="operation-carreau operation-dessus">
							{#if interactive && mark?.blank}
								{@render helperInput(c, ROW_PARTIAL_CARRIES)}
							{:else if mark}
								<span class="operation-petit" class:operation-case-petite={mark.blank}
									>{markText(mark)}</span
								>
							{/if}
						</span>
					{/each}
				{/if}
				{#each scene.partials as row, r (r)}
					{@const last = r === scene.partials.length - 1}
					<span class="operation-carreau operation-signe" class:operation-trait={last}
						>{last ? '+' : ''}</span
					>
					{#each row as cell, c (c)}
						<span class="operation-carreau" class:operation-trait={last}>
							{#if interactive && cell.blank}
								<input
									class="operation-saisie operation-saisie-aide"
									type="text"
									inputmode="numeric"
									enterkeyhint="done"
									autocomplete="off"
									spellcheck="false"
									data-operation-cell="produit"
									data-rangee={partialRow(r)}
									data-colonne={c}
									aria-label="Produit partiel {r + 1}, {fromRight(c)}"
									value={partialDigits[partialKey(partialRow(r), c)] ?? ''}
									disabled={answer?.disabled}
									onfocus={(e) => e.currentTarget.select()}
									onpointerup={(e) => e.currentTarget.select()}
									oninput={(e) => onDigitInput(e, partialRow(r), c)}
									onkeydown={(e) => onDigitKeydown(e, partialRow(r), c)}
								/>
							{:else if cell.blank}
								<span class="operation-case-aide"></span>
							{:else}
								{cell.digit}
							{/if}
						</span>
					{/each}
				{/each}

				<span class="operation-carreau"></span>
				{#each scene.result as cell, c (c)}
					<span class="operation-carreau">
						{#if interactive}
							<input
								class="operation-saisie"
								class:operation-juste={answer?.isCorrect === true}
								class:operation-faux={wrong[c] === true}
								type="text"
								inputmode={multiplication ? 'decimal' : 'numeric'}
								enterkeyhint="done"
								autocomplete="off"
								spellcheck="false"
								data-operation-cell="résultat"
								data-rangee={resultRow}
								data-colonne={c}
								aria-label={resultLabel(c)}
								aria-invalid={wrong[c] === true ? 'true' : undefined}
								value={digits[c] ?? ''}
								disabled={answer?.disabled}
								onfocus={(e) => e.currentTarget.select()}
								onpointerup={(e) => e.currentTarget.select()}
								oninput={(e) => onDigitInput(e, resultRow, c)}
								onkeydown={(e) => onDigitKeydown(e, resultRow, c)}
							/>
						{:else if cell.blank}
							<span class="operation-case"></span>
						{:else}
							{cell.digit}
						{/if}
						{#if interactive && multiplication}
							<!-- Virgule posée par l'élève ; à la correction, absente ou mal placée surlignée -->
							{#if comma === c}
								<span
									class="operation-virgule"
									class:operation-virgule-faux={commaMistake === 'mal placée'}>,</span
								>
							{:else if commaMistake === 'absente' && c === expectedComma}
								<span class="operation-virgule-manquante" aria-hidden="true"></span>
							{/if}
						{:else if cell.comma}<span class="operation-virgule">,</span>{/if}
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

	/* Division : le trait vertical de la potence, le trait sous le diviseur */
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

	/* La seule couleur d'accent : les cases du résultat */
	.operation-case {
		width: 78%;
		height: 78%;
		border: 2px solid var(--color-primary);
		border-radius: 4px;
	}

	/* Produits partiels à remplir : une aide, jamais jugée → pointillés, pas l'accent */
	.operation-case-aide {
		width: 78%;
		height: 78%;
		border: 1px dashed var(--color-muted-foreground);
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

	/* Produits partiels : une aide, jamais jugée → pointillés, pas l'accent */
	.operation-saisie-aide {
		border: 1px dashed var(--color-muted-foreground);
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
