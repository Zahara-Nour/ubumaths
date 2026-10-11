<!--
	Student Riddle Detail Page
	===========================
	Interactive page for student to attempt a riddle
-->

<script lang="ts">
	import BackLink from '$lib/components/navigation/BackLink.svelte';
	import { lore } from '$lib/config/lore';
	import type { PageData } from './$types';
	import RiddleCard from '$lib/components/riddles/RiddleCard.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { goto as _goto } from '$app/navigation';
	import { syncGidouilles } from '$lib/utils/cache-sync';

	let { data }: { data: PageData } = $props();

	/**
	 * Handle riddle answer submission
	 *
	 * PATTERN: Server-confirmed update (gidouilles awarded by server)
	 * 1. Submit answer to API
	 * 2. If correct answer: update cache with earned gidouilles (AFTER API confirms)
	 * 3. Navigate back to riddles list (no page reload)
	 * 4. On error: show error message, resolve false — the card returns to the input
	 */
	async function handleSubmit(answer: string | number): Promise<boolean> {
		try {
			const response = await fetch(`/api/riddles/${data.riddle.id}/submit`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ answer })
			});

			const result = await response.json();

			if (response.ok && result.success) {
				if (result.isCorrect === true) {
					// Update cache with earned gidouilles (server-confirmed amount)
					const gidouillesEarned = result.attempt.gidouilles_awarded || 0;
					if (gidouillesEarned > 0) {
						syncGidouilles({ type: 'student' }, gidouillesEarned);
					}

					toaster.success(result.message || `Bravo ! Tu as gagné ${gidouillesEarned} gidouilles !`);
				} else if (result.isCorrect === false) {
					toaster.error(result.message || 'Réponse incorrecte. Réessaye !');
				} else {
					// Manual validation
					toaster.info(
						result.message ||
							`Ta réponse a été envoyée au ${lore.entities.teacher} pour validation.`
					);
				}

				// Navigate back to riddles list (no full page reload)
				setTimeout(() => {
					_goto('/dashboard/student/riddles');
				}, 2000);
				return true;
			}
			toaster.error(result.message || 'Erreur lors de la soumission');
			return false;
		} catch (err) {
			console.error('Submit error:', err);
			toaster.error('Erreur de connexion');
			return false;
		}
	}
</script>

<svelte:head>
	<title>{data.riddle.title} - Chiphre</title>
</svelte:head>

<div class="container mx-auto max-w-4xl p-4 sm:p-6">
	<h1 class="sr-only">{data.riddle.title}</h1>
	<BackLink href="/dashboard/student/riddles" label="Retour aux énigmes" />

	<!-- Riddle Card in Interactive Mode -->
	<RiddleCard
		riddle={data.riddle}
		mode="interactive"
		studentAttempt={data.studentAttempt}
		onSubmit={(answer: unknown) => handleSubmit(answer as string | number)}
	/>
</div>
