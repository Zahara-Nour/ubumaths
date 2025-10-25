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
	import QuestionTemplateForm from '$lib/components/QuestionTemplateForm.svelte';
	import type { QuestionTemplate } from '$lib/questions/types';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { ArrowLeft } from 'lucide-svelte';
	import { questionCategoriesCache } from '$lib/stores/questionCategories.svelte';
	import { questionTemplatesCache } from '$lib/stores/questionTemplates.svelte';

	let { data }: { data: PageData } = $props();

	let isSubmitting = $state(false);

	async function handleSave(
		template: Omit<QuestionTemplate, 'id' | 'created_at' | 'updated_at' | 'created_by'>
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
				goto('/dashboard/admin/questions').then(() => {});
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
			<QuestionTemplateForm
				template={data.template}
				onSave={handleSave}
				onCancel={handleCancel}
				{isSubmitting}
			/>
		</Card.Content>
	</Card.Root>
</div>
