<!--
	Question Template Creation Page
	================================

	Admin-only page for creating new question templates.

	FEATURES:
	- Main form orchestrator (QuestionTemplateForm component)
	- Live preview of generated instances
	- Validation before submission
	- Success/error handling with toasts

	DATA FLOW:
	----------
	1. User fills in form (type, statement, variables, answer, etc.)
	2. Form validates template structure
	3. On save, POST to /api/questions/templates
	4. On success, redirect to questions list
	5. On error, show validation errors
-->

<script lang="ts">
	import { goto } from '$app/navigation';
	import { toaster } from '$lib/stores/toaster.svelte';
	import type { QuestionTemplate } from '$lib/questions/types';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { ArrowLeft, Loader2 } from 'lucide-svelte';
	import { questionCategoriesCache } from '$lib/stores/questionCategories.svelte';
	import { questionTemplatesCache } from '$lib/stores/questionTemplates.svelte';
	import { onMount } from 'svelte';

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
		template: Omit<QuestionTemplate, 'id' | 'created_at' | 'updated_at' | 'created_by'>
	) {
		isSubmitting = true;

		try {
			const response = await fetch('/api/questions/templates', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(template)
			});

			const result = await response.json();

			if (result.success) {
				// Invalidate category cache to force refresh
				questionCategoriesCache.invalidate();
				questionTemplatesCache.invalidate();

				// Check if level was auto-adjusted
				if (result.levelAdjusted) {
					toaster.success(
						`Question créée avec succès. Le niveau a été ajusté à ${result.adjustedLevel} car le niveau ${template.level} existait déjà dans cette catégorie.`
					);
				} else {
					toaster.success('Question créée avec succès');
				}
				goto('/dashboard/admin/questions').then(() => {});
			} else {
				toaster.error('Erreur lors de la création');
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
	<title>Créer une Question - Admin</title>
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
				<h1 class="text-3xl font-bold">Nouvelle Question</h1>
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
					onSave={handleSave}
					onCancel={handleCancel}
					{isSubmitting}
				/>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
