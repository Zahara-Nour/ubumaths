<!--
	Taux de réussite de la classe par notion, dépliable en points (chantier
	`taux-par-point`, besoin P3). Réponses corrigées (appli ou prof) depuis la
	rentrée ; chaque élève pèse autant ; moins de 3 élèves → pas de taux.
	Cf. `docs/systeme/analytique-prof.md`.
-->
<script lang="ts">
	import { lore } from '$lib/config/lore';
	import { ChevronRight } from '@lucide/svelte';
	import InlineMarkdown from '$lib/components/markdown/InlineMarkdown.svelte';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import * as Card from '$lib/components/ui/card';
	import { Progress } from '$lib/components/ui/progress';

	// Types

	interface SuccessRate {
		rate: number | null;
		students: number;
		onlyDeclared: boolean;
	}
	interface PointRate extends SuccessRate {
		id: string;
		name: string;
	}
	interface NotionRate extends SuccessRate {
		id: string | null;
		name: string | null;
		branch_name: string | null;
		points: PointRate[];
	}

	interface Props {
		classId: string;
		refreshNonce?: number;
	}

	// Constantes

	/** Clé d'une notion dans `expanded` (points hors arbre : pas d'identifiant) */
	const NO_NOTION = '__sans-notion__';

	// Variables

	let { classId, refreshNonce = 0 }: Props = $props();

	let notions = $state<NotionRate[]>([]);
	let loading = $state(false);
	let error = $state<string | null>(null);
	let expanded = $state<string[]>([]);
	/** Jeton de la dernière requête : une réponse périmée ne remplace pas la plus récente */
	let requestSeq = 0;

	const nothingProved = $derived(notions.length > 0 && notions.every((n) => n.students === 0));

	// Functions

	async function load(forClass: string) {
		const seq = ++requestSeq;
		loading = true;
		error = null;
		try {
			const res = await fetch(`/api/teacher/classes/${forClass}/analytics/success-rate`);
			if (seq !== requestSeq) return;
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				if (seq === requestSeq) error = body.error ?? `Erreur ${res.status}`;
				return;
			}
			const data = (await res.json()) as { notions: NotionRate[] };
			if (seq === requestSeq) notions = data.notions;
		} catch (e) {
			if (seq === requestSeq) error = e instanceof Error ? e.message : 'Erreur réseau';
		} finally {
			if (seq === requestSeq) loading = false;
		}
	}

	$effect(() => {
		void refreshNonce;
		void load(classId);
	});

	function keyOf(notion: NotionRate): string {
		return notion.id ?? NO_NOTION;
	}

	function toggle(notion: NotionRate) {
		const key = keyOf(notion);
		expanded = expanded.includes(key) ? expanded.filter((k) => k !== key) : [...expanded, key];
	}

	function percent(rate: number): number {
		return Math.round(rate * 100);
	}

	function studentsLabel(count: number): string {
		return `${count} ${lore.entities.student}${count > 1 ? 's' : ''}`;
	}
</script>

{#snippet rateLine(r: SuccessRate)}
	{#if r.rate !== null}
		<span class="font-semibold tabular-nums">{percent(r.rate)} %</span>
		<span class="text-xs text-muted-foreground">· {studentsLabel(r.students)}</span>
	{:else if r.onlyDeclared}
		<span class="text-xs text-muted-foreground">Seulement déclaré</span>
	{:else}
		<span class="text-xs text-muted-foreground"
			>Pas assez de réponses · {studentsLabel(r.students)}</span
		>
	{/if}
{/snippet}

<Card.Root>
	<Card.Header>
		<Card.Title>Taux de réussite</Card.Title>
		<Card.Description
			>Réponses corrigées (par l'appli ou par vous) depuis la rentrée ; chaque {lore.entities
				.student} pèse autant. Les cartes auto-évaluées ne comptent pas.</Card.Description
		>
	</Card.Header>

	<Card.Content>
		{#if loading}
			<div class="space-y-2">
				<Skeleton class="h-10 w-full" />
				<Skeleton class="h-10 w-full" />
				<Skeleton class="h-10 w-full" />
			</div>
		{:else if error}
			<p class="text-sm text-destructive">⚠ {error}</p>
		{:else if notions.length === 0}
			<p class="py-8 text-center text-sm text-muted-foreground">
				Aucune réponse depuis la rentrée.
			</p>
		{:else}
			{#if nothingProved}
				<p class="mb-3 text-sm text-muted-foreground">
					Aucune réponse corrigée depuis la rentrée : seulement des cartes auto-évaluées.
				</p>
			{/if}
			<ul class="space-y-2">
				{#each notions as notion (keyOf(notion))}
					{@const open = expanded.includes(keyOf(notion))}
					<li class="rounded-md border border-border">
						<button
							type="button"
							class="flex w-full items-center gap-3 p-3 text-left hover:bg-muted/50"
							aria-expanded={open}
							onclick={() => toggle(notion)}
						>
							<ChevronRight
								class="h-4 w-4 shrink-0 text-muted-foreground transition-transform {open
									? 'rotate-90'
									: ''}"
							/>
							<div class="min-w-0 flex-1">
								<div class="flex flex-wrap items-baseline gap-x-2">
									<span class="font-medium">{notion.name ?? 'Points sans notion'}</span>
									{#if notion.branch_name}
										<span class="text-xs text-muted-foreground">{notion.branch_name}</span>
									{/if}
								</div>
								{#if notion.rate !== null}
									<Progress value={percent(notion.rate)} class="mt-2 h-1.5" />
								{/if}
							</div>
							<div class="shrink-0 text-right">{@render rateLine(notion)}</div>
						</button>
						{#if open}
							<ul class="space-y-1 border-t border-border px-3 py-2">
								{#each notion.points as point (point.id)}
									<li class="flex items-center justify-between gap-3 py-1 pl-7 text-sm">
										<span class="min-w-0"><InlineMarkdown content={point.name} /></span>
										<span class="shrink-0 text-right">{@render rateLine(point)}</span>
									</li>
								{/each}
							</ul>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
	</Card.Content>
</Card.Root>
