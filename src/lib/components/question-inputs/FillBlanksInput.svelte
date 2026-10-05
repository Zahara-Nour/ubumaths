<!--
	Fill-in-Blanks Input Component
	===============================

	Renders a statement with fill-in-the-blank inputs using unified AST parsing.
	Supports:
	- Text blanks ({{blank:N}}) via BlankInput
	- Math blanks (\placeholder[N]{}) via MathPrompt
	- Blanks inside table cells (same components, rendered inside TableNode)
	- Expression convention (expressionName + answerFormat)
	- Validation state display (correct/incorrect)

	Architecture:
	1. Parse statement → AST (parseMarkdown)
	2. Augment expression nodes (append ` = answerFormat`)
	3. Render AST using existing node components (ParagraphNode, MathPrompt, MathBlock)
	4. Bridge InputState[] ↔ values[]/valuesLatex[] for parent

	Props:
	- statement: ResolvedMarkdown - Resolved statement with \placeholder[N]{} and {{blank:N}}
	- blanks: InstanceBlank[] - Blank definitions with type, expectedAnswer, prefilled, etc.
	- expressions: Expression metadata for expression convention
	- values: Bindable array of user answers (LaTeX for math, text for text)
	- valuesLatex: Bindable array of LaTeX values (for math blanks, empty for text)
	- disabled: Whether inputs are disabled
	- validationResults: Per-blank validation state
	- blankFeedback: Per-blank message after validation (« Blanc 2 : … »)
	- onSubmit: Callback when Enter is pressed in a blank and every blank is filled
	  (otherwise Enter puts the cursor in the first empty blank)
-->

