<script lang="ts">
	import { resolve } from '$app/paths';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { Badge } from '$lib/components/ui/badge';
	import MySelect from '$lib/components/MySelect.svelte';
	import {
		BookOpen,
		CheckCircle2,
		Clock,
		Circle,
		AlertCircle,
		Check,
		X,
		ArrowUp,
		ArrowDown
	} from '@lucide/svelte';
	import type { PageData } from './$types';
	import type { MasteryStatus } from './+page.server';

	let { data }: { data: PageData } = $props();

	type SortKey = 'title' | 'attempts' | 'activity';
	type SortDir = 'asc' | 'desc';

	let selectedLevel = $state<string>('all');
	let selectedStatus = $state<string>('all');
	let sortBy = $state<SortKey>('activity');
	let sortDir = $state<SortDir>('desc');

	const levelItems = [
		{ value: 'all', label: 'Tous niveaux' },
		{ value: 'college', label: 'Collège' },
		{ value: 'lycee', label: 'Lycée' },
		{ value: 'nsi', label: 'NSI' },
		{ value: 'etudiant', label: 'Étudiant' }
	];

	const statusItems = [
		{ value: 'all', label: 'Tous statuts' },
		{ value: 'mastered', label: 'Maîtrisé' },
		{ value: 'needs_review', label: 'À retravailler' },
		{ value: 'not_started', label: 'Pas commencé' }
	];

	const filteredRows = $derived(
		data.rows.filter((r) => {
			if (selectedLevel !== 'all' && r.exercise.level !== selectedLevel) return false;
			if (selectedStatus !== 'all' && r.mastery_status !== selectedStatus) return false;
			return true;
		})
	);

	const sortedRows = $derived.by(() => {
		const rows = [...filteredRows];
		const dirSign = sortDir === 'asc' ? 1 : -1;
		rows.sort((a, b) => {
			if (sortBy === 'title') {
				return dirSign * a.exercise.title.localeCompare(b.exercise.title);
			}
			if (sortBy === 'attempts') {
				return dirSign * (a.total_attempts - b.total_attempts);
			}
			const tA = a.last_attempt_at ? new Date(a.last_attempt_at).getTime() : null;
			const tB = b.last_attempt_at ? new Date(b.last_attempt_at).getTime() : null;
			if (tA === null && tB === null) return 0;
			if (tA === null) return 1;
			if (tB === null) return -1;
			return dirSign * (tA - tB);
		});
		return rows;
	});

	const stats = $derived({
		total: data.rows.length,
		mastered: data.rows.filter((r) => r.mastery_status === 'mastered').length,
		needs_review: data.rows.filter((r) => r.mastery_status === 'needs_review').length,
		not_started: data.rows.filter((r) => r.mastery_status === 'not_started').length
	});
	const masteryRate = $derived(stats.total === 0 ? 0 : (stats.mastered / stats.total) * 100);

	function statusBadgeClass(status: MasteryStatus): string {
		switch (status) {
			case 'mastered':
				return 'bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900 dark:text-green-100';
			case 'needs_review':
				return 'bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-900 dark:text-amber-100';
			case 'not_started':
				return 'bg-gray-100 text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300';
		}
	}

	function statusLabel(status: MasteryStatus): string {
		switch (status) {
			case 'mastered':
				return 'Maîtrisé';
			case 'needs_review':
				return 'À retravailler';
			case 'not_started':
				return 'Pas commencé';
		}
	}

	function levelLabel(level: string | null): string {
		switch (level) {
			case 'college':
				return 'Collège';
			case 'lycee':
				return 'Lycée';
			case 'nsi':
				return 'NSI';
			case 'etudiant':
				return 'Étudiant';
			default:
				return '—';
		}
	}

	function formatRelative(iso: string | null): string {
		if (!iso) return '—';
		const diffMs = Date.now() - new Date(iso).getTime();
		const minutes = Math.round(diffMs / 60000);
		if (minutes < 1) return "à l'instant";
		if (minutes < 60) return `il y a ${minutes} min`;
		const hours = Math.round(minutes / 60);
		if (hours < 24) return `il y a ${hours} h`;
		const days = Math.round(hours / 24);
		if (days < 30) return `il y a ${days} j`;
		return new Date(iso).toLocaleDateString('fr-FR');
	}

	function toggleSort(key: SortKey) {
		if (sortBy === key) {
			sortDir = sortDir === 'asc' ? 'desc' : 'asc';
		} else {
			sortBy = key;
			sortDir = key === 'title' ? 'asc' : 'desc';
		}
	}
</script>

<svelte:head>
	<title>Ma progression | Chiphre</title>
</svelte:head>

