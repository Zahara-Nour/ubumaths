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

		const response = await fetch('', {
			method: 'POST',
			body
		});

		const result = await response.json();

		if (result.type === 'success') {
			toaster.success('Énigme modifiée avec succès');
			goto('/dashboard/teacher/riddles');
		} else {
			toaster.error('Erreur lors de la modification de l\'énigme');
			loading = false;
		}
	}

	function handleCancel() {
		goto('/dashboard/teacher/riddles');
	}
</script>

<svelte:head>
	<title>Modifier l'énigme #{data.riddle.riddle_number} - UbuMaths</title>
</svelte:head>

<div class="container mx-auto max-w-4xl p-4 sm:p-6">
	<RiddleForm riddle={data.riddle} onSubmit={handleSubmit} onCancel={handleCancel} {loading} />
</div>
