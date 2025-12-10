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
	import * as Tabs from '$lib/components/ui/tabs';
	import { cn } from '$lib/utils';
	import { Search, Package, Users } from 'lucide-svelte';

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
	let statusTab = $state<'my' | 'public'>('my');

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

		// Filter by status tab
		if (statusTab === 'my') {
			result = result.filter((t) => t.isOwner);
		} else {
			result = result.filter((t) => t.isPublic && t.status === 'published');
		}

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

	// Count templates by tab
	const myTemplatesCount = $derived(templates.filter((t) => t.isOwner).length);
	const publicTemplatesCount = $derived(
		templates.filter((t) => t.isPublic && t.status === 'published').length
	);
</script>

<div class={cn('space-y-6', className)}>
	<!-- Header with filters -->
	<div class="space-y-4">
		<!-- Tabs -->
		<Tabs.Root bind:value={statusTab}>
			<Tabs.List class="grid w-full grid-cols-2">
				<Tabs.Trigger value="my" class="flex items-center gap-2">
					<Package class="h-4 w-4" />
					<span>Mes templates</span>
					<span
						class="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
					>
						{myTemplatesCount}
					</span>
				</Tabs.Trigger>
				<Tabs.Trigger value="public" class="flex items-center gap-2">
					<Users class="h-4 w-4" />
					<span>Templates publics</span>
					<span
						class="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
					>
						{publicTemplatesCount}
					</span>
				</Tabs.Trigger>
			</Tabs.List>
		</Tabs.Root>

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
				{:else if statusTab === 'my'}
					Créez votre premier template pour commencer.
				{:else}
					Aucun template public n'est disponible pour le moment.
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
