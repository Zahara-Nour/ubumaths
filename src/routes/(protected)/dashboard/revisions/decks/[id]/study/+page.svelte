<!--
	SRS Study Session
	=================

	Student study session page for reviewing cards in a deck.

	Features:
	- Uses ReviewSession component
	- Handles session completion
	- Back navigation
-->

<script lang="ts">
	import BackLink from '$lib/components/navigation/BackLink.svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import ReviewSession from '$lib/components/srs/ReviewSession.svelte';

	const deckId = $derived(page.params.id);
	const states = $derived(page.url.searchParams.get('states') ?? undefined);

	/**
	 * Handle session completion
	 */
	function handleComplete(summary: {
		totalCards: number;
		correctCount: number;
		wrongCount: number;
		totalTime: number;
	}) {
		console.log('Session completed:', summary);
		// Could show a completion modal or navigate back
	}

	/**
	 * Navigate back to deck list
	 */
	function goBack() {
		goto('/dashboard/revisions').then(() => {});
	}
</script>

<svelte:head>
	<title>Session de révision - Chiphre</title>
</svelte:head>

<div class="study-session-page">
	<h1 class="sr-only">Session de révision</h1>
	<BackLink href="/dashboard/revisions" label="Quitter" kind="quit" class="mb-6" />

	<!-- Review Session -->
	{#if deckId}
		<ReviewSession
			source={{ kind: 'deck', deckId, states }}
			onComplete={handleComplete}
			onBack={goBack}
		/>
	{:else}
		<p class="text-center text-muted-foreground">ID de deck invalide</p>
	{/if}
</div>

<style>
	.study-session-page {
		max-width: 1200px;
		margin: 0 auto;
		padding: 1rem;
		animation: fadeIn 0.3s ease-out;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}
</style>
