<!--
	Fill-in-Blanks Input Component
	===============================

	Renders a statement with fill-in-the-blank inputs using unified AST parsing.
	Supports:
	- Text blanks ({{blank:N}}) via BlankInput
	- Math blanks (\placeholder[N]{}) via MathPrompt
	- Blanks inside table cells (same components, rendered inside TableNode)
	- Expression convention (expressionName + answerFormat)
	- Case « choix » (bloc ```choix) : MultipleChoiceInput à l'endroit du bloc ; valeur
	  de la case = indices d'origine cochés (`formatChoiceAnswer`, « 0;2 »)
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
	- unoptimalResults: Per-blank « juste mais perfectible » (ambre)
	- blankFeedback: Per-blank message after validation (« Blanc 2 : … »)
	- onSubmit: Callback when Enter is pressed in a blank and every blank is filled
	  (otherwise Enter puts the cursor in the first empty blank)
-->

<script lang="ts">
	import '$lib/utils/mathlive-styles';
	import { parseMarkdown } from '$lib/ubumark';
	import { lexiconRuntime, loadLexiconRuntime } from '$lib/lexicon/runtime-store.svelte';
	import { readLexicon } from '$lib/components/markdown/lexicon-context';
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
	import { operationCaseCount } from '$lib/ubumark/utils/operation-division-answer';
	import { buildUnitsKeyboardLayout, unitKeysFor } from '$lib/questions/units/keyboard-units';
	import { buildIntervalsKeyboardLayout } from '$lib/questions/intervals/keyboard-intervals';
	import { buildVectorsKeyboardLayout } from '$lib/questions/vectors/keyboard-vectors';
	import { buildMatricesKeyboardLayout } from '$lib/questions/matrices/keyboard-matrices';
	import {
		buildCombinatoricsKeyboardLayout,
		hasCombinatoricsKeyboard
	} from '$lib/questions/combinatorics/keyboard-combinatorics';
	import type { BlockNode, InlineNode, TableCellNode } from '$lib/ubumark';
	import type { Snippet } from 'svelte';
	import type { GenericFunctionConfig } from '$lib/mathAST';
	import type { CapitalPairs } from '$lib/mathAST/parser/types';

	// Node components (reuse from MarkdownRenderer)
	import ParagraphNode from '$lib/components/markdown/nodes/ParagraphNode.svelte';
	import MathBlock from '$lib/components/markdown/nodes/MathBlock.svelte';
	import MathPrompt from '$lib/components/markdown/nodes/MathPrompt.svelte';
	import HeadingNode from '$lib/components/markdown/nodes/HeadingNode.svelte';
	import StaticBlockNode from '$lib/components/markdown/nodes/StaticBlockNode.svelte';
	import TableNode from '$lib/components/markdown/nodes/TableNode.svelte';
	import ImageDisplay from '$lib/components/markdown/nodes/ImageDisplay.svelte';
	import Operation from '$lib/components/markdown/nodes/Operation.svelte';
	import Collection from '$lib/components/markdown/nodes/Collection.svelte';
	import NumberLine from '$lib/components/markdown/nodes/NumberLine.svelte';
	import HorlogePlacer from '$lib/components/markdown/nodes/HorlogePlacer.svelte';
	import BarresPlacer from '$lib/components/markdown/nodes/BarresPlacer.svelte';
	import Monnaie from '$lib/components/markdown/nodes/Monnaie.svelte';
	import BuildAnswer from '$lib/components/questions/BuildAnswer.svelte';
	import FigureBlock from '$lib/components/markdown/nodes/FigureBlock.svelte';
	import ChoiceBlock from '$lib/components/markdown/nodes/ChoiceBlock.svelte';
	import MultipleChoiceInput from './MultipleChoiceInput.svelte';
	import type { ChoiceNode } from '$lib/ubumark/types/choix';
	import {
		correctChoiceIndexesOf,
		formatChoiceAnswer,
		parseChoiceAnswer
	} from '$lib/questions/choice-case';
	import InlineMarkdown from '$lib/components/markdown/InlineMarkdown.svelte';
	import {
		provideCapitalPairs,
		readCapitalPairs
	} from '$lib/components/markdown/content-capital-pairs';
	import { readDigitGrouping } from '$lib/components/markdown/content-digit-grouping';

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
		/** Case juste mais perfectible (ambre), seulement avec `validationResults[i] === true` */
		unoptimalResults?: boolean[];
		/**
		 * Message propre à chaque trou après correction (index = index du trou),
		 * cf. ValidationResult.blankFeedback. Ne rien passer = aucun message affiché.
		 */
		blankFeedback?: (string | undefined)[];
		/** Entrée dans une case, toutes les cases remplies (sinon : curseur dans la première vide) */
		onSubmit?: () => void;
		/** LaTeX to insert when Space is pressed in math mode */
		mathModeSpace?: string;
		/** Sens de `AB` de l'instance : en mode longueur, raccourcis `AA`, `RR`… coupés (Q-N) */
		capitalPairs?: CapitalPairs;
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
		unoptimalResults = [],
		blankFeedback = [],
		onSubmit,
		mathModeSpace,
		capitalPairs,
		unitKeys: providedUnitKeys,
		genericFunctions,
		grades = []
	}: Props = $props();

	// Sens de `AB` pour les formules de l'énoncé rendues sous ce champ (lot 5)
	const parentCapitalPairs = readCapitalPairs();
	provideCapitalPairs(() => capitalPairs);
	/** Sens qui repère les cases : la prop, sinon celui de la carte (`~A'B'=?~`) */
	const blanksCapitalPairs = () => capitalPairs ?? parentCapitalPairs();
	// Seuil des espaces de groupement de la question, posé par sa carte (« Espaces dès 4 chiffres »)
	const digitGrouping = readDigitGrouping();
	const digitGroupingOptions = () => {
		const minDigits = digitGrouping();
		return minDigits === undefined ? {} : { minDigits };
	};

	// When showing correct answers, force disabled
	let effectiveDisabled = $derived(disabled || showCorrectAnswers);

	/**
	 * Au moins une case à écrire (texte, formule, grille d'opération) : seule elle
	 * justifie « Remplissez les blancs » ; un choix, une figure ou une collection
	 * à construire ont leur propre consigne
	 */
	let hasWrittenBlank = $derived(blanks.some((b) => !b.choice && !b.construction && !b.construire));

	/** Check if a block node contains blanks or math prompts */
	function nodeHasBlanks(node: BlockNode): boolean {
		if (node.type === 'paragraph') {
			return inlineNodesHaveBlanks(node.children, blanksCapitalPairs());
		}
		if (node.type === 'table') {
			return tableHasBlanks(node, blanksCapitalPairs());
		}
		if (node.type === 'math-block') {
			return (
				!!node.expressionName || hasPrompts(node.expression, node.syntax, blanksCapitalPairs())
			);
		}
		if (node.type === 'operation') return node.caseIndex !== undefined;
		if (node.type === 'collection') return node.caseIndex !== undefined;
		if (node.type === 'number-line') return node.caseIndex !== undefined;
		if (node.type === 'horloge') return node.caseIndex !== undefined;
		if (node.type === 'stat-chart') return node.caseIndex !== undefined;
		if (node.type === 'monnaie') return node.caseIndex !== undefined;
		if (node.type === 'figure') return node.construction?.caseIndex !== undefined;
		if (node.type === 'choice') return node.caseIndex !== undefined;
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
						(node.type === 'math-inline' &&
							hasPrompts(node.expression, node.syntax, blanksCapitalPairs()))
				)
			)
			.flat();
	}

	// Mots cliquables : repérés au niveau de lecture posé par le cadre de la question
	// (le dictionnaire est chargé au premier besoin)
	const lexicon = readLexicon();
	$effect(() => {
		if (lexicon()) loadLexiconRuntime();
	});

	// Parse statement to AST and augment expression nodes
	// In flash mode, skip augmentation (no "= ?" appended to expressions)
	let structuredAST = $derived.by(() => {
		const ast = parseMarkdown(statement);
		if (flashMode) return ast;
		const augmented = augmentASTForExpressions(ast, expressions, blanksCapitalPairs());
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

	// Mots repérés en dernier : les positions portent sur le texte affiché (après le
	// découpage en phrases de `onlyBlanks`)
	let augmentedAST = $derived.by(() => {
		const grade = lexicon();
		const runtime = lexiconRuntime();
		return grade && runtime ? runtime.linkDocument(structuredAST, grade) : structuredAST;
	});

	// Build InputState[] from blanks + validationResults (or correction mode)
	let inputStates = $derived.by(() => {
		if (showCorrectAnswers) {
			return buildInputStatesForCorrection(blanks);
		}
		const base = buildInputStates(blanks, digitGrouping());
		const withValues = base.map((s, i) => ({
			...s,
			value: values[i] ?? s.value
		}));
		return applyValidationToInputStates(withValues, validationResults, unoptimalResults);
	});

	// Messages par trou, listés sous l'énoncé : un trou MathLive (\placeholder) vit
	// dans le math-field, on ne peut ni y accrocher une légende ni un aria-describedby.
	// Avec un seul trou, le message est déjà le feedback global de l'écran → pas de doublon.
	// De même pour une case « figure » : son message (le juge) est le feedback global, et elle
	// ne compte pas dans les numéros (l'élève ne voit que les autres cases).
	let blankMessages = $derived.by(() => {
		// Cases « figure » hors compte : le message d'une seule autre case est déjà le feedback global
		if (flashMode || showCorrectAnswers || blanks.filter((b) => !b.construction).length < 2) {
			return [];
		}
		return blankFeedback.flatMap((message, index) => {
			if (!message || blanks[index]?.construction) return [];
			const blankNumber = blanks.slice(0, index + 1).filter((b) => !b.construction).length;
			return [{ blankNumber, message }];
		});
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
	// Case « matrice » à remplir : onglet « Matrice » (gabarits, ajout de ligne / colonne)
	let hasMatrixBlank = $derived(
		!flashMode &&
			!effectiveDisabled &&
			blanks.some((blank) => blank.type === 'math' && blank.answerKind === 'matrice')
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
	 * Onglets « Unités » / « Intervalles » / « Vecteur » / « Matrice » du clavier virtuel MathLive,
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
	 * illisible — docs/archive/wip/reponse-intervalles-progress.md). Il retrouve son réglage
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
			...(hasMatrixBlank ? [buildMatricesKeyboardLayout()] : []),
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

	/**
	 * Une case à remplir, dans l'ordre de l'écran : prompt d'un champ MathLive, champ texte,
	 * ou grille d'un bloc ```operation (ses cases forment UNE réponse ; division
	 * euclidienne : deux, le quotient puis le reste), ou plan d'une collection ou d'une monnaie à construire,
	 * ou droite ou horloge à placer, ou diagramme en barres à construire
	 */
	type Slot =
		| { field: MathfieldElement; promptId: string }
		| { input: HTMLInputElement }
		| { operation: HTMLElement; index: number }
		| { build: HTMLElement; index: number; count: number };

	/**
	 * Cases dans l'ordre du DOM, qui est l'ordre visuel : un tableau `:table-h` est
	 * rendu déjà transposé, ses cellules sont donc lues telles qu'affichées. Cet ordre
	 * ne sert qu'au focus ; l'index des réponses reste celui du modèle (id du prompt).
	 */
	function slotsInOrder(): Slot[] {
		if (!container) return [];
		const elements = container.querySelectorAll<HTMLElement>(
			'math-field, input[type="text"]:not([data-operation-cell]), [data-operation-case], [data-construire-case]'
		);
		return [...elements].flatMap((element): Slot[] => {
			if (element instanceof HTMLInputElement) return element.disabled ? [] : [{ input: element }];
			if (element.dataset.construireCase !== undefined) {
				const index = Number(element.dataset.construireCase);
				return [{ build: element, index, count: Number(element.dataset.construireCases ?? 1) }];
			}
			if (element.dataset.operationCase !== undefined) {
				return [{ operation: element, index: Number(element.dataset.operationCase) }];
			}
			if (!isMathField(element)) return [];
			return element
				.getPrompts({ locked: false })
				.map((promptId) => ({ field: element, promptId }));
		});
	}

	function slotValue(slot: Slot): string {
		if ('build' in slot) {
			// Droite à plusieurs points : vide tant qu'un point manque
			const cases = Array.from({ length: slot.count }, (_, k) => values[slot.index + k] ?? '');
			return cases.some((value) => value === '') ? '' : cases.join(' ');
		}
		if ('operation' in slot) return values[slot.index] ?? '';
		return 'input' in slot ? slot.input.value : (slot.field.getPromptValue(slot.promptId) ?? '');
	}

	/** Curseur dans la case */
	function focusSlot(slot: Slot) {
		if ('build' in slot) {
			// Plan vide : le premier bouton de la réserve ; droite à placer : la droite
			slot.build
				.querySelector<HTMLElement>('.construire-ajouter:not(:disabled), [role="slider"]')
				?.focus();
			return;
		}
		if ('operation' in slot) {
			// Quotient d'une division, écrit de gauche à droite : la case vide la plus à gauche
			const quotient = [
				...slot.operation.querySelectorAll<HTMLInputElement>(
					'input[data-operation-cell="quotient"]'
				)
			];
			if (quotient.length > 0) {
				(quotient.find((cell) => cell.value === '') ?? quotient[0]).focus();
				return;
			}
			// Saisie de droite à gauche (résultat, reste) : la case vide la plus à droite
			const cells = [
				...slot.operation.querySelectorAll<HTMLInputElement>(
					'input[data-operation-cell="résultat"], input[data-operation-cell="reste"]'
				)
			];
			(cells.findLast((cell) => cell.value === '') ?? cells.at(-1))?.focus();
			return;
		}
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
			if (!('field' in slot)) continue;
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
				result[String(i)] = toFrenchDecimal(blanks[i].prefilled!, digitGroupingOptions());
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

	// ============================================================================
	// CASE « CHOIX »
	// ============================================================================

	/** Ordre affiché de la case choix : `order[position]` = indice d'origine */
	function choiceOrder(caseIndex: number): number[] {
		return blanks[caseIndex]?.choice?.order ?? [];
	}

	/** Positions affichées cochées, lues dans la valeur de la case (indices d'origine) */
	function checkedPositions(caseIndex: number, value: string): number[] {
		const order = choiceOrder(caseIndex);
		return (parseChoiceAnswer(value, order.length) ?? []).map((index) => order.indexOf(index));
	}

	/** Positions affichées des bons choix (correction ; vide si la réponse n'est pas connue) */
	function correctPositions(caseIndex: number): number[] {
		const blank = blanks[caseIndex];
		if (!blank?.choice) return [];
		const order = blank.choice.order;
		return correctChoiceIndexesOf({ ...blank, choice: blank.choice }).map((index) =>
			order.indexOf(index)
		);
	}

	/** Choix affichés pour la saisie, marqués justes si la réponse est connue */
	function choiceInputItems(node: ChoiceNode, caseIndex: number) {
		const correct = new Set(correctPositions(caseIndex));
		return node.choices.map((content, position) => ({
			content: content as ResolvedMarkdown,
			isCorrect: correct.has(position)
		}));
	}

	/** Positions cochées → valeur de la case (indices d'origine, triés) */
	function handleChoiceChange(caseIndex: number, positions: number[]) {
		const order = choiceOrder(caseIndex);
		handleInputChange(caseIndex, formatChoiceAnswer(positions.map((position) => order[position])));
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
	{#if cellHasBlanks(cell.content, blanksCapitalPairs())}
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
			{capitalPairs}
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
					{capitalPairs}
					{genericFunctions}
				/>
			{:else if node.type === 'math-block'}
				{#if node.expressionName || hasPrompts(node.expression, node.syntax, blanksCapitalPairs())}
					{#if flashMode}
						{@const displayExpr = node.expressionName
							? expressionDisplayMap?.[node.expressionName]
							: undefined}
						{@const baseLatex =
							displayExpr ??
							expressionToLatex(
								node.expression,
								node.syntax,
								genericFunctions,
								undefined,
								capitalPairs,
								digitGrouping()
							)}
						{@const flashLatex = mathPrefilledValues
							? replacePromptsWithPrefilled(baseLatex, mathPrefilledValues)
							: (displayExpr ??
								expressionToFlashLatex(
									node.expression,
									node.syntax,
									genericFunctions,
									undefined,
									capitalPairs,
									digitGrouping()
								))}
						{#key flashLatex}
							<MathBlock expression={flashLatex} syntax="latex" />
						{/key}
					{:else if showCorrectAnswers && mathCorrectValues}
						{@const latex = expressionToLatex(
							node.expression,
							node.syntax,
							genericFunctions,
							undefined,
							capitalPairs,
							digitGrouping()
						)}
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
								{capitalPairs}
								{genericFunctions}
							/>
						{/key}
					{/if}
				{:else}
					{#key node.expression}
						<MathBlock expression={node.expression} syntax={node.syntax} {genericFunctions} />
					{/key}
				{/if}
			{:else if node.type === 'operation' && node.caseIndex !== undefined}
				{@const caseIndex = node.caseIndex}
				{@const state = inputStates[caseIndex]}
				{@const euclidean = node.spec !== null && operationCaseCount(node.spec) === 2}
				{#if flashMode}
					<Operation {node} />
				{:else if showCorrectAnswers}
					<!-- Bonne réponse : l'opération résolue, retenues comprises -->
					<Operation node={{ ...node, spec: node.spec && { ...node.spec, cells: 'aucune' } }} />
				{:else}
					<!-- Division euclidienne : le reste est la case suivante de la question -->
					<Operation
						{node}
						answer={{
							value: state?.value ?? '',
							isCorrect: state?.isCorrect ?? null,
							disabled: effectiveDisabled,
							onChange: (value) => handleInputChange(caseIndex, value),
							onSubmit: submitOrFocusFirstEmpty,
							minDigits: digitGrouping()
						}}
						remainder={euclidean
							? {
									value: inputStates[caseIndex + 1]?.value ?? '',
									isCorrect: inputStates[caseIndex + 1]?.isCorrect ?? null,
									disabled: effectiveDisabled,
									onChange: (value) => handleInputChange(caseIndex + 1, value),
									onSubmit: submitOrFocusFirstEmpty,
									minDigits: digitGrouping()
								}
							: undefined}
					/>
				{/if}
			{:else if node.type === 'number-line' && node.caseIndex !== undefined && node.placer !== undefined}
				<!-- Droite à placer : l'élève pose ses points, une case par point (N, N + 1…),
				     la graduation de chacun est sa réponse -->
				{@const firstCase = node.caseIndex}
				{@const caseCount = node.placer.length}
				{#if showCorrectAnswers}
					<!-- Bonne réponse : la droite avec les points justes -->
					<BuildAnswer kind="line" source={node.source ?? ''} answer={null} status="solution" />
				{:else}
					<div data-construire-case={firstCase} data-construire-cases={caseCount}>
						<NumberLine
							{node}
							answers={node.placer.map((_, k) => ({
								value: inputStates[firstCase + k]?.value ?? '',
								isCorrect: flashMode ? null : (inputStates[firstCase + k]?.isCorrect ?? null),
								disabled: flashMode || effectiveDisabled,
								onChange: (value: string) => handleInputChange(firstCase + k, value)
							}))}
						/>
					</div>
				{/if}
			{:else if node.type === 'stat-chart' && node.caseIndex !== undefined && node.spec?.toPlace}
				<!-- Diagramme en barres à construire : l'élève monte ses barres, une case par
				     barre (N, N + 1…), la hauteur de chacune est sa réponse -->
				{@const firstCase = node.caseIndex}
				{@const caseCount = node.spec.toPlace.length}
				{#if showCorrectAnswers}
					<!-- Bonne réponse : le diagramme juste -->
					<BuildAnswer kind="barres" source={node.source} answer={null} status="solution" />
				{:else}
					<div data-construire-case={firstCase} data-construire-cases={caseCount}>
						<BarresPlacer
							{node}
							answers={node.spec.toPlace.map((_, k) => ({
								value: inputStates[firstCase + k]?.value ?? '',
								isCorrect: flashMode ? null : (inputStates[firstCase + k]?.isCorrect ?? null),
								disabled: flashMode || effectiveDisabled,
								onChange: (value: string) => handleInputChange(firstCase + k, value)
							}))}
						/>
					</div>
				{/if}
			{:else if node.type === 'horloge' && node.caseIndex !== undefined && node.spec?.placer !== undefined}
				<!-- Horloge à placer : l'élève pose les deux aiguilles, leurs crans sont la réponse -->
				{@const caseIndex = node.caseIndex}
				{@const state = inputStates[caseIndex]}
				{#if showCorrectAnswers}
					<!-- Bonne réponse : le cadran à l'heure juste -->
					<BuildAnswer kind="horloge" source={node.source} answer={null} status="solution" />
				{:else}
					<div data-construire-case={caseIndex}>
						<HorlogePlacer
							{node}
							answer={{
								value: state?.value ?? '',
								isCorrect: flashMode ? null : (state?.isCorrect ?? null),
								disabled: flashMode || effectiveDisabled,
								onChange: (value) => handleInputChange(caseIndex, value)
							}}
						/>
					</div>
				{/if}
			{:else if node.type === 'collection' && node.caseIndex !== undefined && node.spec?.build !== undefined}
				<!-- Collection à construire : l'élève pose barres et cubes, la valeur posée est la réponse -->
				{@const caseIndex = node.caseIndex}
				{@const state = inputStates[caseIndex]}
				{#if showCorrectAnswers}
					<!-- Bonne réponse : une construction juste (le moins d'objets), sans réserve -->
					<BuildAnswer kind="collection" source={node.source} answer={null} status="solution" />
				{:else}
					<div data-construire-case={caseIndex}>
						<Collection
							{node}
							answer={{
								value: state?.value ?? '',
								isCorrect: flashMode ? null : (state?.isCorrect ?? null),
								disabled: flashMode || effectiveDisabled,
								onChange: (value) => handleInputChange(caseIndex, value)
							}}
						/>
					</div>
				{/if}
			{:else if node.type === 'monnaie' && node.caseIndex !== undefined && node.spec?.build !== undefined && node.spec.reserve !== undefined}
				<!-- Monnaie à construire : l'élève pose pièces et billets, la somme posée est la réponse -->
				{@const caseIndex = node.caseIndex}
				{@const state = inputStates[caseIndex]}
				{#if showCorrectAnswers}
					<!-- Bonne réponse : une construction juste (le moins d'objets avec la réserve), sans réserve -->
					<BuildAnswer kind="monnaie" source={node.source} answer={null} status="solution" />
				{:else}
					<div data-construire-case={caseIndex}>
						<Monnaie
							{node}
							answer={{
								value: state?.value ?? '',
								isCorrect: flashMode ? null : (state?.isCorrect ?? null),
								disabled: flashMode || effectiveDisabled,
								onChange: (value) => handleInputChange(caseIndex, value)
							}}
						/>
					</div>
				{/if}
			{:else if node.type === 'figure' && node.construction?.caseIndex !== undefined}
				<!-- Case « figure » (```figure-a-completer) : l'élève trace sur la figure de départ.
				     Figure de travail (```figure-de-travail) : jamais notée, ni verte ni rouge -->
				{@const caseIndex = node.construction.caseIndex}
				{@const state = inputStates[caseIndex]}
				{@const work = node.construction.work === true}
				{#if flashMode}
					<FigureBlock {node} />
				{:else if showCorrectAnswers}
					<FigureBlock {node} showSolution />
				{:else}
					<FigureBlock
						{node}
						answer={{
							value: state?.value ?? '',
							isCorrect: work ? null : (state?.isCorrect ?? null),
							disabled: effectiveDisabled,
							onChange: (value) => handleInputChange(caseIndex, value)
						}}
					/>
				{/if}
			{:else if node.type === 'choice' && node.caseIndex !== undefined && blanks[node.caseIndex]?.choice}
				<!-- Case « choix » : les choix à l'endroit du bloc, ronds (une réponse) ou carrés -->
				{@const caseIndex = node.caseIndex}
				{@const state = inputStates[caseIndex]}
				{@const validated = (state?.isCorrect ?? null) !== null}
				{@const answerKnown = correctPositions(caseIndex).length > 0}
				{#if flashMode}
					<ChoiceBlock {node} />
				{:else}
					<MultipleChoiceInput
						choices={choiceInputItems(node, caseIndex)}
						selectedIndexes={showCorrectAnswers
							? correctPositions(caseIndex)
							: checkedPositions(caseIndex, state?.value ?? '')}
						multipleAnswers={node.multiple}
						disabled={effectiveDisabled || validated}
						showValidation={answerKnown && (showCorrectAnswers || validated)}
						label={`Case ${caseIndex + 1} : choix`}
						onSelectionChange={(positions) => handleChoiceChange(caseIndex, positions)}
						{genericFunctions}
					/>
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
			{:else if node.type === 'table' && tableHasBlanks(node, blanksCapitalPairs())}
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
	{#if !flashMode && !effectiveDisabled && hasWrittenBlank}
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
