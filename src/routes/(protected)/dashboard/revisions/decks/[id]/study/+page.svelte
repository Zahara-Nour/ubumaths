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
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import ReviewSession from '$lib/components/srs/ReviewSession.svelte';
	import { Button } from '$lib/components/ui/button';
	import { ArrowLeft } from 'lucide-svelte';

	const deckId = $derived(page.params.id);

	/**
	 * Handle session completion
	 */
	function handleComplete(summary: any) {
		console.log('Session completed:', summary);
		// Could show a completion modal or navigate back
	}

	/**
	 * Navigate back to deck list
	 */
	function goBack() {
		goto('/dashboard/revisions');
	}
</script>

<svelte:head>
	<title>Session de révision - UbuMaths</title>
</svelte:head>

<div class="study-session-page">
	<!-- Back Button -->
	<div class="mb-6">
		<Button onclick={goBack} variant="ghost">
			<ArrowLeft class="mr-2 h-4 w-4" />
			Retour aux decks
		</Button>
	</div>

	<!-- Review Session -->
	<ReviewSession {deckId} onComplete={handleComplete} onBack={goBack} />
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
