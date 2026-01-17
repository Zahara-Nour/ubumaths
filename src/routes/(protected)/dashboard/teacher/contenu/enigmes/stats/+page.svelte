<!--
	Teacher Riddles Statistics Page
	================================
	Dashboard with comprehensive riddle statistics
-->

<script lang="ts">
	import type { PageData } from './$types';
	import { getDifficultyLabel, getDifficultyColor } from '$lib/types/riddle';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import * as Avatar from '$lib/components/ui/avatar';
	import { BarChart3, Trophy, Users, Target, TrendingUp, FileCheck, User } from 'lucide-svelte';

	let { data }: { data: PageData } = $props();

	function getSuccessRate(stats: { total_attempts: number; successful_attempts: number }): number {
		if (stats.total_attempts === 0) return 0;
		return Math.round((stats.successful_attempts / stats.total_attempts) * 100);
	}

	function getAverageAttempts(stats: {
		total_attempts: number;
		successful_attempts: number;
	}): string {
		if (stats.successful_attempts === 0) return 'N/A';
		return (stats.total_attempts / stats.successful_attempts).toFixed(1);
	}
</script>

<svelte:head>
	<title>Statistiques Énigmes - UbuMaths</title>
</svelte:head>

<div class="container mx-auto max-w-7xl p-4 sm:p-6">
	<!-- Header -->
	<div class="mb-6">
		<h1 class="flex items-center gap-2 text-3xl font-bold">
			<BarChart3 class="h-8 w-8 text-primary" />
			Statistiques des Énigmes
		</h1>
		<p class="mt-2 text-muted-foreground">Vue d'ensemble de vos énigmes et performances élèves</p>
	</div>

	<!-- Overview Cards -->
	<div class="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
		<!-- Total Riddles -->
		<Card.Root>
			<Card.Content class="pt-6">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-muted-foreground">Énigmes créées</p>
						<p class="mt-1 text-3xl font-bold">{data.overview.totalRiddles}</p>
						<p class="mt-1 text-xs text-muted-foreground">
							{data.overview.publishedRiddles} publiées
						</p>
					</div>
					<Target class="h-12 w-12 text-primary opacity-20" />
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Pending Validations -->
		<Card.Root>
			<Card.Content class="pt-6">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-muted-foreground">Validations en attente</p>
						<p class="mt-1 text-3xl font-bold">{data.overview.pendingValidations}</p>
						{#if data.overview.pendingValidations > 0}
							<a
								href="/dashboard/teacher/contenu/enigmes/validations"
								class="mt-1 text-xs text-primary hover:underline"
							>
								Voir les validations →
							</a>
						{/if}
					</div>
					<FileCheck class="h-12 w-12 text-yellow-500 opacity-20" />
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Total Gidouilles -->
		<Card.Root>
			<Card.Content class="pt-6">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-muted-foreground">Gidouilles distribuées</p>
						<p class="mt-1 text-3xl font-bold">{data.overview.totalGidouillesDistributed}</p>
						<p class="mt-1 text-xs text-muted-foreground">Via vos énigmes</p>
					</div>
					<Trophy class="h-12 w-12 text-yellow-500 opacity-20" />
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Active Students -->
		<Card.Root>
			<Card.Content class="pt-6">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-muted-foreground">Élèves actifs</p>
						<p class="mt-1 text-3xl font-bold">{data.topStudents.length}</p>
						<p class="mt-1 text-xs text-muted-foreground">Ont résolu au moins une énigme</p>
					</div>
					<Users class="h-12 w-12 text-primary opacity-20" />
				</div>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Riddle Stats Table -->
	<Card.Root class="mb-8">
		<Card.Header>
			<Card.Title class="flex items-center gap-2">
				<TrendingUp class="h-5 w-5" />
				Statistiques par énigme
			</Card.Title>
			<Card.Description>Taux de réussite et tentatives pour chaque énigme</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if data.riddleStats.length > 0}
				<div class="overflow-x-auto">
					<table class="w-full">
						<thead>
							<tr class="border-b">
								<th class="pb-3 text-left text-sm font-medium">Énigme</th>
								<th class="pb-3 text-left text-sm font-medium">Difficulté</th>
								<th class="pb-3 text-center text-sm font-medium">Tentatives</th>
								<th class="pb-3 text-center text-sm font-medium">Réussis</th>
								<th class="pb-3 text-center text-sm font-medium">Taux</th>
								<th class="pb-3 text-center text-sm font-medium">Moy. tent.</th>
								<th class="pb-3 text-center text-sm font-medium">Gidouilles</th>
							</tr>
						</thead>
						<tbody>
							{#each data.riddleStats as stats (stats.riddle_id)}
								<tr class="border-b last:border-0">
									<td class="py-3">
										<div>
											<Badge variant="outline" class="mb-1">#{stats.riddle_number}</Badge>
											<p class="font-medium">{stats.title}</p>
											{#if stats.genre}
												<p class="text-xs text-muted-foreground">{stats.genre}</p>
											{/if}
										</div>
									</td>
									<td class="py-3">
										<Badge class={getDifficultyColor(stats.difficulty)}>
											{getDifficultyLabel(stats.difficulty)}
										</Badge>
									</td>
									<td class="py-3 text-center">
										<span class="font-medium">{stats.total_attempts}</span>
									</td>
									<td class="py-3 text-center">
										<span class="font-medium text-green-600 dark:text-green-400">
											{stats.successful_attempts}
										</span>
									</td>
									<td class="py-3 text-center">
										<div class="flex flex-col items-center">
											<span class="font-medium">{getSuccessRate(stats)}%</span>
											<div class="mt-1 h-1.5 w-16 overflow-hidden rounded-full bg-muted">
												<div
													class="h-full bg-green-500"
													style="width: {getSuccessRate(stats)}%"
												></div>
											</div>
										</div>
									</td>
									<td class="py-3 text-center">
										<span class="text-sm">{getAverageAttempts(stats)}</span>
									</td>
									<td class="py-3 text-center">
										<span class="font-medium text-yellow-600 dark:text-yellow-400">
											{stats.total_gidouilles_awarded || 0}
										</span>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{:else}
				<p class="py-8 text-center text-muted-foreground">
					Aucune statistique disponible. Créez des énigmes pour voir les stats.
				</p>
			{/if}
		</Card.Content>
	</Card.Root>

	<!-- Top Students -->
	<Card.Root>
		<Card.Header>
			<Card.Title class="flex items-center gap-2">
				<Trophy class="h-5 w-5" />
				Top 10 Élèves
			</Card.Title>
			<Card.Description>Classement des élèves ayant résolu vos énigmes</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if data.topStudents.length > 0}
				<div class="space-y-3">
					{#each data.topStudents as studentStat, index (studentStat.student.id)}
						<div class="flex items-center justify-between rounded-lg border p-3">
							<div class="flex items-center gap-3">
								<!-- Rank Badge -->
								<div
									class="flex h-8 w-8 items-center justify-center rounded-full bg-muted font-bold"
								>
									{#if index === 0}
										🥇
									{:else if index === 1}
										🥈
									{:else if index === 2}
										🥉
									{:else}
										{index + 1}
									{/if}
								</div>

								<!-- Avatar -->
								<Avatar.Root>
									<Avatar.Image src={studentStat.student.avatar_url} alt="Avatar élève" />
									<Avatar.Fallback>
										<User class="h-4 w-4" />
									</Avatar.Fallback>
								</Avatar.Root>

								<!-- Info -->
								<div>
									<p class="font-medium">
										{studentStat.student.firstname || ''}
										{studentStat.student.lastname || ''}
									</p>
									<p class="text-xs text-muted-foreground">
										{studentStat.totalSuccess} énigme{studentStat.totalSuccess > 1 ? 's' : ''}
										réussie{studentStat.totalSuccess > 1 ? 's' : ''}
										{#if studentStat.firstAttemptSuccess > 0}
											• {studentStat.firstAttemptSuccess} du 1er coup
										{/if}
									</p>
								</div>
							</div>

							<!-- Score -->
							<div class="text-right">
								<p class="text-lg font-bold text-yellow-600 dark:text-yellow-400">
									{studentStat.totalGidouilles}
								</p>
								<p class="text-xs text-muted-foreground">gidouilles</p>
							</div>
						</div>
					{/each}
				</div>
			{:else}
				<p class="py-8 text-center text-muted-foreground">
					Aucun élève n'a encore résolu vos énigmes.
				</p>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
