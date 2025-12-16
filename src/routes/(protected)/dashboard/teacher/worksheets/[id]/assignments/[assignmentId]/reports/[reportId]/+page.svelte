<!--
	Teacher Error Report Detail Page
	=================================

	Dedicated page for reviewing a single error report.
	Allows teachers to:
	- View the student's report description
	- Edit the exercise statement and solution
	- Validate (fix) or reject the report

	Features:
	- Live preview of markdown content
	- Rich text editor for rejection reason
	- Auto-navigation to next pending report
-->
<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { z } from 'zod';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import LaTeXEditor from '$lib/components/LaTeXEditor.svelte';
	import MarkdownRenderer from '$lib/components/markdown/MarkdownRenderer.svelte';
	import RichTextEditor from '$lib/components/rich-text/RichTextEditor.svelte';
	import RichTextDisplay from '$lib/components/rich-text/RichTextDisplay.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { ArrowLeft, Check, X, Loader2 } from 'lucide-svelte';

	// Types
	interface ReportData {
		id: string;
		assignment_id: string;
		worksheet_exercise_id: string;
		exercise_position: number;
		student_id: string;
		student_first_name: string | null;
		student_last_name: string | null;
		description: string;
		status: 'pending' | 'fixed' | 'rejected';
		response: string | null;
		created_at: string;
		updated_at: string;
		statement_md: string;
		solution_md: string | null;
	}

	interface ContextData {
		worksheet_title: string;
		student_name: string;
		exercise_position: number;
	}

	// Props
	let { data }: { data: PageData } = $props();

	// Cast for type safety
	const report = data.report as ReportData;
	const context = data.context as ContextData;
	const nextPendingReportId = data.nextPendingReportId as string | null;

	// State
	let statementMd = $state(report.statement_md);
	let solutionMd = $state(report.solution_md ?? '');
	let rejectionReason = $state('');
	let isRejecting = $state(false);
	let isSubmitting = $state(false);

	// Derived values
	let isPending = $derived(report.status === 'pending');
	let canSubmit = $derived(!isSubmitting && isPending);

	// Parse JSON description (TipTap format)
	let descriptionContent = $derived.by(() => {
		try {
			return JSON.parse(report.description);
		} catch {
			// Fallback for plain text or invalid JSON
			return {
				type: 'doc',
				content: [{ type: 'paragraph', content: [{ type: 'text', text: report.description }] }]
			};
		}
	});

	// Parse JSON response if exists (for already-processed reports)
	let responseContent = $derived.by(() => {
		if (!report.response) return null;
		try {
			return JSON.parse(report.response);
		} catch {
			// Fallback for plain text
			return {
				type: 'doc',
				content: [{ type: 'paragraph', content: [{ type: 'text', text: report.response }] }]
			};
		}
	});

	// Format date for display
	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString('fr-FR', {
			day: 'numeric',
			month: 'long',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	// Client-side validation schema (mirrors server schema)
	const reviewSchema = z
		.object({
			status: z.enum(['fixed', 'rejected']),
			response: z.string().trim().min(1).max(2000).nullable().optional(),
			statement_md: z.string().trim().min(1).max(50000).optional(),
			solution_md: z.string().trim().max(50000).nullable().optional()
		})
		.refine(
			(d) => {
				if (d.status === 'rejected') {
					return d.response !== null && d.response !== undefined && d.response.length > 0;
				}
				return true;
			},
			{ message: 'Le motif de rejet est requis', path: ['response'] }
		)
		.refine(
			(d) => {
				if (d.status === 'fixed') {
					return d.statement_md !== undefined && d.statement_md.length > 0;
				}
				return true;
			},
			{ message: "L'enonce corrige est requis", path: ['statement_md'] }
		);

	// Navigate to the reports list
	function navigateToReportsList(): void {
		goto(
			`/dashboard/teacher/worksheets/${data.worksheetId}/assignments/${data.assignmentId}/reports`
		);
	}

	// Navigate to next pending report or back to list
	function navigateToNextOrList(): void {
		if (nextPendingReportId) {
			goto(
				`/dashboard/teacher/worksheets/${data.worksheetId}/assignments/${data.assignmentId}/reports/${nextPendingReportId}`
			);
		} else {
			navigateToReportsList();
		}
	}

	// Submit the review to the API
	async function submitReview(status: 'fixed' | 'rejected'): Promise<void> {
		if (!canSubmit) return;

		// Build request body
		const body: Record<string, unknown> = { status };

		if (status === 'fixed') {
			body.statement_md = statementMd;
			body.solution_md = solutionMd || null;
		} else {
			body.response = rejectionReason;
		}

		// Validate client-side
		const validation = reviewSchema.safeParse(body);
		if (!validation.success) {
			toaster.error(validation.error.issues[0].message);
			return;
		}

		isSubmitting = true;

		try {
			const response = await fetch(
				`/api/worksheets/${data.worksheetId}/assignments/${data.assignmentId}/reports/${report.id}`,
				{
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(body)
				}
			);

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({ message: 'Erreur inconnue' }));
				throw new Error(errorData.message || `Erreur ${response.status}`);
			}

			// Success feedback
			if (status === 'fixed') {
				toaster.success('Signalement valide et exercice mis a jour');
			} else {
				toaster.info('Signalement rejete');
			}

			// Navigate to next
			navigateToNextOrList();
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Une erreur est survenue';
			toaster.error(message);
		} finally {
			isSubmitting = false;
		}
	}

	// Handle validate action
	function handleValidate(): void {
		submitReview('fixed');
	}

	// Handle reject action
	function handleReject(): void {
		if (!isRejecting) {
			// Show rejection form
			isRejecting = true;
		} else {
			// Submit rejection
			submitReview('rejected');
		}
	}

	// Cancel rejection mode
	function cancelRejection(): void {
		isRejecting = false;
		rejectionReason = '';
	}
