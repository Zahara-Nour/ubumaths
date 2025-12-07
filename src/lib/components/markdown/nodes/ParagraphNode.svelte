<!--
	ParagraphNode Component
	=======================

	Renders a paragraph with inline children (text, math, line breaks, blanks).
	Handles whitespace preservation for math-inline elements.

	Features:
	- Recursive rendering of inline children
	- Whitespace preservation adjacent to math elements
	- Fill-in-the-blank input support
	- Proper styling with Tailwind

	Problem solved:
	`display: inline-block` on math-field elements causes adjacent
	whitespace to collapse. We convert spaces adjacent to math-inline
	elements to non-breaking spaces (en-space) to preserve them.

	@see ExerciseDisplay.svelte for original implementation
	@see HeadingNode.svelte for similar inline rendering
	@see BlankInput.svelte for blank input rendering
-->
<script lang="ts">
	import type { InlineNode, InputState } from '$lib/custom-markdown';
	import MathInline from './MathInline.svelte';
	import MathPrompt from './MathPrompt.svelte';
	import TextNode from './TextNode.svelte';
	import BlankInput from './BlankInput.svelte';

	interface Props {
		children: InlineNode[];
		class?: string;
		/** Unified input states for both text blanks and math prompts */
		inputs?: InputState[];
		/** Callback when any input value changes (text or math) */
		onInputChange?: (index: number, value: string) => void;
		/** Callback when user submits a text blank (Enter key) */
		onInputSubmit?: (index: number) => void;
		/** Whether inputs are disabled (e.g., after submission) */
		inputsDisabled?: boolean;
	}

	let {
		children,
		class: className = '',
		inputs = [],
		onInputChange,
		onInputSubmit,
		inputsDisabled = false
	}: Props = $props();

	/**
	 * Check if adjacent node is inline-block (math or blank) for whitespace handling
	 */
	function isInlineBlockNode(node: InlineNode | undefined): boolean {
		return node?.type === 'math-inline' || node?.type === 'blank';
	}

	/**
	 * Get input state by index
	 */
	function getInputState(index: number): InputState | undefined {
		return inputs.find((i) => i.index === index);
	}

	/**
	 * Handle whitespace preservation for text adjacent to math.
	 * Uses en-space for better visibility.
	 *
	 * We use &ensp; rather than word-joiner (U+2060) because:
	 * - &ensp; is universally supported and well-understood
	 * - Line breaks right before/after math expressions are rarely desirable
	 * - It reliably prevents whitespace collapse in all browsers
	 */
	function adjustTextForMath(
		content: string,
		prevIsMath: boolean,
		nextIsMath: boolean
	): { content: string; hasLeadingSpace: boolean; hasTrailingSpace: boolean } {
		let adjusted = content;
		const hasLeadingSpace = content.startsWith(' ') && prevIsMath;
		const hasTrailingSpace = content.endsWith(' ') && nextIsMath;

		if (hasLeadingSpace) {
			adjusted = adjusted.slice(1);
		}
		if (hasTrailingSpace) {
			adjusted = adjusted.slice(0, -1);
		}

		return { content: adjusted, hasLeadingSpace, hasTrailingSpace };
	}
</script>

<p class="mb-4 text-foreground {className}">
	{#each children as child, index (index)}
		{#if child.type === 'text'}
			{@const prevIsInlineBlock = isInlineBlockNode(children[index - 1])}
			{@const nextIsInlineBlock = isInlineBlockNode(children[index + 1])}
			{@const adjusted = adjustTextForMath(child.content, prevIsInlineBlock, nextIsInlineBlock)}
			{#if adjusted.hasLeadingSpace}&ensp;{/if}<TextNode
				content={adjusted.content}
				bold={child.bold}
				italic={child.italic}
				code={child.code}
			/>{#if adjusted.hasTrailingSpace}&ensp;{/if}
		{:else if child.type === 'math-inline'}
			{#if child.hasPrompts && child.promptIndices}
				<MathPrompt
					latex={child.latex}
					display="inline"
					promptIndices={child.promptIndices}
					inputs={inputs.filter((i) => i.type === 'math')}
					onPromptChange={onInputChange}
				/>
			{:else}
				<MathInline latex={child.latex} />
			{/if}
		{:else if child.type === 'blank'}
			{@const state = getInputState(child.index)}
			<BlankInput
				index={child.index}
				value={state?.value ?? ''}
				disabled={inputsDisabled}
				isCorrect={state?.isCorrect ?? null}
				onValueChange={(value) => onInputChange?.(child.index, value)}
				onSubmit={() => onInputSubmit?.(child.index)}
			/>
		{:else if child.type === 'line-break'}
			{#if child.hard}<br />{/if}
		{/if}
	{/each}
</p>