<script lang="ts">
	import { parseMarkdown } from '$lib/ubumark';
	import type { ResolvedMarkdown } from '$lib/ubumark';
	import type { GradeLevel, InstanceBlank, QuestionInstance } from '$lib/questions/types';
	import type { MathfieldElement } from 'mathlive';
	import {
		hasPrompts,
		expressionToFlashLatex,
		expressionToLatex,
		replacePromptsWithValues,
		replacePromptsWithPrefilled
	} from '$lib/components/markdown/utils/math-utils';
	import { toFrenchDecimal } from '$lib/utils/french-math';
	import { buildUnitsKeyboardLayout, unitKeysFor } from '$lib/questions/units/keyboard-units';
	import { buildIntervalsKeyboardLayout } from '$lib/questions/intervals/keyboard-intervals';
	import { buildVectorsKeyboardLayout } from '$lib/questions/vectors/keyboard-vectors';
	import {
		buildCombinatoricsKeyboardLayout,
		hasCombinatoricsKeyboard
	} from '$lib/questions/combinatorics/keyboard-combinatorics';
	import type { BlockNode, InlineNode, TableCellNode } from '$lib/ubumark';
	import type { Snippet } from 'svelte';
	import type { GenericFunctionConfig } from '$lib/mathAST';

	// Node components (reuse from MarkdownRenderer)
	import ParagraphNode from '$lib/components/markdown/nodes/ParagraphNode.svelte';
	import MathBlock from '$lib/components/markdown/nodes/MathBlock.svelte';
	import MathPrompt from '$lib/components/markdown/nodes/MathPrompt.svelte';
	import HeadingNode from '$lib/components/markdown/nodes/HeadingNode.svelte';
	import StaticBlockNode from '$lib/components/markdown/nodes/StaticBlockNode.svelte';
	import TableNode from '$lib/components/markdown/nodes/TableNode.svelte';
	import ImageDisplay from '$lib/components/markdown/nodes/ImageDisplay.svelte';
	import InlineMarkdown from '$lib/components/markdown/InlineMarkdown.svelte';

	// Utility functions
	import {
		augmentASTForExpressions,
		buildInputStates,
		buildInputStatesForCorrection,
		applyValidationToInputStates,
		cellHasBlanks,
		inlineNodesHaveBlanks,
		tableCellInlineNodes,
		tableHasBlanks
	} from './fill-blanks-utils';

	interface Props {
		/** Statement as resolved markdown (with \placeholder[N]{} and {{blank:N}}) */
		statement: ResolvedMarkdown;
		/** Blank definitions from the instance */
		blanks: InstanceBlank[];
		/** Expression metadata for expression convention */
		expressions?: QuestionInstance['expressions'];
		/** User answers: LaTeX for math blanks, text for text blanks */
		values?: string[];
		/** LaTeX values for math blanks (empty string for text blanks) */
		valuesLatex?: string[];
		/** Whether inputs are disabled */
		disabled?: boolean;
		/** Flash mode: show blanks as static placeholders instead of inputs */
		flashMode?: boolean;
		/** Show correct answers in blanks (correction mode) */
		showCorrectAnswers?: boolean;
		/** Only show paragraphs/blocks that contain blanks (for correction display) */
		onlyBlanks?: boolean;
		/** Per-blank validation: true=correct, false=incorrect, null=not validated */
		validationResults?: (boolean | null)[];
		/**
		 * Message propre à chaque trou après correction (index = index du trou),
		 * cf. ValidationResult.blankFeedback. Ne rien passer = aucun message affiché.
		 */
		blankFeedback?: (string | undefined)[];
		/** Entrée dans une case, toutes les cases remplies (sinon : curseur dans la première vide) */
		onSubmit?: () => void;
		/** LaTeX to insert when Space is pressed in math mode */
		mathModeSpace?: string;
		/**
		 * Touches de l'onglet « Unités » fournies par l'appelant. Évaluation : le
		 * navigateur n'a pas la réponse attendue pour les déduire (le serveur les
		 * calcule, cf. `public-question.ts`).
		 */
		unitKeys?: string[];
		/** Fonctions déclarées par le modèle (`P(x)`), pour les formules `~…~` ; absent : défauts */
		genericFunctions?: GenericFunctionConfig;
		/** Niveaux de la carte : Terminale → onglet « n! » (factorielle, coefficient binomial) */
		grades?: readonly GradeLevel[];
	}

	let {
		statement,
		blanks,
		expressions,
		values = $bindable([]),
		valuesLatex = $bindable([]),
		disabled = false,
		flashMode = false,
		showCorrectAnswers = false,
		onlyBlanks = false,
		validationResults = [],
		blankFeedback = [],
		onSubmit,
		mathModeSpace,
		unitKeys: providedUnitKeys,
		genericFunctions,
		grades = []
	}: Props = $props();

	// When showing correct answers, force disabled
	let effectiveDisabled = $derived(disabled || showCorrectAnswers);

	/** Check if a block node contains blanks or math prompts */
	function nodeHasBlanks(node: BlockNode): boolean {
		if (node.type === 'paragraph') {
			return inlineNodesHaveBlanks(node.children);
		}
		if (node.type === 'table') {
			return tableHasBlanks(node);
		}
		if (node.type === 'math-block') {
			return !!node.expressionName || hasPrompts(node.expression, node.syntax);
		}
		return false;
	}

	/** Filter paragraph children to only keep sentences containing blanks */
	function filterSentencesForBlanks(children: InlineNode[]): InlineNode[] {
		const sentences: InlineNode[][] = [[]];

		for (const child of children) {
			if (child.type !== 'text') {
				sentences[sentences.length - 1].push(child);
				continue;
			}

			// Split text at sentence boundaries: ". " followed by uppercase letter
			const parts = child.content.split(/(?<=\.\s)(?=[A-ZÀ-ÿ])/);

			for (let j = 0; j < parts.length; j++) {
				if (j > 0) {
					sentences.push([]);
				}
				if (parts[j]) {
					sentences[sentences.length - 1].push({ ...child, content: parts[j] });
				}
			}
		}

		// Keep only sentences containing blanks or math prompts
		return sentences
			.filter((sentence) =>
				sentence.some(
					(node) =>
						node.type === 'blank' ||
						(node.type === 'math-inline' && hasPrompts(node.expression, node.syntax))
				)
			)
			.flat();
	}

	// Parse statement to AST and augment expression nodes
	// In flash mode, skip augmentation (no "= ?" appended to expressions)
	let augmentedAST = $derived.by(() => {
		const ast = parseMarkdown(statement);
		if (flashMode) return ast;
		const augmented = augmentASTForExpressions(ast, expressions);
		if (onlyBlanks) {
			const blanksOnly = augmented.children.filter(nodeHasBlanks);
			return {
				type: 'document' as const,
				children: blanksOnly.map((block) =>
					block.type === 'paragraph'
						? { ...block, children: filterSentencesForBlanks(block.children) }
						: block
				)
			};
		}
		return augmented;
	});

	// Build InputState[] from blanks + validationResults (or correction mode)
	let inputStates = $derived.by(() => {
		if (showCorrectAnswers) {
			return buildInputStatesForCorrection(blanks);
		}
		const base = buildInputStates(blanks);
		const withValues = base.map((s, i) => ({
			...s,
			value: values[i] ?? s.value
		}));
		return applyValidationToInputStates(withValues, validationResults);
	});

	// Messages par trou, listés sous l'énoncé : un trou MathLive (\placeholder) vit
	// dans le math-field, on ne peut ni y accrocher une légende ni un aria-describedby.
	// Avec un seul trou, le message est déjà le feedback global de l'écran → pas de doublon.
	let blankMessages = $derived.by(() => {
		if (flashMode || showCorrectAnswers || blanks.length < 2) return [];
		return blankFeedback.flatMap((message, index) =>
			message ? [{ blankNumber: index + 1, message }] : []
		);
	});

	// Touches de l'onglet « Unités » : seulement quand l'élève peut répondre à un trou à unité
	let unitKeys = $derived.by(() => {
		if (flashMode || effectiveDisabled) return [];
		if (providedUnitKeys) return providedUnitKeys;
		const unitBlanks = blanks.filter((blank) => blank.type === 'math' && blank.unit?.expected);
		return unitKeysFor(
			unitBlanks.map((blank) => blank.expectedAnswer),
			unitBlanks.map((blank) => blank.unit?.required)
		);
	});

	// Cases « intervalles » à remplir (identifiants de leurs \placeholder) : onglet
	// « Intervalles » et smartFence coupé dans LEURS champs seulement
	let intervalPromptIds = $derived(
		flashMode || effectiveDisabled
			? []
			: blanks.flatMap((blank, index) =>
					blank.type === 'math' && blank.answerKind === 'intervalles' ? [String(index)] : []
				)
	);
	let hasIntervalBlank = $derived(intervalPromptIds.length > 0);
	// Case « vecteur » à remplir : onglet « Vecteur » (colonne, coordonnées en ligne)
	let hasVectorBlank = $derived(
		!flashMode &&
			!effectiveDisabled &&
			blanks.some((blank) => blank.type === 'math' && blank.answerKind === 'vecteur')
	);
	// Carte de Terminale à remplir : onglet « n! » (d'après le niveau, jamais la réponse)
	let hasCombinatoricsTab = $derived(
		!flashMode && !effectiveDisabled && hasCombinatoricsKeyboard(grades)
	);

	let container: HTMLDivElement | undefined = $state();

	/** Champ MathLive (sans importer mathlive à l'exécution : le composant est rendu côté serveur) */
	function isMathField(target: EventTarget | null): target is MathfieldElement {
		return target instanceof HTMLElement && target.tagName === 'MATH-FIELD';
	}

	/**
	 * Onglets « Unités » / « Intervalles » / « Vecteur » du clavier virtuel MathLive,
	 * et « n! » (factorielle, coefficient binomial) pour une carte de Terminale.
	 *
	 * Le clavier est un singleton global (`window.mathVirtualKeyboard`) partagé
	 * par tous les champs de la page : les onglets sont ajoutés quand le focus ENTRE
	 * dans cette question et retirés quand il en SORT (ou au démontage). Une autre
	 * question, un autre champ MathLive, retrouvent ainsi le clavier par défaut.
	 * `focusin`/`focusout` remontent depuis le shadow DOM du math-field ; les
	 * touches du clavier virtuel ne prennent pas le focus, donc ne le font pas sortir.
	 *
	 * Case « intervalles » : le champ qui la contient passe en `smartFence = false`
	 * (mesuré au vrai clavier le 2026-10-01 : avec `smartFence`, taper `[` ouvre une
	 * paire `\left\lbrack…\right\rbrack` refermée d'office, et `[2;3[` devient
	 * illisible — docs/wip/reponse-intervalles-progress.md). Il retrouve son réglage
	 * au démontage seulement.
	 *
	 * ⚠️ Le réglage se pose AVANT que le clavier ne s'ouvre (`pointerdown` en capture,
	 * puis `focusin` pour le Tab), une seule fois, et jamais au `focusout` : toute
	 * affectation d'option sur un math-field `readonly` focalisé, clavier visible,
	 * appelle `hideVirtualKeyboard` (MathLive, `setOptions`). Or en ouvrant le clavier,
	 * le bouton de MathLive fait sortir puis rentrer le focus du champ : l'ancien
	 * va-et-vient du réglage refermait le clavier aussitôt ouvert (bug de prod du
	 * 2026-10-01, modèle n° 11 : « rien n'apparaît »).
	 */
	$effect(() => {
		const element = container;
		const layouts = [
			...(unitKeys.length > 0 ? [buildUnitsKeyboardLayout(unitKeys)] : []),
			...(hasIntervalBlank ? [buildIntervalsKeyboardLayout()] : []),
			...(hasVectorBlank ? [buildVectorsKeyboardLayout()] : []),
			...(hasCombinatoricsTab ? [buildCombinatoricsKeyboardLayout()] : [])
		];
		if (!element || layouts.length === 0) return;

		const promptIds = intervalPromptIds;
		let applied = false;
		// Champs dont smartFence a été coupé → leur réglage d'origine
		const smartFenceBefore = new Map<MathfieldElement, boolean>();

		const restoreSmartFence = () => {
			for (const [field, value] of smartFenceBefore) {
				if (field.smartFence !== value) field.smartFence = value;
			}
			smartFenceBefore.clear();
		};
		const restoreDefault = () => {
			if (!applied) return;
			applied = false;
			const keyboard = window.mathVirtualKeyboard;
			if (keyboard) keyboard.layouts = 'default';
		};
		/** smartFence coupé sur un champ à case « intervalles », s'il ne l'est pas déjà */
		const disableSmartFence = (target: EventTarget | null) => {
			if (!isMathField(target) || target.smartFence === false) return;
			if (!target.getPrompts().some((id) => promptIds.includes(id))) return;
			if (!smartFenceBefore.has(target)) smartFenceBefore.set(target, target.smartFence);
			target.smartFence = false;
		};
		const beforeKeyboardOpens = (event: PointerEvent) => disableSmartFence(event.target);
		const addTabs = (event?: FocusEvent) => {
			disableSmartFence(event?.target ?? document.activeElement);
			const keyboard = window.mathVirtualKeyboard;
			if (!keyboard) return;
			keyboard.layouts = ['default', ...layouts];
			applied = true;
		};

		element.addEventListener('pointerdown', beforeKeyboardOpens, true);
		element.addEventListener('focusin', addTabs);
		element.addEventListener('focusout', restoreDefault);
		// Déjà focalisé quand l'onglet change (unités recalculées) : l'appliquer tout de suite
		if (element.contains(document.activeElement)) addTabs();

		return () => {
			element.removeEventListener('pointerdown', beforeKeyboardOpens, true);
			element.removeEventListener('focusin', addTabs);
			element.removeEventListener('focusout', restoreDefault);
			restoreDefault();
			restoreSmartFence();
		};
	});

	/** Une case à remplir, dans l'ordre de l'écran : prompt d'un champ MathLive ou champ texte */
	type Slot = { field: MathfieldElement; promptId: string } | { input: HTMLInputElement };

	/**
	 * Cases dans l'ordre du DOM, qui est l'ordre visuel : un tableau `:table-h` est
	 * rendu déjà transposé, ses cellules sont donc lues telles qu'affichées. Cet ordre
	 * ne sert qu'au focus ; l'index des réponses reste celui du modèle (id du prompt).
	 */
	function slotsInOrder(): Slot[] {
		if (!container) return [];
		const elements = container.querySelectorAll<HTMLElement>('math-field, input[type="text"]');
		return [...elements].flatMap((element): Slot[] => {
			if (element instanceof HTMLInputElement) return element.disabled ? [] : [{ input: element }];
			if (!isMathField(element)) return [];
			return element
				.getPrompts({ locked: false })
				.map((promptId) => ({ field: element, promptId }));
		});
	}

	function slotValue(slot: Slot): string {
		return 'input' in slot ? slot.input.value : (slot.field.getPromptValue(slot.promptId) ?? '');
	}

	/** Curseur dans la case */
	function focusSlot(slot: Slot) {
		if ('input' in slot) {
			slot.input.focus();
			return;
		}
		slot.field.focus();
		selectPrompt(slot.field, slot.promptId);
	}

	/** Sélectionne tout le prompt : la saisie remplace son contenu */
	function selectPrompt(field: MathfieldElement, promptId: string) {
		const range = field.getPromptRange(promptId);
		if (range) field.selection = { ranges: [range] };
	}

	/**
	 * Entrée (clavier physique, touche « Entrée » du clavier virtuel, champ texte) :
	 * toutes les cases remplies → validation ; sinon curseur dans la première case vide.
	 */
	function submitOrFocusFirstEmpty() {
		if (effectiveDisabled) return;
		const slots = slotsInOrder();
		// MathLive notifie `input` après un setTimeout : relire les prompts avant de valider
		for (const slot of slots) {
			if ('input' in slot) continue;
			const index = Number(slot.promptId);
			if (Number.isInteger(index)) handleInputChange(index, slotValue(slot));
		}
		const firstEmpty = slots.find((slot) => slotValue(slot).trim() === '');
		if (firstEmpty) {
			focusSlot(firstEmpty);
			return;
		}
		onSubmit?.();
	}

	/**
	 * Navigation au clavier entre les cases.
	 *
	 * Tab / Maj+Tab : MathLive passe déjà d'un prompt à l'autre, puis à l'élément
	 * suivant de la page (et le navigateur fait de même depuis un champ texte). Seul
	 * défaut : en revenant par Maj+Tab dans une formule à plusieurs cases, le curseur
	 * tombait sur la PREMIÈRE case au lieu de la dernière. On le replace.
	 *
	 * Entrée dans une formule : MathLive émet `beforeinput` (`insertLineBreak`) avant
	 * son événement `change`, pour la touche physique comme pour la commande `commit`
	 * du clavier virtuel. On l'annule et on applique la règle d'Entrée.
	 */
	$effect(() => {
		const element = container;
		if (!element || flashMode || effectiveDisabled) return;

		let backwardTab = false;
		const trackTab = (event: KeyboardEvent) => {
			backwardTab = event.key === 'Tab' && event.shiftKey;
		};
		// Sur tout le document : Maj+Tab peut venir d'un bouton situé après la question
		const onFocusIn = (event: FocusEvent) => {
			const target = event.target;
			const fromBackwardTab = backwardTab;
			backwardTab = false;
			if (!fromBackwardTab || !isMathField(target) || !element.contains(target)) return;
			const prompts = target.getPrompts({ locked: false });
			if (prompts.length < 2) return;
			selectPrompt(target, prompts[prompts.length - 1]);
		};
		const onBeforeInput = (event: InputEvent) => {
			if (!isMathField(event.target)) return;
			// WebKit retire parfois `inputType` : MathLive le recopie dans `data`
			if (event.inputType !== 'insertLineBreak' && event.data !== 'insertLineBreak') return;
			event.preventDefault();
			submitOrFocusFirstEmpty();
		};

		document.addEventListener('keydown', trackTab, true);
		document.addEventListener('focusin', onFocusIn);
		element.addEventListener('beforeinput', onBeforeInput);
		return () => {
			document.removeEventListener('keydown', trackTab, true);
			document.removeEventListener('focusin', onFocusIn);
			element.removeEventListener('beforeinput', onBeforeInput);
		};
	});

	// Build correctValues map for MathPrompt pre-fill (flash back mode)
	let mathCorrectValues = $derived.by(() => {
		if (!showCorrectAnswers) return undefined;
		const result: Record<string, string> = {};
		for (let i = 0; i < blanks.length; i++) {
			if (blanks[i].type === 'math') {
				result[String(i)] = blanks[i].expectedAnswerLatex ?? blanks[i].expectedAnswer;
			}
		}
		return Object.keys(result).length > 0 ? result : undefined;
	});

	// Build prefilled values map for flash mode (show prefilled instead of ?)
	let mathPrefilledValues = $derived.by(() => {
		if (!flashMode) return undefined;
		const result: Record<string, string> = {};
		for (let i = 0; i < blanks.length; i++) {
			if (blanks[i].prefilled) {
				result[String(i)] = blanks[i].prefilled!;
			}
		}
		return Object.keys(result).length > 0 ? result : undefined;
	});

	// Build prefilled values map for interactive mode (math blanks with prefilled values).
	// Separate from inputStates so MathPrompt receives a static prop that doesn't
	// change on every keystroke (avoids cursor-jump from setPromptValue re-runs).
	let interactivePrefilledValues = $derived.by(() => {
		if (flashMode || showCorrectAnswers) return undefined;
		const result: Record<string, string> = {};
		for (let i = 0; i < blanks.length; i++) {
			if (blanks[i].prefilled && blanks[i].type === 'math') {
				result[String(i)] = toFrenchDecimal(blanks[i].prefilled!);
			}
		}
		return Object.keys(result).length > 0 ? result : undefined;
	});

	// Map expression names to their displayLatex (for flash mode rendering with removeSpaces, etc.)
	let expressionDisplayMap = $derived.by(() => {
		if (!flashMode || !expressions) return undefined;
		const result: Record<string, string> = {};
		for (const expr of expressions) {
			if (expr.displayLatex) {
				result[expr.name] = expr.displayLatex;
			}
		}
		return Object.keys(result).length > 0 ? result : undefined;
	});

	/**
	 * Handle input changes from BlankInput (text) or MathPrompt (math)
	 */
	function handleInputChange(index: number, value: string) {
		if (effectiveDisabled) return;

		// Update values array
		if (index >= 0 && index < blanks.length) {
			values[index] = value;

			// For math blanks, value is LaTeX (from MathLive's getPromptValue)
			if (blanks[index].type === 'math') {
				valuesLatex[index] = value;
			}
		}
	}

	/**
	 * Handle submit from text blank (Enter key)
	 */
	function handleInputSubmit(_index: number) {
		submitOrFocusFirstEmpty();
	}
