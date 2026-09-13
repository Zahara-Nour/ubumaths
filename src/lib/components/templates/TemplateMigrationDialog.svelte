<!--
	TemplateMigrationDialog Component
	==================================

	Modal dialog for reviewing and applying template migrations.
	Shows diff summary and warns about potential data loss.

	@module components/templates/TemplateMigrationDialog
-->
<script lang="ts">
	import { lore } from '$lib/config/lore';
	import type { MigrationPreview } from '$lib/types/chapter-templates';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import {
		ArrowUpCircle,
		X,
		Info,
		FileText,
		HelpCircle,
		ClipboardList,
		Dumbbell
	} from '@lucide/svelte';

	// Props
	interface Props {
		preview: MigrationPreview | null;
		open?: boolean;
		onMigrate: () => void;
		onCancel: () => void;
	}

	let { preview, open = $bindable(false), onMigrate, onCancel }: Props = $props();

	// Submitting state
	let isSubmitting = $state(false);

	// Reset submitting state when dialog opens
	$effect(() => {
		if (open) {
			isSubmitting = false;
		}
	});

	// Handle migrate
	function handleMigrate() {
		if (isSubmitting || !preview) return;
		isSubmitting = true;
		onMigrate();
	}

	// Handle cancel
	function handleCancel() {
		if (!isSubmitting) {
			onCancel();
		}
	}

	// Du contenu a été RETIRÉ DU MODÈLE — ce qui ne le retire plus du chapitre.
	//
	// L'écran annonçait « cette mise à jour supprimera du contenu de votre
	// chapitre, action irréversible », et passait le bouton en rouge « Forcer la
	// mise à jour ». Depuis que la mise à jour fusionne au lieu d'écraser, c'est
	// faux : elle ne supprime rien. Un professeur renonçait devant l'opération la
	// plus anodine du système.
	const retireDuModele = $derived(
		preview
			? preview.diff.stats.documentsRemoved > 0 ||
					preview.diff.stats.quizQuestionsRemoved > 0 ||
					preview.diff.stats.checklistItemsRemoved > 0 ||
					preview.diff.stats.exercisesRemoved > 0 ||
					preview.diff.stats.worksheetsRemoved > 0
			: false
	);
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="max-w-2xl">
		<Dialog.Header>
			<Dialog.Title class="flex items-center gap-2">
				<ArrowUpCircle class="h-5 w-5 text-blue-600" />
				Mettre à jour depuis le template
			</Dialog.Title>
			<Dialog.Description>
				Examinez les modifications avant d'appliquer la mise à jour.
			</Dialog.Description>
		</Dialog.Header>

		{#if preview}
			<div class="space-y-6">
				<!-- Version info -->
				<div class="flex items-center justify-between rounded-lg border bg-muted/50 p-4">
					<div>
						<p class="text-sm font-medium">Version actuelle</p>
						<p class="text-2xl font-bold">{preview.fromVersion}</p>
					</div>
					<ArrowUpCircle class="h-6 w-6 text-muted-foreground" />
					<div class="text-right">
						<p class="text-sm font-medium">Nouvelle version</p>
						<p class="text-2xl font-bold text-blue-600">{preview.toVersion}</p>
					</div>
				</div>

				<!-- Change summary -->
				{#if preview.changeSummary}
					<Card.Root>
						<Card.Header class="pb-3">
							<Card.Title class="text-base">Résumé des modifications</Card.Title>
						</Card.Header>
						<Card.Content>
							<p class="text-sm">{preview.changeSummary}</p>
						</Card.Content>
					</Card.Root>
				{/if}

				<!-- Diff details -->
				<Card.Root>
					<Card.Header class="pb-3">
						<Card.Title class="text-base">Détails des modifications</Card.Title>
					</Card.Header>
					<Card.Content class="space-y-4">
						{@const stats = preview.diff.stats}

						<!-- Documents -->
						{#if stats.documentsAdded + stats.documentsRemoved + stats.documentsModified > 0}
							<div class="space-y-2">
								<div class="flex items-center gap-2">
									<FileText class="h-4 w-4 text-muted-foreground" />
									<h4 class="text-sm font-medium">Documents</h4>
								</div>
								<div class="flex flex-wrap gap-2 text-xs">
									{#if stats.documentsAdded > 0}
										<Badge
											variant="outline"
											class="border-green-500 bg-green-50 text-green-700 dark:bg-green-900/30"
										>
											+ {stats.documentsAdded} ajouté{stats.documentsAdded > 1 ? 's' : ''}
										</Badge>
									{/if}
									{#if stats.documentsRemoved > 0}
										<Badge
											variant="outline"
											class="border-red-500 bg-red-50 text-red-700 dark:bg-red-900/30"
										>
											- {stats.documentsRemoved} supprimé{stats.documentsRemoved > 1 ? 's' : ''}
										</Badge>
									{/if}
									{#if stats.documentsModified > 0}
										<Badge
											variant="outline"
											class="border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30"
										>
											~ {stats.documentsModified} modifié{stats.documentsModified > 1 ? 's' : ''}
										</Badge>
									{/if}
								</div>
							</div>
						{/if}

						<!-- Quiz Questions -->
						{#if stats.quizQuestionsAdded + stats.quizQuestionsRemoved + stats.quizQuestionsModified > 0}
							<div class="space-y-2">
								<div class="flex items-center gap-2">
									<HelpCircle class="h-4 w-4 text-muted-foreground" />
									<h4 class="text-sm font-medium">Questions Quiz</h4>
								</div>
								<div class="flex flex-wrap gap-2 text-xs">
									{#if stats.quizQuestionsAdded > 0}
										<Badge
											variant="outline"
											class="border-green-500 bg-green-50 text-green-700 dark:bg-green-900/30"
										>
											+ {stats.quizQuestionsAdded} ajoutée{stats.quizQuestionsAdded > 1 ? 's' : ''}
										</Badge>
									{/if}
									{#if stats.quizQuestionsRemoved > 0}
										<Badge
											variant="outline"
											class="border-red-500 bg-red-50 text-red-700 dark:bg-red-900/30"
										>
											- {stats.quizQuestionsRemoved} supprimée{stats.quizQuestionsRemoved > 1
												? 's'
												: ''}
										</Badge>
									{/if}
									{#if stats.quizQuestionsModified > 0}
										<Badge
											variant="outline"
											class="border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30"
										>
											~ {stats.quizQuestionsModified} modifiée{stats.quizQuestionsModified > 1
												? 's'
												: ''}
										</Badge>
									{/if}
								</div>
							</div>
						{/if}

						<!-- Checklist Items -->
						{#if stats.checklistItemsAdded + stats.checklistItemsRemoved + stats.checklistItemsModified > 0}
							<div class="space-y-2">
								<div class="flex items-center gap-2">
									<ClipboardList class="h-4 w-4 text-muted-foreground" />
									<h4 class="text-sm font-medium">Objectifs</h4>
								</div>
								<div class="flex flex-wrap gap-2 text-xs">
									{#if stats.checklistItemsAdded > 0}
										<Badge
											variant="outline"
											class="border-green-500 bg-green-50 text-green-700 dark:bg-green-900/30"
										>
											+ {stats.checklistItemsAdded} ajouté{stats.checklistItemsAdded > 1 ? 's' : ''}
										</Badge>
									{/if}
									{#if stats.checklistItemsRemoved > 0}
										<Badge
											variant="outline"
											class="border-red-500 bg-red-50 text-red-700 dark:bg-red-900/30"
										>
											- {stats.checklistItemsRemoved} supprimé{stats.checklistItemsRemoved > 1
												? 's'
												: ''}
										</Badge>
									{/if}
									{#if stats.checklistItemsModified > 0}
										<Badge
											variant="outline"
											class="border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30"
										>
											~ {stats.checklistItemsModified} modifié{stats.checklistItemsModified > 1
												? 's'
												: ''}
										</Badge>
									{/if}
								</div>
							</div>
						{/if}

						<!-- Exercises -->
						{#if stats.exercisesAdded + stats.exercisesRemoved + stats.exercisesModified > 0}
							<div class="space-y-2">
								<div class="flex items-center gap-2">
									<Dumbbell class="h-4 w-4 text-muted-foreground" />
									<h4 class="text-sm font-medium">{lore.learning.exercise}s</h4>
								</div>
								<div class="flex flex-wrap gap-2 text-xs">
									{#if stats.exercisesAdded > 0}
										<Badge
											variant="outline"
											class="border-green-500 bg-green-50 text-green-700 dark:bg-green-900/30"
										>
											+ {stats.exercisesAdded} ajouté{stats.exercisesAdded > 1 ? 's' : ''}
										</Badge>
									{/if}
									{#if stats.exercisesRemoved > 0}
										<Badge
											variant="outline"
											class="border-red-500 bg-red-50 text-red-700 dark:bg-red-900/30"
										>
											- {stats.exercisesRemoved} supprimé{stats.exercisesRemoved > 1 ? 's' : ''}
										</Badge>
									{/if}
									{#if stats.exercisesModified > 0}
										<Badge
											variant="outline"
											class="border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30"
										>
											~ {stats.exercisesModified} modifié{stats.exercisesModified > 1 ? 's' : ''}
										</Badge>
									{/if}
								</div>
							</div>
						{/if}
					</Card.Content>
				</Card.Root>

				<!--
					Ni alerte ni bouton rouge : la mise à jour n'efface rien. Elle ajoute
					ce qui manque et corrige ce qui a changé ; ce que vous aviez ajouté à
					la main, et ce que vous aviez publié, restent en place.
				-->
				<div
					class="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/30"
				>
					<Info class="h-5 w-5 shrink-0 text-blue-600" />
					<div class="text-sm">
						<p class="font-semibold text-blue-900 dark:text-blue-100">
							Rien ne sera supprimé de votre chapitre
						</p>
						<p class="mt-1 text-blue-700 dark:text-blue-200">
							Ce que vous avez ajouté vous-même reste en place, et ce que vous avez publié le reste
							aussi. La progression des {lore.entities.student}s n'est pas touchée.
							{#if retireDuModele}
								Le contenu retiré du modèle reste dans ce chapitre : à vous de l'enlever si vous le
								souhaitez.
							{/if}
						</p>
					</div>
				</div>
			</div>
		{/if}

		<Dialog.Footer class="flex justify-end gap-3">
			<Button variant="outline" onclick={handleCancel} disabled={isSubmitting}>
				<X class="mr-2 h-4 w-4" />
				Annuler
			</Button>
			<Button onclick={handleMigrate} disabled={!preview || isSubmitting}>
				<ArrowUpCircle class="mr-2 h-4 w-4" />
				Mettre à jour
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
