<!--
	Edit Riddle Page
	=================
-->

<script lang="ts">
	import type { PageData } from './$types';
	import type { CreateRiddleData } from '$lib/types/riddle';
	import RiddleForm from '$lib/components/riddles/RiddleForm.svelte';
	import { goto } from '$app/navigation';
	import { toaster } from '$lib/stores/toaster.svelte';

	let { data }: { data: PageData } = $props();

	let loading = $state(false);

	async function handleSubmit(formData: CreateRiddleData) {
		loading = true;

		const body = new FormData();
		body.append('title', formData.title);
		if (formData.genre) body.append('genre', formData.genre);
		body.append('difficulty', formData.difficulty.toString());
		body.append('statement', formData.statement);
		body.append('correction', formData.correction);
		if (formData.image_url) body.append('image_url', formData.image_url);
		body.append('answer', JSON.stringify(formData.answer));
		body.append('status', formData.status || 'draft');

		try {
			console.log('[RIDDLE EDIT] Sending request...');
			const response = await fetch('', {
				method: 'POST',
				body
			});

			console.log('[RIDDLE EDIT] Response status:', response.status);
			console.log(
				'[RIDDLE EDIT] Response headers:',
				Object.fromEntries(response.headers.entries())
			);

			const text = await response.text();
			console.log('[RIDDLE EDIT] Raw response:', text);

			let result;
			try {
				result = JSON.parse(text);
				console.log('[RIDDLE EDIT] Parsed result:', result);
			} catch (e) {
				console.error('[RIDDLE EDIT] Failed to parse JSON:', e);
				toaster.error('Erreur: réponse invalide du serveur');
				loading = false;
				return;
			}

			if (result?.success) {
				toaster.success('Énigme modifiée avec succès');
				goto('/dashboard/teacher/contenu/enigmes').then(() => {});
			} else {
				toaster.error(result?.message || "Erreur lors de la modification de l'énigme");
				loading = false;
			}
		} catch (error) {
			console.error('[RIDDLE EDIT] Error updating riddle:', error);
			toaster.error("Erreur lors de la modification de l'énigme");
			loading = false;
		}
	}

	function handleCancel() {
		goto('/dashboard/teacher/contenu/enigmes').then(() => {});
	}
</script>

<svelte:head>
	<title>Modifier l'énigme #{data.riddle.riddle_number} - UbuMaths</title>
</svelte:head>

<div class="container mx-auto max-w-4xl p-4 sm:p-6">
	<RiddleForm riddle={data.riddle} onSubmit={handleSubmit} onCancel={handleCancel} {loading} />
</div>
