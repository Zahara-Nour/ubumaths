<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import GradeBadgeSelector from '$lib/components/GradeBadgeSelector.svelte';
	import TagBadgeSelector from '$lib/components/TagBadgeSelector.svelte';
	import { FileText, Eye, Download, Calendar, User, ExternalLink, X } from 'lucide-svelte';
	import { formatGradeShort } from '$lib/utils/grades';
	import { GRADE_CODES, type GradeCode } from '$lib/types/grades';
	import type { PageData } from './$types';

	const { data }: { data: PageData } = $props();

	type Evaluation = (typeof data.evaluations)[number];

	let selectedGrades = $state<GradeCode[]>([]);
	let selectedTags = $state<string[]>([]);

	let previewTarget = $state<Evaluation | null>(null);

	function isGradeCode(value: string): value is GradeCode {
		return (GRADE_CODES as readonly string[]).includes(value);
	}

	function toGradeCodes(values: readonly string[]): GradeCode[] {
		return values.filter(isGradeCode);
	}

	function formatFileSize(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} kB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	function formatDate(iso: string): string {
		return new Date(iso).toLocaleDateString('fr-FR', {
			day: '2-digit',
			month: 'short',
			year: 'numeric'
		});
	}

	function creatorName(evaluation: Evaluation): string {
		const creator = evaluation.creator as { firstname?: string; lastname?: string } | null;
		if (!creator) return 'Auteur inconnu';
		const parts = [creator.firstname, creator.lastname].filter(Boolean);
		return parts.length ? parts.join(' ') : 'Auteur inconnu';
	}

	function matchesGradeFilter(evaluation: Evaluation): boolean {
		if (selectedGrades.length === 0) return true;
		const gradeSet = new Set(evaluation.grade_levels ?? []);
		// Intersection — all selected grades must be on the evaluation.
		return selectedGrades.every((g) => gradeSet.has(g));
	}

	function matchesTagFilter(evaluation: Evaluation): boolean {
		if (selectedTags.length === 0) return true;
		const tagSet = new Set(evaluation.tags ?? []);
		return selectedTags.every((t) => tagSet.has(t));
	}

	const filteredEvaluations = $derived(
		data.evaluations.filter((e) => matchesGradeFilter(e) && matchesTagFilter(e))
	);

	const hasActiveFilters = $derived(selectedGrades.length > 0 || selectedTags.length > 0);

	// Restrict the filter modals to the grades and tags actually used in the
	// loaded collection — picking a value that yields zero results is wasteful.
	const usedGrades = $derived(
		GRADE_CODES.filter((grade) =>
			data.evaluations.some((e) => (e.grade_levels ?? []).includes(grade))
		)
	);

	const usedTags = $derived(
		data.evaluations
			.flatMap((e) => e.tags ?? [])
			.filter((tag, idx, arr) => arr.indexOf(tag) === idx)
			.sort((a, b) => a.localeCompare(b, 'fr'))
	);

	function openPreview(evaluation: Evaluation) {
		previewTarget = evaluation;
	}

	function closePreview() {
		previewTarget = null;
	}
</script>

<svelte:head>
	<title>Les presques évaluations · UbuMaths</title>
	<meta
		name="description"
		content="Collection de parodies d'évaluations de mathématiques, partagées par les enseignants UbuMaths."
	/>
</svelte:head>

