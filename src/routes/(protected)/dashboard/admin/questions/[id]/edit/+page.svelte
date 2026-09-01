<!--
	Question Template Edit Page
	============================

	Admin-only page for editing existing question templates.

	FEATURES:
	- Pre-populated form with existing template data
	- Live preview of changes
	- Update via PUT /api/questions/templates/[id]
	- Success/error handling with toasts
	- Cancel navigation

	DATA FLOW:
	----------
	1. Server load fetches existing template
	2. Form is pre-populated with template data
	3. User edits form
	4. On save, PUT to /api/questions/templates/[id]
	5. On success, redirect to questions list
	6. On error, show validation errors
-->

<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { toaster } from '$lib/stores/toaster.svelte';
	import type { QuestionTemplate } from '$lib/questions/types';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { ArrowLeft, Loader2, ListTodo, ChevronDown, ChevronRight } from '@lucide/svelte';
	import MyCheckbox from '$lib/components/MyCheckbox.svelte';
	import InlineMarkdown from '$lib/components/markdown/InlineMarkdown.svelte';
	import { questionCategoriesCache } from '$lib/stores/questionCategories.svelte';
	import { questionTemplatesCache } from '$lib/stores/questionTemplates.svelte';
	import { onMount } from 'svelte';
	import { GRADES, isGradeCode } from '$lib/types/grades';

	let { data }: { data: PageData } = $props();

	let isSubmitting = $state(false);
	let QuestionTemplateForm = $state<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
	let isLoading = $state(true);

	// Dynamically import QuestionTemplateForm to reduce initial bundle size
	onMount(async () => {
		const module = await import('$lib/components/QuestionTemplateForm.svelte');
		QuestionTemplateForm = module.default;
		isLoading = false;
	});

	async function handleSave(
		template: Omit<QuestionTemplate, 'id' | 'created_at' | 'updated_at' | 'created_by'>,
		options?: { silent?: boolean }
	) {
		isSubmitting = true;

		try {
			const response = await fetch(`/api/questions/templates/${data.template.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(template)
			});

			const result = await response.json();

			if (result.success) {
				// Invalidate caches to force refresh
				questionCategoriesCache.invalidate();
				questionTemplatesCache.invalidate();

				toaster.success('Question mise à jour avec succès');
				if (!options?.silent) {
					goto('/dashboard/admin/questions').then(() => {});
				}
			} else {
				toaster.error('Erreur lors de la mise à jour');
				console.error('Validation errors:', result.errors);
			}
		} catch (error) {
			toaster.error('Erreur serveur');
			console.error('Server error:', error);
		} finally {
			isSubmitting = false;
		}
	}

	function handleCancel() {
		goto('/dashboard/admin/questions').then(() => {});
	}
	// --- tagging au programme -------------------------------------------------
	// `question_template_points` est le pivot de l'acquisition : une tentative n'a
	// pas de clé étrangère vers un point, elle s'y relie par le template tagué.
	// Sans une case cochée ici, la question ne validera jamais rien.
	//
	// Mise à jour optimiste : la case bascule tout de suite et revient si
	// l'écriture échoue.

	// svelte-ignore state_referenced_locally
	let taggedSet = $state<Record<string, boolean>>(
		Object.fromEntries((data.taggedPointIds ?? []).map((id: string) => [id, true]))
	);
	let openTagThemes = $state<Record<string, boolean>>({});
	let openTagItems = $state<Record<string, boolean>>({});

	const taggedCount = $derived(Object.keys(taggedSet).length);

	function isTagged(pointId: string): boolean {
		return taggedSet[pointId] === true;
	}

	async function tagApi(url: string, method: string, body?: unknown): Promise<boolean> {
		try {
			const res = await fetch(url, {
				method,
				headers: body ? { 'Content-Type': 'application/json' } : undefined,
				body: body ? JSON.stringify(body) : undefined
			});
			if (!res.ok) {
				const j = await res.json().catch(() => ({}));
				toaster.error(j?.error ?? 'Une erreur est survenue');
				return false;
			}
			return true;
		} catch {
			toaster.error('Erreur réseau');
			return false;
		}
	}

	async function toggleTag(pointId: string) {
		const id = data.templateId;
		if (isTagged(pointId)) {
			const next = { ...taggedSet };
			delete next[pointId];
			taggedSet = next;
			const ok = await tagApi(
				`/api/teacher/curriculum/template-tags?template_id=${id}&point_id=${pointId}`,
				'DELETE'
			);
			if (!ok) taggedSet = { ...taggedSet, [pointId]: true };
		} else {
			taggedSet = { ...taggedSet, [pointId]: true };
			const ok = await tagApi('/api/teacher/curriculum/template-tags', 'POST', {
				template_id: id,
				point_id: pointId
			});
			if (!ok) {
				const next = { ...taggedSet };
				delete next[pointId];
				taggedSet = next;
			}
		}
	}

	/** « 1ère spécialité maths » plutôt que « 1_SPE » : le code est interne. */
	function gradeLabel(grade: string): string {
		return isGradeCode(grade) ? GRADES[grade].displayName : grade;
	}
</script>

<svelte:head>
	<title>Modifier la Question - Admin</title>
</svelte:head>

<div class="container mx-auto max-w-7xl space-y-6 p-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-4">
			<Button variant="outline" onclick={handleCancel} class="gap-2">
				<ArrowLeft class="h-4 w-4" />
				Retour
			</Button>
			<div>
				<h1 class="text-3xl font-bold">Modifier la Question</h1>
				<p class="text-muted-foreground">
					ID: <code class="rounded bg-muted px-2 py-1 text-sm">{data.template.id}</code>
				</p>
			</div>
		</div>
	</div>

	<!-- Main Form -->
	<Card.Root>
		<Card.Content>
			{#if isLoading}
				<div class="flex min-h-[400px] items-center justify-center">
					<Loader2 class="h-8 w-8 animate-spin text-muted-foreground" />
				</div>
			{:else if QuestionTemplateForm}
				<QuestionTemplateForm
					template={data.template}
					onSave={handleSave}
					onCancel={handleCancel}
					{isSubmitting}
				/>
			{/if}
		</Card.Content>
	</Card.Root>

	<!-- Points de programme -->
	{#if data.curriculumByGrade.length > 0}
		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2">
					<ListTodo class="h-5 w-5 text-primary" />
					Points de programme
					{#if taggedCount > 0}
						<span class="text-sm font-normal text-muted-foreground">
							· {taggedCount} tagué{taggedCount > 1 ? 's' : ''}
						</span>
					{/if}
				</Card.Title>
				<Card.Description>
					Tague les points que cette question permet de valider. Sans au moins un point, elle
					n'entre dans l'acquisition d'aucun élève. Un point est acquis après réussite sur
					<strong>deux questions différentes</strong> au moins — un seul tag ne suffit jamais.
				</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-4">
				{#each data.curriculumByGrade as { grade, tree } (grade)}
					{#if data.curriculumByGrade.length > 1}
						<p class="text-sm font-semibold text-muted-foreground">{gradeLabel(grade)}</p>
					{/if}
					<div class="space-y-1">
						{#each tree as theme (theme.id)}
							<div class="rounded-md border">
								<button
									class="flex w-full items-center gap-2 p-2 text-left text-sm font-medium"
									onclick={() => (openTagThemes[theme.id] = !openTagThemes[theme.id])}
								>
									{#if openTagThemes[theme.id]}
										<ChevronDown class="h-4 w-4 shrink-0 text-muted-foreground" />
									{:else}
										<ChevronRight class="h-4 w-4 shrink-0 text-muted-foreground" />
									{/if}
									<InlineMarkdown content={theme.name} />
								</button>
								{#if openTagThemes[theme.id]}
									<div class="space-y-1 border-t p-2 pl-4">
										{#each theme.objectives as item (item.id)}
											<div>
												<button
													class="flex w-full items-center gap-2 py-1 text-left text-sm"
													onclick={() => (openTagItems[item.id] = !openTagItems[item.id])}
												>
													{#if openTagItems[item.id]}
														<ChevronDown class="h-4 w-4 shrink-0 text-muted-foreground" />
													{:else}
														<ChevronRight class="h-4 w-4 shrink-0 text-muted-foreground" />
													{/if}
													<span class="font-medium"><InlineMarkdown content={item.name} /></span>
												</button>
												{#if openTagItems[item.id]}
													<div class="space-y-1 py-1 pl-6">
														{#each item.points as point (point.id)}
															<div class="flex items-start gap-2">
																<code
																	class="mt-0.5 shrink-0 font-mono text-[11px] text-muted-foreground tabular-nums"
																>
																	{point.code}
																</code>
																<MyCheckbox
																	checked={isTagged(point.id)}
																	onchange={() => toggleTag(point.id)}
																>
																	<InlineMarkdown content={point.name} />
																</MyCheckbox>
															</div>
														{/each}
													</div>
												{/if}
											</div>
										{/each}
									</div>
								{/if}
							</div>
						{/each}
					</div>
				{/each}
			</Card.Content>
		</Card.Root>
	{/if}
</div>
