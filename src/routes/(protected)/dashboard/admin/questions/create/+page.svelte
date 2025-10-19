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
	import QuestionTemplateForm from '$lib/components/QuestionTemplateForm.svelte';
	import type { QuestionTemplate } from '$lib/questions/types';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { ArrowLeft } from 'lucide-svelte';

	let isSubmitting = $state(false);

	async function handleSave(template: Omit<QuestionTemplate, 'id' | 'created_at' | 'updated_at' | 'created_by'>) {
		isSubmitting = true;

		try {
			const response = await fetch('/api/questions/templates', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(template)
			});

			const result = await response.json();

			if (result.success) {
				toaster.success('Question créée avec succès');
				goto('/dashboard/admin/questions');
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
		goto('/dashboard/admin/questions');
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
				<h1 class="text-3xl font-bold">Créer une Question</h1>
				<p class="text-muted-foreground">Créer un nouveau modèle de question avec variables et génération aléatoire</p>
			</div>
		</div>
	</div>

	<!-- Main Form -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Nouvelle Question</Card.Title>
			<Card.Description>
				Remplissez les champs ci-dessous pour créer une question. Utilisez la syntaxe spéciale pour les variables (<code>&#123;@:nom&#125;</code>),
				nombres aléatoires (<code>&#123;#:min-max&#125;</code>), et évaluations (<code>&#123;eval:expression&#125;</code>).
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<QuestionTemplateForm
				onSave={handleSave}
				onCancel={handleCancel}
				{isSubmitting}
			/>
		</Card.Content>
	</Card.Root>
</div>
