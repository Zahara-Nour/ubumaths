<script lang="ts">
	import { onMount } from 'svelte';
	import { getSupabase } from '$lib/supabaseClient';
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
		Loader2,
		Plus,
		Edit,
		Trash2,
		Info,
		Search,
		Star,
		StarOff,
		Copy,
		History,
		ChevronDown,
		ChevronUp,
		Eye
	} from 'lucide-svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import type { MessageTemplate, MessageTemplateInput, TriggerType } from '$lib/types/messageTemplates';
	import { getVariablesForTrigger } from '$lib/templates/templateVariables';
	import { renderTemplate } from '$lib/templates/templateEngine';
	import { cn } from '$lib/utils';

	// State
	let isLoading = $state(false);
	let isDialogOpen = $state(false);
	let isVersionDialogOpen = $state(false);
	let isEditMode = $state(false);
	let editingTemplate = $state<MessageTemplate | null>(null);
	let classes = $state<Array<{ id: string; name: string }>>([]);
	let templates = $state<Array<MessageTemplate & { class_name?: string }>>([]);
	let favoriteTemplateIds = $state<Set<string>>(new Set());
	let expandedCards = $state<Set<string>>(new Set());
	let currentUserId = $state<string | null>(null);

	// Form state
	let formTitle = $state('');
	let formDescription = $state('');
	let formSubject = $state('');
	let formBody = $state('');
	let formTriggerType = $state<TriggerType>('general');
	let formClassId = $state<string | null>(null);
	let formIsActive = $state(true);
	let formTags = $state<string[]>([]);

	// Filters
	let filterTriggerType = $state<string | null>(null);
	let filterScope = $state<string | null>(null);
	let searchQuery = $state('');
	let filterFavoritesOnly = $state(false);
	let filterSelectedTags = $state<string[]>([]);

	// Preview state
	let activeTab = $state<'edit' | 'preview'>('edit');
	let previewSubject = $state('');
	let previewBody = $state('');
	let previewTimeout = $state<number | null>(null);

	// Version history
	let templateVersions = $state<Array<any>>([]);
	let loadingVersions = $state(false);
	let selectedVersionTemplate = $state<MessageTemplate | null>(null);

	const triggerTypeOptions = [
		{ value: 'general', label: 'Message général' },
		{ value: 'assessment_question', label: 'Question sur évaluation' },
		{ value: 'srs_help', label: 'Aide SRS' },
		{ value: 'system_notification', label: 'Notification système' },
		{ value: 'enigma_answer', label: 'Réponse énigme (futur)' }
	];

	const scopeOptions = [
		{ value: 'system', label: 'Système' },
		{ value: 'class', label: 'Mes classes' }
	];

	// Computed
	let allTags = $derived(() => {
		const tagSet = new Set<string>();
		templates.forEach((t) => {
			if (t.tags && Array.isArray(t.tags)) {
				t.tags.forEach((tag: string) => tagSet.add(tag));
			}
		});
		return Array.from(tagSet).sort();
	});

	let filteredTemplates = $derived(() => {
		let result = templates;

		// Filter by scope
		if (filterScope) {
			result = result.filter((t) => t.scope === filterScope);
		}

		// Filter by trigger type
		if (filterTriggerType) {
			result = result.filter((t) => t.trigger_type === filterTriggerType);
		}

		// Filter by tags
		if (filterSelectedTags.length > 0) {
			result = result.filter((t) =>
				filterSelectedTags.some((tag) => t.tags && t.tags.includes(tag))
			);
		}

		// Filter by favorites
		if (filterFavoritesOnly) {
			result = result.filter((t) => favoriteTemplateIds.has(t.id));
		}

		// Search query
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

	let availableVariables = $derived(getVariablesForTrigger(formTriggerType));

	let canEditTemplate = $derived((template: MessageTemplate) => {
		return template.scope === 'class' && template.created_by === currentUserId;
	});

	// Load data on mount
	onMount(() => {
		loadCurrentUser();
		loadTemplates();
		loadFavorites();
		loadClasses();
	});

	async function loadCurrentUser() {
		const supabase = getSupabase();
		const {
			data: { user }
		} = await supabase.auth.getUser();
		if (user) {
			currentUserId = user.id;
		}
	}

	async function loadTemplates() {
		isLoading = true;
		try {
			const supabase = getSupabase();
			const { data, error } = await supabase
				.from('message_templates')
				.select(
					`
					*,
					classes:class_id (name)
				`
				)
				.order('created_at', { ascending: false });

			if (error) {
				console.error('Error loading templates:', error);
				toaster.error('Erreur lors du chargement des templates');
			} else {
				templates = (data || []).map((t: any) => ({
					...t,
					class_name: t.classes?.name
				}));
			}
		} finally {
			isLoading = false;
		}
	}

	async function loadFavorites() {
		try {
			const supabase = getSupabase();
			const { data, error } = await supabase
				.from('user_favorite_templates')
				.select('template_id');

			if (!error && data) {
				favoriteTemplateIds = new Set(data.map((f: any) => f.template_id));
			}
		} catch (error) {
			console.error('Error loading favorites:', error);
		}
	}

	async function loadClasses() {
		const supabase = getSupabase();
		const {
			data: { user }
		} = await supabase.auth.getUser();

		if (!user) return;

		const { data } = await supabase
			.from('classes')
			.select('id, name')
			.eq('teacher_id', user.id)
			.order('name');

		if (data) {
			classes = data;
			if (data.length > 0 && !formClassId) {
				formClassId = data[0].id;
			}
		}
	}

	function openCreateDialog() {
		resetForm();
		isEditMode = false;
		editingTemplate = null;
		activeTab = 'edit';
		isDialogOpen = true;
	}

	function openEditDialog(template: MessageTemplate) {
		if (!canEditTemplate(template)) {
			toaster.info('Vous ne pouvez modifier que vos propres templates');
			return;
		}

		resetForm();
		isEditMode = true;
		editingTemplate = template;

		formTitle = template.title;
		formDescription = template.description || '';
		formSubject = template.subject_template;
		formBody = template.body_template;
		formTriggerType = template.trigger_type as TriggerType;
		formClassId = template.class_id;
		formIsActive = template.is_active;
		formTags = template.tags || [];

		activeTab = 'edit';
		updatePreview();
		isDialogOpen = true;
	}

	function resetForm() {
		formTitle = '';
		formDescription = '';
		formSubject = '';
		formBody = '';
		formTriggerType = 'general';
		formClassId = classes[0]?.id || null;
		formIsActive = true;
		formTags = [];
		previewSubject = '';
		previewBody = '';
	}

	function updatePreview() {
		if (previewTimeout) {
			clearTimeout(previewTimeout);
		}

		previewTimeout = setTimeout(() => {
			try {
				const mockData: Record<string, string> = {};
				availableVariables.forEach((v) => {
					mockData[v.name] = v.example;
				});

				const tempTemplate: MessageTemplate = {
					id: 'preview',
					title: formTitle,
					subject_template: formSubject,
					body_template: formBody,
					trigger_type: formTriggerType,
					scope: 'class',
					is_active: true,
					variables: availableVariables,
					created_at: new Date().toISOString(),
					updated_at: new Date().toISOString()
				};

				const rendered = renderTemplate(tempTemplate, mockData);
				previewSubject = rendered.subject;
				previewBody = rendered.body;
			} catch (error) {
				console.error('Preview error:', error);
				previewSubject = 'Erreur de prévisualisation';
				previewBody = 'Impossible de générer la prévisualisation';
			}
		}, 500) as unknown as number;
	}

	$effect(() => {
		if (isDialogOpen && activeTab === 'preview') {
			updatePreview();
		}
	});

	$effect(() => {
		// Watch form changes when in preview mode
		if (activeTab === 'preview') {
			formSubject;
			formBody;
			formTriggerType;
			updatePreview();
		}
	});

	function handleVariableInsert(event: CustomEvent<{ text: string; type: 'variable' | 'filter' }>) {
		formBody += event.detail.text;
		updatePreview();
	}

	async function handleSubmit() {
		if (!formTitle.trim() || !formSubject.trim() || !formBody.trim()) {
			toaster.error('Tous les champs obligatoires doivent être remplis');
			return;
		}

		if (!formClassId) {
			toaster.error('Veuillez sélectionner une classe');
			return;
		}

		isLoading = true;

		try {
			const supabase = getSupabase();

			const templateData: any = {
				title: formTitle.trim(),
				description: formDescription.trim() || null,
				subject_template: formSubject.trim(),
				body_template: formBody,
				trigger_type: formTriggerType,
				scope: 'class',
				class_id: formClassId,
				is_active: formIsActive,
				variables: availableVariables,
				tags: formTags
			};

			if (isEditMode && editingTemplate) {
				const { error } = await supabase
					.from('message_templates')
					.update(templateData)
					.eq('id', editingTemplate.id);

				if (error) {
					console.error('Error updating template:', error);
					toaster.error('Erreur lors de la mise à jour');
				} else {
					toaster.success('Template mis à jour avec succès');
					isDialogOpen = false;
					await loadTemplates();
				}
			} else {
				const { error } = await supabase.from('message_templates').insert([templateData]);

				if (error) {
					console.error('Error creating template:', error);
					toaster.error('Erreur lors de la création');
				} else {
					toaster.success('Template créé avec succès');
					isDialogOpen = false;
					await loadTemplates();
				}
			}
		} catch (error) {
			console.error('Error saving template:', error);
			toaster.error('Une erreur est survenue');
		} finally {
			isLoading = false;
		}
	}

	async function handleDelete(template: MessageTemplate) {
		if (!canEditTemplate(template)) {
			toaster.error('Vous ne pouvez supprimer que vos propres templates');
			return;
		}

		if (!confirm(`Êtes-vous sûr de vouloir supprimer le template "${template.title}" ?`)) {
			return;
		}

		isLoading = true;
		try {
			const supabase = getSupabase();
			const { error } = await supabase.from('message_templates').delete().eq('id', template.id);

			if (error) {
				console.error('Error deleting template:', error);
				toaster.error('Erreur lors de la suppression');
			} else {
				toaster.success('Template supprimé avec succès');
				await loadTemplates();
			}
		} finally {
			isLoading = false;
		}
	}

	async function toggleFavorite(templateId: string) {
		const isFavorite = favoriteTemplateIds.has(templateId);

		try {
			if (isFavorite) {
				const response = await fetch(
					`/api/messages/templates/favorites?template_id=${templateId}`,
					{
						method: 'DELETE'
					}
				);

				if (response.ok) {
					favoriteTemplateIds.delete(templateId);
					favoriteTemplateIds = new Set(favoriteTemplateIds);
					toaster.success('Retiré des favoris');
				}
			} else {
				const response = await fetch('/api/messages/templates/favorites', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ template_id: templateId })
				});

				if (response.ok) {
					favoriteTemplateIds.add(templateId);
					favoriteTemplateIds = new Set(favoriteTemplateIds);
					toaster.success('Ajouté aux favoris');
				}
			}
		} catch (error) {
			console.error('Error toggling favorite:', error);
			toaster.error('Erreur lors de la mise à jour des favoris');
		}
	}

	async function duplicateTemplate(template: MessageTemplate) {
		const newTitle = prompt('Titre du nouveau template:', `${template.title} (copie)`);
		if (!newTitle) return;

		if (!formClassId && classes.length === 0) {
			toaster.error('Vous devez avoir au moins une classe pour dupliquer un template');
			return;
		}

		isLoading = true;
		try {
			const response = await fetch(`/api/messages/templates/${template.id}/duplicate`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					new_title: newTitle,
					class_id: formClassId || classes[0]?.id
				})
			});

			if (response.ok) {
				toaster.success('Template dupliqué avec succès');
				await loadTemplates();
			} else {
				toaster.error('Erreur lors de la duplication');
			}
		} catch (error) {
			console.error('Error duplicating template:', error);
			toaster.error('Une erreur est survenue');
		} finally {
			isLoading = false;
		}
	}

	async function loadVersionHistory(template: MessageTemplate) {
		if (!canEditTemplate(template)) {
			toaster.info('Historique disponible uniquement pour vos propres templates');
			return;
		}

		selectedVersionTemplate = template;
		loadingVersions = true;
		isVersionDialogOpen = true;

		try {
			const response = await fetch(`/api/messages/templates/${template.id}/versions`);
			if (response.ok) {
				const data = await response.json();
				templateVersions = data.versions || [];
			} else {
				toaster.error('Erreur lors du chargement de l\'historique');
			}
		} catch (error) {
			console.error('Error loading versions:', error);
			toaster.error('Une erreur est survenue');
		} finally {
			loadingVersions = false;
		}
	}

	async function restoreVersion(versionId: string) {
		if (!selectedVersionTemplate) return;

		if (!confirm('Restaurer cette version ? Les modifications actuelles seront perdues.')) {
			return;
		}

		try {
			const response = await fetch(
				`/api/messages/templates/${selectedVersionTemplate.id}/versions`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ version_id: versionId })
				}
			);

			if (response.ok) {
				toaster.success('Version restaurée avec succès');
				isVersionDialogOpen = false;
				await loadTemplates();
			} else {
				toaster.error('Erreur lors de la restauration');
			}
		} catch (error) {
			console.error('Error restoring version:', error);
			toaster.error('Une erreur est survenue');
		}
	}

	function toggleCardExpanded(templateId: string) {
		if (expandedCards.has(templateId)) {
			expandedCards.delete(templateId);
		} else {
			expandedCards.add(templateId);
		}
		expandedCards = new Set(expandedCards);
	}

	function toggleTagFilter(tag: string) {
		if (filterSelectedTags.includes(tag)) {
			filterSelectedTags = filterSelectedTags.filter((t) => t !== tag);
		} else {
			filterSelectedTags = [...filterSelectedTags, tag];
		}
	}

	function getTriggerTypeLabel(type: string): string {
		return triggerTypeOptions.find((o) => o.value === type)?.label || type;
	}

	function getApprovalStatusBadge(status: string | null) {
		if (!status || status === 'approved') return null;
		if (status === 'pending')
			return {
				text: 'En attente',
				class: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
			};
		if (status === 'rejected')
			return {
				text: 'Rejeté',
				class: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
			};
		return null;
	}
