<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import MyCheckbox from '$lib/components/MyCheckbox.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { ArrowLeft, Save, Loader2, Globe, Lock } from 'lucide-svelte';
	import type { PageData, ActionData } from './$types';
	import TypstEditor from '$lib/components/worksheets/TypstEditor.svelte';
	import { COMMON_PLACEHOLDERS, STANDARD_TEMPLATE } from '$lib/worksheets/default-templates';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Form state
	let name = $state(data.template?.name || '');
	let description = $state(data.template?.description || '');
	let templateContent = $state(
		data.template?.template_content || STANDARD_TEMPLATE.template_content
	);
	let isPublic = $state(data.template?.is_public || false);

	// Loading state
	let submitting = $state(false);

	// Derived values
	let isNew = $derived(data.isNew);
	let canEdit = $derived(data.canEdit);
	let isValid = $derived(name.trim().length > 0 && templateContent.trim().length > 0);

	// Available placeholders
	let placeholders = $derived(data.template?.placeholders || COMMON_PLACEHOLDERS);

	/**
	 * Handle content change from editor
	 */
	function handleContentChange(content: string) {
		templateContent = content;
	}

	// Show toast on form result
	$effect(() => {
		if (form?.success) {
			toaster.success(form.message || 'Operation reussie');
		} else if (form?.message) {
			toaster.error(form.message);
		}
	});
</script>

<svelte:head>
	<title>{isNew ? 'Nouveau template' : data.template?.name || 'Template'} - UbuMaths</title>
</svelte:head>

<div class="container mx-auto max-w-5xl py-6">
	<!-- Header -->
	<div class="mb-6 flex items-center gap-4">
		<Button variant="ghost" size="icon" href="/dashboard/teacher/contenu/worksheets/templates">
			<ArrowLeft class="h-5 w-5" />
		</Button>
		<div class="flex-1">
			<h1 class="text-3xl font-bold">
				{isNew ? 'Nouveau template' : data.template?.name || 'Template'}
			</h1>
			<p class="text-muted-foreground">
				{#if isNew}
					Creez un nouveau template de mise en page Typst
				{:else if canEdit}
					Modifiez votre template de mise en page
				{:else}
					Apercu du template (lecture seule)
				{/if}
			</p>
		</div>
		{#if !isNew && !canEdit}
			<Button
				variant="outline"
				href="/dashboard/teacher/contenu/worksheets/templates?action=duplicate&id={data.template
					?.id}"
			>
				Dupliquer pour modifier
			</Button>
		{/if}
	</div>

	<!-- Form -->
	<form
		method="POST"
		action={isNew ? '?/create' : '?/update'}
		use:enhance={() => {
			submitting = true;
			return async ({ result, update }) => {
				await update();
				submitting = false;
				if (result.type === 'redirect') {
					// Let the redirect happen
				}
			};
		}}
		class="space-y-6"
	>
		<!-- Metadata card -->
		<Card.Root>
			<Card.Header>
				<Card.Title>Informations</Card.Title>
			</Card.Header>
			<Card.Content class="space-y-4">
				<!-- Name -->
				<div class="space-y-2">
					<Label for="name">Nom du template *</Label>
					<Input
						id="name"
						name="name"
						type="text"
						placeholder="Ex: Mon template personnalise"
						bind:value={name}
						disabled={!canEdit}
						required
					/>
				</div>

				<!-- Description -->
				<div class="space-y-2">
					<Label for="description">Description</Label>
					<Textarea
						id="description"
						name="description"
						placeholder="Description du template..."
						bind:value={description}
						disabled={!canEdit}
						rows={2}
					/>
				</div>

				<!-- Public toggle -->
				<div class="flex items-center gap-4">
					<MyCheckbox
						bind:checked={isPublic}
						label="Rendre ce template public"
						disabled={!canEdit}
					/>
					<input type="hidden" name="is_public" value={isPublic ? 'true' : 'false'} />
					{#if isPublic}
						<span class="flex items-center gap-1 text-sm text-muted-foreground">
							<Globe class="h-4 w-4" />
							Visible par tous les enseignants
						</span>
					{:else}
						<span class="flex items-center gap-1 text-sm text-muted-foreground">
							<Lock class="h-4 w-4" />
							Visible uniquement par vous
						</span>
					{/if}
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Template editor card -->
		<Card.Root>
			<Card.Header>
				<Card.Title>Contenu du template</Card.Title>
				<Card.Description>
					Utilisez la syntaxe Typst avec des placeholders au format {'{{placeholder}}'}
				</Card.Description>
			</Card.Header>
			<Card.Content>
				<input type="hidden" name="template_content" value={templateContent} />
				<TypstEditor
					bind:content={templateContent}
					{placeholders}
					readonly={!canEdit}
					onchange={handleContentChange}
				/>
			</Card.Content>
		</Card.Root>

		<!-- Actions -->
		{#if canEdit}
			<div class="flex justify-end gap-3">
				<Button
					variant="outline"
					href="/dashboard/teacher/contenu/worksheets/templates"
					disabled={submitting}
				>
					Annuler
				</Button>
				<Button type="submit" disabled={!isValid || submitting}>
					{#if submitting}
						<Loader2 class="mr-2 h-4 w-4 animate-spin" />
						{isNew ? 'Creation...' : 'Sauvegarde...'}
					{:else}
						<Save class="mr-2 h-4 w-4" />
						{isNew ? 'Creer le template' : 'Sauvegarder'}
					{/if}
				</Button>
			</div>
		{/if}
	</form>
</div>
