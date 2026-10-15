<script lang="ts">
	import { WORKSHEET_TYPE_OPTIONS } from '$lib/utils/worksheet-constants';
	import { lore } from '$lib/config/lore';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import BackLink from '$lib/components/navigation/BackLink.svelte';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import MySelect from '$lib/components/MySelect.svelte';
	import WorksheetTypeOptions from '$lib/components/worksheets/WorksheetTypeOptions.svelte';
	import GradeBadgeSelector from '$lib/components/GradeBadgeSelector.svelte';
	import TagBadgeSelector from '$lib/components/TagBadgeSelector.svelte';
	import StyleSelector from '$lib/components/worksheets/StyleSelector.svelte';
	import { DEFAULT_STYLE_ID } from '$lib/typst/templates/styles';
	import { configForType, type WorksheetOptionKey } from '$lib/worksheets/worksheet-header';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { Loader2, Save, FileText } from '@lucide/svelte';
	import type { PageData } from './$types';
	import type { WorksheetType, WorksheetConfig } from '$lib/types/worksheets';
	import type { GradeCode } from '$lib/types/grades';

	let { data }: { data: PageData } = $props();

	// Form state
	let title = $state('');
	let description = $state('');
	let worksheetType = $state<WorksheetType>('worksheet');
	let estimatedDuration = $state<number | null>(null);
	let selectedGrades = $state<GradeCode[]>([]);
	let selectedTags = $state<string[]>([]);
	let selectedStyleId = $state(DEFAULT_STYLE_ID);

	// Options du type de la fiche (ADR 0030) : seules celles du type choisi
	// partent (`TYPE_OPTION_KEYS`), plus « mélanger les exercices »
	let typeOptions = $state<WorksheetConfig>({});

	// Loading state
	let submitting = $state(false);

	// Type options
	const typeItems = WORKSHEET_TYPE_OPTIONS;

	// La config envoyée : les options du type choisi seulement
	let config = $derived(configForType(worksheetType, typeOptions));

	function handleOptionChange(key: WorksheetOptionKey, value: boolean | string | undefined) {
		typeOptions = { ...typeOptions, [key]: value } as WorksheetConfig;
	}

	// Derived: form is valid
	let isValid = $derived(title.trim().length > 0);

	/**
	 * Handle form submission
	 */
	async function handleSubmit() {
		if (!isValid || submitting) return;

		submitting = true;

		try {
			const worksheetData = {
				title: title.trim(),
				description: description.trim() || null,
				type: worksheetType,
				config,
				style_id: selectedStyleId,
				estimated_duration_minutes: estimatedDuration,
				grades: selectedGrades,
				tags: selectedTags
			};

			const response = await fetch('/api/worksheets', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(worksheetData)
			});

			if (!response.ok) {
				const error = await response.json().catch(() => ({ message: 'Erreur inconnue' }));
				throw new Error(error.message || 'Erreur lors de la creation');
			}

			const { worksheet } = await response.json();
			toaster.success('Feuille créée avec succès');
			goto(`/dashboard/teacher/contenu/worksheets/${worksheet.id}`);
		} catch (error) {
			console.error('Error creating worksheet:', error);
			toaster.error(
				error instanceof Error ? error.message : 'Erreur lors de la creation de la feuille'
			);
		} finally {
			submitting = false;
		}
	}
</script>

<svelte:head>
	<title>Nouvelle feuille - Chiphre</title>
</svelte:head>

<div class="container mx-auto max-w-3xl py-6">
	<!-- Header -->
	<div class="mb-6">
		<BackLink href="/dashboard/teacher/contenu/worksheets" label="Retour aux fiches" />
		<div>
			<h1 class="text-3xl font-bold">Nouvelle feuille</h1>
			<p class="text-muted-foreground">Creez une nouvelle feuille de {lore.learning.exercise}s</p>
		</div>
	</div>

	<!-- Form -->
	<form
		onsubmit={(e) => {
			e.preventDefault();
			handleSubmit();
		}}
		class="space-y-6"
	>
		<!-- Basic info card -->
		<Card.Root>
			<Card.Header>
				<Card.Title>Informations generales</Card.Title>
			</Card.Header>
			<Card.Content class="space-y-4">
				<!-- Title -->
				<div class="space-y-2">
					<Label for="title">Titre *</Label>
					<Input
						id="title"
						type="text"
						placeholder="Ex: Equations du premier degre"
						bind:value={title}
						required
					/>
				</div>

				<!-- Description -->
				<div class="space-y-2">
					<Label for="description">Description</Label>
					<Textarea
						id="description"
						placeholder="Description de la feuille de {lore.learning.exercise}s..."
						bind:value={description}
						rows={3}
					/>
				</div>

				<!-- Type and Duration row -->
				<div class="grid gap-4 md:grid-cols-2">
					<!-- Type -->
					<div class="space-y-2">
						<Label>Type</Label>
						<MySelect type="single" items={typeItems} bind:value={worksheetType} />
					</div>

					<!-- Estimated duration -->
					<div class="space-y-2">
						<Label for="duration">Duree estimee (minutes)</Label>
						<Input
							id="duration"
							type="number"
							placeholder="Ex: 45"
							min={1}
							max={300}
							bind:value={estimatedDuration}
						/>
					</div>
				</div>

				<!-- Grade levels -->
				<div class="space-y-2">
					<Label>Niveaux scolaires</Label>
					<GradeBadgeSelector bind:value={selectedGrades} placeholder="Selectionner les niveaux" />
				</div>

				<!-- Tags -->
				<div class="space-y-2">
					<Label>Tags</Label>
					<TagBadgeSelector
						kind="worksheet"
						bind:value={selectedTags}
						placeholder="Ajouter des tags"
					/>
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Style selection -->
		<Card.Root>
			<Card.Header>
				<div class="flex items-center gap-2">
					<FileText class="h-5 w-5 text-muted-foreground" />
					<Card.Title>Style</Card.Title>
				</div>
				<Card.Description>La mise en page des PDF de la fiche</Card.Description>
			</Card.Header>
			<Card.Content>
				<StyleSelector bind:value={selectedStyleId} styles={data.styles} />
			</Card.Content>
		</Card.Root>

		<!-- Options du type de la fiche (ADR 0030) -->
		<Card.Root>
			<Card.Header>
				<Card.Title>Options</Card.Title>
				<Card.Description>
					Le type de la fiche décide de l'en-tête du PDF ; voici ses options
				</Card.Description>
			</Card.Header>
			<Card.Content>
				<WorksheetTypeOptions type={worksheetType} {config} onchange={handleOptionChange} />
			</Card.Content>
		</Card.Root>

		<!-- Info about exercises -->
		<Card.Root class="border-dashed">
			<Card.Content class="py-8 text-center">
				<p class="text-muted-foreground">
					Les {lore.learning.exercise}s seront ajoutes apres la creation de la feuille.
				</p>
			</Card.Content>
		</Card.Root>

		<!-- Actions -->
		<div class="flex justify-end gap-3">
			<Button variant="outline" href="/dashboard/teacher/contenu/worksheets" disabled={submitting}>
				Annuler
			</Button>
			<Button type="submit" disabled={!isValid || submitting}>
				{#if submitting}
					<Loader2 class="mr-2 h-4 w-4 animate-spin" />
					Creation...
				{:else}
					<Save class="mr-2 h-4 w-4" />
					Creer le brouillon
				{/if}
			</Button>
		</div>
	</form>
</div>
