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
	import { page } from '$app/stores';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Separator } from '$lib/components/ui/separator';
	import { Badge } from '$lib/components/ui/badge';
	import QuestionCard from '$lib/components/migration/QuestionCard.svelte';
	import QuestionCompareView from '$lib/components/migration/QuestionCompareView.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import {
		AlertCircle,
		AlertTriangle,
		CheckCircle2,
		ChevronLeft,
		ChevronRight,
		Home,
		Layers,
		XCircle,
		X,
		Edit3
	} from '@lucide/svelte';
	import ReviewActions from '$lib/components/migration/ReviewActions.svelte';
	import TestSpecBatchRunner from '$lib/components/migration/TestSpecBatchRunner.svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import { FlaskConical } from '@lucide/svelte';
	import type { QuestionTemplate } from '$lib/questions/types';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Filter state
	type FilterType = 'all' | 'pending' | 'clean' | 'warnings' | 'errors' | 'approved' | 'rejected';
	let activeFilter = $state<FilterType>('pending');

	// Selected question for detail view
	let selectedQuestion = $state<(typeof data.questions)[0] | null>(null);
	let dialogOpen = $state(false);

	// Review status tracking - use SvelteMap for reactivity
	// Initialize from persisted data, updates on approve/reject
	type ReviewStatus = 'pending' | 'approved' | 'rejected';
	const reviewStatus = new SvelteMap<number, { status: ReviewStatus; reason?: string }>();

	// Batch test runner
	let showBatchRunner = $state(false);

	// Build QuestionTemplate array from migration data for batch testing
	let batchTestTemplates = $derived.by(() => {
		return data.questions
			.filter((q) => q.transformed?.variations?.length)
			.map(
				(q): QuestionTemplate => ({
					id: `migration-${q.globalIndex}`,
					title: q.transformed.title || `Question ${q.globalIndex}`,
					status: 'draft',
					shared: q.transformed.shared as unknown as QuestionTemplate['shared'],
					// Migration JSON uses plain strings; cast through unknown to satisfy TemplateMarkdown brand
					variations: (q.transformed.variations ?? []) as unknown as QuestionTemplate['variations'],
					options: q.transformed.options as QuestionTemplate['options'],
					defaultDisplayOptions: q.transformed.defaultDisplayOptions,
					exerciseInstruction: q.transformed.exerciseInstruction,
					multipleAnswers: q.transformed.multipleAnswers,
					grades: q.transformed.grades ?? ['6'],
					// theme/domain/subdomain live at data top-level, not inside stats
					theme: q.transformed.theme ?? data.theme,
					domain: q.transformed.domain ?? data.domain,
					subdomain: q.transformed.subdomain ?? data.subdomain,
					level: q.transformed.level ?? q.level,
					delay: q.transformed.delay,
					testSpecs: (q.transformed as Record<string, unknown>)
						.testSpecs as QuestionTemplate['testSpecs']
				})
			);
	});

	// Edit tracking - track which questions have been edited
	const questionEdits = new SvelteMap<number, { editId: string; editedJson: unknown }>();

	// Initialize review status from server data (DB-persisted values)
	$effect(() => {
		if (data.reviewStatusMap) {
			for (const [indexStr, dbStatus] of Object.entries(data.reviewStatusMap)) {
				const index = Number(indexStr);
				// Convert DB status to UI status: 'validated' -> 'approved', 'failed' -> 'rejected'
				const uiStatus: ReviewStatus =
					dbStatus.status === 'validated'
						? 'approved'
						: dbStatus.status === 'failed'
							? 'rejected'
							: 'pending';
				if (uiStatus !== 'pending') {
					reviewStatus.set(index, { status: uiStatus, reason: dbStatus.reason });
				}
			}
		}
	});

	// Initialize question edits from server data
	$effect(() => {
		if (data.questionEditsMap) {
			for (const [indexStr, editData] of Object.entries(data.questionEditsMap)) {
				const index = Number(indexStr);
				questionEdits.set(index, editData);
			}
		}
	});

	// Loading state for API calls
	let isSubmitting = $state(false);

	// Get review status for a question
	function getReviewStatus(globalIndex: number): ReviewStatus {
		return reviewStatus.get(globalIndex)?.status ?? 'pending';
	}

	// Check if a question has been edited
	function isQuestionEdited(globalIndex: number): boolean {
		return questionEdits.has(globalIndex);
	}

	// Get edited data for a question (returns transformed data with edits applied)
	function getEditedTransformed(question: (typeof data.questions)[0]): Record<string, unknown> {
		const edit = questionEdits.get(question.globalIndex);
		if (edit?.editedJson) {
			return edit.editedJson as Record<string, unknown>;
		}
		return question.transformed;
	}

	// Filtered questions
	const filteredQuestions = $derived.by(() => {
		let questions = data.questions;

		switch (activeFilter) {
			case 'pending':
				questions = questions.filter((q) => getReviewStatus(q.globalIndex) === 'pending');
				break;
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

	// Navigation within filtered questions
	const selectedQuestionIndex = $derived(
		selectedQuestion
			? filteredQuestions.findIndex((q) => q.globalIndex === selectedQuestion!.globalIndex)
			: -1
	);
	const canNavigatePrev = $derived(selectedQuestionIndex > 0);
	const canNavigateNext = $derived(
		selectedQuestionIndex >= 0 && selectedQuestionIndex < filteredQuestions.length - 1
	);

	function navigatePrev() {
		if (canNavigatePrev) {
			selectedQuestion = filteredQuestions[selectedQuestionIndex - 1];
		}
	}

	function navigateNext() {
		if (canNavigateNext) {
			selectedQuestion = filteredQuestions[selectedQuestionIndex + 1];
		}
	}

	// Navigate back
	async function navigateBack() {
		await goto('/dashboard/admin/migration');
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

	// Handle edit button click - navigate to dedicated edit page
	function handleEditClick() {
		if (!selectedQuestion) return;
		dialogOpen = false;
		goto(`${$page.url.pathname}/${selectedQuestion.globalIndex}/edit`).then(() => {});
	}
</script>

<svelte:head>
	<title>Migration: {data.subdomain} - Chiphre</title>
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
					<AlertTriangle class="mr-2 inline-block h-4 w-4 text-warning" />
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

		<Card.Root class="border-success/50 bg-success/5">
			<Card.Header class="pb-3">
				<Card.Title class="text-sm font-medium">
					<CheckCircle2 class="mr-2 inline-block h-4 w-4 text-success" />
					Approuvees
				</Card.Title>
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold text-success">{reviewStats.approved}</div>
				<p class="text-xs text-muted-foreground">Validees en DB</p>
			</Card.Content>
		</Card.Root>

		<Card.Root class="border-destructive/50 bg-destructive/5">
			<Card.Header class="pb-3">
				<Card.Title class="text-sm font-medium">
					<XCircle class="mr-2 inline-block h-4 w-4 text-destructive" />
					Rejetees
				</Card.Title>
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold text-destructive">{reviewStats.rejected}</div>
				<p class="text-xs text-muted-foreground">Rejetees en DB</p>
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
			variant={activeFilter === 'pending' ? 'default' : 'outline'}
			size="sm"
			onclick={() => (activeFilter = 'pending')}
		>
			En attente ({reviewStats.pending})
		</Button>
		<Separator orientation="vertical" class="mx-1 h-6" />
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
			class={activeFilter === 'approved' ? 'bg-success hover:bg-success/90' : ''}
		>
			<CheckCircle2 class="mr-1 h-3 w-3" />
			Approuvees ({reviewStats.approved})
		</Button>
		<Button
			variant={activeFilter === 'rejected' ? 'default' : 'outline'}
			size="sm"
			onclick={() => (activeFilter = 'rejected')}
			class={activeFilter === 'rejected' ? 'bg-destructive hover:bg-destructive/90' : ''}
		>
			<XCircle class="mr-1 h-3 w-3" />
			Rejetees ({reviewStats.rejected})
		</Button>
		<Separator orientation="vertical" class="mx-1 h-6" />
		<Button variant="outline" size="sm" onclick={() => (showBatchRunner = true)}>
			<FlaskConical class="mr-1 h-3 w-3" />
			Tests
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
	<Dialog.Content
		class="flex h-[100dvh] max-h-[100dvh] max-w-[100vw] flex-col overflow-hidden rounded-none p-0 sm:max-w-[100vw]"
		showCloseButton={false}
	>
		<!-- Sticky header bar -->
		{#if selectedQuestion}
			{@const status = getReviewStatus(selectedQuestion.globalIndex)}
			{@const isEdited = isQuestionEdited(selectedQuestion.globalIndex)}
			{@const hasErrors = selectedQuestion.errors.length > 0}
			<div class="flex shrink-0 items-center gap-3 border-b px-4 py-2">
				<!-- Navigation prev/next -->
				<div class="flex items-center gap-1">
					<Button
						variant="ghost"
						size="icon"
						onclick={navigatePrev}
						disabled={!canNavigatePrev}
						class="h-8 w-8"
					>
						<ChevronLeft class="h-5 w-5" />
					</Button>
					<span class="min-w-[3rem] text-center text-sm text-muted-foreground">
						{selectedQuestionIndex + 1}/{filteredQuestions.length}
					</span>
					<Button
						variant="ghost"
						size="icon"
						onclick={navigateNext}
						disabled={!canNavigateNext}
						class="h-8 w-8"
					>
						<ChevronRight class="h-5 w-5" />
					</Button>
				</div>

				<!-- Title -->
				<Dialog.Title class="flex items-center gap-2 text-base font-semibold">
					<span>#{selectedQuestion.globalIndex}</span>
					<span class="text-sm font-normal text-muted-foreground">
						{data.theme} › {data.domain} › {data.subdomain}
					</span>
					<span class="text-muted-foreground">-</span>
					<span class="text-muted-foreground">Niveau {selectedQuestion.level}</span>
				</Dialog.Title>

				<!-- Status badges -->
				{#if isEdited}
					<Badge variant="outline" class="border-info/50 text-info">
						<Edit3 class="mr-1 h-3 w-3" />
						Modifie
					</Badge>
				{/if}
				{#if status === 'approved'}
					<Badge variant="default" class="bg-success">
						<CheckCircle2 class="mr-1 h-3 w-3" />
						Approuvee
					</Badge>
				{:else if status === 'rejected'}
					<Badge variant="destructive">
						<XCircle class="mr-1 h-3 w-3" />
						Rejetee
					</Badge>
				{/if}

				<!-- Spacer -->
				<div class="flex-1"></div>

				<!-- Actions (only when pending) -->
				{#if status === 'pending'}
					<Button
						variant="ghost"
						size="icon"
						onclick={handleEditClick}
						title="Modifier"
						class="h-8 w-8"
					>
						<Edit3 class="h-4 w-4" />
					</Button>
					<ReviewActions onApprove={handleApprove} onReject={handleReject} disabled={hasErrors} />
				{/if}

				<!-- Close button -->
				<Button variant="ghost" size="icon" onclick={closeDialog} class="h-8 w-8" title="Fermer">
					<X class="h-4 w-4" />
				</Button>
			</div>
		{/if}

		<!-- Scrollable content -->
		<div class="flex-1 overflow-y-auto p-4">
			{#if selectedQuestion}
				<QuestionCompareView
					original={selectedQuestion.question}
					transformed={getEditedTransformed(selectedQuestion)}
					warnings={selectedQuestion.warnings}
					errors={selectedQuestion.errors}
					isEdited={isQuestionEdited(selectedQuestion.globalIndex)}
				/>
			{/if}
		</div>

		<!-- Hidden description for accessibility -->
		<Dialog.Description class="sr-only">
			{#if selectedQuestion}
				{selectedQuestion.question.description}
			{/if}
		</Dialog.Description>
	</Dialog.Content>
</Dialog.Root>

<!-- Batch Test Runner -->
<TestSpecBatchRunner bind:open={showBatchRunner} templates={batchTestTemplates} />
