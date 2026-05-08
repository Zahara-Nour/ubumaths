<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { BookOpen, Search, X, Tag } from 'lucide-svelte';
	import { PYTHON_EXAMPLES } from '$lib/data/python-examples';
	import { filterExamples, getAllTagsFromExamples } from '$lib/data/python-examples/utils';
	import type { ExampleTag, PythonExample } from '$lib/data/python-examples/types';

	interface Props {
		onLoad: (example: PythonExample) => void;
	}

	let { onLoad }: Props = $props();

	let query = $state('');
	let selectedTags = $state<ExampleTag[]>([]);
	let selectedId = $state<string | null>(null);

	const allTags = getAllTagsFromExamples(PYTHON_EXAMPLES);

	let filtered = $derived(filterExamples(PYTHON_EXAMPLES, query, selectedTags));
	let selected = $derived(filtered.find((ex) => ex.id === selectedId) ?? filtered[0] ?? null);

	function toggleTag(tag: ExampleTag): void {
		selectedTags = selectedTags.includes(tag)
			? selectedTags.filter((t) => t !== tag)
			: [...selectedTags, tag];
	}

	function clearFilters(): void {
		query = '';
		selectedTags = [];
	}

	function selectExample(id: string): void {
		selectedId = id;
	}
</script>

<div class="flex flex-col gap-3">
	<!-- Search bar -->
	<div class="relative">
		<Search
			class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
		/>
		<Input
			bind:value={query}
			placeholder="Rechercher par titre, description ou tag…"
			class="pr-9 pl-9"
			aria-label="Rechercher dans la bibliothèque"
		/>
		{#if query || selectedTags.length > 0}
			<button
				type="button"
				class="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted"
				onclick={clearFilters}
				aria-label="Effacer les filtres"
				title="Effacer les filtres"
			>
				<X class="size-4" />
			</button>
		{/if}
	</div>

	<!-- Tag filter chips -->
	<div class="flex flex-wrap gap-1.5">
		<span class="flex items-center gap-1 text-xs text-muted-foreground">
			<Tag class="size-3" />
			Filtrer :
		</span>
		{#each allTags as tag (tag)}
			{@const active = selectedTags.includes(tag)}
			<button
				type="button"
				onclick={() => toggleTag(tag)}
				aria-pressed={active}
				class="cursor-pointer"
			>
				<Badge variant={active ? 'default' : 'secondary'} class="text-xs">{tag}</Badge>
			</button>
		{/each}
	</div>

	<!-- Counter -->
	<div class="flex items-center justify-between text-sm text-muted-foreground">
		<span>{filtered.length} exemple{filtered.length > 1 ? 's' : ''}</span>
	</div>

	<!-- Split: list (left) + preview (right) -->
	<div class="grid min-h-[400px] gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
		<!-- List -->
		<div class="flex max-h-[55vh] flex-col gap-1.5 overflow-y-auto rounded-md border p-2">
			{#if filtered.length === 0}
				<div class="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
					<BookOpen class="size-8 opacity-50" />
					<p class="text-sm">Aucun exemple ne correspond aux filtres</p>
					<Button variant="ghost" size="sm" onclick={clearFilters}>Réinitialiser</Button>
				</div>
			{:else}
				{#each filtered as ex (ex.id)}
					{@const isSelected = selected?.id === ex.id}
					<button
						type="button"
						onclick={() => selectExample(ex.id)}
						class="group rounded-md border p-3 text-left transition-colors {isSelected
							? 'border-primary bg-primary/5'
							: 'border-border hover:bg-muted/50'}"
						aria-current={isSelected ? 'true' : undefined}
					>
						<div class="font-medium">{ex.title}</div>
						<div class="mt-1 line-clamp-2 text-xs text-muted-foreground">{ex.description}</div>
						<div class="mt-2 flex flex-wrap gap-1">
							{#each ex.tags as tag (tag)}
								<Badge variant="outline" class="text-[10px]">{tag}</Badge>
							{/each}
						</div>
					</button>
				{/each}
			{/if}
		</div>

		<!-- Preview -->
		<div class="flex max-h-[55vh] flex-col rounded-md border">
			{#if selected}
				<div class="flex items-start justify-between gap-3 border-b p-3">
					<div class="min-w-0">
						<h3 class="truncate font-semibold">{selected.title}</h3>
						<p class="mt-0.5 text-xs text-muted-foreground">{selected.description}</p>
						<div class="mt-2 flex flex-wrap gap-1">
							{#each selected.tags as tag (tag)}
								<Badge variant="secondary" class="text-[10px]">{tag}</Badge>
							{/each}
						</div>
					</div>
					<Button size="sm" onclick={() => onLoad(selected)} class="shrink-0">Charger</Button>
				</div>
				<pre
					class="flex-1 overflow-auto bg-muted/30 p-3 font-mono text-xs leading-relaxed"
					aria-label="Aperçu du code"><code>{selected.code}</code></pre>
			{:else}
				<div
					class="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-muted-foreground"
				>
					<BookOpen class="size-8 opacity-50" />
					<p class="text-sm">Sélectionnez un exemple pour l'aperçu</p>
				</div>
			{/if}
		</div>
	</div>
</div>
