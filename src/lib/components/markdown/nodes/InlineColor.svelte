<!--
	InlineColor — formule d'un texte coloré `[$x^2$]{.orange}` (ADR 0042)
	Sans couleur, ou dans le chat des élèves (rendu restreint), rien n'est ajouté.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { NamedColor } from '#lib/theme/named-colors.ts';
	import { readRestrictedRendering } from '../restricted-rendering';
	import { inlineColorValue } from '../inline-color';

	interface Props {
		color?: NamedColor;
		children: Snippet;
	}

	let { color, children }: Props = $props();

	const restricted = readRestrictedRendering();
	let colorValue = $derived(inlineColorValue(color, restricted()));
</script>

{#if colorValue}<span style:color={colorValue}>{@render children()}</span
	>{:else}{@render children()}{/if}
