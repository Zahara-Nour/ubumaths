<!--
	Widget F — Grille élève × 6 compétences math (famille B).

	Cellules : niveau visuel (◯ insuffisante / 🟠 fragile / 🟢 satisfaisante / ✨ très bonne).
	Chip de fraîcheur "dernière saisie il y a X jours".
-->
<script lang="ts">
	import { lore } from '$lib/config/lore';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import {
		formatMathCompetenceLevel,
		getMathCompetenceLevelVisual,
		type MathCompetenceLevel
	} from '$lib/types/skills';

	interface ClassStudent {
		id: string;
		display_name: string;
	}
	interface MathCompetence {
		id: string;
		code: string;
		name: string;
		display_order: number;
	}
	interface GridData {
		students: ClassStudent[];
		competences: MathCompetence[];
		cells: Record<string, MathCompetenceLevel | null>;
		columnSatisfaitPct: Record<string, number>;
		last_saisie_at: string | null;
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

	async function load() {
		loading = true;
		error = null;
		try {
			const res = await fetch(`/api/teacher/classes/${classId}/analytics/competence-grid`);
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
		void classId;
		void refreshNonce;
		void load();
	});

	function displayName(s: ClassStudent, idx: number): string {
		return anonymized ? `Élève ${idx + 1}` : s.display_name;
	}

	function freshnessLabel(iso: string | null): string {
		if (!iso) return 'Aucune saisie';
		const days = Math.floor((Date.now() - new Date(iso).getTime()) / (24 * 3600 * 1000));
		if (days <= 0) return "Dernière saisie : aujourd'hui";
		if (days === 1) return 'Dernière saisie : hier';
		return `Dernière saisie : il y a ${days} jours`;
	}
</script>

<Card.Root>
	<Card.Header>
		<div class="flex flex-wrap items-center justify-between gap-2">
			<div>
				<Card.Title>Grille compétences math × {lore.entities.student}s</Card.Title>
				<Card.Description>Niveaux famille B saisis par le prof (6 compétences).</Card.Description>
			</div>
			{#if data}
				<Badge variant="secondary" class="text-xs">{freshnessLabel(data.last_saisie_at)}</Badge>
			{/if}
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
			<p class="py-8 text-center text-sm text-muted-foreground">
				Aucun {lore.entities.student} dans cette classe.
			</p>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full border-collapse text-sm" aria-label="Grille compétences × élèves">
					<thead>
						<tr class="border-b border-border">
							<th class="sticky left-0 z-10 bg-background px-2 py-2 text-left font-medium">
								{lore.entities.student}
							</th>
							{#each data.competences as comp (comp.id)}
								<th
									class="min-w-[4rem] px-1 py-2 text-center align-bottom text-xs font-normal"
									title={comp.name}
								>
									<div class="flex flex-col items-center gap-0.5">
										<span class="line-clamp-2 max-w-[5rem]">{comp.name}</span>
										<Badge variant="outline" class="text-[0.6rem]">{comp.code}</Badge>
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
								{#each data.competences as comp (comp.id)}
									{@const lvl = data.cells[`${student.id}:${comp.id}`]}
									<td
										class="px-1 py-2 text-center"
										title={lvl ? formatMathCompetenceLevel(lvl) : 'Non saisi'}
									>
										<span
											class="text-lg"
											aria-label={lvl ? formatMathCompetenceLevel(lvl) : 'Non saisi'}
										>
											{lvl ? getMathCompetenceLevelVisual(lvl) : '◯'}
										</span>
									</td>
								{/each}
							</tr>
						{/each}
					</tbody>
					<tfoot>
						<tr class="border-t-2 border-border bg-muted/30 text-xs">
							<td class="sticky left-0 z-10 bg-muted/30 px-2 py-2 font-medium">
								% satisfaisante+
							</td>
							{#each data.competences as comp (comp.id)}
								{@const pct = data.columnSatisfaitPct[comp.id] ?? 0}
								<td class="px-1 py-2 text-center text-emerald-600 dark:text-emerald-400">
									{pct}%
								</td>
							{/each}
						</tr>
					</tfoot>
				</table>
			</div>
		{/if}
	</Card.Content>
</Card.Root>
