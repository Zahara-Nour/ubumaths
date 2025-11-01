<!--
	Student Riddle Detail Page
	===========================
	Interactive page for student to attempt a riddle
-->

<script lang="ts">
	import type { PageData } from './$types';
	import type { SubmitAttemptData } from '$lib/types/riddle';
	import RiddleCard from '$lib/components/riddles/RiddleCard.svelte';
	import { Button } from '$lib/components/ui/button';
	import { ArrowLeft } from 'lucide-svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { goto as _goto } from '$app/navigation';

	let { data }: { data: PageData } = $props();

	async function handleSubmit(answer: string | number) {
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
					toaster.success(
						result.message ||
							`Bravo ! Tu as gagné ${result.attempt.gidouilles_awarded} gidouilles !`
					);
				} else if (result.isCorrect === false) {
					toaster.error(result.message || 'Réponse incorrecte. Réessaye !');
				} else {
					// Manual validation
					toaster.info(result.message || 'Ta réponse a été envoyée au professeur pour validation.');
				}

				// Reload page to show updated attempt
				setTimeout(() => {
					window.location.reload();
				}, 2000);
			} else {
				toaster.error(result.message || 'Erreur lors de la soumission');
			}
		} catch (err) {
			console.error('Submit error:', err);
			toaster.error('Erreur de connexion');
		}
	}
</script>

<svelte:head>
	<title>{data.riddle.title} - UbuMaths</title>
</svelte:head>

<div class="container mx-auto max-w-4xl p-4 sm:p-6">
	<!-- Back Button -->
	<Button variant="ghost" href="/dashboard/student/riddles" class="mb-4">
		<ArrowLeft class="mr-2 h-4 w-4" />
		Retour aux énigmes
	</Button>

	<!-- Riddle Card in Interactive Mode -->
	<RiddleCard
		riddle={data.riddle}
		mode="interactive"
		studentAttempt={data.studentAttempt}
		onSubmit={(answer: unknown) => handleSubmit(answer as string | number)}
	/>
</div>
