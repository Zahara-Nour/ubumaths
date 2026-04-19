<script lang="ts">
	import MATH_DICTIONARY from '$lib/data/math-dictionary-fr';
	import { GRADES } from '$lib/types/grades';
	import type { GradeCode } from '$lib/types/grades';
	import type { MathTerm } from '$lib/data/math-dictionary-fr';
	import InlineMarkdown from '$lib/components/markdown/InlineMarkdown.svelte';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';
	import MySelect from '$lib/components/MySelect.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Search, BookOpen, RotateCcw } from 'lucide-svelte';

	// ===== State =====

	let searchQuery = $state('');
	let selectedLevel = $state<string>('all');
	let selectedTags = $state<string[]>([]);
	let selectedTerm = $state<MathTerm | null>(null);
	let showTermDialog = $state(false);

	// ===== Constants =====

	const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

	/** Grade levels relevant for filtering */
	const LEVEL_OPTIONS = [
		{ value: 'all', label: 'Tous les niveaux' },
		...(['CP', 'CE1', 'CE2', 'CM1', 'CM2', '6', '5', '4', '3', '2', '1_SPE', 'T_SPE'] as const).map(
			(code) => ({
				value: code,
				label: GRADES[code].displayName
			})
		)
	];

	// ===== Helpers =====

	function normalizeString(str: string): string {
		return str
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.toLowerCase();
	}

	function matchesSearch(term: MathTerm, query: string): boolean {
		const q = normalizeString(query);
		if (normalizeString(term.term).includes(q)) return true;
		if (term.definition && normalizeString(term.definition).includes(q)) return true;
		if (term.synonyms?.some((s) => normalizeString(s).includes(q))) return true;
		return false;
	}

	function getFirstLetter(term: string): string {
		return normalizeString(term).charAt(0).toUpperCase();
	}

	function toggleTag(tag: string) {
		if (selectedTags.includes(tag)) {
			selectedTags = selectedTags.filter((t) => t !== tag);
		} else {
			selectedTags = [...selectedTags, tag];
		}
	}

	function resetFilters() {
		searchQuery = '';
		selectedLevel = 'all';
		selectedTags = [];
	}

	function openTerm(term: MathTerm) {
		selectedTerm = term;
		showTermDialog = true;
	}

	function openTermByName(name: string) {
		const term = MATH_DICTIONARY.find((t) => t.term === name);
		if (term) openTerm(term);
	}

	function scrollToLetter(letter: string) {
		document.getElementById(`letter-${letter}`)?.scrollIntoView({ behavior: 'smooth' });
	}

	// ===== Derived =====

	/** All unique tags sorted */
	let allTags = $derived(
		[...new Set(MATH_DICTIONARY.flatMap((t) => t.tags))].sort((a, b) => a.localeCompare(b, 'fr'))
	);

	/** Whether any filter is active */
	let hasActiveFilters = $derived(
		searchQuery.length > 0 || selectedLevel !== 'all' || selectedTags.length > 0
	);

	/** Filtered and sorted terms */
	let filteredTerms = $derived.by(() => {
		let terms = [...MATH_DICTIONARY];

		// Search filter
		if (searchQuery.length > 0) {
			terms = terms.filter((t) => matchesSearch(t, searchQuery));
		}

		// Level filter
		if (selectedLevel !== 'all') {
			const maxYear = GRADES[selectedLevel as GradeCode].schoolYear;
			terms = terms.filter((t) => GRADES[t.level].schoolYear <= maxYear);
		}

		// Tag filter
		if (selectedTags.length > 0) {
			terms = terms.filter((t) => selectedTags.some((tag) => t.tags.includes(tag)));
		}

		// Sort alphabetically (normalized)
		terms.sort((a, b) => normalizeString(a.term).localeCompare(normalizeString(b.term), 'fr'));

		return terms;
	});

	/** Terms grouped by first letter */
	let groupedTerms = $derived.by(() => {
		const groups: Record<string, MathTerm[]> = {};
		for (const term of filteredTerms) {
			const letter = getFirstLetter(term.term);
			if (!groups[letter]) groups[letter] = [];
			groups[letter].push(term);
		}
		return groups;
	});

	/** Letters that have terms */
	let activeLetters = $derived(new Set(Object.keys(groupedTerms)));
</script>

<svelte:head>
	<title>Glossaire Mathématique | UbuMaths</title>
	<meta
		name="description"
		content="Glossaire de vocabulaire mathématique - Définitions, exemples et histoire des termes de la 6ème à la Terminale"
	/>
</svelte:head>

