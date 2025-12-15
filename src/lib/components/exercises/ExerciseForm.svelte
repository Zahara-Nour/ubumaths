<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import ExerciseMarkdownEditor from './ExerciseMarkdownEditor.svelte';
	import ExerciseResourceEditor from './ExerciseResourceEditor.svelte';
	import LaTeXImportDialog from './LaTeXImportDialog.svelte';
	import GradeBadgeSelector from '$lib/components/GradeBadgeSelector.svelte';
	import TagBadgeSelector from '$lib/components/TagBadgeSelector.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import type { Database } from '$lib/types/database';
	import type { SupabaseClient } from '@supabase/supabase-js';
	import type { TranspileWarning } from '$lib/custom-markdown/importers/latex';
	import type { GradeCode } from '$lib/types/grades';
	import type { ExerciseResource } from '$lib/exercises/types';

	type Exercise = Database['public']['Tables']['exercises']['Row'];
	type ExerciseInsert = Database['public']['Tables']['exercises']['Insert'];

	interface Props {
		exercise?: Exercise;
		onsubmit: (data: Partial<ExerciseInsert>) => void | Promise<void>;
		submitting?: boolean;
		supabase?: SupabaseClient;
		userId?: string;
	}

	let { exercise = undefined, onsubmit, submitting = false, supabase, userId }: Props = $props();

	// Form state
	let title = $state(exercise?.title || '');
	let slug = $state(exercise?.slug || '');
	let source = $state(exercise?.source || '');
	let difficulty = $state<1 | 2 | 3>((exercise?.difficulty as 1 | 2 | 3) || 2);
	let tags = $state<string[]>(exercise?.tags || []);
	let topic = $state(exercise?.topic || '');
	let gradeLevels = $state<GradeCode[]>((exercise?.grade_levels as GradeCode[]) || []);
	let statementMd = $state(exercise?.statement_md || '');
	let solutionMd = $state(exercise?.solution_md || '');
	let resources = $state<ExerciseResource[]>((exercise?.resources as ExerciseResource[]) || []);

	// LaTeX import state
	let latexImportOpen = $state(false);

	// Validation
	let errors = $state<Record<string, string>>({});

	/**
	 * Validate form
	 */
	function validate(): boolean {
		errors = {};

		if (!statementMd.trim()) {
			errors.statement_md = "L'énoncé est requis";
		}

		if (!solutionMd.trim()) {
			errors.solution_md = 'La solution est requise';
		}

		if (![1, 2, 3].includes(difficulty)) {
			errors.difficulty = 'La difficulté doit être 1, 2 ou 3';
		}

		// Validate slug format if provided
		if (slug.trim()) {
			const slugRegex = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;
			if (slug.length < 3) {
				errors.slug = 'Le slug doit contenir au moins 3 caractères';
			} else if (slug.length > 100) {
				errors.slug = 'Le slug ne peut pas dépasser 100 caractères';
			} else if (!slugRegex.test(slug)) {
				errors.slug = 'Format invalide (minuscules, chiffres et tirets uniquement)';
			}
		}

		return Object.keys(errors).length === 0;
	}

	/**
	 * Handle form submission
	 */
	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();

		if (!validate()) {
			return;
		}

		const data: Partial<ExerciseInsert> = {
			title: title.trim() || null,
			slug: slug.trim() || null,
			source: source.trim() || null,
			difficulty,
			tags,
			topic: topic.trim() || null,
			grade_levels: gradeLevels,
			statement_md: statementMd,
			solution_md: solutionMd,
			resources: resources.length > 0 ? resources : null
		};

		await onsubmit(data);
	}

	/**
	 * Handle LaTeX import
	 */
	function handleLatexImport(result: {
		statement: string;
		solution: string | null;
		warnings: TranspileWarning[];
	}) {
		// Check if we should confirm overwriting existing content
		const hasExistingStatement = statementMd.trim().length > 0;
		const hasExistingSolution = solutionMd.trim().length > 0;

		if (hasExistingStatement || hasExistingSolution) {
			const confirmMsg = 'Le contenu existant sera remplacé par le contenu importé. Continuer ?';
			if (!confirm(confirmMsg)) {
				return;
			}
		}

		// Apply imported content
		statementMd = result.statement;
		if (result.solution) {
			solutionMd = result.solution;
		}

		// Close dialog
		latexImportOpen = false;

		// Show success toast with warning count if any
		if (result.warnings.length > 0) {
			const errorCount = result.warnings.filter((w) => w.severity === 'error').length;
			const warningCount = result.warnings.filter((w) => w.severity === 'warning').length;

			if (errorCount > 0) {
				toaster.warning(
					`Contenu importé avec ${errorCount} erreur${errorCount > 1 ? 's' : ''} et ${warningCount} avertissement${warningCount > 1 ? 's' : ''}. Vérifiez le contenu.`
				);
			} else if (warningCount > 0) {
				toaster.info(
					`Contenu importé avec ${warningCount} avertissement${warningCount > 1 ? 's' : ''}. Vérifiez le contenu.`
				);
			}
		} else {
			toaster.success('Contenu LaTeX importé avec succès');
		}
	}
</script>

