<!--
	Widget G — Top observables famille B où le % minus est le plus élevé.
-->
<script lang="ts">
	import { Users } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import * as Card from '$lib/components/ui/card';
	import { Progress } from '$lib/components/ui/progress';
	import AnalyticsModal from './AnalyticsModal.svelte';

	interface StudentRef {
		student_id: string;
		display_name: string;
		last_attempt_at: string | null;
	}
	interface TopRow {
		skill_id: string;
		observable_code: string | null;
		skill_name: string;
		subdimension_letter: string | null;
		subdimension_name: string | null;
		competence_code: string | null;
		students_concerned: StudentRef[];
		minus_pct: number;
	}

	interface Props {
		classId: string;
		refreshNonce?: number;
	}

	let { classId, refreshNonce = 0 }: Props = $props();

	let rows = $state<TopRow[]>([]);
	let loading = $state(false);
	let error = $state<string | null>(null);

	let modalOpen = $state(false);
	let modalTitle = $state('');
	let modalStudents = $state<{ student_id: string; display_name: string; caption?: string }[]>([]);

	async function load() {
		loading = true;
		error = null;
		try {
			const res = await fetch(
				`/api/teacher/classes/${classId}/analytics/competence-top-consolidate?topN=10`
			);
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				error = body.error ?? `Erreur ${res.status}`;
				return;
			}
			const data = (await res.json()) as { rows: TopRow[] };
			rows = data.rows;
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

	function openModal(row: TopRow) {
		modalTitle = row.skill_name;
		modalStudents = row.students_concerned.map((s) => ({
			student_id: s.student_id,
			display_name: s.display_name,
			caption: s.last_attempt_at ? new Date(s.last_attempt_at).toLocaleDateString('fr-FR') : '—'
		}));
		modalOpen = true;
	}
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>Top observables à consolider</Card.Title>
		<Card.Description>Observables famille B avec le plus haut % de moins.</Card.Description>
	</Card.Header>

	<Card.Content>
		{#if loading}
			<div class="space-y-2">
				<Skeleton class="h-12 w-full" />
				<Skeleton class="h-12 w-full" />
				<Skeleton class="h-12 w-full" />
			</div>
		{:else if error}
			<p class="text-sm text-destructive">⚠ {error}</p>
		{:else if rows.length === 0}
			<p class="py-8 text-center text-sm text-muted-foreground">
				Bravo, tous les observables observés sont validés 🎉
			</p>
		{:else}
			<ul class="space-y-3">
				{#each rows as row (row.skill_id)}
					<li class="rounded-md border border-border p-3">
						<div class="flex items-center justify-between gap-2">
							<div class="min-w-0 flex-1">
								<div class="flex items-center gap-2">
									<span class="truncate font-medium">{row.skill_name}</span>
									{#if row.observable_code}
										<Badge variant="outline" class="text-xs">{row.observable_code}</Badge>
									{/if}
									{#if row.competence_code}
										<Badge variant="secondary" class="text-xs">{row.competence_code}</Badge>
									{/if}
								</div>
								<Progress value={row.minus_pct} class="mt-2 h-2" />
								<p class="mt-1 text-xs text-muted-foreground">
									{row.minus_pct}% des élèves observés en minus ({row.students_concerned.length} élève{row
										.students_concerned.length > 1
										? 's'
										: ''})
								</p>
							</div>
							<Button variant="outline" size="sm" onclick={() => openModal(row)}>
								<Users class="mr-1 h-4 w-4" />
								Voir
							</Button>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</Card.Content>
</Card.Root>

<AnalyticsModal
	bind:open={modalOpen}
	title={modalTitle}
	description="Élèves observés en minus sur cet observable."
	students={modalStudents}
/>
