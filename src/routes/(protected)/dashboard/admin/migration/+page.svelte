<script lang="ts">
	/**
	 * Migration Dashboard Page
	 * ========================
	 *
	 * Main admin page for reviewing questions during migration.
	 * Displays:
	 * - Overall statistics (total questions, themes, domains, etc.)
	 * - Migration status (success, warnings, errors)
	 * - Hierarchical tree navigation (theme > domain > subdomain)
	 *
	 * Navigation:
	 * - Click on subdomain to view/review individual questions
	 */

	import type { PageData } from './$types';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import MigrationTree from '$lib/components/migration/MigrationTree.svelte';
	import CategoryProgress from '$lib/components/migration/CategoryProgress.svelte';
	import {
		FileQuestion,
		FolderTree,
		Layers,
		CheckCircle2,
		AlertTriangle,
		XCircle,
		Calendar,
		RefreshCw
	} from 'lucide-svelte';

	let { data }: { data: PageData } = $props();

	// Format date for display
	function formatDate(dateString: string | null): string {
		if (!dateString) return 'Non disponible';
		const date = new Date(dateString);
		return date.toLocaleDateString('fr-FR', {
			day: 'numeric',
			month: 'long',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	// Refresh page
	function refreshData() {
		window.location.reload();
	}
</script>

<div class="container mx-auto space-y-6 py-8">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold">Migration des Questions</h1>
			<p class="mt-1 text-muted-foreground">
				Tableau de bord pour la revue et validation des questions migrees
			</p>
		</div>
		<Button onclick={refreshData} variant="outline" class="gap-2">
			<RefreshCw class="h-4 w-4" />
			Actualiser
		</Button>
	</div>

	<!-- Error state -->
	{#if data.error}
		<Card.Root class="border-destructive">
			<Card.Header>
				<Card.Title class="flex items-center gap-2 text-destructive">
					<XCircle class="h-5 w-5" />
					Erreur de chargement
				</Card.Title>
			</Card.Header>
			<Card.Content>
				<p class="text-muted-foreground">{data.error}</p>
			</Card.Content>
		</Card.Root>
	{:else}
		<!-- Statistics Cards -->
		<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
			<!-- Total Questions -->
			<Card.Root>
				<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
					<Card.Title class="text-sm font-medium">Questions Totales</Card.Title>
					<FileQuestion class="h-4 w-4 text-muted-foreground" />
				</Card.Header>
				<Card.Content>
					<div class="text-2xl font-bold">{data.stats.totalQuestions}</div>
					<p class="text-xs text-muted-foreground">questions exportees pour revue</p>
				</Card.Content>
			</Card.Root>

			<!-- Themes -->
			<Card.Root>
				<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
					<Card.Title class="text-sm font-medium">Themes</Card.Title>
					<FolderTree class="h-4 w-4 text-muted-foreground" />
				</Card.Header>
				<Card.Content>
					<div class="text-2xl font-bold">{data.stats.totalThemes}</div>
					<p class="text-xs text-muted-foreground">
						{data.stats.totalDomains} domaines, {data.stats.totalSubdomains} sous-domaines
					</p>
				</Card.Content>
			</Card.Root>

			<!-- Success Rate -->
			<Card.Root>
				<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
					<Card.Title class="text-sm font-medium">Taux de Succes</Card.Title>
					<CheckCircle2 class="h-4 w-4 text-green-500" />
				</Card.Header>
				<Card.Content>
					<div class="text-2xl font-bold text-green-600 dark:text-green-400">
						{data.stats.totalQuestions > 0
							? Math.round((data.stats.successCount / data.stats.totalQuestions) * 100)
							: 0}%
					</div>
					<p class="text-xs text-muted-foreground">
						{data.stats.successCount} sur {data.stats.totalQuestions} questions
					</p>
				</Card.Content>
			</Card.Root>

			<!-- Export Date -->
			<Card.Root>
				<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
					<Card.Title class="text-sm font-medium">Date d'Export</Card.Title>
					<Calendar class="h-4 w-4 text-muted-foreground" />
				</Card.Header>
				<Card.Content>
					<div class="text-sm font-medium">
						{formatDate(data.stats.exportDate)}
					</div>
				</Card.Content>
			</Card.Root>
		</div>

		<!-- Migration Status Summary -->
		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2">
					<Layers class="h-5 w-5" />
					Statut de la Migration
				</Card.Title>
				<Card.Description>Resume de l'export des questions vers le nouveau format</Card.Description>
			</Card.Header>
			<Card.Content>
				<div class="flex flex-wrap gap-4">
					<!-- Success -->
					<div
						class="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 dark:border-green-800 dark:bg-green-950/30"
					>
						<CheckCircle2 class="h-8 w-8 text-green-500" />
						<div>
							<p class="text-2xl font-bold text-green-700 dark:text-green-400">
								{data.stats.successCount}
							</p>
							<p class="text-sm text-green-600 dark:text-green-500">Succes</p>
						</div>
					</div>

					<!-- Warnings -->
					<div
						class="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-950/30"
					>
						<AlertTriangle class="h-8 w-8 text-amber-500" />
						<div>
							<p class="text-2xl font-bold text-amber-700 dark:text-amber-400">
								{data.stats.warningCount}
							</p>
							<p class="text-sm text-amber-600 dark:text-amber-500">Avertissements</p>
						</div>
					</div>

					<!-- Errors -->
					<div
						class="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800 dark:bg-red-950/30"
					>
						<XCircle class="h-8 w-8 text-red-500" />
						<div>
							<p class="text-2xl font-bold text-red-700 dark:text-red-400">
								{data.stats.errorCount}
							</p>
							<p class="text-sm text-red-600 dark:text-red-500">Erreurs</p>
						</div>
					</div>
				</div>

				{#if data.stats.warningCount > 0}
					<div class="mt-4 rounded-md bg-amber-50 p-3 dark:bg-amber-950/20">
						<p class="text-sm text-amber-800 dark:text-amber-200">
							<strong>{data.stats.warningCount}</strong> questions ont des avertissements et necessitent
							une verification manuelle.
						</p>
					</div>
				{/if}
			</Card.Content>
		</Card.Root>

		<!-- Review Progress -->
		<Card.Root>
			<Card.Header>
				<Card.Title>Progression de la Revue</Card.Title>
				<Card.Description>Avancement global de la validation des questions</Card.Description>
			</Card.Header>
			<Card.Content>
				<CategoryProgress
					total={data.stats.totalQuestions}
					approved={0}
					pending={data.stats.totalQuestions}
					rejected={0}
					showBar
				/>
				<p class="mt-3 text-sm text-muted-foreground">
					Selectionnez un sous-domaine dans l'arborescence ci-dessous pour commencer la revue.
				</p>
			</Card.Content>
		</Card.Root>

		<!-- Tree Navigation -->
		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2">
					<FolderTree class="h-5 w-5" />
					Arborescence des Questions
				</Card.Title>
				<Card.Description>
					Cliquez sur un theme ou domaine pour le developper, puis sur un sous-domaine pour acceder
					aux questions
				</Card.Description>
			</Card.Header>
			<Card.Content>
				<MigrationTree data={data.treeData} />
			</Card.Content>
		</Card.Root>
	{/if}
</div>
