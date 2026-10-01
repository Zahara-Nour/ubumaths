<script lang="ts">
	import { goto } from '$app/navigation';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Copy, FileEdit, Lock, Plus, ShoppingCart, Trash2 } from '@lucide/svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { submitAction, refreshPageData } from '$lib/utils/form-action';
	import SeriesLinkShare from '$lib/components/series/SeriesLinkShare.svelte';
	import { countSeriesQuestions } from '$lib/types/evaluation';
	import type { SeriesWithUsage } from '$lib/types/evaluation';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let pendingId = $state<string | null>(null);

	function handleEdit(series: SeriesWithUsage) {
		if (series.locked) return;
		goto(`/dashboard/teacher/series/${series.id}/edit`).then(() => {});
	}

	function handleCreateEvaluation(series: SeriesWithUsage) {
		goto(`/dashboard/teacher/assessments/new?series=${series.id}`).then(() => {});
	}

	async function runAction(action: 'duplicate' | 'delete', series: SeriesWithUsage) {
		const formData = new FormData();
		formData.set('id', series.id);
		pendingId = series.id;
		try {
			const outcome = await submitAction(`?/${action}`, formData);
			if (!outcome.ok) {
				toaster.error(outcome.message);
				return;
			}
			toaster.success(action === 'duplicate' ? 'Série dupliquée' : 'Série supprimée');
			await refreshPageData();
		} finally {
			pendingId = null;
		}
	}

	function handleDuplicate(series: SeriesWithUsage) {
		runAction('duplicate', series).then(() => {});
	}

	function handleDelete(series: SeriesWithUsage) {
		if (!confirm(`Supprimer la série « ${series.title} » ?`)) return;
		runAction('delete', series).then(() => {});
	}
</script>

<svelte:head>
	<title>Mes séries | Chiphre</title>
</svelte:head>

<div class="container mx-auto max-w-7xl px-4 py-8">
	<div class="mb-8 flex flex-wrap items-center justify-between gap-4">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Mes séries</h1>
			<p class="mt-2 text-muted-foreground">
				Une série compose les questions ; une évaluation la donne à des élèves, sous une forme.
			</p>
		</div>
		<Button href="/automaths">
			<ShoppingCart class="mr-2 h-4 w-4" />
			Composer une série
		</Button>
	</div>

	{#if data.series.length === 0}
		<Card.Root class="border-dashed">
			<Card.Content class="py-12 text-center text-muted-foreground">
				<p>Aucune série pour l'instant.</p>
				<p class="mt-2 text-sm">
					Compose un panier dans Automaths, puis « Enregistrer comme série ».
				</p>
			</Card.Content>
		</Card.Root>
	{:else}
		<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
			{#each data.series as series (series.id)}
				{@const questions = countSeriesQuestions(series.categories)}
				<Card.Root data-testid="series-card">
					<Card.Header>
						<div class="mb-2 flex flex-wrap items-center gap-2">
							<Badge variant="outline">{series.grade}</Badge>
							{#if series.locked}
								<Badge class="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
									<Lock class="mr-1 h-3 w-3" />
									verrouillée
								</Badge>
							{/if}
						</div>
						<Card.Title class="text-xl">{series.title}</Card.Title>
						{#if series.description}
							<Card.Description class="mt-2">{series.description}</Card.Description>
						{/if}
					</Card.Header>
					<Card.Content class="space-y-1 text-sm text-muted-foreground">
						<p>
							{series.categories.length} catégorie{series.categories.length > 1 ? 's' : ''} ·
							{questions} question{questions > 1 ? 's' : ''}
						</p>
						<p>
							{series.evaluations_count} évaluation{series.evaluations_count > 1 ? 's' : ''}
						</p>
						{#if series.locked}
							<p class="text-xs">
								Un élève a commencé une évaluation qui l'utilise : duplique-la pour la modifier.
							</p>
						{/if}
					</Card.Content>
					<Card.Footer class="flex flex-wrap gap-2">
						<Button size="sm" onclick={() => handleCreateEvaluation(series)}>
							<Plus class="mr-2 h-4 w-4" />
							Créer une évaluation
						</Button>
						<Button
							size="sm"
							variant="outline"
							disabled={series.locked}
							title={series.locked ? 'Série verrouillée : duplique-la pour la modifier' : undefined}
							onclick={() => handleEdit(series)}
						>
							<FileEdit class="mr-2 h-4 w-4" />
							Modifier
						</Button>
						<Button
							size="sm"
							variant="outline"
							disabled={pendingId === series.id}
							onclick={() => handleDuplicate(series)}
						>
							<Copy class="mr-2 h-4 w-4" />
							Dupliquer
						</Button>
						<Button
							size="sm"
							variant="outline"
							disabled={pendingId === series.id}
							onclick={() => handleDelete(series)}
						>
							<Trash2 class="mr-2 h-4 w-4" />
							Supprimer
						</Button>
						<!-- Lien de la série, avec ou sans forme (Q44, Q46) -->
						<SeriesLinkShare categories={series.categories} compact />
					</Card.Footer>
				</Card.Root>
			{/each}
		</div>
	{/if}
</div>