<!-- Header with LaTeX import button -->
<div class="mb-6 flex items-center justify-between">
	<div>
		<h2 class="text-lg font-semibold">{exercise ? "Modifier l'exercice" : 'Nouvel exercice'}</h2>
		<p class="text-sm text-muted-foreground">
			{exercise
				? "Modifiez les informations de l'exercice"
				: 'Créez un nouvel exercice avec support LaTeX'}
		</p>
	</div>
	<Button variant="outline" onclick={() => (latexImportOpen = true)}>
		<svg
			class="mr-2 h-4 w-4"
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
			xmlns="http://www.w3.org/2000/svg"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
			/>
		</svg>
		Import LaTeX
	</Button>
</div>

<form onsubmit={handleSubmit} class="space-y-6">
	<!-- Metadata -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Informations générales</Card.Title>
			<Card.Description>Métadonnées de l'exercice (optionnel sauf difficulté)</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-4">
			<!-- Title & Source -->
			<div class="grid gap-4 md:grid-cols-2">
				<div class="space-y-2">
					<Label for="title">Titre</Label>
					<Input
						id="title"
						type="text"
						placeholder="Ex: Équations du premier degré"
						bind:value={title}
					/>
				</div>
				<div class="space-y-2">
					<Label for="source">Source</Label>
					<Input
						id="source"
						type="text"
						placeholder="Ex: Livre de 3ème, p. 42"
						bind:value={source}
					/>
				</div>
			</div>

			<!-- Slug -->
			<div class="space-y-2">
				<Label for="slug">
					Slug (URL)
					<span class="ml-1 text-xs text-muted-foreground"> (auto-généré si vide) </span>
				</Label>
				<Input
					id="slug"
					type="text"
					placeholder="Ex: algebre-equations-k8m2n4"
					bind:value={slug}
					class="font-mono text-sm"
				/>
				{#if errors.slug}
					<p class="text-sm text-destructive">{errors.slug}</p>
				{/if}
				{#if slug && !errors.slug}
					<p class="text-xs text-muted-foreground">
						URL : /exercice/{slug}
					</p>
				{/if}
			</div>

			<!-- Difficulty & Topic -->
			<div class="grid gap-4 md:grid-cols-2">
				<div class="space-y-2">
					<Label for="difficulty">
						Difficulté <span class="text-destructive">*</span>
					</Label>
					<select
						id="difficulty"
						bind:value={difficulty}
						class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
					>
						<option value={1}>1 - Facile</option>
						<option value={2}>2 - Moyen</option>
						<option value={3}>3 - Difficile</option>
					</select>
					{#if errors.difficulty}
						<p class="text-sm text-destructive">{errors.difficulty}</p>
					{/if}
				</div>

				<div class="space-y-2">
					<Label for="topic">Thème</Label>
					<Input id="topic" type="text" placeholder="Ex: Algèbre" bind:value={topic} />
				</div>
			</div>

			<!-- Tags & Grade Levels -->
			<div class="grid gap-4 md:grid-cols-2">
				<div class="space-y-2">
					<Label>Tags</Label>
					<TagBadgeSelector bind:value={tags} placeholder="Ajouter des tags" maxSelections={20} />
				</div>

				<div class="space-y-2">
					<Label>Niveaux</Label>
					<GradeBadgeSelector bind:value={gradeLevels} placeholder="Ajouter des niveaux" />
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Statement -->
	<Card.Root>
		<Card.Header>
			<Card.Title>
				Énoncé <span class="text-destructive">*</span>
			</Card.Title>
			<Card.Description>
				Rédigez l'énoncé en Markdown. Utilisez $...$ pour les formules mathématiques en ligne et
				$$...$$ pour les formules sur une ligne séparée.
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<ExerciseMarkdownEditor bind:value={statementMd} {supabase} {userId} />
			{#if errors.statement_md}
				<p class="mt-2 text-sm text-destructive">{errors.statement_md}</p>
			{/if}
		</Card.Content>
	</Card.Root>

	<!-- Solution -->
	<Card.Root>
		<Card.Header>
			<Card.Title>
				Solution <span class="text-destructive">*</span>
			</Card.Title>
			<Card.Description>
				Rédigez la solution en Markdown avec le même format que l'énoncé.
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<ExerciseMarkdownEditor bind:value={solutionMd} {supabase} {userId} />
			{#if errors.solution_md}
				<p class="mt-2 text-sm text-destructive">{errors.solution_md}</p>
			{/if}
		</Card.Content>
	</Card.Root>

	<!-- Resources -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Ressources complémentaires</Card.Title>
			<Card.Description>
				Ajoutez des liens vers des vidéos, documents PDF, fichiers GeoGebra ou autres ressources
				utiles.
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<ExerciseResourceEditor bind:resources />
		</Card.Content>
	</Card.Root>

	<!-- Actions -->
	<div class="flex justify-end gap-4">
		<Button type="button" variant="outline" href="/dashboard/teacher/exercises">Annuler</Button>
		<Button type="submit" disabled={submitting}>
			{submitting ? 'Enregistrement...' : exercise ? 'Mettre à jour' : "Créer l'exercice"}
		</Button>
	</div>
</form>

<!-- LaTeX Import Dialog -->
<LaTeXImportDialog bind:open={latexImportOpen} onImport={handleLatexImport} />
