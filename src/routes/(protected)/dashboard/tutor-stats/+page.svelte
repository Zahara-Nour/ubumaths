<!--
	Tutor Statistics Dashboard
	==========================
	Dashboard showing AI tutor conversation statistics for teachers
-->

<script lang="ts">
	import type { PageData } from './$types';
	import * as Card from '$lib/components/ui/card';
	import * as Avatar from '$lib/components/ui/avatar';
	import { Button } from '$lib/components/ui/button';
	import MySelect from '$lib/components/MySelect.svelte';
	import {
		BarChart3,
		MessageSquare,
		Users,
		TrendingUp,
		Target,
		HelpCircle,
		RefreshCw
	} from 'lucide-svelte';

	let { data }: { data: PageData } = $props();

	// ============================================================================
	// STATE
	// ============================================================================

	let selectedPeriod = $state<'day' | 'week' | 'month' | 'all'>('week');
	let selectedClassId = $state<string>('all');
	let isLoading = $state(false);

	// Stats data from API
	let stats = $state<{
		overview: {
			totalConversations: number;
			totalMessages: number;
			activeStudents: number;
			avgEffortScore: number;
			avgHelpLevel: string;
		};
		byStudent: Array<{
			studentId: string;
			studentName: string;
			avatarUrl: string | null;
			conversationCount: number;
			totalMessages: number;
			avgEffortScore: number;
			maxHelpLevel: number;
		}>;
		topTopics: Array<{
			topic: string;
			count: number;
			percentage: number;
		}>;
		helpLevelDistribution: Array<{
			level: number;
			count: number;
		}>;
	}>({
		overview: {
			totalConversations: 0,
			totalMessages: 0,
			activeStudents: 0,
			avgEffortScore: 0,
			avgHelpLevel: '0.0'
		},
		byStudent: [],
		topTopics: [],
		helpLevelDistribution: []
	});

	// ============================================================================
	// DERIVED VALUES
	// ============================================================================

	// Class filter items for MySelect
	const classItems = $derived([
		{ value: 'all', label: 'Toutes les classes' },
		...data.classes.map((c) => ({ value: c.id, label: c.name }))
	]);

	// Period filter items
	const periodItems = [
		{ value: 'day', label: "Aujourd'hui" },
		{ value: 'week', label: 'Cette semaine' },
		{ value: 'month', label: 'Ce mois' },
		{ value: 'all', label: 'Tout' }
	];

	// Max value for help level distribution chart
	const maxHelpLevelCount = $derived(
		Math.max(...stats.helpLevelDistribution.map((d) => d.count), 1)
	);

	// ============================================================================
	// EFFECTS
	// ============================================================================

	// Fetch stats when filters change
	$effect(() => {
		fetchStats();
	});

	// ============================================================================
	// FUNCTIONS
	// ============================================================================

	async function fetchStats() {
		isLoading = true;
		try {
			const params = new URLSearchParams({
				period: selectedPeriod
			});

			if (selectedClassId !== 'all') {
				params.set('classId', selectedClassId);
			}

			const response = await fetch(`/api/tutor/stats?${params}`);
			if (!response.ok) {
				throw new Error('Failed to fetch stats');
			}

			stats = await response.json();
		} catch (error) {
			console.error('Error fetching stats:', error);
		} finally {
			isLoading = false;
		}
	}

	function getEffortColor(score: number): string {
		if (score >= 80) return 'text-green-600';
		if (score >= 60) return 'text-blue-600';
		if (score >= 40) return 'text-yellow-600';
		return 'text-red-600';
	}

	function getHelpLevelLabel(level: number): string {
		const labels = [
			'Aucune aide',
			'Indice minimal',
			'Indice simple',
			'Indice détaillé',
			'Exemple partiel',
			'Exemple complet',
			'Explication',
			'Solution complète'
		];
		return labels[level] || `Niveau ${level}`;
	}
</script>

<svelte:head>
	<title>Statistiques Tuteur - UbuMaths</title>