</script>

<svelte:head>
	<title>Signalement - Exercice {context.exercise_position + 1} - UbuMaths</title>
</svelte:head>

<div class="container mx-auto max-w-7xl py-6">
	<!-- Header with back button -->
	<div class="mb-6 flex items-start gap-4">
		<Button variant="ghost" size="icon" onclick={navigateToReportsList} class="mt-1">
			<ArrowLeft class="h-5 w-5" />
		</Button>
		<div>
			<h1 class="text-3xl font-bold">Signalement</h1>
			<p class="mt-1 text-muted-foreground">
				{context.worksheet_title}
			</p>
		</div>
	</div>

	<!-- Report info card -->
	<Card.Root class="mb-6">
		<Card.Header class="pb-3">
			<div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
				<span>
					<span class="font-medium text-foreground">Eleve :</span>
					{context.student_name}
				</span>
				<span>
					<span class="font-medium text-foreground">Date :</span>
					{formatDate(report.created_at)}
				</span>
				<span>
					<span class="font-medium text-foreground">Exercice :</span>
					{context.exercise_position + 1}
				</span>
				{#if !isPending}
					<span
						class="rounded-full px-2 py-0.5 text-xs font-medium {report.status === 'fixed'
							? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
							: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'}"
					>
						{report.status === 'fixed' ? 'Valide' : 'Rejete'}
					</span>
				{/if}
			</div>
		</Card.Header>
		<Card.Content>
			<RichTextDisplay
				content={descriptionContent}
				class="prose prose-sm max-w-none dark:prose-invert"
			/>
		</Card.Content>
	</Card.Root>

	<!-- Action buttons (only for pending reports) -->
	{#if isPending}
		<div class="mb-6 flex flex-wrap items-center gap-3">
			{#if !isRejecting}
				<Button onclick={handleValidate} disabled={!canSubmit} class="gap-2">
					{#if isSubmitting}
						<Loader2 class="h-4 w-4 animate-spin" />
					{:else}
						<Check class="h-4 w-4" />
					{/if}
					Valider
				</Button>
				<Button variant="destructive" onclick={handleReject} disabled={!canSubmit} class="gap-2">
					<X class="h-4 w-4" />
					Rejeter
				</Button>
			{:else}
				<!-- Rejection mode -->
				<div class="flex w-full flex-col gap-4">
					<div>
						<p class="mb-2 text-sm font-medium text-foreground">Motif du rejet (obligatoire) :</p>
						<RichTextEditor
							mode="form"
							bind:htmlValue={rejectionReason}
							mathTemplates="basic"
							minHeight="100px"
							disabled={isSubmitting}
						/>
					</div>
					<div class="flex gap-3">
						<Button
							variant="destructive"
							onclick={handleReject}
							disabled={!canSubmit || !rejectionReason.trim()}
							class="gap-2"
						>
							{#if isSubmitting}
								<Loader2 class="h-4 w-4 animate-spin" />
							{:else}
								<X class="h-4 w-4" />
							{/if}
							Confirmer le rejet
						</Button>
						<Button variant="outline" onclick={cancelRejection} disabled={isSubmitting}>
							Annuler
						</Button>
					</div>
				</div>
			{/if}
		</div>
	{:else}
		<!-- Show response for non-pending reports -->
		{#if responseContent}
			<Card.Root class="mb-6 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
				<Card.Header class="pb-2">
					<Card.Title class="text-base">Reponse du professeur</Card.Title>
				</Card.Header>
				<Card.Content>
					<RichTextDisplay
						content={responseContent}
						class="prose prose-sm max-w-none dark:prose-invert"
					/>
				</Card.Content>
			</Card.Root>
		{/if}
	{/if}

	<!-- Editor and Preview side by side -->
	<div class="grid gap-6 lg:grid-cols-2">
		<!-- Editor Column -->
		<div class="flex flex-col gap-6">
			<Card.Root>
				<Card.Header>
					<Card.Title>Enonce</Card.Title>
					<Card.Description>Modifiez l'enonce de l'exercice en Markdown/LaTeX</Card.Description>
				</Card.Header>
				<Card.Content>
					<LaTeXEditor
						bind:value={statementMd}
						disabled={!isPending || isSubmitting}
						height="300px"
						placeholder="Entrez l'enonce de l'exercice..."
					/>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header>
					<Card.Title>Solution (optionnelle)</Card.Title>
					<Card.Description>Modifiez la solution de l'exercice en Markdown/LaTeX</Card.Description>
				</Card.Header>
				<Card.Content>
					<LaTeXEditor
						bind:value={solutionMd}
						disabled={!isPending || isSubmitting}
						height="300px"
						placeholder="Entrez la solution de l'exercice..."
					/>
				</Card.Content>
			</Card.Root>
		</div>

		<!-- Preview Column -->
		<div class="flex flex-col gap-6">
			<Card.Root>
				<Card.Header>
					<Card.Title>Apercu de l'enonce</Card.Title>
				</Card.Header>
				<Card.Content>
					<div class="min-h-[300px] rounded-md border border-border bg-muted/50 p-4">
						{#if statementMd.trim()}
							<MarkdownRenderer content={statementMd} />
						{:else}
							<p class="text-sm text-muted-foreground italic">Aucun contenu a afficher</p>
						{/if}
					</div>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header>
					<Card.Title>Apercu de la solution</Card.Title>
				</Card.Header>
				<Card.Content>
					<div class="min-h-[300px] rounded-md border border-border bg-muted/50 p-4">
						{#if solutionMd.trim()}
							<MarkdownRenderer content={solutionMd} />
						{:else}
							<p class="text-sm text-muted-foreground italic">Aucune solution definie</p>
						{/if}
					</div>
				</Card.Content>
			</Card.Root>
		</div>
	</div>
</div>
