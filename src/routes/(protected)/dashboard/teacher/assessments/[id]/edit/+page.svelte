<script lang="ts">
	import { lore } from '$lib/config/lore';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { ArrowLeft } from '@lucide/svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { submitAction } from '$lib/utils/form-action';
	import EvaluationConfigForm from '$lib/components/assessments/EvaluationConfigForm.svelte';
	import type { EvaluationSettingsInput } from '$lib/types/evaluation';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let isSubmitting = $state(false);

	// svelte-ignore state_referenced_locally
	const initialSettings: EvaluationSettingsInput = {
		form: data.evaluation.form,
		time_limit_minutes: data.evaluation.time_limit
			? Math.round(data.evaluation.time_limit / 60)
			: null,
		max_attempts: data.evaluation.max_attempts,
		deadline: data.evaluation.deadline,
		shuffle_questions: data.evaluation.shuffle_questions
	};

	function handleBack() {
		goto('/dashboard/teacher/assessments').then(() => {});
	}

	async function handleSubmit(settings: EvaluationSettingsInput) {
		if (isSubmitting) return;
		isSubmitting = true;
		try {
			const formData = new FormData();
			formData.set('settings', JSON.stringify(settings));
			const outcome = await submitAction('', formData);
			if (!outcome.ok) {
				toaster.error(outcome.message);
				return;
			}
			toaster.success('Évaluation mise à jour');
			handleBack();
		} finally {
			isSubmitting = false;
		}
	}
</script>

<svelte:head>
	<title>Modifier l'évaluation | Chiphre</title>
</svelte:head>

<div class="container mx-auto max-w-4xl px-4 py-8">
	<div class="mb-8 flex items-center gap-4">
		<Button variant="ghost" size="icon" onclick={handleBack} aria-label="Retour aux évaluations">
			<ArrowLeft class="h-5 w-5" />
		</Button>
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Modifier l'évaluation</h1>
			<p class="mt-2 text-muted-foreground">Série « {data.evaluation.series.title} »</p>
		</div>
	</div>

	<Card.Root>
		<Card.Header>
			<Card.Title>Réglages de l'évaluation</Card.Title>
			<Card.Description>Seules les évaluations en brouillon se modifient</Card.Description>
		</Card.Header>
		<Card.Content>
			<EvaluationConfigForm
				initialData={initialSettings}
				onSubmit={handleSubmit}
				onCancel={handleBack}
				submitLabel={lore.actions.save}
			/>
		</Card.Content>
	</Card.Root>
</div>