</svelte:head>

<div class="container mx-auto max-w-7xl p-4 sm:p-6">
	<!-- Header -->
	<div class="mb-6">
		<h1 class="flex items-center gap-2 text-3xl font-bold">
			<MessageSquare class="h-8 w-8 text-primary" />
			Statistiques du Tuteur IA
		</h1>
		<p class="mt-2 text-muted-foreground">
			Vue d'ensemble des conversations et de l'engagement des élèves avec le tuteur
		</p>
	</div>

	<!-- Filters -->
	<Card.Root class="mb-6">
		<Card.Content class="pt-6">
			<div class="flex flex-wrap items-center gap-4">
				<div class="flex items-center gap-2">
					<label for="period-select" class="text-sm font-medium">Période:</label>
					<MySelect type="single" bind:value={selectedPeriod} items={periodItems} />
				</div>

				<div class="flex items-center gap-2">
					<label for="class-select" class="text-sm font-medium">Classe:</label>
					<MySelect type="single" bind:value={selectedClassId} items={classItems} />
				</div>

				<Button
					variant="outline"
					size="sm"
					onclick={fetchStats}
					disabled={isLoading}
					class="ml-auto"
				>
					<RefreshCw class={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
					Actualiser
				</Button>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Overview Cards -->
	<div class="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
		<!-- Total Conversations -->
		<Card.Root>
			<Card.Content class="pt-6">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-muted-foreground">Conversations</p>
						<p class="mt-1 text-3xl font-bold">{stats.overview.totalConversations}</p>
						<p class="mt-1 text-xs text-muted-foreground">Total</p>
					</div>
					<MessageSquare class="h-12 w-12 text-primary opacity-20" />
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Total Messages -->
		<Card.Root>
			<Card.Content class="pt-6">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-muted-foreground">Messages</p>
						<p class="mt-1 text-3xl font-bold">{stats.overview.totalMessages}</p>
						<p class="mt-1 text-xs text-muted-foreground">
							{stats.overview.totalConversations > 0
								? `~${Math.round(stats.overview.totalMessages / stats.overview.totalConversations)} par conversation`
								: 'Aucune conversation'}
						</p>
					</div>
					<BarChart3 class="h-12 w-12 text-blue-500 opacity-20" />
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Active Students -->
		<Card.Root>
			<Card.Content class="pt-6">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-muted-foreground">Élèves actifs</p>
						<p class="mt-1 text-3xl font-bold">{stats.overview.activeStudents}</p>
						<p class="mt-1 text-xs text-muted-foreground">Ont utilisé le tuteur</p>
					</div>
					<Users class="h-12 w-12 text-green-500 opacity-20" />
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Average Effort Score -->
		<Card.Root>
			<Card.Content class="pt-6">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-muted-foreground">Score d'effort moyen</p>
						<p class={`mt-1 text-3xl font-bold ${getEffortColor(stats.overview.avgEffortScore)}`}>
							{stats.overview.avgEffortScore}/100
						</p>
						<p class="mt-1 text-xs text-muted-foreground">
							Aide: niveau {stats.overview.avgHelpLevel}
						</p>
					</div>
					<Target class="h-12 w-12 text-yellow-500 opacity-20" />
				</div>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Student Stats Table -->
	<Card.Root class="mb-8">
		<Card.Header>
			<Card.Title class="flex items-center gap-2">
				<Users class="h-5 w-5" />
				Statistiques par élève
			</Card.Title>
			<Card.Description>Engagement et performance de chaque élève avec le tuteur</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if stats.byStudent.length > 0}
				<div class="overflow-x-auto">
					<table class="w-full">
						<thead>
							<tr class="border-b">
								<th class="pb-3 text-left text-sm font-medium">Élève</th>
								<th class="pb-3 text-center text-sm font-medium">Conversations</th>
								<th class="pb-3 text-center text-sm font-medium">Messages</th>
								<th class="pb-3 text-center text-sm font-medium">Score d'effort</th>
								<th class="pb-3 text-center text-sm font-medium">Niveau d'aide max</th>
							</tr>
						</thead>
						<tbody>
							{#each stats.byStudent as student (student.studentId)}
								<tr class="border-b last:border-0">
									<td class="py-3">
										<div class="flex items-center gap-3">
											<Avatar.Root class="h-8 w-8">
												<Avatar.Image
													src={student.avatarUrl || undefined}
													alt={student.studentName}
												/>
												<Avatar.Fallback>
													{student.studentName
														.split(' ')
														.map((n) => n[0])
														.join('')
														.toUpperCase()
														.slice(0, 2)}
												</Avatar.Fallback>
											</Avatar.Root>
											<span class="font-medium">{student.studentName}</span>
										</div>
									</td>
									<td class="py-3 text-center">{student.conversationCount}</td>
									<td class="py-3 text-center">{student.totalMessages}</td>
									<td class="py-3 text-center">
										<span class={getEffortColor(student.avgEffortScore)}>
											{student.avgEffortScore}/100
										</span>
									</td>
									<td class="py-3 text-center">
										<span class="text-sm text-muted-foreground">
											{getHelpLevelLabel(student.maxHelpLevel)}
										</span>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{:else}
				<p class="py-8 text-center text-muted-foreground">
					Aucune conversation pour la période et les filtres sélectionnés
				</p>
			{/if}
		</Card.Content>
	</Card.Root>

	<!-- Charts Row -->
	<div class="grid gap-6 lg:grid-cols-2">
		<!-- Top Topics -->
		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2">
					<TrendingUp class="h-5 w-5" />
					Sujets les plus discutés
				</Card.Title>
				<Card.Description>Les 10 sujets mathématiques les plus fréquents</Card.Description>
			</Card.Header>
			<Card.Content>
				{#if stats.topTopics.length > 0}
					<div class="space-y-3">
						{#each stats.topTopics as topic (topic.topic)}
							<div>
								<div class="mb-1 flex items-center justify-between text-sm">
									<span class="font-medium">{topic.topic}</span>
									<span class="text-muted-foreground">{topic.count} conversations</span>
								</div>
								<div class="h-2 w-full overflow-hidden rounded-full bg-secondary">
									<div
										class="h-full bg-primary transition-all"
										style="width: {topic.percentage}%"
									></div>
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<p class="py-8 text-center text-muted-foreground">Aucun sujet enregistré</p>
				{/if}
			</Card.Content>
		</Card.Root>

		<!-- Help Level Distribution -->
		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2">
					<HelpCircle class="h-5 w-5" />
					Distribution des niveaux d'aide
				</Card.Title>
				<Card.Description>Niveau d'aide maximum atteint par conversation</Card.Description>
			</Card.Header>
			<Card.Content>
				{#if stats.helpLevelDistribution.some((d) => d.count > 0)}
					<div class="space-y-3">
						{#each stats.helpLevelDistribution as dist (dist.level)}
							{#if dist.count > 0}
								<div>
									<div class="mb-1 flex items-center justify-between text-sm">
										<span class="font-medium">{getHelpLevelLabel(dist.level)}</span>
										<span class="text-muted-foreground">{dist.count} conversations</span>
									</div>
									<div class="h-2 w-full overflow-hidden rounded-full bg-secondary">
										<div
											class="h-full transition-all"
											class:bg-green-500={dist.level <= 2}
											class:bg-blue-500={dist.level > 2 && dist.level <= 4}
											class:bg-yellow-500={dist.level > 4 && dist.level <= 6}
											class:bg-red-500={dist.level > 6}
											style="width: {(dist.count / maxHelpLevelCount) * 100}%"
										></div>
									</div>
								</div>
							{/if}
						{/each}
					</div>
				{:else}
					<p class="py-8 text-center text-muted-foreground">Aucune donnée disponible</p>
				{/if}
			</Card.Content>
		</Card.Root>
	</div>
</div>
