<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import * as Collapsible from '$lib/components/ui/collapsible';
	import MySelect from '$lib/components/MySelect.svelte';
	import MyCheckbox from '$lib/components/MyCheckbox.svelte';
	import GradeBadgeSelector from '$lib/components/GradeBadgeSelector.svelte';
	import TagBadgeSelector from '$lib/components/TagBadgeSelector.svelte';
	import TemplateSelector from '$lib/components/worksheets/TemplateSelector.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { ArrowLeft, ChevronDown, ChevronUp, Loader2, Save, FileText } from 'lucide-svelte';
	import type { PageData } from './$types';
	import type {
		WorksheetType,
		WorksheetConfig,
		NumberingStyle,
		WorksheetTemplateRow
	} from '$lib/types/worksheets';
	import type { GradeCode } from '$lib/types/grades';

	let { data }: { data: PageData } = $props();

	// Form state
	let title = $state('');
	let description = $state('');
	let worksheetType = $state<WorksheetType>('worksheet');
	let estimatedDuration = $state<number | null>(null);
	let selectedGrades = $state<GradeCode[]>([]);
	let selectedTags = $state<string[]>([]);
	let selectedTemplateId = $state<string | null>(null);

	// Config options state
	let configOpen = $state(false);
	let showTitle = $state(true);
	let showDate = $state(true);
	let showStudentName = $state(true);
	let showClass = $state(true);
	let showPoints = $state(true);
	let numberingStyle = $state<NumberingStyle>('numeric');
	let shuffleExercises = $state(false);
	let shuffleWithinSections = $state(false);
	let pageLayout = $state<'A4' | 'Letter'>('A4');

	// Loading state
	let submitting = $state(false);

	// Type options
	const typeOptions = [
		{ value: 'worksheet', label: "Feuille d'exercices" },
		{ value: 'assessment', label: 'Evaluation' },
		{ value: 'exam', label: 'Examen' },
		{ value: 'quiz', label: 'Quiz' },
		{ value: 'homework', label: 'Devoirs' }
	];

	// Numbering style options
	const numberingOptions = [
		{ value: 'numeric', label: '1, 2, 3...' },
		{ value: 'alphabetic', label: 'A, B, C...' },
		{ value: 'roman', label: 'I, II, III...' }
	];

	// Page layout options
	const layoutOptions = [
		{ value: 'A4', label: 'A4' },
		{ value: 'Letter', label: 'Letter' }
	];

	// Derived: build config object
	let config = $derived<WorksheetConfig>({
		show_title: showTitle,
		show_date: showDate,
		show_student_name: showStudentName,
		show_class: showClass,
		show_points: showPoints,
		numbering_style: numberingStyle,
		shuffle_exercises: shuffleExercises,
		shuffle_within_sections: shuffleWithinSections,
		page_layout: pageLayout
	});

	// Derived: form is valid
	let isValid = $derived(title.trim().length > 0);

	/**
	 * Handle form submission
	 */
	async function handleSubmit() {
		if (!isValid || submitting) return;

		submitting = true;

		try {
			// Parse template ID (handle default: prefix)
			let templateId: string | null = null;
			if (selectedTemplateId && !selectedTemplateId.startsWith('default:')) {
				templateId = selectedTemplateId;
			}

			const worksheetData = {
				title: title.trim(),
				description: description.trim() || null,
				type: worksheetType,
				config,
				template_id: templateId,
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
			toaster.success('Feuille creee avec succes');
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
	<title>Nouvelle feuille - UbuMaths</title>
</svelte:head>

<div class="container mx-auto max-w-3xl py-6">
	<!-- Header -->
	<div class="mb-6 flex items-center gap-4">
		<Button variant="ghost" size="icon" href="/dashboard/teacher/contenu/worksheets">
			<ArrowLeft class="h-5 w-5" />
		</Button>
		<div>
			<h1 class="text-3xl font-bold">Nouvelle feuille</h1>
			<p class="text-muted-foreground">Creez une nouvelle feuille d'exercices</p>
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
						placeholder="Description de la feuille d'exercices..."
						bind:value={description}
						rows={3}
					/>
				</div>

				<!-- Type and Duration row -->
				<div class="grid gap-4 md:grid-cols-2">
					<!-- Type -->
					<div class="space-y-2">
						<Label>Type</Label>
						<MySelect type="single" items={typeOptions} bind:value={worksheetType} />
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
					<TagBadgeSelector bind:value={selectedTags} placeholder="Ajouter des tags" />
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Template selection -->
		<Card.Root>
			<Card.Header>
				<div class="flex items-center gap-2">
					<FileText class="h-5 w-5 text-muted-foreground" />
					<Card.Title>Template de mise en page</Card.Title>
				</div>
				<Card.Description>
					Choisissez un template pour personnaliser la mise en page PDF de votre feuille
				</Card.Description>
			</Card.Header>
			<Card.Content>
				<TemplateSelector
					bind:value={selectedTemplateId}
					templates={data.templates as WorksheetTemplateRow[]}
				/>
			</Card.Content>
		</Card.Root>

		<!-- Config options (collapsible) -->
		<Card.Root>
			<Collapsible.Root bind:open={configOpen}>
				<Card.Header class="cursor-pointer" onclick={() => (configOpen = !configOpen)}>
					<div class="flex items-center justify-between">
						<Card.Title>Options d'affichage</Card.Title>
						<Collapsible.Trigger>
							{#snippet child({ props })}
								<Button {...props} variant="ghost" size="icon" class="h-8 w-8">
									{#if configOpen}
										<ChevronUp class="h-4 w-4" />
									{:else}
										<ChevronDown class="h-4 w-4" />
									{/if}
								</Button>
							{/snippet}
						</Collapsible.Trigger>
					</div>
					<Card.Description>
						Configurez l'apparence et le comportement de la feuille
					</Card.Description>
				</Card.Header>
				<Collapsible.Content>
					<Card.Content class="space-y-6 border-t pt-6">
						<!-- Display options -->
						<div class="space-y-4">
							<h4 class="text-sm font-medium">Elements affiches</h4>
							<div class="grid gap-4 sm:grid-cols-2">
								<MyCheckbox bind:checked={showTitle} label="Afficher le titre" />
								<MyCheckbox bind:checked={showDate} label="Afficher la date" />
								<MyCheckbox bind:checked={showStudentName} label="Nom de l'eleve" />
								<MyCheckbox bind:checked={showClass} label="Classe" />
								<MyCheckbox bind:checked={showPoints} label="Points par exercice" />
							</div>
						</div>

						<!-- Numbering and layout -->
						<div class="grid gap-4 sm:grid-cols-2">
							<div class="space-y-2">
								<Label>Numerotation</Label>
								<MySelect type="single" items={numberingOptions} bind:value={numberingStyle} />
							</div>
							<div class="space-y-2">
								<Label>Format de page</Label>
								<MySelect type="single" items={layoutOptions} bind:value={pageLayout} />
							</div>
						</div>

						<!-- Shuffle options -->
						<div class="space-y-4">
							<h4 class="text-sm font-medium">Options de melange</h4>
							<div class="grid gap-4 sm:grid-cols-2">
								<MyCheckbox bind:checked={shuffleExercises} label="Melanger les exercices" />
								<MyCheckbox
									bind:checked={shuffleWithinSections}
									label="Melanger dans les sections"
								/>
							</div>
						</div>
					</Card.Content>
				</Collapsible.Content>
			</Collapsible.Root>
		</Card.Root>

		<!-- Info about exercises -->
		<Card.Root class="border-dashed">
			<Card.Content class="py-8 text-center">
				<p class="text-muted-foreground">
					Les exercices seront ajoutes apres la creation de la feuille.
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
