<!--
@component
Une étape d'un guide calculatrice : du texte où les touches `[[id]]` sont dessinées.
-->
<script lang="ts">
	import { parseStep } from '$lib/calculatrices/guide';
	import CalculatorKey from './CalculatorKey.svelte';

	let { step, keys }: { step: string; keys: Readonly<Record<string, string>> } = $props();

	const segments = $derived(parseStep(step, keys));
</script>

{#each segments as segment, index (index)}
	{#if segment.kind === 'key'}
		<CalculatorKey label={segment.label} />
	{:else}
		{segment.text}
	{/if}
{/each}