</script>

<!--
	Cellule d'un tableau à trous : mêmes champs que dans un paragraphe (index N du
	trou, flash, correction, états) ; une cellule sans trou garde le rendu du tableau.
-->
{#snippet blankCell(cell: TableCellNode, defaultCell: Snippet<[string]>)}
	{#if cellHasBlanks(cell.content)}
		<ParagraphNode
			element="span"
			class="table-blank-cell"
			children={tableCellInlineNodes(cell.content)}
			inputs={inputStates}
			onInputChange={handleInputChange}
			onInputSubmit={handleInputSubmit}
			inputsDisabled={effectiveDisabled}
			{flashMode}
			correctionMode={showCorrectAnswers}
			correctValues={mathCorrectValues}
			prefilledValues={flashMode ? mathPrefilledValues : interactivePrefilledValues}
			{expressionDisplayMap}
			{mathModeSpace}
			{genericFunctions}
		/>
	{:else}
		{@render defaultCell(cell.content)}
	{/if}
{/snippet}

<div class="fill-blanks-container" bind:this={container}>
	{#if augmentedAST}
		{#each augmentedAST.children as node, i (i)}
			{#if node.type === 'paragraph'}
				<ParagraphNode
					children={node.children}
					inputs={inputStates}
					onInputChange={handleInputChange}
					onInputSubmit={handleInputSubmit}
					inputsDisabled={effectiveDisabled}
					{flashMode}
					correctionMode={showCorrectAnswers}
					correctValues={mathCorrectValues}
					prefilledValues={flashMode ? mathPrefilledValues : interactivePrefilledValues}
					{expressionDisplayMap}
					{mathModeSpace}
					{genericFunctions}
				/>
			{:else if node.type === 'math-block'}
				{#if node.expressionName || hasPrompts(node.expression, node.syntax)}
					{#if flashMode}
						{@const displayExpr = node.expressionName
							? expressionDisplayMap?.[node.expressionName]
							: undefined}
						{@const baseLatex =
							displayExpr ?? expressionToLatex(node.expression, node.syntax, genericFunctions)}
						{@const flashLatex = mathPrefilledValues
							? replacePromptsWithPrefilled(baseLatex, mathPrefilledValues)
							: (displayExpr ??
								expressionToFlashLatex(node.expression, node.syntax, genericFunctions))}
						{#key flashLatex}
							<MathBlock expression={flashLatex} syntax="latex" />
						{/key}
					{:else if showCorrectAnswers && mathCorrectValues}
						{@const latex = expressionToLatex(node.expression, node.syntax, genericFunctions)}
						{@const filledLatex = replacePromptsWithValues(latex, mathCorrectValues)}
						{#key filledLatex}
							<MathBlock expression={filledLatex} syntax="latex" />
						{/key}
					{:else}
						{#key node.expression}
							<MathPrompt
								expression={node.expression}
								syntax={node.syntax}
								display="block"
								inputs={inputStates.filter((s) => s.type === 'math')}
								onPromptChange={handleInputChange}
								disabled={effectiveDisabled}
								correctValues={mathCorrectValues}
								prefilledValues={interactivePrefilledValues}
								{mathModeSpace}
								{genericFunctions}
							/>
						{/key}
					{/if}
				{:else}
					{#key node.expression}
						<MathBlock expression={node.expression} syntax={node.syntax} {genericFunctions} />
					{/key}
				{/if}
			{:else if node.type === 'image'}
				<ImageDisplay
					src={node.src}
					alt={node.alt}
					title={node.title}
					sizeClass={node.sizeClass}
					widthPercent={node.widthPercent}
					alignment={node.alignment}
					caption={node.caption}
				/>
			{:else if node.type === 'heading'}
				<HeadingNode level={node.level} children={node.children} />
			{:else if node.type === 'table' && tableHasBlanks(node)}
				<!-- `relative` : les éléments en position absolue des champs MathLive (libellés
				     pour lecteur d'écran) restent dans le cadre défilant, sinon la page déborde -->
				<TableNode
					header={node.header}
					rows={node.rows}
					alignments={node.alignments}
					transpose={node.transpose}
					cross={node.cross}
					{genericFunctions}
					customCell={blankCell}
					class="relative"
				/>
			{:else}
				<!-- Blocs sans trou (courbe, tableau, code, liste…) : rendus tels quels -->
				<StaticBlockNode {node} />
			{/if}
		{/each}
	{/if}

	<!-- Messages par blanc (après correction) -->
	<div role="status" aria-live="polite" aria-label="Messages par blanc">
		{#if blankMessages.length > 0}
			<ul class="mt-2 space-y-1 text-sm text-destructive">
				{#each blankMessages as { blankNumber, message } (blankNumber)}
					<li>
						<span class="font-semibold">Blanc {blankNumber}&nbsp;:</span>
						<!-- Message écrit par un auteur (règle) : peut contenir une formule `$x>0$` -->
						<InlineMarkdown content={message} {genericFunctions} />
					</li>
				{/each}
			</ul>
		{/if}
	</div>

	<!-- Helper text -->
	{#if !flashMode && !effectiveDisabled && blanks.length > 0}
		<div class="helper-text">
			<span class="text-xs text-muted-foreground"> Remplissez les blancs avec vos réponses </span>
		</div>
	{/if}
</div>

<style>
	.fill-blanks-container {
		width: 100%;
	}

	/* Case dans une cellule étroite : largeur minimale lisible, sans retour à la ligne */
	:global(.table-blank-cell) {
		white-space: nowrap;
	}

	:global(.table-blank-cell math-field) {
		min-width: 2.5em;
	}

	/* Cellule étroite : sans le bouton de menu (le clic droit l'ouvre toujours) */
	:global(.table-blank-cell math-field::part(menu-toggle)) {
		display: none;
	}

	.helper-text {
		margin-top: calc(0.5rem * var(--font-scale, 1));
		font-size: calc(0.75rem * var(--font-scale, 1));
		color: var(--color-muted-foreground);
	}
</style>
