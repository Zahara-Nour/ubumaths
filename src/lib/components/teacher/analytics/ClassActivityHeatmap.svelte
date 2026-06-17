<!--
	Widget C — Heatmap activité classe (élève × jour, sur 30 derniers jours).

	Cellule coloriée selon le count de reviews. Bande "alerte" pour élèves
	sans review depuis > 5 jours (paramétré).
-->
<script lang="ts">
	import { AlertTriangle } from '@lucide/svelte';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';

	interface HeatmapStudent {
		id: string;
		display_name: string;
		days_since_last_review: number | null;
		is_alert: boolean;
	}
	interface HeatmapCell {
		student_id: string;
		day: string;
		review_count: number;
		success_pct: number;
	}
	interface HeatmapData {
		days: string[];
		students: HeatmapStudent[];
		cells: HeatmapCell[];
	}

	interface Props {
		classId: string;
		anonymized?: boolean;
		days?: number;
		alertThresholdDays?: number;
		refreshNonce?: number;
	}

	let {
		classId,
		anonymized = false,
		days = 30,
		alertThresholdDays = 5,
		refreshNonce = 0
	}: Props = $props();

	let data = $state<HeatmapData | null>(null);
	let loading = $state(false);
	let error = $state<string | null>(null);

	async function load() {
		loading = true;
		error = null;
		try {
			const url = `/api/teacher/classes/${classId}/analytics/knowledge-heatmap?days=${days}&alertThresholdDays=${alertThresholdDays}`;
			const res = await fetch(url);
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				error = body.error ?? `Erreur ${res.status}`;
				return;
			}
			data = (await res.json()) as HeatmapData;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Erreur réseau';
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		void classId;
		void refreshNonce;
		void days;
		void alertThresholdDays;
		void load();
	});

	const cellMap = $derived.by(() => {
		const map = new Map<string, HeatmapCell>();
		if (!data) return map;
		for (const c of data.cells) {
			map.set(`${c.student_id}:${c.day}`, c);
		}
		return map;
	});

	function cellColor(count: number): string {
		if (count === 0) return 'bg-muted';
		if (count <= 2) return 'bg-emerald-200 dark:bg-emerald-900';
		if (count <= 5) return 'bg-emerald-400 dark:bg-emerald-700';
		if (count <= 10) return 'bg-emerald-600 dark:bg-emerald-500';
		return 'bg-emerald-800 dark:bg-emerald-400';
	}

	function studentDisplay(s: HeatmapStudent, idx: number): string {
		return anonymized ? `Élève ${idx + 1}` : s.display_name;
	}

	function alertChip(days: number | null): string {
		if (days === null) return 'jamais';
		if (days === 1) return '1 jour';
		return `${days} jours`;
	}
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>Activité quotidienne</Card.Title>
		<Card.Description>
			Reviews/jour sur {days} derniers jours. Alerte si > {alertThresholdDays} jours sans review.
		</Card.Description>
	</Card.Header>

	<Card.Content>
		{#if loading}
			<Skeleton class="h-40 w-full" />
		{:else if error}
			<p class="text-sm text-destructive">⚠ {error}</p>
		{:else if !data || data.students.length === 0}
			<p class="py-8 text-center text-sm text-muted-foreground">Aucun élève dans cette classe.</p>
		{:else}
			<div class="overflow-x-auto">
				<table class="border-collapse text-xs" aria-label="Heatmap d'activité">
					<thead>
						<tr>
							<th class="sticky left-0 z-10 bg-background px-2 py-1 text-left">Élève</th>
							<th class="sticky left-[5rem] z-10 bg-background px-2 py-1 text-left">Alerte</th>
							{#each data.days as day, i (day)}
								<th
									class="min-w-[14px] px-0 py-1 text-center text-[0.55rem] font-normal text-muted-foreground"
								>
									{i % 5 === 0 ? day.slice(5) : ''}
								</th>
							{/each}
						</tr>
					</thead>
					<tbody>
						{#each data.students as student, idx (student.id)}
							<tr>
								<td
									class="sticky left-0 z-10 max-w-[10rem] truncate bg-background px-2 py-1 font-medium"
								>
									{studentDisplay(student, idx)}
								</td>
								<td class="sticky left-[5rem] z-10 bg-background px-2 py-1">
									{#if student.is_alert}
										<Badge variant="destructive" class="gap-1 text-[0.6rem]">
											<AlertTriangle class="h-3 w-3" />
											{alertChip(student.days_since_last_review)}
										</Badge>
									{:else}
										<span class="text-muted-foreground">—</span>
									{/if}
								</td>
								{#each data.days as day (day)}
									{@const cell = cellMap.get(`${student.id}:${day}`)}
									{@const count = cell?.review_count ?? 0}
									<td class="px-0 py-1">
										<div
											class="mx-auto h-3 w-3 rounded-sm {cellColor(count)}"
											title={count > 0
												? `${student.display_name} — ${day} : ${count} review${count > 1 ? 's' : ''} (${cell?.success_pct ?? 0}% succès)`
												: `${student.display_name} — ${day} : aucune review`}
										></div>
									</td>
								{/each}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</Card.Content>
</Card.Root>
