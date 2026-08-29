<script lang="ts">
	import { ChevronLeft, CircleCheck, LifeBuoy, CircleDashed, Users } from '@lucide/svelte';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import MyCheckbox from '$lib/components/MyCheckbox.svelte';
	import { page } from '$app/state';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let onlyStruggling = $state(false);

	let rows = $derived(
		onlyStruggling ? data.students.filter((s) => s.needsReview > 0) : data.students
	);

	function relativeDate(iso: string | null): string {
		if (!iso) return '—';
		const days = Math.floor((Date.now() - Date.parse(iso)) / 86_400_000);
		if (days <= 0) return "aujourd'hui";
		if (days === 1) return 'hier';
		if (days < 30) return `il y a ${days} j`;
		return new Date(iso).toLocaleDateString('fr-FR');
	}

	/** Part des exercices positionnés, en pourcentage. */
	function progressPct(untouched: number): number {
		if (data.exerciseCount === 0) return 0;
		return Math.round(((data.exerciseCount - untouched) / data.exerciseCount) * 100);
	}
</script>

<svelte:head><title>Avancement — {data.worksheetTitle} | Chiphre</title></svelte:head>

<div class="container mx-auto max-w-4xl space-y-6 p-4">
	<div>
		<Button variant="ghost" size="sm" href="/dashboard/teacher/contenu/worksheets/{page.params.id}">
			<ChevronLeft class="mr-1 h-4 w-4" />
			Retour à la fiche
		</Button>
		<h1 class="mt-2 text-2xl font-bold tracking-tight">
			Avancement — {data.assignmentTitle ?? data.worksheetTitle}
		</h1>
		<p class="text-sm text-muted-foreground">
			{#if data.className}{data.className} ·{/if}
			{data.exerciseCount}
			{data.exerciseCount > 1 ? 'exercices' : 'exercice'}
		</p>
	</div>

	{#if data.students.length === 0}
		<div class="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
			Aucun élève concerné par cette assignation.
		</div>
	{:else}
		<!-- L'auto-évaluation est déclarative : elle dit ce que l'élève pense avoir
			 acquis, pas ce qu'il a réussi. C'est un signal d'alerte, pas une note. -->
		<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
			<Card.Root>
				<Card.Content class="p-4">
					<div class="flex items-center gap-2 text-muted-foreground">
						<Users class="h-4 w-4" />
						<span class="text-xs">Élèves</span>
					</div>
					<div class="mt-1 text-2xl font-bold tabular-nums">{data.stats.total}</div>
				</Card.Content>
			</Card.Root>
			<Card.Root>
				<Card.Content class="p-4">
					<div class="flex items-center gap-2 text-muted-foreground">
						<CircleDashed class="h-4 w-4" />
						<span class="text-xs">Commencé</span>
					</div>
					<div class="mt-1 text-2xl font-bold tabular-nums">{data.stats.started}</div>
				</Card.Content>
			</Card.Root>
			<Card.Root>
				<Card.Content class="p-4">
					<div class="flex items-center gap-2 text-green-700 dark:text-green-400">
						<CircleCheck class="h-4 w-4" />
						<span class="text-xs">Terminé</span>
					</div>
					<div class="mt-1 text-2xl font-bold tabular-nums">{data.stats.completed}</div>
				</Card.Content>
			</Card.Root>
			<Card.Root>
				<Card.Content class="p-4">
					<div class="flex items-center gap-2 text-red-700 dark:text-red-400">
						<LifeBuoy class="h-4 w-4" />
						<span class="text-xs">À aider</span>
					</div>
					<div class="mt-1 text-2xl font-bold tabular-nums">{data.stats.struggling}</div>
				</Card.Content>
			</Card.Root>
		</div>

		<div class="flex items-center justify-between gap-3">
			<MyCheckbox bind:checked={onlyStruggling} label="Seulement ceux à aider" />
			<span class="text-xs text-muted-foreground">
				Trié : ceux qui ont besoin d'attention d'abord
			</span>
		</div>

		<div class="overflow-x-auto rounded-lg border bg-card">
			<table class="w-full text-sm">
				<thead>
					<tr class="border-b bg-muted/40 text-left text-xs text-muted-foreground">
						<th class="px-4 py-2 font-medium">Élève</th>
						<th class="px-4 py-2 font-medium">Avancement</th>
						<th class="px-4 py-2 text-right font-medium">Maîtrisé</th>
						<th class="px-4 py-2 text-right font-medium">À retravailler</th>
						<th class="px-4 py-2 text-right font-medium">Dernière activité</th>
					</tr>
				</thead>
				<tbody>
					{#each rows as row (row.studentId)}
						<tr class="border-b last:border-b-0">
							<td class="px-4 py-2 font-medium">{row.displayName}</td>
							<td class="px-4 py-2">
								<div class="flex items-center gap-2">
									<div class="h-2 w-24 overflow-hidden rounded-full bg-muted">
										<div
											class="h-full rounded-full bg-primary"
											style="width: {progressPct(row.untouched)}%"
										></div>
									</div>
									<span class="text-xs text-muted-foreground tabular-nums">
										{data.exerciseCount - row.untouched}/{data.exerciseCount}
									</span>
								</div>
							</td>
							<td class="px-4 py-2 text-right tabular-nums">{row.mastered}</td>
							<td class="px-4 py-2 text-right">
								{#if row.needsReview > 0}
									<Badge variant="destructive" class="tabular-nums">{row.needsReview}</Badge>
								{:else}
									<span class="text-muted-foreground">—</span>
								{/if}
							</td>
							<td class="px-4 py-2 text-right text-xs text-muted-foreground">
								{relativeDate(row.lastActivityAt)}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<p class="text-xs text-muted-foreground">
			L'avancement vient de l'auto-évaluation que l'élève pose exercice par exercice dans sa vue
			fiche. C'est une déclaration, pas une correction : lis-la comme un signal d'alerte.
		</p>
	{/if}
</div>
