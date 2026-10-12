<!--
	Create New Riddle Page
	=======================
-->

<script lang="ts">
	import BackLink from '$lib/components/navigation/BackLink.svelte';
	import type { CreateRiddleData } from '$lib/types/riddle';
	import RiddleForm from '$lib/components/riddles/RiddleForm.svelte';
	import { goto } from '$app/navigation';
	import { toaster } from '$lib/stores/toaster.svelte';
	import {
		buildRiddleFormBody,
		submitRiddleForm
	} from '$lib/components/riddles/submit-riddle-form';

	let loading = $state(false);

	async function handleSubmit(data: CreateRiddleData) {
		loading = true;

		try {
			const result = await submitRiddleForm(buildRiddleFormBody(data));
			if (result.ok) {
				toaster.success('Énigme créée avec succès');
				goto('/dashboard/teacher/contenu/enigmes').then(() => {});
			} else {
				toaster.error(result.message || "Erreur lors de la création de l'énigme");
				loading = false;
			}
		} catch (error) {
			console.error('[RIDDLE CREATE] Error creating riddle:', error);
			toaster.error("Erreur lors de la création de l'énigme");
			loading = false;
		}
	}

	function handleCancel() {
		goto('/dashboard/teacher/contenu/enigmes').then(() => {});
	}
</script>

<svelte:head>
	<title>Créer une énigme - Chiphre</title>
</svelte:head>

<div class="container mx-auto max-w-4xl p-4 sm:p-6">
	<BackLink href="/dashboard/teacher/contenu/enigmes" label="Retour aux énigmes" />
	<h1 class="sr-only">Créer une énigme</h1>
	<RiddleForm onSubmit={handleSubmit} onCancel={handleCancel} {loading} />
</div>
