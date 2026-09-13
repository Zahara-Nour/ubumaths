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
	import { toaster } from '$lib/stores/toaster.svelte';
	import GradeBadgeSelector from '$lib/components/GradeBadgeSelector.svelte';
	import type { GradeCode } from '$lib/types/grades';
	import { ArrowLeft } from '@lucide/svelte';

	let { form }: { form: ActionData } = $props();

	let isSubmitting = $state(false);
	let selectedGrades = $state<GradeCode[]>([]);
	let title = $state('');
	let description = $state('');

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
		<Button variant="ghost" href="/dashboard/teacher/contenu/templates" class="mb-4">
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
					<!--
						Les niveaux viennent du référentiel commun, comme partout
						ailleurs : une liste maison laissait choisir « 1ère » et
						« Terminale », que le serveur refuse, et cachait le primaire
						comme les filières (spécialité, STMG, expertes).
					-->
					<GradeBadgeSelector bind:value={selectedGrades} />
					<input type="hidden" name="grades" value={selectedGrades.join(',')} />
					<p class="text-xs text-muted-foreground">
						Sélectionnez les niveaux pour lesquels ce template est adapté
					</p>
				</div>

				<!-- Submit -->
				<div class="flex items-center justify-end gap-2 pt-4">
					<Button type="button" variant="outline" href="/dashboard/teacher/contenu/templates">
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
