<!--
	@component
	Coupe les mots du dictionnaire dans ce qu'il contient : correction, résultat
	attendu, verso d'une carte (R2 du chantier mots-cliquables, validé par David
	le 2026-11-16 : la correction se lit d'un trait, le mot reste cliquable dans
	l'énoncé).
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { provideLexicon } from './lexicon-context';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	provideLexicon(() => null);
</script>

{@render children()}
