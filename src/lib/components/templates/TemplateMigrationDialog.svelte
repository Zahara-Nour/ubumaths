<!--
	TemplateMigrationDialog Component
	==================================

	Modal dialog for reviewing and applying template migrations.
	Shows diff summary and warns about potential data loss.

	@module components/templates/TemplateMigrationDialog
-->
<script lang="ts">
	import type { MigrationPreview } from '$lib/types/chapter-templates';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import {
		ArrowUpCircle,
		X,
		AlertTriangle,
		FileText,
		HelpCircle,
		ClipboardList,
		Dumbbell
	} from 'lucide-svelte';

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

	// Check if there are removals (data loss warning)
	const hasRemovals = $derived(
		preview
			? preview.diff.stats.documentsRemoved > 0 ||
					preview.diff.stats.quizQuestionsRemoved > 0 ||
					preview.diff.stats.checklistItemsRemoved > 0 ||
					preview.diff.stats.exercisesRemoved > 0
			: false
	);

	// Check if there are checklist changes (progress loss warning)
	const hasChecklistChanges = $derived(
		preview
			? preview.diff.stats.checklistItemsAdded > 0 ||
					preview.diff.stats.checklistItemsRemoved > 0 ||
					preview.diff.stats.checklistItemsModified > 0
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
									<h4 class="text-sm font-medium">Exercices</h4>
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

				<!-- Warnings -->
				{#if hasRemovals}
					<div
						class="flex items-start gap-3 rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-900/30"
					>
						<AlertTriangle class="h-5 w-5 shrink-0 text-orange-600" />
						<div class="text-sm">
							<p class="font-semibold text-orange-900 dark:text-orange-100">
								Attention : Suppressions détectées
							</p>
							<p class="mt-1 text-orange-700 dark:text-orange-200">
								Cette mise à jour supprimera du contenu de votre chapitre. Cette action est
								irréversible.
							</p>
						</div>
					</div>
				{/if}

				{#if hasChecklistChanges}
					<div
						class="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/30"
					>
						<AlertTriangle class="h-5 w-5 shrink-0 text-red-600" />
						<div class="text-sm">
							<p class="font-semibold text-red-900 dark:text-red-100">
								Perte de progression des élèves
							</p>
							<p class="mt-1 text-red-700 dark:text-red-200">
								Les modifications des objectifs entraîneront la perte de la progression des élèves
								sur ces objectifs.
							</p>
						</div>
					</div>
				{/if}
			</div>
		{/if}

		<Dialog.Footer class="flex justify-end gap-3">
			<Button variant="outline" onclick={handleCancel} disabled={isSubmitting}>
				<X class="mr-2 h-4 w-4" />
				Annuler
			</Button>
			<Button
				onclick={handleMigrate}
				disabled={!preview || isSubmitting}
				variant={hasRemovals ? 'destructive' : 'default'}
			>
				<ArrowUpCircle class="mr-2 h-4 w-4" />
				{hasRemovals ? 'Forcer la mise à jour' : 'Mettre à jour'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
