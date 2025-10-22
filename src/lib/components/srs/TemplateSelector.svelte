<!--
	TemplateSelector Component
	==========================

	Allows selecting question templates from the question bank to add to SRS decks.

	Features:
	- Search/filter templates
	- Preview templates
	- Multi-select for batch add
	- Filter by level, topic, type

	Props:
	- onSelect: Callback with selected template IDs
	- onCancel: Callback when cancelled
	- initialSelection: Pre-selected template IDs (for editing)
-->

<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Badge } from '$lib/components/ui/badge';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { Search, Check, X } from 'lucide-svelte';
	import { SvelteSet } from 'svelte/reactivity';

	interface Props {
		onSelect: (templateIds: string[]) => void;
		onCancel?: () => void;
		initialSelection?: string[];
	}

	let { onSelect, onCancel, initialSelection = [] }: Props = $props();

	// State
	let templates = $state<any[]>([]);
	let selectedIds = new SvelteSet<string>(initialSelection);
	let searchQuery = $state('');
	let isLoading = $state(true);
	let selectionCount = $state(initialSelection.length); // Track count separately

	// Derived
	const filteredTemplates = $derived(
		templates.filter((t) => {
			if (!searchQuery) return true;
			const query = searchQuery.toLowerCase();
			return (
				t.title?.toLowerCase().includes(query) ||
				t.topic?.toLowerCase().includes(query) ||
				t.level?.toLowerCase().includes(query)
			);
		})
	);

	const hasSelection = $derived(selectionCount > 0);

	/**
	 * Load templates on mount
	 */
	$effect(() => {
		loadTemplates();
	});

	/**
	 * Load published templates from API
	 */
	async function loadTemplates() {
		isLoading = true;

		try {
			// TODO: Replace with actual API call to fetch published templates
			// For now, simulate with empty array
			const response = await fetch('/api/questions/templates?status=published');

			if (response.ok) {
				const data = await response.json();
				templates = data.templates || [];
			} else {
				templates = [];
			}
		} catch (error) {
			console.error('Error loading templates:', error);
			toaster.error('Erreur lors du chargement des templates');
			templates = [];
		} finally {
			isLoading = false;
		}
	}

	/**
	 * Toggle template selection
	 */
	function toggleTemplate(templateId: string) {
		console.log('Toggle template:', templateId);
		if (selectedIds.has(templateId)) {
			selectedIds.delete(templateId);
			selectionCount--;
			console.log('Removed. New size:', selectedIds.size, 'count:', selectionCount);
		} else {
			selectedIds.add(templateId);
			selectionCount++;
			console.log('Added. New size:', selectedIds.size, 'count:', selectionCount);
		}
		console.log('hasSelection:', hasSelection);
	}

	/**
	 * Select all filtered templates
	 */
	function selectAll() {
		filteredTemplates.forEach((t) => {
			if (!selectedIds.has(t.id)) {
				selectedIds.add(t.id);
				selectionCount++;
			}
		});
	}

	/**
	 * Deselect all
	 */
	function deselectAll() {
		selectedIds.clear();
		selectionCount = 0;
	}

	/**
	 * Confirm selection
	 */
	function confirmSelection() {
		onSelect(Array.from(selectedIds));
	}
</script>

<div class="template-selector">
	<!-- Header -->
	<div class="mb-4 flex items-center justify-between">
		<div>
			<h3 class="text-lg font-semibold">Sélectionner des templates</h3>
			<p class="text-sm text-muted-foreground">
				{selectionCount} template{selectionCount > 1 ? 's' : ''} sélectionné{selectionCount > 1
					? 's'
					: ''}
			</p>
		</div>

		<div class="flex gap-2">
			{#if onCancel}
				<Button onclick={onCancel} variant="outline" size="sm">
					<X class="mr-2 h-4 w-4" />
					Annuler
				</Button>
			{/if}
			<Button onclick={confirmSelection} disabled={!hasSelection} size="sm">
				<Check class="mr-2 h-4 w-4" />
				Confirmer ({selectionCount})
			</Button>
		</div>
	</div>

	<!-- Search Bar -->
	<div class="mb-4">
		<div class="relative">
			<Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
			<Input
				bind:value={searchQuery}
				placeholder="Rechercher par titre, sujet, niveau..."
				class="pl-10"
			/>
		</div>
	</div>

	<!-- Bulk Actions -->
	<div class="mb-4 flex items-center justify-between">
		<div class="flex gap-2">
			<Button onclick={selectAll} variant="outline" size="sm" disabled={isLoading}>
				Tout sélectionner
			</Button>
			<Button onclick={deselectAll} variant="outline" size="sm" disabled={!hasSelection}>
				Tout désélectionner
			</Button>
		</div>
	</div>

	<!-- Templates List -->
	<div class="templates-list max-h-[500px] space-y-2 overflow-y-auto rounded-lg border p-4">
		{#if isLoading}
			<!-- Loading State -->
			<div class="flex flex-col items-center justify-center py-12">
				<div class="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
				<p class="text-muted-foreground">Chargement des templates...</p>
			</div>
		{:else if filteredTemplates.length === 0}
			<!-- Empty State -->
			<div class="py-12 text-center">
				<p class="text-muted-foreground">
					{searchQuery ? 'Aucun template trouvé' : 'Aucun template publié disponible'}
				</p>
			</div>
		{:else}
			<!-- Templates -->
			{#each filteredTemplates as template (template.id)}
				<div
					class="flex items-start gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-accent"
					onclick={() => toggleTemplate(template.id)}
					role="button"
					tabindex="0"
				>
					<!-- Checkbox -->
					<div onclick={(e) => e.stopPropagation()}>
						<Checkbox
							checked={selectedIds.has(template.id)}
							onCheckedChange={() => toggleTemplate(template.id)}
						/>
					</div>

					<!-- Template Info -->
					<div class="flex-1">
						<p class="font-medium">{template.title || `Template ${template.id.slice(0, 8)}`}</p>
						<div class="mt-1 flex flex-wrap gap-2">
							{#if template.topic}
								<Badge variant="outline">{template.topic}</Badge>
							{/if}
							{#if template.level}
								<Badge variant="secondary">{template.level}</Badge>
							{/if}
							{#if template.type}
								<Badge variant="outline">{template.type}</Badge>
							{/if}
						</div>
						{#if template.description}
							<p class="mt-1 text-sm text-muted-foreground line-clamp-2">
								{template.description}
							</p>
						{/if}
					</div>
				</div>
			{/each}
		{/if}
	</div>
</div>

<style>
	.template-selector {
		animation: fadeIn 0.3s ease-out;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	.templates-list {
		scrollbar-width: thin;
		scrollbar-color: hsl(var(--muted)) transparent;
	}

	.templates-list::-webkit-scrollbar {
		width: 8px;
	}

	.templates-list::-webkit-scrollbar-track {
		background: transparent;
	}

	.templates-list::-webkit-scrollbar-thumb {
		background: hsl(var(--muted));
		border-radius: 4px;
	}
</style>
