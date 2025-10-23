<!--
	Create New Riddle Page
	=======================
-->

<script lang="ts">
	import type { CreateRiddleData } from '$lib/types/riddle';
	import RiddleForm from '$lib/components/riddles/RiddleForm.svelte';
	import { goto } from '$app/navigation';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { enhance } from '$app/forms';

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

		const response = await fetch('', {
			method: 'POST',
			body: formData
		});

		const result = await response.json();

		if (result.type === 'success') {
			toaster.success('Énigme créée avec succès');
			goto('/dashboard/teacher/riddles');
		} else {
			toaster.error('Erreur lors de la création de l\'énigme');
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
