<script lang="ts">
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Select from '$lib/components/ui/select';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Label } from '$lib/components/ui/label';
	import { Badge } from '$lib/components/ui/badge';
	import FormRichTextEditor from '$lib/components/rich-text/FormRichTextEditor.svelte';
	import VariableAutocomplete from '$lib/components/templates/VariableAutocomplete.svelte';
	import TagsInput from '$lib/components/templates/TagsInput.svelte';
	import FiltersHelp from '$lib/components/templates/FiltersHelp.svelte';
	import {
		Loader2, Plus, Edit, Trash2, Copy, Star, StarOff, History,
		Eye, EyeOff, ChevronDown, ChevronUp, BarChart3, Search
	} from 'lucide-svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import type { MessageTemplate, TriggerType } from '$lib/types/messageTemplates';
	import { getVariablesForTrigger } from '$lib/templates/templateVariables';
	import { previewTemplate } from '$lib/templates/templateEngine';
	import { getSupabase } from '$lib/supabaseClient';
	import { goto } from '$app/navigation';

	// State
	let isLoading = $state(false);
	let isDialogOpen = $state(false);
	let isEditMode = $state(false);
	let editingTemplate = $state<MessageTemplate | null>(null);
	let templates = $state<MessageTemplate[]>([]);
	let favoriteTemplateIds = $state<Set<string>>(new Set());

	// Form state
	let formTitle = $state('');
	let formDescription = $state('');
	let formSubject = $state('');
	let formBody = $state('');
	let formTriggerType = $state<TriggerType>('general');
	let formScope = $state<'system' | 'class'>('system');
	let formIsActive = $state(true);
	let formTags = $state<string[]>([]);

	// Preview
	let showPreview = $state(false);
	let previewHtml = $state({ subject: '', body: '' });

	// Filters
	let filterScope = $state<string | null>(null);
	let filterTriggerType = $state<string | null>(null);
	let filterTags = $state<string[]>([]);
	let favoritesOnly = $state(false);
	let searchQuery = $state('');
	let expandedCards = $state<Set<string>>(new Set());

	const triggerTypeOptions = [
		{ value: 'general', label: 'Message général' },
		{ value: 'assessment_question', label: 'Question sur évaluation' },
		{ value: 'srs_help', label: 'Aide SRS' },
		{ value: 'system_notification', label: 'Notification système' },
		{ value: 'enigma_answer', label: 'Réponse énigme (futur)' }
	];

	const scopeOptions = [
		{ value: 'system', label: 'Système' },
		{ value: 'class', label: 'Classe' }
	];

	const tagSuggestions = [
		'urgent', 'rappel', 'info', 'important', 'optionnel',
		'évaluation', 'devoir', 'révision', 'aide', 'notification'
	];

	// Computed
	let availableVariables = $derived(getVariablesForTrigger(formTriggerType));

	let filteredTemplates = $derived(() => {
		let result = templates;

		if (filterScope) {
			result = result.filter((t) => t.scope === filterScope);
		}

		if (filterTriggerType) {
			result = result.filter((t) => t.trigger_type === filterTriggerType);
		}

		if (filterTags.length > 0) {
			result = result.filter((t) =>
				t.tags && filterTags.every(tag => (t.tags as string[]).includes(tag))
			);
		}

		if (favoritesOnly) {
			result = result.filter((t) => favoriteTemplateIds.has(t.id));
		}

		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase();
			result = result.filter(
				(t) =>
					t.title.toLowerCase().includes(query) ||
					t.description?.toLowerCase().includes(query) ||
					t.subject_template.toLowerCase().includes(query) ||
					t.body_template.toLowerCase().includes(query)
			);
		}

		return result;
	});

	// Load templates on mount
	onMount(() => {
		loadTemplates();
		loadFavorites();
	});

	async function loadTemplates() {
		isLoading = true;
		const supabase = getSupabase();

		const { data, error } = await supabase
			.from('message_templates')
			.select(`
				*,
				classes:class_id (name)
			`)
			.order('created_at', { ascending: false });

		if (error) {
			console.error('Error loading templates:', error);
			toaster.error('Erreur lors du chargement');
		} else {
			templates = (data || []).map((t: any) => ({
				...t,
				class_name: t.classes?.name || null
			}));
		}

		isLoading = false;
	}

	async function loadFavorites() {
		const supabase = getSupabase();
		const { data } = await supabase
			.from('user_favorite_templates')
			.select('template_id');

		if (data) {
			favoriteTemplateIds = new Set(data.map(f => f.template_id));
		}
	}

	function openCreateDialog() {
		resetForm();
		isEditMode = false;
		editingTemplate = null;
		isDialogOpen = true;
	}

	function openEditDialog(template: MessageTemplate) {
		resetForm();
		isEditMode = true;
		editingTemplate = template;

		formTitle = template.title;
		formDescription = template.description || '';
		formSubject = template.subject_template;
		formBody = template.body_template;
		formTriggerType = template.trigger_type as TriggerType;
		formScope = template.scope as 'system' | 'class';
		formIsActive = template.is_active;
		formTags = Array.isArray(template.tags) ? template.tags : [];

		isDialogOpen = true;
	}

	function resetForm() {
		formTitle = '';
		formDescription = '';
		formSubject = '';
		formBody = '';
		formTriggerType = 'general';
		formScope = 'system';
		formIsActive = true;
		formTags = [];
		showPreview = false;
	}

	function handleVariableInsert(event: CustomEvent<{ text: string }>) {
		formBody += event.detail.text;
		updatePreview();
	}

	function updatePreview() {
		if (!showPreview) return;

		const variables = getVariablesForTrigger(formTriggerType);
		const exampleData: Record<string, string> = {};
		variables.forEach(v => {
			exampleData[v.name] = v.example;
		});

		const preview = previewTemplate(
			{
				id: '',
				title: formTitle,
				subject_template: formSubject,
				body_template: formBody,
				trigger_type: formTriggerType,
				variables: [],
				tags: formTags,
				scope: formScope,
				created_by: '',
				class_id: null,
				is_active: formIsActive,
				trigger_config: {},
				description: formDescription,
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
				approval_status: 'approved',
				reviewed_by: null,
				reviewed_at: null,
				review_notes: null
			},
			exampleData
		);

		previewHtml = preview;
	}

	// Auto-update preview
	$effect(() => {
		if (showPreview && (formSubject || formBody)) {
			const timer = setTimeout(() => {
				updatePreview();
			}, 300);
			return () => clearTimeout(timer);
		}
	});

	async function handleSubmit() {
		if (!formTitle.trim() || !formSubject.trim() || !formBody.trim()) {
			toaster.error('Tous les champs obligatoires doivent être remplis');
			return;
		}

		isLoading = true;
		const supabase = getSupabase();

		const templateData = {
			title: formTitle.trim(),
			description: formDescription.trim() || null,
			subject_template: formSubject.trim(),
			body_template: formBody,
			trigger_type: formTriggerType,
			scope: formScope,
			is_active: formIsActive,
			variables: availableVariables,
			tags: formTags
		};

		try {
			if (isEditMode && editingTemplate) {
				const { error } = await supabase
					.from('message_templates')
					.update(templateData)
					.eq('id', editingTemplate.id);

				if (error) throw error;
				toaster.success('Template mis à jour');
			} else {
				const { error } = await supabase
					.from('message_templates')
					.insert({
						...templateData,
						created_by: (await supabase.auth.getUser()).data.user!.id
					});

				if (error) throw error;
				toaster.success('Template créé');
			}

			isDialogOpen = false;
			await loadTemplates();
		} catch (error) {
			console.error('Error saving template:', error);
			toaster.error('Erreur lors de la sauvegarde');
		} finally {
			isLoading = false;
		}
	}

	async function handleDelete(template: MessageTemplate) {
		if (!confirm(`Supprimer "${template.title}" ?`)) return;

		isLoading = true;
		const supabase = getSupabase();

		const { error } = await supabase
			.from('message_templates')
			.delete()
			.eq('id', template.id);

		isLoading = false;

		if (error) {
			console.error('Error deleting:', error);
			toaster.error('Erreur lors de la suppression');
		} else {
			toaster.success('Template supprimé');
			await loadTemplates();
		}
	}

	async function handleDuplicate(template: MessageTemplate) {
		isLoading = true;

		try {
			const response = await fetch(`/api/messages/templates/${template.id}/duplicate`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					new_title: `${template.title} (copie)`
				})
			});

			if (!response.ok) throw new Error('Duplication failed');

			toaster.success('Template dupliqué');
			await loadTemplates();
		} catch (error) {
			console.error('Error duplicating:', error);
			toaster.error('Erreur lors de la duplication');
		} finally {
			isLoading = false;
		}
	}

	async function toggleFavorite(templateId: string) {
		const isFavorite = favoriteTemplateIds.has(templateId);

		try {
			if (isFavorite) {
				const response = await fetch(`/api/messages/templates/favorites?template_id=${templateId}`, {
					method: 'DELETE'
				});
				if (!response.ok) throw new Error();

				const newFavorites = new Set(favoriteTemplateIds);
				newFavorites.delete(templateId);
				favoriteTemplateIds = newFavorites;
			} else {
				const response = await fetch('/api/messages/templates/favorites', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ template_id: templateId })
				});
				if (!response.ok) throw new Error();

				favoriteTemplateIds = new Set([...favoriteTemplateIds, templateId]);
			}
		} catch (error) {
			console.error('Error toggling favorite:', error);
			toaster.error('Erreur');
		}
	}

	function toggleCardExpansion(templateId: string) {
		const newExpanded = new Set(expandedCards);
		if (newExpanded.has(templateId)) {
			newExpanded.delete(templateId);
		} else {
			newExpanded.add(templateId);
		}
		expandedCards = newExpanded;
	}

	function getTriggerTypeLabel(type: string): string {
		return triggerTypeOptions.find((o) => o.value === type)?.label || type;
	}
