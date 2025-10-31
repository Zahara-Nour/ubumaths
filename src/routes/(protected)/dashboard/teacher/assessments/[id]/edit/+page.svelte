<script lang="ts">
	import { goto } from '$app/navigation';
	import { enhance as _enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { ArrowLeft } from 'lucide-svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import AssessmentConfigForm from '$lib/components/assessments/AssessmentConfigForm.svelte';
	import type { PageData } from './$types';
	import type { AssessmentSettings } from '$lib/types/assessment';

	let { data }: { data: PageData } = $props();

	let _isSubmitting = $state(false);

	function handleBack() {
		goto('/dashboard/teacher/assessments').then(() => {});
	}

	async function handleSubmit(formData: {
		title: string;
		grade: string;
		description: string;
		settings: AssessmentSettings;
	}) {
		_isSubmitting = true;

		try {
			const form = new FormData();
			form.append('title', formData.title);
			form.append('grade', formData.grade);
			form.append('description', formData.description);
			form.append('settings', JSON.stringify(formData.settings));

			const response = await fetch('', {
				method: 'POST',
				body: form
			});

			const result = await response.json();

			if (result.type === 'success' || result.success) {
				toaster.success('Évaluation mise à jour');
				goto('/dashboard/teacher/assessments').then(() => {});
			} else {
				toaster.error(result.error || 'Échec de la mise à jour');
			}
		} catch (error) {
			console.error('Update failed:', error);
			toaster.error('Échec de la mise à jour');
		} finally {
			_isSubmitting = false;
		}
	}
</script>

<svelte:head>
	<title>Modifier l'Évaluation | UbuMaths</title>
</svelte:head>

<div class="container mx-auto max-w-4xl px-4 py-8">
	<!-- Header -->
	<div class="mb-8 flex items-center gap-4">
		<Button variant="ghost" size="icon" onclick={handleBack}>
			<ArrowLeft class="h-5 w-5" />
		</Button>
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Modifier l'Évaluation</h1>
			<p class="mt-2 text-muted-foreground">Modifiez les paramètres de votre évaluation</p>
		</div>
	</div>

	<Card.Root>
		<Card.Header>
			<Card.Title>Paramètres de l'évaluation</Card.Title>
			<Card.Description>
				Les modifications s'appliquent uniquement aux évaluations en brouillon
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<AssessmentConfigForm
				initialData={{
					title: data.assessment.title,
					grade: data.assessment.grade,
					description: data.assessment.description || '',
					settings: data.assessment.settings
				}}
				onSubmit={handleSubmit}
				onCancel={handleBack}
				submitLabel="Enregistrer"
			/>
		</Card.Content>
	</Card.Root>
</div>