<div class="container mx-auto max-w-7xl px-4 py-8">
	<div class="mb-8">
		<h1 class="text-3xl font-bold tracking-tight">Ma progression</h1>
		<p class="mt-2 text-muted-foreground">Tes exercices Python et où tu en es.</p>
	</div>

	<div class="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 md:grid-cols-4">
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Exercices</Card.Title>
				<BookOpen class="h-4 w-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{stats.total}</div>
				<p class="text-xs text-muted-foreground">{masteryRate.toFixed(0)} % maîtrisé</p>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Maîtrisé</Card.Title>
				<CheckCircle2 class="h-4 w-4 text-green-600 dark:text-green-400" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{stats.mastered}</div>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">À retravailler</Card.Title>
				<Clock class="h-4 w-4 text-amber-600 dark:text-amber-400" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{stats.needs_review}</div>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Pas commencé</Card.Title>
				<Circle class="h-4 w-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{stats.not_started}</div>
			</Card.Content>
		</Card.Root>
	</div>

	<div class="mb-4 flex flex-wrap items-center gap-4">
		<div class="flex items-center gap-2">
			<span class="text-sm font-medium text-muted-foreground">Niveau :</span>
			<MySelect
				type="single"
				bind:value={selectedLevel}
				items={levelItems}
				placeholder="Tous"
				fitContent
			/>
		</div>
		<div class="flex items-center gap-2">
			<span class="text-sm font-medium text-muted-foreground">Statut :</span>
			<MySelect
				type="single"
				bind:value={selectedStatus}
				items={statusItems}
				placeholder="Tous"
				fitContent
			/>
		</div>
	</div>

	<Card.Root>
		<Card.Header>
			<Card.Title>Détails</Card.Title>
			<Card.Description>
				{sortedRows.length} exercice{sortedRows.length > 1 ? 's' : ''}
			</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if sortedRows.length === 0}
				<div class="py-12 text-center text-muted-foreground">
					<AlertCircle class="mx-auto mb-3 h-12 w-12 opacity-50" />
					{#if data.rows.length === 0}
						<p>Tu n'as pas encore travaillé d'exercice Python.</p>
						<p class="mt-2 text-sm">
							Va sur <a href={resolve('/python-exercises')} class="text-primary hover:underline"
								>la liste des exercices</a
							> pour démarrer.
						</p>
					{:else}
						<p>Aucun exercice ne correspond à tes filtres.</p>
					{/if}
				</div>
			{:else}
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>
								<button
									type="button"
									class="flex items-center gap-1 hover:text-foreground"
									onclick={() => toggleSort('title')}
								>
									Exercice
									{#if sortBy === 'title'}
										{#if sortDir === 'asc'}
											<ArrowUp class="h-3 w-3" />
										{:else}
											<ArrowDown class="h-3 w-3" />
										{/if}
									{/if}
								</button>
							</Table.Head>
							<Table.Head class="text-center">Niveau</Table.Head>
							<Table.Head class="text-center">Statut</Table.Head>
							<Table.Head class="text-center">
								<button
									type="button"
									class="mx-auto flex items-center gap-1 hover:text-foreground"
									onclick={() => toggleSort('attempts')}
								>
									Tentatives
									{#if sortBy === 'attempts'}
										{#if sortDir === 'asc'}
											<ArrowUp class="h-3 w-3" />
										{:else}
											<ArrowDown class="h-3 w-3" />
										{/if}
									{/if}
								</button>
							</Table.Head>
							<Table.Head class="text-center">
								<button
									type="button"
									class="mx-auto flex items-center gap-1 hover:text-foreground"
									onclick={() => toggleSort('activity')}
								>
									Dernière activité
									{#if sortBy === 'activity'}
										{#if sortDir === 'asc'}
											<ArrowUp class="h-3 w-3" />
										{:else}
											<ArrowDown class="h-3 w-3" />
										{/if}
									{/if}
								</button>
							</Table.Head>
							<Table.Head class="text-center">Dernier essai</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each sortedRows as row (row.exercise.id)}
							<Table.Row>
								<Table.Cell class="font-medium">
									<a
										href={resolve(`/python-exercises/${row.exercise.id}`)}
										class="text-primary hover:underline"
									>
										{row.exercise.title}
									</a>
								</Table.Cell>
								<Table.Cell class="text-center text-sm text-muted-foreground">
									{levelLabel(row.exercise.level)}
								</Table.Cell>
								<Table.Cell class="text-center">
									<Badge class={statusBadgeClass(row.mastery_status)}>
										{statusLabel(row.mastery_status)}
									</Badge>
								</Table.Cell>
								<Table.Cell class="text-center">{row.total_attempts}</Table.Cell>
								<Table.Cell class="text-center text-sm text-muted-foreground">
									{formatRelative(row.last_attempt_at)}
								</Table.Cell>
								<Table.Cell class="text-center">
									{#if row.last_attempt_correct === true}
										<Check class="mx-auto h-4 w-4 text-green-600 dark:text-green-400" />
									{:else if row.last_attempt_correct === false}
										<X class="mx-auto h-4 w-4 text-red-600 dark:text-red-400" />
									{:else}
										<span class="text-muted-foreground">—</span>
									{/if}
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
