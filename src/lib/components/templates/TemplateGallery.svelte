<!--
	TemplateGallery Component
	=========================

	Gallery view with filters for browsing templates.
	Includes search, grade filtering, and status tabs.

	@module components/templates/TemplateGallery
-->
<script lang="ts">
	import type { TemplateSummary } from '$lib/types/chapter-templates';
	import { GRADE_LEVELS } from '$lib/types/chapter-templates';
	import TemplateCard from './TemplateCard.svelte';
	import MySelect from '$lib/components/MySelect.svelte';
	import { Input } from '$lib/components/ui/input';
	import { cn } from '$lib/utils';
	import { Search, Package } from '@lucide/svelte';

	// Props
	interface Props {
		templates: TemplateSummary[];
		currentUserId: string;
		onSelect?: (template: TemplateSummary) => void;
		onEdit?: (template: TemplateSummary) => void;
		onInstantiate?: (template: TemplateSummary) => void;
		class?: string;
	}

	let {
		templates,
		currentUserId: _currentUserId,
		onSelect,
		onEdit,
		onInstantiate,
		class: className = ''
	}: Props = $props();

	// Filter state
	let searchQuery = $state('');
	let selectedGrades = $state<string[]>([]);

	// Grade items for MySelect
	const gradeItems = $derived(
		GRADE_LEVELS.map((grade) => ({
			value: grade,
			label: `${grade}e`
		}))
	);

	// Filter templates
	const filteredTemplates = $derived(() => {
		let result = templates;

		// Filter by search query
		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase();
			result = result.filter(
				(t) =>
					t.title.toLowerCase().includes(query) ||
					t.description?.toLowerCase().includes(query) ||
					t.creatorName?.toLowerCase().includes(query)
			);
		}

		// Filter by grades
		if (selectedGrades.length > 0) {
			result = result.filter((t) => t.grades.some((g) => selectedGrades.includes(g)));
		}

		return result;
	});
</script>

<div class={cn('space-y-6', className)}>
	<!-- Header with filters -->
	<div class="space-y-4">
		<!-- Filters -->
		<div class="flex flex-col gap-3 sm:flex-row">
			<!-- Search -->
			<div class="relative flex-1">
				<Search class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
				<Input
					type="search"
					placeholder="Rechercher un template..."
					bind:value={searchQuery}
					class="pl-9"
				/>
			</div>

			<!-- Grade filter -->
			<div class="w-full sm:w-48">
				<MySelect
					type="multiple"
					bind:value={selectedGrades}
					items={gradeItems}
					placeholder="Tous les niveaux"
				/>
			</div>
		</div>
	</div>

	<!-- Templates grid -->
	{#if filteredTemplates().length === 0}
		<div class="flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-12">
			<Package class="mb-3 h-12 w-12 text-muted-foreground/50" />
			<h3 class="mb-1 text-lg font-semibold">Aucun template trouvé</h3>
			<p class="text-sm text-muted-foreground">
				{#if searchQuery.trim() || selectedGrades.length > 0}
					Essayez de modifier vos filtres de recherche.
				{:else}
					Créez votre premier template pour commencer.
				{/if}
			</p>
		</div>
	{:else}
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each filteredTemplates() as template (template.id)}
				<TemplateCard
					{template}
					{onSelect}
					onEdit={template.isOwner ? onEdit : undefined}
					{onInstantiate}
				/>
			{/each}
		</div>

		<!-- Results count -->
		<p class="text-center text-sm text-muted-foreground">
			{filteredTemplates().length} template{filteredTemplates().length > 1 ? 's' : ''} affiché{filteredTemplates()
				.length > 1
				? 's'
				: ''}
		</p>
	{/if}
</div>
