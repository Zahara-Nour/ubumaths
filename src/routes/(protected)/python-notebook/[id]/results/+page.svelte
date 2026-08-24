<script lang="ts">
	import { lore } from '$lib/config/lore';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import MySelect from '$lib/components/MySelect.svelte';
	import MyCheckbox from '$lib/components/MyCheckbox.svelte';
	import {
		ArrowLeft,
		Users,
		CheckCircle2,
		XCircle,
		CircleDashed,
		Sparkles,
		Lightbulb
	} from '@lucide/svelte';
	import type { PageData } from './$types';
	import type { CheckpointDetail } from '$lib/types/database-helpers';

	let { data }: { data: PageData } = $props();

	/** Threshold for the "struggled" filter — strictly more than this means we surface it. */
	const STRUGGLED_THRESHOLD = 5;

	// Class filter
	let selectedClassId = $state<string>('all');
	// Filter: show only students with at least one checkpoint they struggled
	// on (> STRUGGLED_THRESHOLD attempts on a single checkpoint).
	let showStruggledOnly = $state(false);

	const classItems = $derived([
		{ value: 'all', label: 'Toutes mes classes' },
		...data.teacherClasses.map((c) => ({ value: c.id, label: c.name }))
	]);

	const studentClasses = $derived.by(() => {
		const obj: Record<string, Record<string, true>> = {};
		for (const m of data.classMembers) {
			(obj[m.student_id] ??= {})[m.class_id] = true;
		}
		return obj;
	});

	function hasStruggled(row: { details: Record<string, CheckpointDetail> }): boolean {
		return Object.values(row.details).some((d) => d.attemptCount > STRUGGLED_THRESHOLD);
	}

	const filteredRows = $derived.by(() => {
		let rows = data.rows;
		if (selectedClassId !== 'all') {
			rows = rows.filter((r) => studentClasses[r.student.id]?.[selectedClassId]);
		}
		if (showStruggledOnly) {
			rows = rows.filter(hasStruggled);
		}
		return rows;
	});

	// Sort rows by student name (lastname, firstname) for predictable order.
	const sortedRows = $derived(
		[...filteredRows].sort((a, b) => {
			const nameA = `${a.student.lastname ?? ''} ${a.student.firstname ?? ''}`.trim().toLowerCase();
			const nameB = `${b.student.lastname ?? ''} ${b.student.firstname ?? ''}`.trim().toLowerCase();
			return nameA.localeCompare(nameB);
		})
	);

	// Stats — computed over `filteredRows` so the filter affects them too.
	const stats = $derived.by(() => {
		const rows = filteredRows;
		const totalStudents = rows.length;
		const checkpoints = data.checkpoints;
		const totalCheckpoints = checkpoints.length;

		// Students who have run at least one checkpoint
		const started = rows.filter((r) => Object.keys(r.details).length > 0).length;

		// Students who have passed ALL checkpoints in the notebook
		const fullyPassed = totalCheckpoints
			? rows.filter((r) => checkpoints.every((cp) => r.details[cp.cell_id]?.status === 'passed'))
					.length
			: 0;

		// % of (student × checkpoint) cells that are passed
		const totalCells = totalStudents * totalCheckpoints;
		const passedCells = rows.reduce(
			(acc, r) =>
				acc + checkpoints.filter((cp) => r.details[cp.cell_id]?.status === 'passed').length,
			0
		);
		const overallPassRate = totalCells === 0 ? 0 : Math.round((passedCells / totalCells) * 100);

		// Mean attempts on PASSED checkpoints (a measure of "how hard the
		// problem was for them" — failing students never closed the loop so
		// they'd skew the average). Rounded to 1 decimal.
		const passedAttemptCounts = rows.flatMap((r) =>
			Object.values(r.details)
				.filter((d) => d.status === 'passed')
				.map((d) => d.attemptCount)
		);
		const meanAttempts =
			passedAttemptCounts.length === 0
				? 0
				: Math.round(
						(passedAttemptCounts.reduce((a, b) => a + b, 0) / passedAttemptCounts.length) * 10
					) / 10;

		// % of run rows where the hint was revealed at least once
		const allRuns = rows.flatMap((r) => Object.values(r.details));
		const hintsRevealed = allRuns.filter((d) => d.hintRevealed).length;
		const hintsRate = allRuns.length === 0 ? 0 : Math.round((hintsRevealed / allRuns.length) * 100);

		return {
			totalStudents,
			started,
			fullyPassed,
			overallPassRate,
			meanAttempts,
			hintsRate
		};
	});

	/**
	 * `attemptCount === 0` is the placeholder row written when the student
	 * revealed the hint before ever pressing Vérifier — we render it as
	 * "not yet attempted" (CircleDashed) rather than "failed" even though
	 * the row carries `status='failed'` to satisfy the NOT NULL column.
	 */
	function isPlaceholder(detail: CheckpointDetail | undefined): boolean {
		return detail !== undefined && detail.attemptCount === 0;
	}

	function statusIcon(detail: CheckpointDetail | undefined) {
		if (!detail || isPlaceholder(detail)) return CircleDashed;
		return detail.status === 'passed' ? CheckCircle2 : XCircle;
	}

	function statusClass(detail: CheckpointDetail | undefined): string {
		if (!detail || isPlaceholder(detail)) return 'text-muted-foreground';
		if (detail.status === 'passed') return 'text-emerald-600 dark:text-emerald-400';
		return 'text-destructive';
	}

	function statusLabel(detail: CheckpointDetail | undefined): string {
		if (!detail) return 'Non vérifié';
		if (isPlaceholder(detail)) return 'Indice révélé sans essai';
		return detail.status === 'passed' ? 'Réussi' : 'Échec';
	}

	/**
	 * Tooltip with the full timing story for a cell. Shown in `title=` on
	 * the cell's container so the teacher sees it on hover.
	 */
	function cellTooltip(detail: CheckpointDetail | undefined): string {
		if (!detail) return 'Non vérifié';
		const parts: string[] = [];
		if (isPlaceholder(detail)) {
			parts.push('Indice révélé sans essai');
		} else {
			parts.push(
				`${statusLabel(detail)} — ${detail.attemptCount} essai${detail.attemptCount > 1 ? 's' : ''}`
			);
			if (detail.firstAttemptedAt) {
				parts.push(`Premier essai : ${formatDateTime(detail.firstAttemptedAt)}`);
			}
			if (detail.succeededAt) {
				parts.push(`Réussi : ${formatDateTime(detail.succeededAt)}`);
			}
			if (detail.hintRevealed) {
				parts.push('Indice révélé');
			}
		}
		return parts.join('\n');
	}

	function formatDateTime(iso: string): string {
		try {
			return new Date(iso).toLocaleString('fr-FR', {
				day: '2-digit',
				month: '2-digit',
				hour: '2-digit',
				minute: '2-digit'
			});
		} catch {
			return iso;
		}
	}

	function checkpointLabel(cp: { cell_id: string; title: string | null; mode: string }): string {
		return cp.title ?? `Checkpoint (${cp.mode})`;
	}

	function handleBack(): void {
		void goto(`/python-notebook/${data.notebook.id}`);
	}
