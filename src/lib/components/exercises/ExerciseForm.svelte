<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import ExerciseMarkdownEditor from './ExerciseMarkdownEditor.svelte';
	import LaTeXImportDialog from './LaTeXImportDialog.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import type { Database } from '$lib/types/database';
	import type { SupabaseClient } from '@supabase/supabase-js';
	import type { TranspileWarning } from '$lib/exercises/transpilers/latex-to-markdown';

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
	let source = $state(exercise?.source || '');
	let difficulty = $state<1 | 2 | 3>((exercise?.difficulty as 1 | 2 | 3) || 2);
	let tags = $state<string>(exercise?.tags?.join(', ') || '');
	let topic = $state(exercise?.topic || '');
	let estimatedTime = $state<number | null>(exercise?.estimated_time_minutes || null);
	let gradeLevels = $state<string>(exercise?.grade_levels?.join(', ') || '');
	let statementMd = $state(exercise?.statement_md || '');
	let solutionMd = $state(exercise?.solution_md || '');

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
			source: source.trim() || null,
			difficulty,
			tags: tags
				.split(',')
				.map((t) => t.trim())
				.filter(Boolean),
			topic: topic.trim() || null,
			estimated_time_minutes: estimatedTime,
			grade_levels: gradeLevels
				.split(',')
				.map((g) => g.trim())
				.filter(Boolean),
			statement_md: statementMd,
			solution_md: solutionMd
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

			<!-- Difficulty, Time, Topic -->
			<div class="grid gap-4 md:grid-cols-3">
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
					<Label for="estimatedTime">Temps estimé (min)</Label>
					<Input
						id="estimatedTime"
						type="number"
						min="1"
						placeholder="Ex: 15"
						bind:value={estimatedTime}
					/>
				</div>

				<div class="space-y-2">
					<Label for="topic">Thème</Label>
					<Input id="topic" type="text" placeholder="Ex: Algèbre" bind:value={topic} />
				</div>
			</div>

			<!-- Tags & Grade Levels -->
			<div class="grid gap-4 md:grid-cols-2">
				<div class="space-y-2">
					<Label for="tags">Tags</Label>
					<Input
						id="tags"
						type="text"
						placeholder="Ex: équations, algèbre, premier degré"
						bind:value={tags}
					/>
					<p class="text-xs text-muted-foreground">Séparez les tags par des virgules</p>
				</div>

				<div class="space-y-2">
					<Label for="gradeLevels">Niveaux</Label>
					<Input id="gradeLevels" type="text" placeholder="Ex: 3, 2, 1" bind:value={gradeLevels} />
					<p class="text-xs text-muted-foreground">
						Niveaux scolaires séparés par des virgules (6, 5, 4, 3, 2, 1, T)
					</p>
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
