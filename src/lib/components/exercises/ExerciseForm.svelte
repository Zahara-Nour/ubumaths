<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import ExerciseMarkdownEditor from './ExerciseMarkdownEditor.svelte';
	import type { Database } from '$lib/types/database';
	import type { SupabaseClient } from '@supabase/supabase-js';

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
	let difficulty = $state<1 | 2 | 3>(exercise?.difficulty || 2);
	let tags = $state<string>(exercise?.tags?.join(', ') || '');
	let topic = $state(exercise?.topic || '');
	let estimatedTime = $state<number | null>(exercise?.estimated_time_minutes || null);
	let gradeLevels = $state<string>(exercise?.grade_levels?.join(', ') || '');
	let statementMd = $state(exercise?.statement_md || '');
	let solutionMd = $state(exercise?.solution_md || '');

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
</script>

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
