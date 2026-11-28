<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '#lib/components/ui/button/index.ts';
	import BackLink from '#lib/components/navigation/BackLink.svelte';
	import * as Card from '#lib/components/ui/card/index.ts';
	import { Badge } from '#lib/components/ui/badge/index.ts';
	import { toaster } from '#lib/stores/toaster.svelte.ts';
	import { submitAction } from '#lib/utils/form-action.ts';
	import EvaluationConfigForm from '#lib/components/assessments/EvaluationConfigForm.svelte';
	import { countSeriesQuestions, formLabel } from '#lib/types/evaluation.ts';
	import type { EvaluationSettingsInput } from '#lib/types/evaluation.ts';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Réglages validés par le formulaire, en attente du choix brouillon / publier
	let settings = $state<EvaluationSettingsInput | null>(null);
	// Derniers réglages saisis : le formulaire les retrouve après « Retour »
	let lastSettings = $state<EvaluationSettingsInput | undefined>(undefined);
	let isSubmitting = $state(false);

	let questionsCount = $derived(countSeriesQuestions(data.series.items));

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
			toaster.success(status === 'published' ? 'Contrôle publié' : 'Brouillon enregistré');
			goto('/dashboard/teacher/assessments').then(() => {});
		} finally {
			isSubmitting = false;
		}
	}
</script>

<svelte:head>
	<title>Nouveau contrôle | Chiphre</title>
</svelte:head>

<div class="container mx-auto max-w-4xl px-4 py-8">
	<div class="mb-8">
		<BackLink href="/dashboard/teacher/series" label="Retour aux séries" />
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Nouveau contrôle</h1>
			<p class="mt-2 text-muted-foreground">
				Série « {data.series.title} » · {data.series.grade} · {questionsCount} question{questionsCount >
				1
					? 's'
					: ''}
			</p>
		</div>
	</div>

	{#if data.pythonTitles.length > 0}
		<!-- Case Python : jugée dans le navigateur seulement, le serveur qui corrige le contrôle ne la tire pas -->
		<div
			class="mb-6 rounded-md border border-border bg-muted/50 p-4 text-sm"
			role="note"
			data-testid="python-exclues"
		>
			<p class="font-medium">
				{data.pythonTitles.length > 1 ? 'Ces modèles n’entreront pas' : 'Ce modèle n’entrera pas'} dans
				le contrôle
			</p>
			<p class="mt-1 text-muted-foreground">
				Un programme Python se corrige dans le navigateur de l’élève, pas sur le serveur qui note le
				contrôle : ces questions restent pour l’entraînement.
			</p>
			<ul class="mt-2 list-disc pl-5">
				{#each data.pythonTitles as title, i (i)}
					<li>{title}</li>
				{/each}
			</ul>
		</div>
	{/if}

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
