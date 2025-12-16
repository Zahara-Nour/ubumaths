<!--
	Create Template Page
	====================

	Form for creating a new chapter template from scratch.
-->

<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { ArrowLeft } from 'lucide-svelte';

	let { form }: { form: ActionData } = $props();

	let isSubmitting = $state(false);
	let selectedGrades = $state<string[]>([]);
	let title = $state('');
	let description = $state('');

	const gradeOptions = [
		{ value: '6', label: '6ème' },
		{ value: '5', label: '5ème' },
		{ value: '4', label: '4ème' },
		{ value: '3', label: '3ème' },
		{ value: '2', label: '2nde' },
		{ value: '1', label: '1ère' },
		{ value: 'T', label: 'Terminale' }
	];

	function toggleGrade(grade: string) {
		if (selectedGrades.includes(grade)) {
			selectedGrades = selectedGrades.filter((g) => g !== grade);
		} else {
			selectedGrades = [...selectedGrades, grade];
		}
	}

	// Show error toast if form returns error
	$effect(() => {
		if (form?.error) {
			toaster.error(form.error);
		}
	});
</script>

<div class="space-y-6">
	<!-- Header -->
	<div>
		<Button variant="ghost" href="/dashboard/teacher/templates" class="mb-4">
			<ArrowLeft class="mr-2 h-4 w-4" />
			Retour aux templates
		</Button>
		<h1 class="text-3xl font-bold tracking-tight">Nouveau Template</h1>
		<p class="mt-1 text-muted-foreground">
			Créez un template de chapitre réutilisable pour vos cours
		</p>
	</div>

	<!-- Create Form -->
	<form
		method="POST"
		action="?/create"
		use:enhance={() => {
			isSubmitting = true;
			return async ({ result, update }) => {
				isSubmitting = false;
				if (result.type === 'success' || result.type === 'redirect') {
					toaster.success('Template créé avec succès');
				}
				await update();
			};
		}}
	>
		<Card>
			<CardHeader>
				<CardTitle>Informations du Template</CardTitle>
				<CardDescription>
					Définissez les propriétés de base. Vous pourrez ajouter du contenu après la création.
				</CardDescription>
			</CardHeader>
			<CardContent class="space-y-4">
				<!-- Title -->
				<div class="space-y-2">
					<Label for="title">
						Titre<span class="text-destructive">*</span>
					</Label>
					<Input
						id="title"
						name="title"
						type="text"
						placeholder="Ex: Chapitre sur les équations du second degré"
						required
						maxlength={200}
						bind:value={title}
					/>
					<p class="text-xs text-muted-foreground">{title.length}/200 caractères</p>
				</div>

				<!-- Description -->
				<div class="space-y-2">
					<Label for="description">Description (optionnel)</Label>
					<Textarea
						id="description"
						name="description"
						placeholder="Décrivez le contenu et l'objectif de ce template..."
						rows={4}
						maxlength={2000}
						bind:value={description}
					/>
					<p class="text-xs text-muted-foreground">{description.length}/2000 caractères</p>
				</div>

				<!-- Grades -->
				<div class="space-y-2">
					<Label>Niveaux recommandés</Label>
					<div class="flex flex-wrap gap-2">
						{#each gradeOptions as grade (grade.value)}
							<Badge
								variant={selectedGrades.includes(grade.value) ? 'default' : 'outline'}
								class="cursor-pointer"
								onclick={() => toggleGrade(grade.value)}
							>
								{grade.label}
							</Badge>
						{/each}
					</div>
					<input type="hidden" name="grades" value={selectedGrades.join(',')} />
					<p class="text-xs text-muted-foreground">
						Sélectionnez les niveaux pour lesquels ce template est adapté
					</p>
				</div>

				<!-- Submit -->
				<div class="flex items-center justify-end gap-2 pt-4">
					<Button type="button" variant="outline" href="/dashboard/teacher/templates">
						Annuler
					</Button>
					<Button type="submit" disabled={isSubmitting || !title.trim()}>
						{isSubmitting ? 'Création...' : 'Créer le Template'}
					</Button>
				</div>
			</CardContent>
		</Card>
	</form>
</div>