</script>

<div class="container mx-auto p-6">
	<!-- Header -->
	<div class="mb-6 flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold">Templates de Messages</h1>
			<p class="text-muted-foreground">
				Gérez les templates système et de classe
			</p>
		</div>
		<div class="flex gap-2">
			<Button variant="outline" onclick={() => goto('/dashboard/admin/message-templates/stats')}>
				<BarChart3 class="mr-2 h-4 w-4" />
				Statistiques
			</Button>
			<Button onclick={openCreateDialog}>
				<Plus class="mr-2 h-4 w-4" />
				Nouveau template
			</Button>
		</div>
	</div>

	<!-- Filters -->
	<div class="mb-6 space-y-4">
		<!-- Search bar -->
		<div class="relative">
			<Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
			<Input
				type="text"
				placeholder="Rechercher dans les templates..."
				bind:value={searchQuery}
				class="pl-10"
			/>
		</div>

		<!-- Filter row -->
		<div class="flex flex-wrap gap-3">
			<Select.Root
				onSelectedChange={(v) => {
					filterScope = v?.value || null;
				}}
			>
				<Select.Trigger class="w-48">
					<Select.Value placeholder="Tous les scopes" />
				</Select.Trigger>
				<Select.Content>
					<Select.Item value={null}>Tous les scopes</Select.Item>
					{#each scopeOptions as option}
						<Select.Item value={option.value}>{option.label}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>

			<Select.Root
				onSelectedChange={(v) => {
					filterTriggerType = v?.value || null;
				}}
			>
				<Select.Trigger class="w-64">
					<Select.Value placeholder="Tous les types" />
				</Select.Trigger>
				<Select.Content>
					<Select.Item value={null}>Tous les types</Select.Item>
					{#each triggerTypeOptions as option}
						<Select.Item value={option.value}>{option.label}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>

			<Button
				variant={favoritesOnly ? 'default' : 'outline'}
				onclick={() => (favoritesOnly = !favoritesOnly)}
			>
				<Star class="mr-2 h-4 w-4" class:fill-current={favoritesOnly} />
				Favoris uniquement
			</Button>

			{#if filterScope || filterTriggerType || favoritesOnly || searchQuery || filterTags.length > 0}
				<Button
					variant="ghost"
					onclick={() => {
						filterScope = null;
						filterTriggerType = null;
						favoritesOnly = false;
						searchQuery = '';
						filterTags = [];
					}}
				>
					Réinitialiser filtres
				</Button>
			{/if}
		</div>

		<!-- Tags filter (if there are templates with tags) -->
		{#if templates.some(t => t.tags && (t.tags as string[]).length > 0)}
			<div class="flex flex-wrap gap-2">
				{@const allTags = Array.from(new Set(templates.flatMap(t => (t.tags as string[]) || [])))}
				{#each allTags as tag}
					<Badge
						variant={filterTags.includes(tag) ? 'default' : 'outline'}
						class="cursor-pointer"
						onclick={() => {
							if (filterTags.includes(tag)) {
								filterTags = filterTags.filter(t => t !== tag);
							} else {
								filterTags = [...filterTags, tag];
							}
						}}
					>
						{tag}
					</Badge>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Templates List -->
	{#if isLoading}
		<div class="flex items-center justify-center py-12">
			<Loader2 class="h-8 w-8 animate-spin text-muted-foreground" />
		</div>
	{:else if filteredTemplates().length === 0}
		<div class="rounded-lg border border-border bg-card p-12 text-center">
			<p class="text-muted-foreground">
				{searchQuery || filterScope || filterTriggerType || favoritesOnly
					? 'Aucun template ne correspond aux filtres'
					: 'Aucun template créé'}
			</p>
		</div>
	{:else}
		<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
			{#each filteredTemplates() as template (template.id)}
				{@const isExpanded = expandedCards.has(template.id)}
				{@const isFavorite = favoriteTemplateIds.has(template.id)}
				<div class="rounded-lg border border-border bg-card p-4 transition-shadow hover:shadow-md">
					<!-- Header -->
					<div class="mb-3 flex items-start justify-between">
						<div class="flex-1">
							<div class="flex items-center gap-2">
								<h3 class="font-semibold">{template.title}</h3>
								<button
									onclick={() => toggleFavorite(template.id)}
									class="text-yellow-500 transition-colors hover:text-yellow-600"
								>
									{#if isFavorite}
										<Star class="h-4 w-4 fill-current" />
									{:else}
										<StarOff class="h-4 w-4" />
									{/if}
								</button>
							</div>
							{#if template.description}
								<p class="mt-1 text-sm text-muted-foreground">{template.description}</p>
							{/if}
						</div>
						<div class="flex flex-col gap-1">
							{#if !template.is_active}
								<Badge variant="secondary" class="text-xs">Inactif</Badge>
							{/if}
							{#if template.approval_status === 'pending'}
								<Badge variant="outline" class="text-xs">En attente</Badge>
							{:else if template.approval_status === 'rejected'}
								<Badge variant="destructive" class="text-xs">Rejeté</Badge>
							{/if}
						</div>
					</div>

					<!-- Info -->
					<div class="mb-3 space-y-1 text-sm">
						<div class="flex items-center gap-2">
							<span class="text-muted-foreground">Type:</span>
							<Badge variant="outline" class="text-xs">{getTriggerTypeLabel(template.trigger_type)}</Badge>
						</div>
						<div class="flex items-center gap-2">
							<span class="text-muted-foreground">Scope:</span>
							<Badge variant={template.scope === 'system' ? 'default' : 'secondary'} class="text-xs">
								{template.scope === 'system' ? 'Système' : 'Classe'}
							</Badge>
						</div>
						{#if template.tags && (template.tags as string[]).length > 0}
							<div class="flex flex-wrap gap-1">
								{#each (template.tags as string[]) as tag}
									<Badge variant="outline" class="text-xs">{tag}</Badge>
								{/each}
							</div>
						{/if}
					</div>

					<!-- Preview toggle -->
					<button
						class="mb-2 flex w-full items-center justify-between rounded p-2 text-sm transition-colors hover:bg-muted"
						onclick={() => toggleCardExpansion(template.id)}
					>
						<span class="font-medium">Aperçu</span>
						{#if isExpanded}
							<ChevronUp class="h-4 w-4" />
						{:else}
							<ChevronDown class="h-4 w-4" />
						{/if}
					</button>

					{#if isExpanded}
						<div class="mb-3 rounded border border-border bg-muted/50 p-3 text-xs">
							<div class="mb-1 font-mono font-semibold">Sujet:</div>
							<div class="mb-2 font-mono">{template.subject_template}</div>
							<div class="mb-1 font-mono font-semibold">Corps (extrait):</div>
							<div class="line-clamp-3 font-mono text-muted-foreground">
								{template.body_template.replace(/<[^>]*>/g, '').substring(0, 150)}...
							</div>
						</div>
					{/if}

					<!-- Actions -->
					<div class="flex flex-wrap gap-2">
						<Button variant="outline" size="sm" onclick={() => openEditDialog(template)}>
							<Edit class="h-3 w-3" />
						</Button>
						<Button variant="outline" size="sm" onclick={() => handleDuplicate(template)}>
							<Copy class="h-3 w-3" />
						</Button>
						<Button
							variant="outline"
							size="sm"
							onclick={() => goto(`/dashboard/admin/message-templates/${template.id}/versions`)}
						>
							<History class="h-3 w-3" />
						</Button>
						<Button variant="outline" size="sm" onclick={() => handleDelete(template)}>
							<Trash2 class="h-3 w-3" />
						</Button>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- Create/Edit Dialog -->
<Dialog.Root bind:open={isDialogOpen}>
	<Dialog.Content class="max-h-[90vh] max-w-6xl overflow-y-auto">
		<Dialog.Header>
			<Dialog.Title>
				{isEditMode ? 'Modifier le template' : 'Nouveau template'}
			</Dialog.Title>
		</Dialog.Header>

		<Tabs.Root value="edit" class="w-full">
			<Tabs.List class="grid w-full grid-cols-2">
				<Tabs.Trigger value="edit">Édition</Tabs.Trigger>
				<Tabs.Trigger value="preview" onclick={updatePreview}>Aperçu</Tabs.Trigger>
			</Tabs.List>

			<Tabs.Content value="edit" class="space-y-4">
				<form
					onsubmit={(e) => {
						e.preventDefault();
						handleSubmit();
					}}
					class="space-y-4"
				>
					<!-- Title & Description -->
					<div class="grid gap-4 md:grid-cols-2">
						<div class="space-y-2">
							<Label for="title">Titre *</Label>
							<Input id="title" bind:value={formTitle} maxlength={100} required />
						</div>
						<div class="space-y-2">
							<Label for="description">Description</Label>
							<Input id="description" bind:value={formDescription} />
						</div>
					</div>

					<!-- Trigger Type & Scope -->
					<div class="grid gap-4 md:grid-cols-2">
						<div class="space-y-2">
							<Label>Type de déclencheur *</Label>
							<Select.Root
								onSelectedChange={(v) => {
									if (v) formTriggerType = v.value as TriggerType;
								}}
							>
								<Select.Trigger>
									<Select.Value placeholder="Sélectionnez" />
								</Select.Trigger>
								<Select.Content>
									{#each triggerTypeOptions as option}
										<Select.Item value={option.value}>{option.label}</Select.Item>
									{/each}
								</Select.Content>
							</Select.Root>
						</div>

						<div class="space-y-2">
							<Label>Portée *</Label>
							<Select.Root
								onSelectedChange={(v) => {
									if (v) formScope = v.value as 'system' | 'class';
								}}
							>
								<Select.Trigger>
									<Select.Value placeholder="Sélectionnez" />
								</Select.Trigger>
								<Select.Content>
									{#each scopeOptions as option}
										<Select.Item value={option.value}>{option.label}</Select.Item>
									{/each}
								</Select.Content>
							</Select.Root>
						</div>
					</div>

					<!-- Tags -->
					<div class="space-y-2">
						<Label>Tags</Label>
						<TagsInput bind:tags={formTags} suggestions={tagSuggestions} />
					</div>

					<!-- Subject -->
					<div class="space-y-2">
						<Label for="subject">Sujet *</Label>
						<Input id="subject" bind:value={formSubject} maxlength={200} required />
					</div>

					<!-- Body with tools -->
					<div class="space-y-2">
						<div class="flex items-center justify-between">
							<Label>Corps du message *</Label>
							<div class="flex gap-2">
								<VariableAutocomplete
									{formTriggerType}
									on:insert={handleVariableInsert}
								/>
								<FiltersHelp />
							</div>
						</div>
						<FormRichTextEditor bind:value={formBody} placeholder="Écrivez le template..." />
					</div>

					<!-- Active checkbox -->
					<div class="flex items-center gap-2">
						<input type="checkbox" id="is-active" bind:checked={formIsActive} />
						<Label for="is-active">Template actif</Label>
					</div>

					<!-- Actions -->
					<div class="flex justify-end gap-3">
						<Button type="button" variant="outline" onclick={() => (isDialogOpen = false)}>
							Annuler
						</Button>
						<Button type="submit" disabled={isLoading}>
							{#if isLoading}
								<Loader2 class="mr-2 h-4 w-4 animate-spin" />
							{/if}
							{isEditMode ? 'Mettre à jour' : 'Créer'}
						</Button>
					</div>
				</form>
			</Tabs.Content>

			<Tabs.Content value="preview" class="space-y-4">
				<div class="rounded-lg border border-border bg-card p-6">
					<div class="mb-4">
						<div class="text-sm font-medium text-muted-foreground">Sujet:</div>
						<div class="text-lg font-semibold">{previewHtml.subject || formSubject}</div>
					</div>
					<div>
						<div class="text-sm font-medium text-muted-foreground mb-2">Corps:</div>
						<div class="prose prose-sm dark:prose-invert max-w-none">
							{@html previewHtml.body || formBody}
						</div>
					</div>
					{#if previewHtml.missingVariables && previewHtml.missingVariables.length > 0}
						<div class="mt-4 rounded bg-yellow-50 p-3 dark:bg-yellow-900/20">
							<div class="text-sm font-medium text-yellow-800 dark:text-yellow-200">
								Variables non renseignées:
							</div>
							<div class="text-sm text-yellow-700 dark:text-yellow-300">
								{previewHtml.missingVariables.join(', ')}
							</div>
						</div>
					{/if}
				</div>
			</Tabs.Content>
		</Tabs.Root>
	</Dialog.Content>
</Dialog.Root>
