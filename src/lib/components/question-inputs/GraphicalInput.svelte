<!--
	GraphicalInput Component
	========================

	Generic dispatcher for graphical input tools.
	Currently supports:
	- number-line: Interactive number line (droite graduée)

	Extensible for future tools (trig circle input, graph input, etc.)

	@module components/question-inputs/GraphicalInput
-->
<script lang="ts">
	import type { InstanceBlank } from '$lib/questions/types';
	import NumberLineInput from './NumberLineInput.svelte';

	interface Props {
		blank: InstanceBlank;
		value: string;
		disabled?: boolean;
		isCorrect?: boolean | null;
		onchange?: (value: string) => void;
	}

	let {
		blank,
		value = $bindable(''),
		disabled = false,
		isCorrect = null,
		onchange
	}: Props = $props();
</script>

{#if blank.graphicalConfig?.tool === 'number-line' && blank.graphicalConfig.numberLine}
	{@const nl = blank.graphicalConfig.numberLine}
	<NumberLineInput
		configBlock={nl.configBlock}
		fixedPoints={nl.fixedPoints}
		fixedSegments={nl.fixedSegments}
		task={nl.task}
		snap={nl.snap}
		bind:value
		{disabled}
		{isCorrect}
		{onchange}
	/>
{:else}
	<p class="text-sm text-muted-foreground">Outil graphique non supporté</p>
{/if}