</script>

<div class="container mx-auto max-w-7xl px-4 py-6">
	<!-- Header -->
	<div class="mb-6 flex items-center gap-3">
		<Button variant="ghost" size="icon" onclick={handleBack} aria-label="Retour au notebook">
			<ArrowLeft class="size-5" />
		</Button>
		<div class="flex-1">
			<h1 class="text-2xl font-bold">Résultats : {data.notebook.title}</h1>
			<p class="text-sm text-muted-foreground">
				Statut des checkpoints par {lore.entities.student}
			</p>
		</div>
	</div>

	{#if data.checkpoints.length === 0}
		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2">
					<Sparkles class="size-5 text-amber-500" />
					Aucun checkpoint dans ce notebook
				</Card.Title>
				<Card.Description>
					Ajoutez des cellules de type Checkpoint depuis l'éditeur du notebook pour voir leurs
					résultats apparaître ici.
				</Card.Description>
			</Card.Header>
		</Card.Root>
	{:else}
		<!-- Stat cards -->
		<div class="mb-6 grid gap-4 md:grid-cols-3 lg:grid-cols-6">
			<Card.Root>
				<Card.Header class="pb-2">
					<Card.Title class="flex items-center gap-2 text-sm font-medium text-muted-foreground">
						<Users class="size-4" />
						{lore.entities.student}s concernés
					</Card.Title>
				</Card.Header>
				<Card.Content>
					<p class="text-2xl font-bold">{stats.totalStudents}</p>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header class="pb-2">
					<Card.Title class="flex items-center gap-2 text-sm font-medium text-muted-foreground">
						<Sparkles class="size-4" />
						Ont commencé
					</Card.Title>
				</Card.Header>
				<Card.Content>
					<p class="text-2xl font-bold">{stats.started}</p>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header class="pb-2">
					<Card.Title class="flex items-center gap-2 text-sm font-medium text-muted-foreground">
						<CheckCircle2 class="size-4 text-emerald-500" />
						Ont tout réussi
					</Card.Title>
				</Card.Header>
				<Card.Content>
					<p class="text-2xl font-bold">{stats.fullyPassed}</p>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header class="pb-2">
					<Card.Title class="flex items-center gap-2 text-sm font-medium text-muted-foreground">
						<CheckCircle2 class="size-4" />
						Taux de réussite
					</Card.Title>
				</Card.Header>
				<Card.Content>
					<p class="text-2xl font-bold">{stats.overallPassRate}%</p>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header class="pb-2">
					<Card.Title class="flex items-center gap-2 text-sm font-medium text-muted-foreground">
						<Sparkles class="size-4" />
						Essais moyens
					</Card.Title>
					<Card.Description class="text-[10px]">sur checkpoints réussis</Card.Description>
				</Card.Header>
				<Card.Content>
					<p class="text-2xl font-bold">{stats.meanAttempts || '—'}</p>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header class="pb-2">
					<Card.Title class="flex items-center gap-2 text-sm font-medium text-muted-foreground">
						<Lightbulb class="size-4 text-amber-500" />
						Indices révélés
					</Card.Title>
					<Card.Description class="text-[10px]">% des essais avec indice</Card.Description>
				</Card.Header>
				<Card.Content>
					<p class="text-2xl font-bold">{stats.hintsRate}%</p>
				</Card.Content>
			</Card.Root>
		</div>

		<!-- Filters: class + "struggled only" -->
		<div class="mb-4 flex flex-wrap items-center gap-4">
			{#if data.teacherClasses.length > 1}
				<div class="flex items-center gap-2">
					<label for="class-filter" class="text-sm font-medium">Filtrer par classe :</label>
					<div class="w-64">
						<MySelect type="single" bind:value={selectedClassId} items={classItems} />
					</div>
				</div>
			{/if}
			<MyCheckbox
				bind:checked={showStruggledOnly}
				label="Voir uniquement ceux qui ont galéré (> {STRUGGLED_THRESHOLD} essais)"
			/>
		</div>

		<!-- Table -->
		<Card.Root>
			<Card.Content class="pt-6">
				{#if sortedRows.length === 0}
					<p class="py-8 text-center text-sm text-muted-foreground">
						Aucun {lore.entities.student} dans la sélection actuelle.
					</p>
				{:else}
					<div class="overflow-x-auto">
						<Table.Root>
							<Table.Header>
								<Table.Row>
									<Table.Head class="min-w-48">{lore.entities.student}</Table.Head>
									{#each data.checkpoints as cp (cp.cell_id)}
										<Table.Head class="min-w-32 text-center">
											{checkpointLabel(cp)}
										</Table.Head>
									{/each}
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#each sortedRows as row (row.student.id)}
									<Table.Row>
										<Table.Cell class="font-medium">
											{row.student.lastname ?? ''}
											{row.student.firstname ?? ''}
											{#if !row.student.lastname && !row.student.firstname}
												<span class="text-muted-foreground">{row.student.email ?? '?'}</span>
											{/if}
										</Table.Cell>
										{#each data.checkpoints as cp (cp.cell_id)}
											{@const detail = row.details[cp.cell_id]}
											{@const Icon = statusIcon(detail)}
											<Table.Cell class="text-center">
												<span
													class="inline-flex items-center gap-1 {statusClass(detail)}"
													title={cellTooltip(detail)}
												>
													<Icon class="size-4" />
													{#if detail && !isPlaceholder(detail)}
														<span class="text-xs font-medium">
															{detail.attemptCount} essai{detail.attemptCount > 1 ? 's' : ''}
														</span>
													{/if}
													{#if detail?.hintRevealed}
														<Lightbulb class="size-3 text-amber-500" aria-label="Indice révélé" />
													{/if}
													<span class="sr-only">{statusLabel(detail)}</span>
												</span>
											</Table.Cell>
										{/each}
									</Table.Row>
								{/each}
							</Table.Body>
						</Table.Root>
					</div>
				{/if}
			</Card.Content>
		</Card.Root>
	{/if}
</div>
