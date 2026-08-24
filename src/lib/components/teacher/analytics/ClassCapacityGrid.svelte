<!--
	Widget A — Grille élève × capacité famille A.

	Affiche un badge FSRS par cellule (🆘 / 🔁 / ⏳ / ✅ / ◯).
	Toggles : "Trier par % acquise desc", "Inclure tout le cycle".
	Mode projection (anonymisation) reçu via prop pour cohérence page.
-->
<script lang="ts">
	import { lore } from '$lib/config/lore';
	import { ArrowUpDown, AlertCircle, RefreshCw, Clock, CheckCircle, Circle } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { Badge } from '$lib/components/ui/badge';
	import MyCheckbox from '$lib/components/MyCheckbox.svelte';
	import * as Card from '$lib/components/ui/card';
	import type { CapacityBadge } from '$lib/server/srs/capacity-badge';

	interface ClassStudent {
		id: string;
		display_name: string;
	}
	interface ClassCapacity {
		id: string;
		name: string;
		theme_code: string | null;
		theme_name: string | null;
	}
	interface GridData {
		students: ClassStudent[];
		capacities: ClassCapacity[];
		cells: Record<string, CapacityBadge>;
		columnStats: Record<string, { acquise_pct: number; remediate_pct: number }>;
	}

	interface Props {
		classId: string;
		anonymized?: boolean;
		refreshNonce?: number;
	}

	let { classId, anonymized = false, refreshNonce = 0 }: Props = $props();

	let data = $state<GridData | null>(null);
	let loading = $state(false);
	let error = $state<string | null>(null);
	let sortByAcquired = $state(false);
	let includeAllCycle = $state(false);

	async function load() {
		loading = true;
		error = null;
		try {
			const url = `/api/teacher/classes/${classId}/analytics/knowledge-grid?includeAllCycle=${includeAllCycle}`;
			const res = await fetch(url);
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				error = body.error ?? `Erreur ${res.status}`;
				return;
			}
			data = (await res.json()) as GridData;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Erreur réseau';
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		// Dependencies tracked: classId, includeAllCycle, refreshNonce.
		void classId;
		void includeAllCycle;
		void refreshNonce;
		void load();
	});

	const orderedCapacities = $derived.by(() => {
		if (!data) return [];
		if (!sortByAcquired) return data.capacities;
		const stats = data.columnStats;
		return [...data.capacities].sort(
			(a, b) => (stats[b.id]?.acquise_pct ?? 0) - (stats[a.id]?.acquise_pct ?? 0)
		);
	});

	function badgeMeta(badge: CapacityBadge) {
		return (
			{
				a_remedier: { icon: AlertCircle, color: 'text-red-600', label: 'À remédier' },
				a_renforcer: { icon: RefreshCw, color: 'text-amber-600', label: 'À renforcer' },
				en_apprentissage: { icon: Clock, color: 'text-blue-600', label: 'En apprentissage' },
				acquise_en_memoire: { icon: CheckCircle, color: 'text-emerald-600', label: 'Acquise' },
				non_commencee: { icon: Circle, color: 'text-muted-foreground', label: 'Non commencée' }
			} as const
		)[badge];
	}

	function displayName(s: ClassStudent, idx: number): string {
		return anonymized ? `Élève ${idx + 1}` : s.display_name;
	}
</script>

<Card.Root>
	<Card.Header>
		<div class="flex flex-wrap items-center justify-between gap-2">
			<div>
				<Card.Title>Grille capacités × {lore.entities.student}s</Card.Title>
				<Card.Description>État actuel agrégé via FSRS-6 (famille A).</Card.Description>
			</div>
			<div class="flex flex-wrap items-center gap-3">
				<MyCheckbox bind:checked={includeAllCycle} label="Tout le cycle" />
				<Button
					variant="ghost"
					size="sm"
					onclick={() => (sortByAcquired = !sortByAcquired)}
					aria-pressed={sortByAcquired}
				>
					<ArrowUpDown class="mr-2 h-4 w-4" />
					{sortByAcquired ? 'Tri : % acquise' : 'Tri : ordre BO'}
				</Button>
			</div>
		</div>
	</Card.Header>

	<Card.Content>
		{#if loading}
			<div class="space-y-2">
				<Skeleton class="h-8 w-full" />
				<Skeleton class="h-8 w-full" />
				<Skeleton class="h-8 w-full" />
			</div>
		{:else if error}
			<p class="text-sm text-destructive">⚠ {error}</p>
		{:else if !data || data.students.length === 0}
			<p class="py-8 text-center text-sm text-muted-foreground">Aucun élève dans cette classe.</p>
		{:else if orderedCapacities.length === 0}
			<p class="py-8 text-center text-sm text-muted-foreground">
				Aucune capacité famille A travaillée pour le moment.
			</p>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full border-collapse text-sm" aria-label="Grille capacités × élèves">
					<thead>
						<tr class="border-b border-border">
							<th class="sticky left-0 z-10 bg-background px-2 py-2 text-left font-medium">
								{lore.entities.student}
							</th>
							{#each orderedCapacities as cap (cap.id)}
								<th
									class="min-w-[3rem] px-1 py-2 text-center align-bottom text-xs font-normal"
									title={cap.name}
								>
									<div class="flex flex-col items-center gap-0.5">
										<span class="line-clamp-2 max-w-[5rem]">{cap.name}</span>
										{#if cap.theme_code}
											<Badge variant="outline" class="text-[0.6rem]">{cap.theme_code}</Badge>
										{/if}
									</div>
								</th>
							{/each}
						</tr>
					</thead>
					<tbody>
						{#each data.students as student, idx (student.id)}
							<tr class="border-b border-border/50">
								<td
									class="sticky left-0 z-10 max-w-[10rem] truncate bg-background px-2 py-2 font-medium"
								>
									{displayName(student, idx)}
								</td>
								{#each orderedCapacities as cap (cap.id)}
									{@const badge = data.cells[`${student.id}:${cap.id}`] ?? 'non_commencee'}
									{@const meta = badgeMeta(badge)}
									<td
										class="px-1 py-2 text-center {meta.color}"
										title={`${student.display_name} — ${cap.name} : ${meta.label}`}
									>
										<meta.icon class="mx-auto h-4 w-4" aria-label={meta.label} />
									</td>
								{/each}
							</tr>
						{/each}
					</tbody>
					<tfoot>
						<tr class="border-t-2 border-border bg-muted/30 text-xs">
							<td class="sticky left-0 z-10 bg-muted/30 px-2 py-2 font-medium">
								% acquise / % à remédier
							</td>
							{#each orderedCapacities as cap (cap.id)}
								{@const stats = data.columnStats[cap.id] ?? { acquise_pct: 0, remediate_pct: 0 }}
								<td class="px-1 py-2 text-center">
									<span class="text-emerald-600 dark:text-emerald-400">{stats.acquise_pct}%</span>
									<span class="text-muted-foreground"> / </span>
									<span class="text-red-600 dark:text-red-400">{stats.remediate_pct}%</span>
								</td>
							{/each}
						</tr>
					</tfoot>
				</table>
			</div>
		{/if}
	</Card.Content>
</Card.Root>
