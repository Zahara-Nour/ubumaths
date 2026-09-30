<script lang="ts">
	// Sonde de test : remonte le DeckContext au test qui l'a rendue
	import { getContext } from 'svelte';
	import { DECK_CONTEXT_KEY } from '../context.js';
	import type { DeckContext } from '../types.js';

	interface Props {
		onprobe: (context: DeckContext) => void;
	}

	let { onprobe }: Props = $props();

	// svelte-ignore state_referenced_locally
	onprobe(getContext<DeckContext>(DECK_CONTEXT_KEY));
</script>
