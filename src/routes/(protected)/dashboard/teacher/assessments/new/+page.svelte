<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { ArrowLeft } from '@lucide/svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { submitAction } from '$lib/utils/form-action';
	import EvaluationConfigForm from '$lib/components/assessments/EvaluationConfigForm.svelte';
	import { countSeriesQuestions, formLabel } from '$lib/types/evaluation';
	import type { EvaluationSettingsInput } from '$lib/types/evaluation';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Réglages validés par le formulaire, en attente du choix brouillon / publier
	let settings = $state<EvaluationSettingsInput | null>(null);
	// Derniers réglages saisis : le formulaire les retrouve après « Retour »
	let lastSettings = $state<EvaluationSettingsInput | undefined>(undefined);
	let isSubmitting = $state(false);

	let questionsCount = $derived(countSeriesQuestions(data.series.categories));

	function handleBack() {
		goto('/dashboard/teacher/series').then(() => {});
	}

	function handleConfigSubmit(value: EvaluationSettingsInput) {
		settings = value;
	}

	function handleEditSettings() {
		lastSettings = settings ?? undefined;
		settings = null;
	}

	async function handleCreate(status: 'draft' | 'published') {
		if (!settings) return;
		isSubmitting = true;
		try {
			const formData = new FormData();
			formData.set('series_id', data.series.id);
			formData.set('settings', JSON.stringify(settings));
			formData.set('status', status);
			const outcome = await submitAction('', formData);
			if (!outcome.ok) {
				toaster.error(outcome.message);
				return;
			}
			toaster.success(status === 'published' ? 'Évaluation publiée' : 'Brouillon enregistré');
			goto('/dashboard/teacher/assessments').then(() => {});
		} finally {
			isSubmitting = false;
		}
	}
</script>

<svelte:head>
	<title>Nouvelle évaluation | Chiphre</title>
</svelte:head>

<div class="container mx-auto max-w-4xl px-4 py-8">
	<div class="mb-8 flex items-center gap-4">
		<Button variant="ghost" size="icon" onclick={handleBack} aria-label="Retour aux séries">
			<ArrowLeft class="h-5 w-5" />
		</Button>
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Nouvelle évaluation</h1>
			<p class="mt-2 text-muted-foreground">
				Série « {data.series.title} » · {data.series.grade} · {questionsCount} question{questionsCount >
				1
					? 's'
					: ''}
			</p>
		</div>
	</div>

	{#if !settings}
		<Card.Root>
			<Card.Header>
				<Card.Title>Réglages</Card.Title>
				<Card.Description>Forme, temps limite, tentatives et date limite</Card.Description>
			</Card.Header>
			<Card.Content>
				<EvaluationConfigForm
					initialData={lastSettings}
					onSubmit={handleConfigSubmit}
					onCancel={handleBack}
					submitLabel="Suivant"
				/>
			</Card.Content>
		</Card.Root>
	{:else}
		<Card.Root>
			<Card.Header>
				<Card.Title>Récapitulatif</Card.Title>
			</Card.Header>
			<Card.Content>
				<dl class="grid gap-3 text-sm md:grid-cols-2">
					<div>
						<dt class="text-muted-foreground">Forme</dt>
						<dd class="font-medium">
							<Badge variant="secondary">{formLabel(settings.form)}</Badge>
							{#if settings.form === 'course' && settings.time_limit_minutes}
								· {settings.time_limit_minutes} min
							{/if}
						</dd>
					</div>
					<div>
						<dt class="text-muted-foreground">Tentatives max</dt>
						<dd class="font-medium">{settings.max_attempts ?? 'Illimité'}</dd>
					</div>
					<div>
						<dt class="text-muted-foreground">Date limite</dt>
						<dd class="font-medium">
							{settings.deadline ? new Date(settings.deadline).toLocaleString('fr-FR') : 'Aucune'}
						</dd>
					</div>
					<div>
						<dt class="text-muted-foreground">Ordre aléatoire</dt>
						<dd class="font-medium">{settings.shuffle_questions ? 'Oui' : 'Non'}</dd>
					</div>
				</dl>
			</Card.Content>
			<Card.Footer class="flex flex-wrap justify-between gap-3">
				<Button variant="outline" onclick={handleEditSettings} disabled={isSubmitting}>
					Retour
				</Button>
				<div class="flex gap-3">
					<Button variant="outline" onclick={() => handleCreate('draft')} disabled={isSubmitting}>
						Enregistrer en brouillon
					</Button>
					<Button onclick={() => handleCreate('published')} disabled={isSubmitting}>Publier</Button>
				</div>
			</Card.Footer>
		</Card.Root>
	{/if}
</div>