<div class="container mx-auto max-w-6xl space-y-6 p-4 md:p-6">
	<header class="space-y-2">
		<h1 class="text-3xl font-bold tracking-tight md:text-4xl">Les presques évaluations</h1>
		<p class="text-muted-foreground">
			Une collection de parodies d'évaluations de mathématiques. Aperçu et téléchargement libres.
		</p>
	</header>

	<!-- Compact filter bar -->
	<div
		class="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border bg-card/30 px-3 py-2 text-sm"
	>
		<div class="flex items-center gap-2">
			<span class="text-xs font-medium text-muted-foreground">Niveau</span>
			<GradeBadgeSelector bind:value={selectedGrades} restrictTo={usedGrades} placeholder="Tous" />
		</div>
		<div class="flex items-center gap-2">
			<span class="text-xs font-medium text-muted-foreground">Thème</span>
			<TagBadgeSelector bind:value={selectedTags} restrictTo={usedTags} placeholder="Tous" />
		</div>

		<div class="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
			<span>
				{filteredEvaluations.length} résultat{filteredEvaluations.length >= 2 ? 's' : ''}
			</span>
			{#if hasActiveFilters}
				<button
					type="button"
					class="flex items-center gap-1 hover:text-foreground"
					onclick={() => {
						selectedGrades = [];
						selectedTags = [];
					}}
				>
					<X class="h-3 w-3" />
					Effacer
				</button>
			{/if}
		</div>
	</div>

	{#if data.evaluations.length === 0}
		<Card.Root>
			<Card.Content class="flex flex-col items-center justify-center gap-3 py-12">
				<FileText class="h-10 w-10 text-muted-foreground/50" />
				<p class="text-muted-foreground">Aucune presque évaluation pour le moment.</p>
			</Card.Content>
		</Card.Root>
	{:else if filteredEvaluations.length === 0}
		<Card.Root>
			<Card.Content class="flex flex-col items-center justify-center gap-3 py-12">
				<FileText class="h-10 w-10 text-muted-foreground/50" />
				<p class="text-muted-foreground">Aucun résultat pour ces filtres.</p>
			</Card.Content>
		</Card.Root>
	{:else}
		<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
			{#each filteredEvaluations as evaluation (evaluation.id)}
				<Card.Root class="flex flex-col">
					<Card.Header class="space-y-2">
						<div class="flex items-start gap-2">
							<FileText class="mt-1 h-5 w-5 shrink-0 text-primary" />
							<Card.Title class="text-base leading-tight">{evaluation.title}</Card.Title>
						</div>
						{#if evaluation.description}
							<Card.Description class="line-clamp-3 text-sm">
								{evaluation.description}
							</Card.Description>
						{/if}
					</Card.Header>

					<Card.Content class="flex-1 space-y-3 text-sm">
						{#if (evaluation.grade_levels ?? []).length > 0}
							<div class="flex flex-wrap gap-1">
								{#each toGradeCodes(evaluation.grade_levels ?? []) as grade (grade)}
									<Badge variant="secondary" class="text-xs">{formatGradeShort(grade)}</Badge>
								{/each}
							</div>
						{/if}

						{#if (evaluation.tags ?? []).length > 0}
							<div class="flex flex-wrap gap-1">
								{#each evaluation.tags ?? [] as tag (tag)}
									<Badge variant="outline" class="text-xs">{tag}</Badge>
								{/each}
							</div>
						{/if}

						<div class="space-y-1 pt-1 text-xs text-muted-foreground">
							<div class="flex items-center gap-1">
								<Calendar class="h-3 w-3" />
								{formatDate(evaluation.created_at)}
							</div>
							<div class="flex items-center gap-1">
								<User class="h-3 w-3" />
								{creatorName(evaluation)}
							</div>
							<div>{formatFileSize(evaluation.file_size)}</div>
						</div>
					</Card.Content>

					<Card.Footer class="gap-2">
						<Button
							variant="outline"
							size="sm"
							class="flex-1"
							onclick={() => openPreview(evaluation)}
							disabled={!evaluation.publicUrl}
						>
							<Eye class="mr-1 h-3.5 w-3.5" />
							Aperçu
						</Button>
						{#if evaluation.downloadUrl}
							<Button
								variant="default"
								size="sm"
								href={evaluation.downloadUrl}
								download={evaluation.file_name}
							>
								<Download class="mr-1 h-3.5 w-3.5" />
								Télécharger
							</Button>
						{/if}
					</Card.Footer>
				</Card.Root>
			{/each}
		</div>
	{/if}
</div>

<!-- Preview Dialog -->
<Dialog.Root
	open={previewTarget !== null}
	onOpenChange={(open) => {
		if (!open) closePreview();
	}}
>
	<Dialog.Content class="flex h-[90vh] max-w-5xl flex-col gap-3">
		{#if previewTarget}
			<Dialog.Header>
				<Dialog.Title>{previewTarget.title}</Dialog.Title>
				{#if previewTarget.description}
					<Dialog.Description>{previewTarget.description}</Dialog.Description>
				{/if}
			</Dialog.Header>

			<div class="min-h-0 flex-1">
				{#if previewTarget.publicUrl}
					<iframe
						src={previewTarget.publicUrl}
						title={previewTarget.title}
						class="h-full w-full rounded-md border"
					></iframe>
				{:else}
					<div class="flex h-full items-center justify-center text-muted-foreground">
						Aperçu indisponible
					</div>
				{/if}
			</div>

			<Dialog.Footer class="flex flex-wrap gap-2 sm:justify-between">
				<Button variant="outline" onclick={closePreview}>Fermer</Button>
				<div class="flex gap-2">
					{#if previewTarget.publicUrl}
						<Button variant="outline" href={previewTarget.publicUrl} target="_blank" rel="noopener">
							<ExternalLink class="mr-1 h-3.5 w-3.5" />
							Nouvel onglet
						</Button>
					{/if}
					{#if previewTarget.downloadUrl}
						<Button href={previewTarget.downloadUrl} download={previewTarget.file_name}>
							<Download class="mr-1 h-3.5 w-3.5" />
							Télécharger
						</Button>
					{/if}
				</div>
			</Dialog.Footer>
		{/if}
	</Dialog.Content>
</Dialog.Root>
