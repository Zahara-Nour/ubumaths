<script lang="ts">
	/**
	 * Subdomain Detail Page
	 * ======================
	 *
	 * Displays all questions within a specific subdomain with filtering and review options.
	 *
	 * Features:
	 * - Breadcrumb navigation
	 * - Statistics overview
	 * - Filter by status (all/clean/warnings/errors)
	 * - Question cards with status indicators
	 * - Click to review individual questions
	 */

	import { goto } from '$app/navigation';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Separator } from '$lib/components/ui/separator';
	import QuestionCard from '$lib/components/migration/QuestionCard.svelte';
	import { AlertCircle, AlertTriangle, CheckCircle2, Home, Layers } from 'lucide-svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Filter state
	type FilterType = 'all' | 'clean' | 'warnings' | 'errors';
	let activeFilter = $state<FilterType>('all');

	// Filtered questions
	const filteredQuestions = $derived(() => {
		switch (activeFilter) {
			case 'clean':
				return data.questions.filter((q) => q.warnings.length === 0 && q.errors.length === 0);
			case 'warnings':
				return data.questions.filter((q) => q.warnings.length > 0 && q.errors.length === 0);
			case 'errors':
				return data.questions.filter((q) => q.errors.length > 0);
			case 'all':
			default:
				return data.questions;
		}
	});

	// Handle question click (for now, just log - will implement detail view later)
	function handleQuestionClick(question: (typeof data.questions)[0]) {
		// TODO: Open question review modal or navigate to detail page
		console.log('Question clicked:', question.globalIndex);
	}

	// Navigate back
	function navigateBack() {
		goto('/dashboard/admin/migration').then(() => {});
	}
</script>

<svelte:head>
	<title>Migration: {data.subdomain} - UbuMaths</title>
</svelte:head>

<div class="container mx-auto space-y-6 py-6">
	<!-- Breadcrumb -->
	<Breadcrumb.Root>
		<Breadcrumb.List>
			<Breadcrumb.Item>
				<Breadcrumb.Link href="/dashboard/admin">
					<Home class="h-4 w-4" />
				</Breadcrumb.Link>
			</Breadcrumb.Item>
			<Breadcrumb.Separator />
			<Breadcrumb.Item>
				<Breadcrumb.Link href="/dashboard/admin/migration">Migration</Breadcrumb.Link>
			</Breadcrumb.Item>
			<Breadcrumb.Separator />
			<Breadcrumb.Item>
				<Breadcrumb.Page class="text-muted-foreground">{data.theme}</Breadcrumb.Page>
			</Breadcrumb.Item>
			<Breadcrumb.Separator />
			<Breadcrumb.Item>
				<Breadcrumb.Page class="text-muted-foreground">{data.domain}</Breadcrumb.Page>
			</Breadcrumb.Item>
			<Breadcrumb.Separator />
			<Breadcrumb.Item>
				<Breadcrumb.Page>{data.subdomain}</Breadcrumb.Page>
			</Breadcrumb.Item>
		</Breadcrumb.List>
	</Breadcrumb.Root>

	<!-- Header -->
	<div class="flex items-start justify-between">
		<div class="space-y-1">
			<h1 class="text-3xl font-bold tracking-tight">{data.subdomain}</h1>
			<p class="text-muted-foreground">
				{data.theme} → {data.domain}
			</p>
		</div>

		<Button variant="outline" onclick={navigateBack}>
			<Layers class="mr-2 h-4 w-4" />
			Retour à la vue d'ensemble
		</Button>
	</div>

	<!-- Statistics -->
	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
		<Card.Root>
			<Card.Header class="pb-3">
				<Card.Title class="text-sm font-medium">Total Questions</Card.Title>
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{data.stats.totalQuestions}</div>
				<p class="text-xs text-muted-foreground">
					Sur {data.stats.totalLevels} niveau{data.stats.totalLevels > 1 ? 'x' : ''}
				</p>
			</Card.Content>
		</Card.Root>

		<Card.Root class="border-success/50 bg-success/5">
			<Card.Header class="pb-3">
				<Card.Title class="text-sm font-medium">
					<CheckCircle2 class="mr-2 inline-block h-4 w-4 text-success" />
					Prêtes
				</Card.Title>
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{data.stats.questionsClean}</div>
				<p class="text-xs text-muted-foreground">
					{((data.stats.questionsClean / data.stats.totalQuestions) * 100).toFixed(1)}% du total
				</p>
			</Card.Content>
		</Card.Root>

		<Card.Root class="border-warning/50 bg-warning/5">
			<Card.Header class="pb-3">
				<Card.Title class="text-sm font-medium">
					<AlertTriangle class="text-warning mr-2 inline-block h-4 w-4" />
					Avertissements
				</Card.Title>
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{data.stats.questionsWithWarnings}</div>
				<p class="text-xs text-muted-foreground">Nécessitent vérification</p>
			</Card.Content>
		</Card.Root>

		<Card.Root class="border-destructive/50 bg-destructive/5">
			<Card.Header class="pb-3">
				<Card.Title class="text-sm font-medium">
					<AlertCircle class="mr-2 inline-block h-4 w-4 text-destructive" />
					Erreurs
				</Card.Title>
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{data.stats.questionsWithErrors}</div>
				<p class="text-xs text-muted-foreground">Nécessitent correction</p>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Filters -->
	<div class="flex items-center gap-2">
		<span class="text-sm font-medium text-muted-foreground">Filtrer:</span>
		<Button
			variant={activeFilter === 'all' ? 'default' : 'outline'}
			size="sm"
			onclick={() => (activeFilter = 'all')}
		>
			Toutes ({data.questions.length})
		</Button>
		<Button
			variant={activeFilter === 'clean' ? 'default' : 'outline'}
			size="sm"
			onclick={() => (activeFilter = 'clean')}
		>
			<CheckCircle2 class="mr-1 h-3 w-3" />
			Prêtes ({data.stats.questionsClean})
		</Button>
		<Button
			variant={activeFilter === 'warnings' ? 'default' : 'outline'}
			size="sm"
			onclick={() => (activeFilter = 'warnings')}
		>
			<AlertTriangle class="mr-1 h-3 w-3" />
			Avertissements ({data.stats.questionsWithWarnings})
		</Button>
		<Button
			variant={activeFilter === 'errors' ? 'default' : 'outline'}
			size="sm"
			onclick={() => (activeFilter = 'errors')}
		>
			<AlertCircle class="mr-1 h-3 w-3" />
			Erreurs ({data.stats.questionsWithErrors})
		</Button>
	</div>

	<Separator />

	<!-- Questions List -->
	<div class="space-y-3">
		{#each filteredQuestions() as question (question.globalIndex)}
			<QuestionCard {question} onclick={() => handleQuestionClick(question)} />
		{:else}
			<Card.Root>
				<Card.Content class="py-12 text-center">
					<p class="text-muted-foreground">Aucune question trouvée avec ce filtre.</p>
				</Card.Content>
			</Card.Root>
		{/each}
	</div>

	<!-- Results Summary -->
	{#if filteredQuestions().length > 0 && activeFilter !== 'all'}
		<div class="text-center text-sm text-muted-foreground">
			Affichage de {filteredQuestions().length} question{filteredQuestions().length > 1 ? 's' : ''} sur
			{data.questions.length}
		</div>
	{/if}
</div>
