<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import MySelect from '$lib/components/MySelect.svelte';
	import { ArrowLeft, Users, CheckCircle2, XCircle, CircleDashed, Sparkles } from 'lucide-svelte';
	import type { PageData } from './$types';
	import type { CheckpointStatus } from '$lib/types/notebook';

	let { data }: { data: PageData } = $props();

	// Class filter
	let selectedClassId = $state<string>('all');

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

	const filteredRows = $derived(
		selectedClassId === 'all'
			? data.rows
			: data.rows.filter((r) => studentClasses[r.student.id]?.[selectedClassId])
	);

	// Sort rows by student name (lastname, firstname) for predictable order.
	const sortedRows = $derived(
		[...filteredRows].sort((a, b) => {
			const nameA = `${a.student.lastname ?? ''} ${a.student.firstname ?? ''}`.trim().toLowerCase();
			const nameB = `${b.student.lastname ?? ''} ${b.student.firstname ?? ''}`.trim().toLowerCase();
			return nameA.localeCompare(nameB);
		})
	);

	// Stats
	const stats = $derived.by(() => {
		const rows = filteredRows;
		const totalStudents = rows.length;
		const checkpoints = data.checkpoints;
		const totalCheckpoints = checkpoints.length;

		// Students who have run at least one checkpoint
		const started = rows.filter((r) => Object.keys(r.statuses).length > 0).length;

		// Students who have passed ALL checkpoints in the notebook
		const fullyPassed = totalCheckpoints
			? rows.filter((r) => checkpoints.every((cp) => r.statuses[cp.cell_id] === 'passed')).length
			: 0;

		// % of (student × checkpoint) cells that are passed
		const totalCells = totalStudents * totalCheckpoints;
		const passedCells = rows.reduce(
			(acc, r) => acc + checkpoints.filter((cp) => r.statuses[cp.cell_id] === 'passed').length,
			0
		);
		const overallPassRate = totalCells === 0 ? 0 : Math.round((passedCells / totalCells) * 100);

		return { totalStudents, started, fullyPassed, overallPassRate };
	});

	function statusIcon(status: CheckpointStatus | undefined) {
		return status === 'passed' ? CheckCircle2 : status === 'failed' ? XCircle : CircleDashed;
	}

	function statusClass(status: CheckpointStatus | undefined): string {
		if (status === 'passed') return 'text-emerald-600 dark:text-emerald-400';
		if (status === 'failed') return 'text-destructive';
		return 'text-muted-foreground';
	}

	function statusLabel(status: CheckpointStatus | undefined): string {
		if (status === 'passed') return 'Réussi';
		if (status === 'failed') return 'Échec';
		return 'Non vérifié';
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
			<p class="text-sm text-muted-foreground">Statut des checkpoints par élève</p>
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
		<div class="mb-6 grid gap-4 md:grid-cols-4">
			<Card.Root>
				<Card.Header class="pb-2">
					<Card.Title class="flex items-center gap-2 text-sm font-medium text-muted-foreground">
						<Users class="size-4" />
						Élèves concernés
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
						Taux de réussite global
					</Card.Title>
				</Card.Header>
				<Card.Content>
					<p class="text-2xl font-bold">{stats.overallPassRate}%</p>
				</Card.Content>
			</Card.Root>
		</div>

		<!-- Class filter -->
		{#if data.teacherClasses.length > 1}
			<div class="mb-4 flex items-center gap-2">
				<label for="class-filter" class="text-sm font-medium">Filtrer par classe :</label>
				<div class="w-64">
					<MySelect type="single" bind:value={selectedClassId} items={classItems} />
				</div>
			</div>
		{/if}

		<!-- Table -->
		<Card.Root>
			<Card.Content class="pt-6">
				{#if sortedRows.length === 0}
					<p class="py-8 text-center text-sm text-muted-foreground">
						Aucun élève dans la sélection actuelle.
					</p>
				{:else}
					<div class="overflow-x-auto">
						<Table.Root>
							<Table.Header>
								<Table.Row>
									<Table.Head class="min-w-48">Élève</Table.Head>
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
											{@const status = row.statuses[cp.cell_id]}
											{@const Icon = statusIcon(status)}
											<Table.Cell class="text-center">
												<span
													class="inline-flex items-center gap-1 {statusClass(status)}"
													title={statusLabel(status)}
												>
													<Icon class="size-4" />
													<span class="sr-only">{statusLabel(status)}</span>
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
