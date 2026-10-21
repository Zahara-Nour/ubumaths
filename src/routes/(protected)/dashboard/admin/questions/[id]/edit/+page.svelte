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
	import BackLink from '$lib/components/navigation/BackLink.svelte';
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { toaster } from '$lib/stores/toaster.svelte';
	import type { QuestionTemplate } from '$lib/questions/types';
	import { toTemplatePutBody } from '$lib/questions/template-put-body';
	import * as Card from '$lib/components/ui/card';
	import { Loader2, ListTodo } from '@lucide/svelte';
	import MySelect from '$lib/components/MySelect.svelte';
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
	): Promise<boolean> {
		isSubmitting = true;

		try {
			const response = await fetch(`/api/questions/templates/${data.template.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				// Champs vidés envoyés à null : la route garde une clé absente (PATCH)
				body: JSON.stringify(toTemplatePutBody(template))
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
				return true;
			}
			// Raisons du refus (contrôle de publication : spec rouge, tirage en échec…)
			const errors: string[] = Array.isArray(result.errors) ? result.errors : [];
			toaster.error('Erreur lors de la mise à jour', {
				description: errors.slice(0, 5).join('\n') || undefined
			});
			return false;
		} catch (error) {
			toaster.error('Erreur serveur');
			console.error('Server error:', error);
			return false;
		} finally {
			isSubmitting = false;
		}
	}

	function handleCancel() {
		goto('/dashboard/admin/questions').then(() => {});
	}
	// --- tagging au programme -------------------------------------------------
	// `question_template_points` est le pivot de l'acquisition : une tentative n'a
	// pas de clé étrangère vers un point, elle s'y relie par le modèle tagué.
	// Un choix par programme (règle 2 en base), parmi les points du nœud du
	// modèle et de sa notion (règle 1). Changer de point retire l'ancien tag,
	// puis pose le nouveau ; l'affichage suit ce que la base a accepté.

	const NONE = 'aucun';

	// svelte-ignore state_referenced_locally
	let selectedByGrade = $state<Record<string, string | null>>(
		Object.fromEntries(data.programmeTags.programmes.map((p) => [p.grade, p.selectedPointId]))
	);
	let savingGrade = $state<string | null>(null);

	const taggedCount = $derived(Object.values(selectedByGrade).filter((id) => id !== null).length);

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

	async function changeTag(grade: string, value: string) {
		const previous = selectedByGrade[grade] ?? null;
		const next = value === NONE ? null : value;
		if (next === previous) return;

		const id = data.templateId;
		savingGrade = grade;
		try {
			if (previous !== null) {
				const removed = await tagApi(
					`/api/teacher/curriculum/template-tags?template_id=${id}&point_id=${previous}`,
					'DELETE'
				);
				if (!removed) return;
				selectedByGrade[grade] = null;
			}
			if (next !== null) {
				const added = await tagApi('/api/teacher/curriculum/template-tags', 'POST', {
					template_id: id,
					point_id: next
				});
				if (added) selectedByGrade[grade] = next;
			}
		} finally {
			savingGrade = null;
		}
	}

	function pointItems(points: { id: string; code: string; name: string; archived: boolean }[]) {
		return [
			{ value: NONE, label: 'Aucun point' },
			...points.map((p) => ({
				value: p.id,
				label: `${p.code} — ${p.name}${p.archived ? ' (archivé)' : ''}`,
				disabled: p.archived
			}))
		];
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
		<div>
			<BackLink href="/dashboard/admin/questions" label="Retour aux questions" />
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
				Pour chaque programme, choisis le point que cette question permet de valider, parmi ceux du
				nœud du modèle et de sa notion. Sans au moins un point, elle n'entre dans l'acquisition
				d'aucun élève. Un point est acquis après réussite sur
				<strong>deux questions différentes</strong> au moins — un seul tag ne suffit jamais.
			</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-4">
			{#if data.programmeTags.nodeMissing}
				<div class="text-sm text-muted-foreground">
					Rangez d'abord ce modèle dans l'arbre des notions : un modèle sans nœud ne peut pas être
					tagué.
				</div>
			{:else if data.programmeTags.programmes.length === 0}
				<div class="text-sm text-muted-foreground">
					Aucun point du programme n'est posé sur le nœud de ce modèle ni sur sa notion.
				</div>
			{:else}
				{#each data.programmeTags.programmes as programme (programme.grade)}
					{@const chosen = programme.points.find((p) => p.id === selectedByGrade[programme.grade])}
					<div class="space-y-1">
						<div class="text-sm font-semibold text-muted-foreground">
							{gradeLabel(programme.grade)}
						</div>
						<MySelect
							items={pointItems(programme.points)}
							value={selectedByGrade[programme.grade] ?? NONE}
							disabled={savingGrade !== null}
							triggerAriaLabel={`Point de ${gradeLabel(programme.grade)}`}
							onValueChange={(value: string) => changeTag(programme.grade, value)}
						/>
						{#if chosen}
							<div class="text-sm">
								<code class="font-mono text-[11px] text-muted-foreground">{chosen.code}</code>
								<InlineMarkdown content={chosen.name} />
							</div>
						{/if}
					</div>
				{/each}
			{/if}
		</Card.Content>
	</Card.Root>
</div>
