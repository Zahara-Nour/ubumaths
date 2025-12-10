<!--
	TemplateVersionHistory Component
	=================================

	Timeline view of template versions with change summaries.
	Shows version history with expandable diff details.

	@module components/templates/TemplateVersionHistory
-->
<script lang="ts">
	import { SvelteSet } from 'svelte/reactivity';
	import type { ChapterTemplateVersion } from '$lib/types/chapter-templates';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { cn } from '$lib/utils';
	import { Clock, ChevronDown, ChevronUp, GitCommit } from 'lucide-svelte';

	// Props
	interface Props {
		versions: ChapterTemplateVersion[];
		class?: string;
	}

	let { versions, class: className = '' }: Props = $props();

	// Sort versions by version number (descending)
	const sortedVersions = $derived([...versions].sort((a, b) => b.versionNumber - a.versionNumber));

	// Expanded versions state
	let expandedVersions = new SvelteSet<string>();

	// Toggle expansion
	function toggleExpanded(versionId: string) {
		if (expandedVersions.has(versionId)) {
			expandedVersions.delete(versionId);
		} else {
			expandedVersions.add(versionId);
		}
	}

	// Format date
	function formatDate(dateString: string): string {
		const date = new Date(dateString);
		return new Intl.DateTimeFormat('fr-FR', {
			day: 'numeric',
			month: 'long',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		}).format(date);
	}

	// Get relative time
	function getRelativeTime(dateString: string): string {
		const date = new Date(dateString);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / 60000);
		const diffHours = Math.floor(diffMs / 3600000);
		const diffDays = Math.floor(diffMs / 86400000);

		if (diffMins < 1) return "À l'instant";
		if (diffMins < 60) return `Il y a ${diffMins} min`;
		if (diffHours < 24) return `Il y a ${diffHours}h`;
		if (diffDays < 7) return `Il y a ${diffDays}j`;
		return formatDate(dateString);
	}
</script>