</script>

<div class="container mx-auto p-6">
	<div class="mb-6 flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold">Mes Templates de Messages</h1>
			<p class="text-muted-foreground">
				Créez des templates personnalisés pour vos classes et utilisez les templates système
			</p>
		</div>
		<Button onclick={openCreateDialog} disabled={classes.length === 0}>
			<Plus class="mr-2 h-4 w-4" />
			Nouveau template
		</Button>
	</div>

	{#if classes.length === 0}
		<div class="rounded-lg border border-border bg-card p-12 text-center">
			<Info class="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
			<p class="text-lg font-medium">Aucune classe disponible</p>
			<p class="text-muted-foreground">
				Vous devez avoir au moins une classe pour créer des templates
			</p>
		</div>
	{:else}
		<!-- Filters -->
		<div class="mb-6 space-y-4">
			<div class="flex flex-wrap gap-4">
				<!-- Search -->
				<div class="relative w-64">
					<Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<Input type="text" placeholder="Rechercher..." bind:value={searchQuery} class="pl-9" />
				</div>

				<!-- Scope Filter -->
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

				<!-- Trigger Type Filter -->
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

				<!-- Favorites Filter -->
				<Button
					variant={filterFavoritesOnly ? 'default' : 'outline'}
					onclick={() => (filterFavoritesOnly = !filterFavoritesOnly)}
				>
					<Star class={cn("mr-2 h-4 w-4", filterFavoritesOnly && "fill-current")} />
					Favoris uniquement
				</Button>
			</div>

			<!-- Tag filters -->
			{#if allTags().length > 0}
				<div class="flex flex-wrap gap-2">
					<span class="text-sm text-muted-foreground">Tags:</span>
					{#each allTags() as tag}
						<Badge
							variant={filterSelectedTags.includes(tag) ? 'default' : 'outline'}
							class="cursor-pointer"
							onclick={() => toggleTagFilter(tag)}
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
					{searchQuery || filterTriggerType || filterScope || filterFavoritesOnly
						? 'Aucun template ne correspond aux filtres'
						: 'Aucun template disponible'}
				</p>
			</div>
		{:else}
			<div class="space-y-2">
				{#each filteredTemplates() as template (template.id)}
					{@const isExpanded = expandedCards.has(template.id)}
					{@const isFavorite = favoriteTemplateIds.has(template.id)}
					{@const isOwnTemplate = canEditTemplate(template)}
					{@const approvalBadge = getApprovalStatusBadge(template.approval_status)}
					<div class="rounded-lg border border-border bg-card p-4 transition-shadow hover:shadow-md">
						<div class="flex items-start justify-between">
							<div class="flex-1">
								<div class="mb-2 flex items-center gap-2">
									<!-- Favorite -->
									<button
										type="button"
										onclick={() => toggleFavorite(template.id)}
										class="transition-colors hover:text-yellow-500"
									>
										{#if isFavorite}
											<Star class="h-4 w-4 fill-yellow-500 text-yellow-500" />
										{:else}
											<StarOff class="h-4 w-4 text-muted-foreground" />
										{/if}
									</button>

									<h3 class="font-semibold">{template.title}</h3>

									<!-- Scope Badge -->
									{#if template.scope === 'system'}
										<span
											class="rounded bg-blue-100 px-2 py-1 text-xs text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
										>
											Système
										</span>
									{:else}
										<span
											class="rounded bg-green-100 px-2 py-1 text-xs text-green-700 dark:bg-green-900/30 dark:text-green-300"
										>
											{template.class_name || 'Ma classe'}
										</span>
									{/if}

									<!-- Active Badge -->
									{#if !template.is_active}
										<span class="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600 dark:bg-gray-800">
											Inactif
										</span>
									{/if}

									<!-- Approval Status -->
									{#if approvalBadge}
										<span class="rounded px-2 py-1 text-xs {approvalBadge.class}">
											{approvalBadge.text}
										</span>
									{/if}
								</div>

								{#if template.description}
									<p class="mb-2 text-sm text-muted-foreground">{template.description}</p>
								{/if}

								<!-- Tags -->
								{#if template.tags && template.tags.length > 0}
									<div class="mb-2 flex flex-wrap gap-1">
										{#each template.tags as tag}
											<Badge variant="secondary" class="text-xs">{tag}</Badge>
										{/each}
									</div>
								{/if}

								<div class="space-y-1 text-sm">
									<div class="flex items-center gap-2">
										<span class="text-muted-foreground">Type:</span>
										<span>{getTriggerTypeLabel(template.trigger_type)}</span>
									</div>
									<div class="text-muted-foreground">
										Sujet: <span class="font-mono text-xs">{template.subject_template}</span>
									</div>

									<!-- Expanded preview -->
									{#if isExpanded}
										<div class="mt-3 space-y-2 rounded-lg border border-border bg-muted/50 p-3">
											<div>
												<div class="mb-1 text-xs font-medium text-muted-foreground">
													Corps du template:
												</div>
												<div class="text-xs">
													{@html template.body_template.slice(0, 300)}
													{template.body_template.length > 300 ? '...' : ''}
												</div>
											</div>
										</div>
									{/if}
								</div>
							</div>

							<div class="flex gap-2">
								<!-- Expand/Collapse -->
								<Button
									variant="ghost"
									size="sm"
									onclick={() => toggleCardExpanded(template.id)}
								>
									{#if isExpanded}
										<ChevronUp class="h-4 w-4" />
									{:else}
										<ChevronDown class="h-4 w-4" />
									{/if}
								</Button>

								<!-- Duplicate (available for all templates) -->
								<Button
									variant="ghost"
									size="sm"
									onclick={() => duplicateTemplate(template)}
									title="Dupliquer ce template"
								>
									<Copy class="h-4 w-4" />
								</Button>

								<!-- Version History (only for own templates) -->
								{#if isOwnTemplate}
									<Button
										variant="ghost"
										size="sm"
										onclick={() => loadVersionHistory(template)}
										title="Historique des versions"
									>
										<History class="h-4 w-4" />
									</Button>

									<!-- Edit -->
									<Button variant="outline" size="sm" onclick={() => openEditDialog(template)}>
										<Edit class="h-3 w-3" />
									</Button>

									<!-- Delete -->
									<Button variant="outline" size="sm" onclick={() => handleDelete(template)}>
										<Trash2 class="h-3 w-3" />
									</Button>
								{/if}
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	{/if}
</div>

<!-- Create/Edit Dialog -->
<Dialog.Root bind:open={isDialogOpen}>
	<Dialog.Content class="max-h-[90vh] max-w-4xl overflow-y-auto">
		<Dialog.Header>
			<Dialog.Title>
				{isEditMode ? 'Modifier le template' : 'Nouveau template'}
			</Dialog.Title>
		</Dialog.Header>

		<Tabs.Root bind:value={activeTab}>
			<Tabs.List class="grid w-full grid-cols-2">
				<Tabs.Trigger value="edit">Édition</Tabs.Trigger>
				<Tabs.Trigger value="preview">Prévisualisation</Tabs.Trigger>
			</Tabs.List>

			<!-- Edit Tab -->
			<Tabs.Content value="edit">
				<form
					onsubmit={(e) => {
						e.preventDefault();
						handleSubmit();
					}}
					class="space-y-4"
				>
					<!-- Title -->
					<div class="space-y-2">
						<Label for="title">Titre *</Label>
						<Input id="title" bind:value={formTitle} maxlength={100} required />
					</div>

					<!-- Description -->
					<div class="space-y-2">
						<Label for="description">Description</Label>
						<Input id="description" bind:value={formDescription} />
					</div>

					<!-- Class Selection -->
					<div class="space-y-2">
						<Label>Classe *</Label>
						<Select.Root
							selected={{ value: formClassId || classes[0]?.id, label: classes.find(c => c.id === formClassId)?.name || 'Sélectionnez une classe' }}
							onSelectedChange={(v) => {
								if (v) formClassId = v.value;
							}}
						>
							<Select.Trigger>
								<Select.Value placeholder="Sélectionnez une classe" />
							</Select.Trigger>
							<Select.Content>
								{#each classes as classItem}
									<Select.Item value={classItem.id}>{classItem.name}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</div>

					<!-- Trigger Type -->
					<div class="space-y-2">
						<Label>Type de déclencheur *</Label>
						<Select.Root
							selected={{ value: formTriggerType, label: getTriggerTypeLabel(formTriggerType) }}
							onSelectedChange={(v) => {
								if (v) formTriggerType = v.value as TriggerType;
							}}
						>
							<Select.Trigger>
								<Select.Value placeholder="Sélectionnez un type" />
							</Select.Trigger>
							<Select.Content>
								{#each triggerTypeOptions as option}
									<Select.Item value={option.value}>{option.label}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</div>

					<!-- Tags -->
					<div class="space-y-2">
						<Label>Tags</Label>
						<TagsInput bind:tags={formTags} suggestions={allTags()} />
					</div>

					<!-- Subject -->
					<div class="space-y-2">
						<Label for="subject">Sujet *</Label>
						<Input id="subject" bind:value={formSubject} maxlength={200} required />
					</div>

					<!-- Body -->
					<div class="space-y-2">
						<div class="flex items-center justify-between">
							<Label>Corps du message *</Label>
							<div class="flex gap-2">
								<VariableAutocomplete
									triggerType={formTriggerType}
									on:insert={handleVariableInsert}
								/>
								<FiltersHelp />
							</div>
						</div>
						<FormRichTextEditor bind:value={formBody} placeholder="Écrivez le template..." />
					</div>

					<!-- Active -->
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

			<!-- Preview Tab -->
			<Tabs.Content value="preview">
				<div class="space-y-4">
					<div class="rounded-lg border border-border bg-muted/50 p-4">
						<div class="mb-2 flex items-center gap-2">
							<Eye class="h-4 w-4 text-muted-foreground" />
							<span class="text-sm font-medium text-muted-foreground">
								Prévisualisation avec données d'exemple
							</span>
						</div>

						<div class="space-y-4">
							<div>
								<Label class="text-xs text-muted-foreground">Sujet</Label>
								<div class="mt-1 rounded bg-background p-3 text-sm">{previewSubject}</div>
							</div>

							<div>
								<Label class="text-xs text-muted-foreground">Corps</Label>
								<div class="prose prose-sm mt-1 max-w-none rounded bg-background p-3">
									{@html previewBody}
								</div>
							</div>
						</div>
					</div>

					<div class="flex justify-end">
						<Button variant="outline" onclick={() => (activeTab = 'edit')}>
							Retour à l'édition
						</Button>
					</div>
				</div>
			</Tabs.Content>
		</Tabs.Root>
	</Dialog.Content>
</Dialog.Root>

<!-- Version History Dialog -->
<Dialog.Root bind:open={isVersionDialogOpen}>
	<Dialog.Content class="max-h-[80vh] max-w-3xl overflow-y-auto">
		<Dialog.Header>
			<Dialog.Title>Historique des versions - {selectedVersionTemplate?.title}</Dialog.Title>
		</Dialog.Header>

		{#if loadingVersions}
			<div class="flex items-center justify-center py-12">
				<Loader2 class="h-8 w-8 animate-spin text-muted-foreground" />
			</div>
		{:else if templateVersions.length === 0}
			<div class="py-8 text-center text-muted-foreground">Aucune version disponible</div>
		{:else}
			<div class="space-y-3">
				{#each templateVersions as version}
					<div class="rounded-lg border border-border p-4">
						<div class="mb-2 flex items-start justify-between">
							<div class="flex-1">
								<div class="font-medium">{version.title}</div>
								<div class="text-xs text-muted-foreground">
									{new Date(version.created_at).toLocaleString('fr-FR')}
								</div>
							</div>
							<Button size="sm" onclick={() => restoreVersion(version.id)}>Restaurer</Button>
						</div>

						<div class="mt-2 text-sm">
							<div class="mb-1 text-muted-foreground">Sujet:</div>
							<div class="font-mono text-xs">{version.subject_template}</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</Dialog.Content>
</Dialog.Root>
