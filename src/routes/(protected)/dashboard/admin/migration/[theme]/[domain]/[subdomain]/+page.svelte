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
	 * - Filter by status (all/clean/warnings/errors/approved/rejected)
	 * - Question cards with status indicators
	 * - Click to review individual questions
	 * - Approve/Reject actions with API integration
	 */

	import { goto } from '$app/navigation';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Separator } from '$lib/components/ui/separator';
	import { Badge } from '$lib/components/ui/badge';
	import QuestionCard from '$lib/components/migration/QuestionCard.svelte';
	import QuestionCompareView from '$lib/components/migration/QuestionCompareView.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { AlertCircle, AlertTriangle, CheckCircle2, Home, Layers, XCircle } from 'lucide-svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Filter state
	type FilterType = 'all' | 'clean' | 'warnings' | 'errors' | 'approved' | 'rejected';
	let activeFilter = $state<FilterType>('all');

	// Selected question for detail view
	let selectedQuestion = $state<(typeof data.questions)[0] | null>(null);
	let dialogOpen = $state(false);

	// Review status tracking (in-memory for session) - use SvelteMap for reactivity
	type ReviewStatus = 'pending' | 'approved' | 'rejected';
	let reviewStatus = new SvelteMap<number, { status: ReviewStatus; reason?: string }>();

	// Loading state for API calls
	let isSubmitting = $state(false);

	// Get review status for a question
	function getReviewStatus(globalIndex: number): ReviewStatus {
		return reviewStatus.get(globalIndex)?.status ?? 'pending';
	}

	// Filtered questions
	const filteredQuestions = $derived.by(() => {
		let questions = data.questions;

		switch (activeFilter) {
			case 'clean':
				questions = questions.filter((q) => q.warnings.length === 0 && q.errors.length === 0);
				break;
			case 'warnings':
				questions = questions.filter((q) => q.warnings.length > 0 && q.errors.length === 0);
				break;
			case 'errors':
				questions = questions.filter((q) => q.errors.length > 0);
				break;
			case 'approved':
				questions = questions.filter((q) => getReviewStatus(q.globalIndex) === 'approved');
				break;
			case 'rejected':
				questions = questions.filter((q) => getReviewStatus(q.globalIndex) === 'rejected');
				break;
		}

		return questions;
	});

	// Stats derived from review status
	const reviewStats = $derived({
		approved: [...reviewStatus.values()].filter((s) => s.status === 'approved').length,
		rejected: [...reviewStatus.values()].filter((s) => s.status === 'rejected').length,
		pending: data.questions.length - reviewStatus.size
	});

	// Handle question click - open detail dialog
	function handleQuestionClick(question: (typeof data.questions)[0]) {
		selectedQuestion = question;
		dialogOpen = true;
	}

	// Close dialog
	function closeDialog() {
		dialogOpen = false;
		selectedQuestion = null;
	}

	// Navigate back
	function navigateBack() {
		goto('/dashboard/admin/migration');
	}

	// Handle approve
	async function handleApprove() {
		if (!selectedQuestion || isSubmitting) return;

		isSubmitting = true;
		try {
			const response = await fetch(
				`/api/migration/questions/${selectedQuestion.globalIndex}/approve`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({})
				}
			);

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || "Erreur lors de l'approbation");
			}

			// Update local state - SvelteMap handles reactivity automatically
			reviewStatus.set(selectedQuestion.globalIndex, { status: 'approved' });

			toaster.success(`Question #${selectedQuestion.globalIndex} approuvee`);
			closeDialog();
		} catch (err) {
			toaster.error(err instanceof Error ? err.message : "Erreur lors de l'approbation");
		} finally {
			isSubmitting = false;
		}
	}

	// Handle reject
	async function handleReject(reason: string) {
		if (!selectedQuestion || isSubmitting) return;

		isSubmitting = true;
		try {
			const response = await fetch(
				`/api/migration/questions/${selectedQuestion.globalIndex}/reject`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ reason })
				}
			);

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || 'Erreur lors du rejet');
			}

			// Update local state - SvelteMap handles reactivity automatically
			reviewStatus.set(selectedQuestion.globalIndex, { status: 'rejected', reason });

			toaster.success(`Question #${selectedQuestion.globalIndex} rejetee`);
			closeDialog();
		} catch (err) {
			toaster.error(err instanceof Error ? err.message : 'Erreur lors du rejet');
		} finally {
			isSubmitting = false;
		}
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
	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
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
					Pretes
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
				<p class="text-xs text-muted-foreground">Necessitent verification</p>
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
				<p class="text-xs text-muted-foreground">Necessitent correction</p>
			</Card.Content>
		</Card.Root>

		<Card.Root class="border-green-500/50 bg-green-500/5">
			<Card.Header class="pb-3">
				<Card.Title class="text-sm font-medium">
					<CheckCircle2 class="mr-2 inline-block h-4 w-4 text-green-600" />
					Approuvees
				</Card.Title>
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold text-green-600">{reviewStats.approved}</div>
				<p class="text-xs text-muted-foreground">Cette session</p>
			</Card.Content>
		</Card.Root>

		<Card.Root class="border-red-500/50 bg-red-500/5">
			<Card.Header class="pb-3">
				<Card.Title class="text-sm font-medium">
					<XCircle class="mr-2 inline-block h-4 w-4 text-red-600" />
					Rejetees
				</Card.Title>
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold text-red-600">{reviewStats.rejected}</div>
				<p class="text-xs text-muted-foreground">Cette session</p>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Filters -->
	<div class="flex flex-wrap items-center gap-2">
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
			Pretes ({data.stats.questionsClean})
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
		<Separator orientation="vertical" class="mx-1 h-6" />
		<Button
			variant={activeFilter === 'approved' ? 'default' : 'outline'}
			size="sm"
			onclick={() => (activeFilter = 'approved')}
			class={activeFilter === 'approved' ? 'bg-green-600 hover:bg-green-700' : ''}
		>
			<CheckCircle2 class="mr-1 h-3 w-3" />
			Approuvees ({reviewStats.approved})
		</Button>
		<Button
			variant={activeFilter === 'rejected' ? 'default' : 'outline'}
			size="sm"
			onclick={() => (activeFilter = 'rejected')}
			class={activeFilter === 'rejected' ? 'bg-red-600 hover:bg-red-700' : ''}
		>
			<XCircle class="mr-1 h-3 w-3" />
			Rejetees ({reviewStats.rejected})
		</Button>
	</div>

	<Separator />

	<!-- Questions List -->
	<div class="space-y-3">
		{#each filteredQuestions as question (question.globalIndex)}
			<QuestionCard
				{question}
				reviewStatus={getReviewStatus(question.globalIndex)}
				onclick={() => handleQuestionClick(question)}
			/>
		{:else}
			<Card.Root>
				<Card.Content class="py-12 text-center">
					<p class="text-muted-foreground">Aucune question trouvée avec ce filtre.</p>
				</Card.Content>
			</Card.Root>
		{/each}
	</div>

	<!-- Results Summary -->
	{#if filteredQuestions.length > 0 && activeFilter !== 'all'}
		<div class="text-center text-sm text-muted-foreground">
			Affichage de {filteredQuestions.length} question{filteredQuestions.length > 1 ? 's' : ''} sur
			{data.questions.length}
		</div>
	{/if}
</div>

<!-- Question Detail Dialog -->
<Dialog.Root bind:open={dialogOpen}>
	<Dialog.Content class="max-h-[90vh] overflow-y-auto sm:max-w-[95vw]">
		<Dialog.Header>
			<Dialog.Title class="flex items-center gap-2">
				{#if selectedQuestion}
					<span>Question #{selectedQuestion.globalIndex}</span>
					<span class="text-muted-foreground">-</span>
					<span class="text-muted-foreground">Niveau {selectedQuestion.level}</span>
				{/if}
			</Dialog.Title>
			<Dialog.Description>
				{#if selectedQuestion}
					{selectedQuestion.question.description}
				{/if}
			</Dialog.Description>
		</Dialog.Header>

		{#if selectedQuestion}
			{@const status = getReviewStatus(selectedQuestion.globalIndex)}
			{#if status !== 'pending'}
				<div class="mb-4 flex items-center gap-2">
					{#if status === 'approved'}
						<Badge variant="default" class="bg-green-600">
							<CheckCircle2 class="mr-1 h-3 w-3" />
							Approuvee
						</Badge>
					{:else}
						<Badge variant="destructive">
							<XCircle class="mr-1 h-3 w-3" />
							Rejetee
						</Badge>
						{#if reviewStatus.get(selectedQuestion.globalIndex)?.reason}
							<span class="text-sm text-muted-foreground">
								- {reviewStatus.get(selectedQuestion.globalIndex)?.reason}
							</span>
						{/if}
					{/if}
				</div>
			{/if}
			<QuestionCompareView
				original={selectedQuestion.question}
				transformed={selectedQuestion.transformed}
				warnings={selectedQuestion.warnings}
				errors={selectedQuestion.errors}
				onApprove={status === 'pending' ? handleApprove : undefined}
				onReject={status === 'pending' ? handleReject : undefined}
			/>
		{/if}

		<Dialog.Footer>
			<Button variant="outline" onclick={closeDialog} disabled={isSubmitting}>Fermer</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