<Card.Root class={cn('', className)}>
	<Card.Header>
		<div class="flex items-center gap-2">
			<Clock class="h-5 w-5 text-primary" />
			<Card.Title>Historique des versions</Card.Title>
		</div>
		<Card.Description>
			{versions.length} version{versions.length > 1 ? 's' : ''} enregistrée{versions.length > 1
				? 's'
				: ''}
		</Card.Description>
	</Card.Header>

	<Card.Content>
		{#if sortedVersions.length === 0}
			<p class="py-6 text-center text-sm text-muted-foreground">
				Aucune version enregistrée pour le moment.
			</p>
		{:else}
			<div class="relative space-y-4">
				<!-- Timeline line -->
				<div class="absolute top-0 left-5 h-full w-0.5 bg-border" style="margin-left: -1px;"></div>

				{#each sortedVersions as version, index (version.id)}
					{@const isExpanded = expandedVersions.has(version.id)}
					{@const isLatest = index === 0}
					{@const hasDiff = version.diff !== null}

					<div class="relative flex gap-4">
						<!-- Timeline dot -->
						<div
							class={cn(
								'relative z-10 mt-1 flex h-10 w-10 items-center justify-center rounded-full border-4 border-background',
								isLatest ? 'bg-primary' : 'bg-muted'
							)}
						>
							<GitCommit class={cn('h-4 w-4', isLatest ? 'text-primary-foreground' : '')} />
						</div>

						<!-- Version card -->
						<div class="flex-1 pb-4">
							<div
								class={cn(
									'rounded-lg border bg-card p-4',
									isLatest && 'border-primary/50 bg-primary/5'
								)}
							>
								<!-- Header -->
								<div class="flex items-start justify-between gap-3">
									<div>
										<div class="flex items-center gap-2">
											<h3 class="font-semibold">
												Version {version.versionNumber}
											</h3>
											{#if isLatest}
												<Badge variant="default" class="text-xs">Actuelle</Badge>
											{/if}
										</div>
										<p class="mt-1 text-xs text-muted-foreground">
											{getRelativeTime(version.createdAt)}
										</p>
									</div>

									{#if hasDiff}
										<Button
											variant="ghost"
											size="icon-sm"
											onclick={() => toggleExpanded(version.id)}
											class="h-8 w-8"
										>
											{#if isExpanded}
												<ChevronUp class="h-4 w-4" />
											{:else}
												<ChevronDown class="h-4 w-4" />
											{/if}
										</Button>
									{/if}
								</div>

								<!-- Change summary -->
								{#if version.changeSummary}
									<p class="mt-3 text-sm">{version.changeSummary}</p>
								{/if}

								<!-- Expanded diff details -->
								{#if isExpanded && hasDiff && version.diff}
									{@const stats = version.diff.stats}
									<div class="mt-4 space-y-2 border-t pt-4">
										<h4 class="text-sm font-medium">Détails des modifications</h4>

										<div class="grid grid-cols-2 gap-2 text-xs">
											{#if stats.documentsAdded + stats.documentsRemoved + stats.documentsModified > 0}
												<div class="rounded-md bg-muted p-2">
													<p class="font-medium">Documents</p>
													<ul class="mt-1 space-y-0.5 text-muted-foreground">
														{#if stats.documentsAdded > 0}
															<li class="text-green-600 dark:text-green-400">
																+ {stats.documentsAdded} ajouté{stats.documentsAdded > 1 ? 's' : ''}
															</li>
														{/if}
														{#if stats.documentsRemoved > 0}
															<li class="text-red-600 dark:text-red-400">
																- {stats.documentsRemoved} supprimé{stats.documentsRemoved > 1
																	? 's'
																	: ''}
															</li>
														{/if}
														{#if stats.documentsModified > 0}
															<li class="text-blue-600 dark:text-blue-400">
																~ {stats.documentsModified} modifié{stats.documentsModified > 1
																	? 's'
																	: ''}
															</li>
														{/if}
													</ul>
												</div>
											{/if}

											{#if stats.quizQuestionsAdded + stats.quizQuestionsRemoved + stats.quizQuestionsModified > 0}
												<div class="rounded-md bg-muted p-2">
													<p class="font-medium">Quiz</p>
													<ul class="mt-1 space-y-0.5 text-muted-foreground">
														{#if stats.quizQuestionsAdded > 0}
															<li class="text-green-600 dark:text-green-400">
																+ {stats.quizQuestionsAdded} ajouté{stats.quizQuestionsAdded > 1
																	? 's'
																	: ''}
															</li>
														{/if}
														{#if stats.quizQuestionsRemoved > 0}
															<li class="text-red-600 dark:text-red-400">
																- {stats.quizQuestionsRemoved} supprimé{stats.quizQuestionsRemoved >
																1
																	? 's'
																	: ''}
															</li>
														{/if}
														{#if stats.quizQuestionsModified > 0}
															<li class="text-blue-600 dark:text-blue-400">
																~ {stats.quizQuestionsModified} modifié{stats.quizQuestionsModified >
																1
																	? 's'
																	: ''}
															</li>
														{/if}
													</ul>
												</div>
											{/if}

											{#if stats.checklistItemsAdded + stats.checklistItemsRemoved + stats.checklistItemsModified > 0}
												<div class="rounded-md bg-muted p-2">
													<p class="font-medium">Objectifs</p>
													<ul class="mt-1 space-y-0.5 text-muted-foreground">
														{#if stats.checklistItemsAdded > 0}
															<li class="text-green-600 dark:text-green-400">
																+ {stats.checklistItemsAdded} ajouté{stats.checklistItemsAdded > 1
																	? 's'
																	: ''}
															</li>
														{/if}
														{#if stats.checklistItemsRemoved > 0}
															<li class="text-red-600 dark:text-red-400">
																- {stats.checklistItemsRemoved} supprimé{stats.checklistItemsRemoved >
																1
																	? 's'
																	: ''}
															</li>
														{/if}
														{#if stats.checklistItemsModified > 0}
															<li class="text-blue-600 dark:text-blue-400">
																~ {stats.checklistItemsModified} modifié{stats.checklistItemsModified >
																1
																	? 's'
																	: ''}
															</li>
														{/if}
													</ul>
												</div>
											{/if}

											{#if stats.exercisesAdded + stats.exercisesRemoved + stats.exercisesModified > 0}
												<div class="rounded-md bg-muted p-2">
													<p class="font-medium">Exercices</p>
													<ul class="mt-1 space-y-0.5 text-muted-foreground">
														{#if stats.exercisesAdded > 0}
															<li class="text-green-600 dark:text-green-400">
																+ {stats.exercisesAdded} ajouté{stats.exercisesAdded > 1 ? 's' : ''}
															</li>
														{/if}
														{#if stats.exercisesRemoved > 0}
															<li class="text-red-600 dark:text-red-400">
																- {stats.exercisesRemoved} supprimé{stats.exercisesRemoved > 1
																	? 's'
																	: ''}
															</li>
														{/if}
														{#if stats.exercisesModified > 0}
															<li class="text-blue-600 dark:text-blue-400">
																~ {stats.exercisesModified} modifié{stats.exercisesModified > 1
																	? 's'
																	: ''}
															</li>
														{/if}
													</ul>
												</div>
											{/if}
										</div>
									</div>
								{/if}
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</Card.Content>
</Card.Root>
