<!--
	Edit Riddle Page
	=================
-->

<script lang="ts">
	import BackLink from '$lib/components/navigation/BackLink.svelte';
	import type { PageData } from './$types';
	import type { CreateRiddleData } from '$lib/types/riddle';
	import RiddleForm from '$lib/components/riddles/RiddleForm.svelte';
	import { goto } from '$app/navigation';
	import { toaster } from '$lib/stores/toaster.svelte';
	import {
		buildRiddleFormBody,
		submitRiddleForm
	} from '$lib/components/riddles/submit-riddle-form';

	let { data }: { data: PageData } = $props();

	let loading = $state(false);

	async function handleSubmit(formData: CreateRiddleData) {
		loading = true;

		try {
			const result = await submitRiddleForm(buildRiddleFormBody(formData));
			if (result.ok) {
				toaster.success('Énigme modifiée avec succès');
				goto('/dashboard/teacher/contenu/enigmes').then(() => {});
			} else {
				toaster.error(result.message || "Erreur lors de la modification de l'énigme");
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
	<title>Modifier l'énigme #{data.riddle.riddle_number} - Chiphre</title>
</svelte:head>

<div class="container mx-auto max-w-4xl p-4 sm:p-6">
	<BackLink href="/dashboard/teacher/contenu/enigmes" label="Retour aux énigmes" />
	<h1 class="sr-only">Modifier l’énigme n° {data.riddle.riddle_number}</h1>
	<RiddleForm riddle={data.riddle} onSubmit={handleSubmit} onCancel={handleCancel} {loading} />
</div>
