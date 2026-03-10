<!--
	Fill-in-Blanks Input Component
	===============================

	Renders a statement with fill-in-the-blank inputs using unified AST parsing.
	Supports:
	- Text blanks ({{blank:N}}) via BlankInput
	- Math blanks (\placeholder[N]{}) via MathPrompt
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
	- onSubmit: Callback when Enter is pressed in a blank
-->

<script lang="ts">
	import { parseMarkdown } from '$lib/ubumark';
	import type { ResolvedMarkdown } from '$lib/ubumark';
	import type { InstanceBlank, QuestionInstance } from '$lib/questions/types';
	import {
		hasPrompts,
		expressionToFlashLatex,
		expressionToLatex,
		replacePromptsWithValues,
		replacePromptsWithPrefilled
	} from '$lib/components/markdown/utils/math-utils';
	import { toFrenchDecimal } from '$lib/utils/french-math';
	import type { BlockNode, InlineNode } from '$lib/ubumark';

	// Node components (reuse from MarkdownRenderer)
	import ParagraphNode from '$lib/components/markdown/nodes/ParagraphNode.svelte';
	import MathBlock from '$lib/components/markdown/nodes/MathBlock.svelte';
	import MathPrompt from '$lib/components/markdown/nodes/MathPrompt.svelte';
	import HeadingNode from '$lib/components/markdown/nodes/HeadingNode.svelte';
	import ImageDisplay from '$lib/components/markdown/nodes/ImageDisplay.svelte';

	// Utility functions
	import {
		augmentASTForExpressions,
		buildInputStates,
		buildInputStatesForCorrection,
		applyValidationToInputStates
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
		/** Callback when Enter is pressed in a blank */
		onSubmit?: () => void;
		/** LaTeX to insert when Space is pressed in math mode */
		mathModeSpace?: string;
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
		onSubmit,
		mathModeSpace
	}: Props = $props();

	// When showing correct answers, force disabled
	let effectiveDisabled = $derived(disabled || showCorrectAnswers);

	/** Check if a block node contains blanks or math prompts */
	function nodeHasBlanks(node: BlockNode): boolean {
		if (node.type === 'paragraph') {
			return node.children.some(
				(child) =>
					child.type === 'blank' ||
					(child.type === 'math-inline' && hasPrompts(child.expression, child.syntax))
			);
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
		if (!effectiveDisabled) {
			onSubmit?.();
		}
	}
</script>

<div class="fill-blanks-container">
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
				/>
			{:else if node.type === 'math-block'}
				{#if node.expressionName || hasPrompts(node.expression, node.syntax)}
					{#if flashMode}
						{@const displayExpr = node.expressionName
							? expressionDisplayMap?.[node.expressionName]
							: undefined}
						{@const baseLatex = displayExpr ?? expressionToLatex(node.expression, node.syntax)}
						{@const flashLatex = mathPrefilledValues
							? replacePromptsWithPrefilled(baseLatex, mathPrefilledValues)
							: (displayExpr ?? expressionToFlashLatex(node.expression, node.syntax))}
						{#key flashLatex}
							<MathBlock expression={flashLatex} syntax="latex" />
						{/key}
					{:else if showCorrectAnswers && mathCorrectValues}
						{@const latex = expressionToLatex(node.expression, node.syntax)}
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
							/>
						{/key}
					{/if}
				{:else}
					{#key node.expression}
						<MathBlock expression={node.expression} syntax={node.syntax} />
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
			{/if}
		{/each}
	{/if}

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

	.helper-text {
		margin-top: calc(0.5rem * var(--font-scale, 1));
		font-size: calc(0.75rem * var(--font-scale, 1));
		color: hsl(var(--muted-foreground));
	}
</style>
