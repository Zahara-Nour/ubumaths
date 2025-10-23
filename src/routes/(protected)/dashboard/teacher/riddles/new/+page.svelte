<!--
	Create New Riddle Page
	=======================
-->

<script lang="ts">
	import type { CreateRiddleData } from '$lib/types/riddle';
	import RiddleForm from '$lib/components/riddles/RiddleForm.svelte';
	import { goto } from '$app/navigation';
	import { toaster } from '$lib/stores/toaster.svelte';

	let loading = $state(false);

	async function handleSubmit(data: CreateRiddleData) {
		loading = true;

		const formData = new FormData();
		formData.append('title', data.title);
		if (data.genre) formData.append('genre', data.genre);
		formData.append('difficulty', data.difficulty.toString());
		formData.append('statement', data.statement);
		formData.append('correction', data.correction);
		if (data.image_url) formData.append('image_url', data.image_url);
		formData.append('answer', JSON.stringify(data.answer));
		formData.append('status', data.status || 'draft');

		try {
			console.log('[RIDDLE CREATE] Sending request...');
			const response = await fetch('', {
				method: 'POST',
				body: formData
			});

			console.log('[RIDDLE CREATE] Response status:', response.status);
			console.log(
				'[RIDDLE CREATE] Response headers:',
				Object.fromEntries(response.headers.entries())
			);

			const text = await response.text();
			console.log('[RIDDLE CREATE] Raw response:', text);

			let result;
			try {
				result = JSON.parse(text);
				console.log('[RIDDLE CREATE] Parsed result:', result);
			} catch (e) {
				console.error('[RIDDLE CREATE] Failed to parse JSON:', e);
				toaster.error('Erreur: réponse invalide du serveur');
				loading = false;
				return;
			}

			if (result?.success) {
				toaster.success('Énigme créée avec succès');
				goto('/dashboard/teacher/riddles');
			} else {
				toaster.error(result?.message || "Erreur lors de la création de l'énigme");
				loading = false;
			}
		} catch (error) {
			console.error('[RIDDLE CREATE] Error creating riddle:', error);
			toaster.error("Erreur lors de la création de l'énigme");
			loading = false;
		}
	}

	function handleCancel() {
		goto('/dashboard/teacher/riddles');
	}
</script>

<svelte:head>
	<title>Créer une énigme - UbuMaths</title>
</svelte:head>

<div class="container mx-auto max-w-4xl p-4 sm:p-6">
	<RiddleForm onSubmit={handleSubmit} onCancel={handleCancel} {loading} />
</div>