<div class="mx-auto max-w-4xl p-4 md:p-6">
	<!-- Header -->
	<div class="mb-6 flex items-center gap-4">
		<div
			class="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-2xl"
		>
			<BookOpen class="h-6 w-6 text-white" />
		</div>
		<div>
			<h1 class="text-2xl font-bold text-foreground md:text-3xl">Glossaire Mathématique</h1>
			<p class="text-sm text-muted-foreground">
				{filteredTerms.length} terme{filteredTerms.length > 1 ? 's' : ''}
				{hasActiveFilters ? '(filtré)' : ''}
			</p>
		</div>
	</div>

	<Separator class="mb-6" />

	<!-- Search -->
	<div class="relative mb-4">
		<Search class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
		<Input
			type="text"
			placeholder="Rechercher un terme..."
			bind:value={searchQuery}
			class="pl-10"
		/>
	</div>

	<!-- Filters -->
	<div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start">
		<!-- Level filter -->
		<div class="flex items-center gap-2">
			<span class="text-xs font-medium text-muted-foreground">Niveau :</span>
			<MySelect type="single" bind:value={selectedLevel} items={LEVEL_OPTIONS} />
		</div>

		<!-- Reset button -->
		{#if hasActiveFilters}
			<Button variant="ghost" size="sm" onclick={resetFilters}>
				<RotateCcw class="mr-1 h-3 w-3" />
				Réinitialiser
			</Button>
		{/if}
	</div>

	<!-- Tag chips -->
	<div class="mb-4 flex flex-wrap gap-1.5">
		{#each allTags as tag (tag)}
			<button
				class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors {selectedTags.includes(
					tag
				)
					? 'border-primary bg-primary text-primary-foreground'
					: 'border-border bg-background text-foreground hover:bg-muted'}"
				onclick={() => toggleTag(tag)}
			>
				{tag}
			</button>
		{/each}
	</div>

	<Separator class="mb-4" />

	<!-- Alphabetical index -->
	{#if !searchQuery}
		<div class="mb-4 flex flex-wrap justify-center gap-1">
			{#each ALPHABET as letter (letter)}
				<button
					class="flex h-8 w-8 items-center justify-center rounded text-sm font-medium transition-colors {activeLetters.has(
						letter
					)
						? 'text-primary hover:bg-primary/10'
						: 'cursor-default text-muted-foreground/30'}"
					onclick={() => scrollToLetter(letter)}
					disabled={!activeLetters.has(letter)}
				>
					{letter}
				</button>
			{/each}
		</div>
	{/if}

	<!-- Terms list -->
	{#if filteredTerms.length === 0}
		<div class="py-12 text-center">
			<BookOpen class="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
			<p class="text-muted-foreground">Aucun terme trouvé</p>
			{#if hasActiveFilters}
				<Button variant="outline" size="sm" class="mt-4" onclick={resetFilters}>
					Réinitialiser les filtres
				</Button>
			{/if}
		</div>
	{:else}
		<div class="space-y-1">
			{#each Object.entries(groupedTerms) as [letter, terms] (letter)}
				<!-- Letter header -->
				<div id="letter-{letter}" class="sticky top-0 z-10 bg-background pt-4 pb-1">
					<h2 class="text-lg font-bold text-primary">{letter}</h2>
					<Separator />
				</div>

				<!-- Terms in this letter group -->
				{#each terms as term (term.term)}
					<button
						class="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-muted/30"
						onclick={() => openTerm(term)}
					>
						<span class="font-medium">{term.term}</span>
						{#if term.derivedFrom}
							<span class="text-xs text-muted-foreground italic">→ {term.derivedFrom}</span>
						{:else}
							<div class="hidden flex-wrap gap-1 sm:flex">
								{#each term.tags.slice(0, 3) as tag (tag)}
									<Badge variant="outline" class="text-[10px]">{tag}</Badge>
								{/each}
							</div>
						{/if}
						<span class="ml-auto shrink-0 text-xs text-muted-foreground">
							{GRADES[term.level].displayName}
						</span>
					</button>
				{/each}
			{/each}
		</div>
	{/if}
</div>

<!-- Term Detail Dialog -->
<Dialog.Root bind:open={showTermDialog}>
	<Dialog.Content class="sm:max-w-md">
		{#if selectedTerm}
			<Dialog.Header>
				<Dialog.Title class="text-2xl font-bold">{selectedTerm.term}</Dialog.Title>
				<Dialog.Description>
					<div class="flex flex-wrap items-center gap-2">
						<Badge variant="secondary">{GRADES[selectedTerm.level].displayName}</Badge>
						{#each selectedTerm.tags as tag (tag)}
							<Badge variant="outline" class="text-xs">{tag}</Badge>
						{/each}
					</div>
				</Dialog.Description>
			</Dialog.Header>

			<div class="space-y-4 py-4">
				{#if selectedTerm.derivedFrom}
					<p class="text-muted-foreground italic">
						Forme dérivée de
						<button
							class="font-medium text-primary underline"
							onclick={() => openTermByName(selectedTerm?.derivedFrom ?? '')}
						>
							{selectedTerm.derivedFrom}
						</button>
					</p>
				{/if}

				{#if selectedTerm.definition}
					<div>
						<h3 class="mb-1 text-sm font-semibold text-muted-foreground">Définition</h3>
						<div class="text-sm">
							<InlineMarkdown content={selectedTerm.definition} />
						</div>
					</div>
				{/if}

				{#if selectedTerm.exemple}
					<div>
						<h3 class="mb-1 text-sm font-semibold text-muted-foreground">Exemple</h3>
						<div class="text-sm">
							<InlineMarkdown content={selectedTerm.exemple} />
						</div>
					</div>
				{/if}

				{#if selectedTerm.history}
					<div>
						<h3 class="mb-1 text-sm font-semibold text-muted-foreground">Histoire</h3>
						<div class="text-sm">
							<InlineMarkdown content={selectedTerm.history} />
						</div>
					</div>
				{/if}

				{#if selectedTerm.synonyms && selectedTerm.synonyms.length > 0}
					<div>
						<h3 class="mb-1 text-sm font-semibold text-muted-foreground">Synonymes</h3>
						<p class="text-sm">{selectedTerm.synonyms.join(', ')}</p>
					</div>
				{/if}
			</div>
		{/if}
	</Dialog.Content>
</Dialog.Root>
