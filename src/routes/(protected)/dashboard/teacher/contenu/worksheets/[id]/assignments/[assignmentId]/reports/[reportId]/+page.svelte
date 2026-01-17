<!--
	Teacher Error Report Detail Page
	=================================

	Dedicated page for reviewing a single error report.
	Allows teachers to:
	- View the student's report description
	- Edit ALL variations of the exercise using VariationEditor
	- See which variation the student saw (highlighted)
	- Preview what the student saw with their seed
	- Validate (fix) or reject the report

	Features:
	- Full VariationEditor with rich text editing
	- Tabs for all variations
	- Visual indicator for the reported variation
	- Student preview with seed-based rendering
	- Rich text editor for rejection reason
	- Auto-navigation to next pending report
-->
<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { z } from 'zod';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Tabs from '$lib/components/ui/tabs';
	import VariationEditor from '$lib/components/exercises/VariationEditor.svelte';
	import RichTextEditor from '$lib/components/rich-text/RichTextEditor.svelte';
	import RichTextDisplay from '$lib/components/rich-text/RichTextDisplay.svelte';
	import MarkdownRenderer from '$lib/components/markdown/MarkdownRenderer.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { ArrowLeft, Check, X, Loader2, AlertTriangle } from 'lucide-svelte';
	import type { ExerciseVariation } from '$lib/exercises/types';

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
		variation_index: number | null;
		seed: number | null;
		created_at: string;
		updated_at: string;
	}

	interface ExerciseData {
		id: string;
		slug: string;
		variations: ExerciseVariation[];
		shared: unknown;
		generic_functions: string[] | null;
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
	const exercise = data.exercise as ExerciseData;
	const context = data.context as ContextData;
	const nextPendingReportId = data.nextPendingReportId as string | null;

	// State - deep copy variations for editing
	let variations = $state<ExerciseVariation[]>(JSON.parse(JSON.stringify(exercise.variations)));

	// Active variation tab - default to the reported variation or first
	let activeVariationTab = $state<string>(
		report.variation_index !== null ? String(report.variation_index) : '0'
	);

	let rejectionReasonJson = $state<object | null>(null);
	let isRejecting = $state(false);
	let isSubmitting = $state(false);

	// Derived values
	let isPending = $derived(report.status === 'pending');
	let canSubmit = $derived(!isSubmitting && isPending);

	// Safe reported variation with bounds checking
	let reportedVariationIndex = $derived.by(() => {
		if (report.variation_index === null) return 0;
		if (report.variation_index >= variations.length) {
			console.warn(
				`[ErrorReport] variation_index ${report.variation_index} out of bounds (${variations.length} variations)`
			);
			return 0;
		}
		return report.variation_index;
	});

	let reportedVariation = $derived.by(() => {
		if (report.variation_index === null || variations.length === 0) return null;
		if (report.variation_index >= variations.length) return null;
		return variations[report.variation_index];
	});

	// Get variation display label
	function getVariationDisplayLabel(variation: ExerciseVariation): string {
		const labelMap: Record<string, string> = {
			guided: 'Guidee',
			intermediate: 'Intermediaire',
			autonomous: 'Autonome'
		};
		return labelMap[variation.label] ?? variation.label;
	}

	// Check if rejection reason has content
	function hasRejectionContent(json: object | null): boolean {
		if (!json) return false;
		const doc = json as { type?: string; content?: Array<{ content?: unknown[] }> };
		if (doc.type !== 'doc' || !doc.content) return false;
		return doc.content.some((node) => node.content && node.content.length > 0);
	}

	// Parse JSON description (TipTap format)
	let descriptionContent = $derived.by(() => {
		try {
			return JSON.parse(report.description);
		} catch {
			return {
				type: 'doc',
				content: [{ type: 'paragraph', content: [{ type: 'text', text: report.description }] }]
			};
		}
	});

	// Parse JSON response if exists
	let responseContent = $derived.by(() => {
		if (!report.response) return null;
		try {
			return JSON.parse(report.response);
		} catch {
			const text = report.response;
			if (text.includes('<p>') || text.includes('<br>')) {
				const plainText = text
					.replace(/<br\s*\/?>/gi, '\n')
					.replace(/<p>/gi, '')
					.replace(/<\/p>/gi, '\n')
					.replace(/<[^>]+>/g, '')
					.trim();
				return {
					type: 'doc',
					content: [{ type: 'paragraph', content: [{ type: 'text', text: plainText }] }]
				};
			}
			return {
				type: 'doc',
				content: [{ type: 'paragraph', content: [{ type: 'text', text }] }]
			};
		}
	});

	// Format date
	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString('fr-FR', {
			day: 'numeric',
			month: 'long',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	// Client-side validation
	const reviewSchema = z
		.object({
			status: z.enum(['fixed', 'rejected']),
			response: z.string().trim().min(1).max(2000).nullable().optional(),
			variations: z.array(z.unknown()).optional()
		})
		.refine(
			(d) => {
				if (d.status === 'rejected') {
					return d.response !== null && d.response !== undefined && d.response.length > 0;
				}
				return true;
			},
			{ message: 'Le motif de rejet est requis', path: ['response'] }
		);

	// Navigation
	function navigateToReportsList(): void {
		goto(
			`/dashboard/teacher/contenu/worksheets/${data.worksheetId}/assignments/${data.assignmentId}/reports`
		);
	}

	function navigateToNextOrList(): void {
		if (nextPendingReportId) {
			goto(
				`/dashboard/teacher/contenu/worksheets/${data.worksheetId}/assignments/${data.assignmentId}/reports/${nextPendingReportId}`
			);
		} else {
			navigateToReportsList();
		}
	}

	// Submit review
	async function submitReview(status: 'fixed' | 'rejected'): Promise<void> {
		if (!canSubmit) return;

		const body: Record<string, unknown> = { status };

		if (status === 'fixed') {
			body.variations = variations;
		} else {
			body.response = rejectionReasonJson ? JSON.stringify(rejectionReasonJson) : null;
		}

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

			if (status === 'fixed') {
				toaster.success('Signalement valide et exercice mis a jour');
			} else {
				toaster.info('Signalement rejete');
			}

			navigateToNextOrList();
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Une erreur est survenue';
			toaster.error(message);
		} finally {
			isSubmitting = false;
		}
	}

	function handleValidate(): void {
		submitReview('fixed');
	}

	function handleReject(): void {
		if (!isRejecting) {
			isRejecting = true;
		} else {
			submitReview('rejected');
		}
	}

	function cancelRejection(): void {
		isRejecting = false;
		rejectionReasonJson = null;
	}
</script>

<svelte:head>
	<title>Signalement - Exercice {context.exercise_position + 1} - UbuMaths</title>
</svelte:head>

<div class="container mx-auto max-w-7xl py-6">
	<!-- Header -->
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
				{#if report.variation_index !== null}
					<span>
						<span class="font-medium text-foreground">Variation :</span>
						{getVariationDisplayLabel(variations[report.variation_index] ?? variations[0])}
					</span>
				{/if}
				{#if report.seed !== null}
					<span class="text-xs">
						(seed: {report.seed})
					</span>
				{/if}
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

	<!-- Student preview (what they saw) -->
	{#if reportedVariation}
		<Card.Root class="mb-6 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
			<Card.Header class="pb-2">
				<Card.Title class="flex items-center gap-2 text-base">
					<AlertTriangle class="h-4 w-4" />
					Ce que l'eleve a vu
				</Card.Title>
				<Card.Description>
					Variation "{getVariationDisplayLabel(reportedVariation)}"
					{#if report.seed !== null}
						avec seed {report.seed}
					{/if}
				</Card.Description>
			</Card.Header>
			<Card.Content>
				<div class="rounded-md border bg-background p-4">
					<MarkdownRenderer content={reportedVariation.statement_md} />
				</div>
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- Action buttons -->
	{#if isPending}
		<div class="mb-6 flex flex-wrap items-center gap-3">
			{#if !isRejecting}
				<Button onclick={handleValidate} disabled={!canSubmit} class="gap-2">
					{#if isSubmitting}
						<Loader2 class="h-4 w-4 animate-spin" />
					{:else}
						<Check class="h-4 w-4" />
					{/if}
					Valider les modifications
				</Button>
				<Button variant="destructive" onclick={handleReject} disabled={!canSubmit} class="gap-2">
					<X class="h-4 w-4" />
					Rejeter
				</Button>
			{:else}
				<div class="flex w-full flex-col gap-4">
					<div>
						<p class="mb-2 text-sm font-medium text-foreground">Motif du rejet (obligatoire) :</p>
						<RichTextEditor
							mode="form"
							bind:jsonValue={rejectionReasonJson}
							mathTemplates="basic"
							minHeight="100px"
							disabled={isSubmitting}
						/>
					</div>
					<div class="flex gap-3">
						<Button
							variant="destructive"
							onclick={handleReject}
							disabled={!canSubmit || !hasRejectionContent(rejectionReasonJson)}
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
	{:else if responseContent}
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

	<!-- Variations Editor -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Variations de l'exercice</Card.Title>
			<Card.Description>
				Modifiez les variations de l'exercice. La variation signalee est marquee.
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<Tabs.Root bind:value={activeVariationTab}>
				<div class="sticky top-0 z-10 mb-4 bg-card py-2">
					<Tabs.List class="flex-wrap">
						{#each variations as variation, index (index)}
							<Tabs.Trigger
								value={String(index)}
								class="relative {index === reportedVariationIndex
									? 'ring-2 ring-amber-500 ring-offset-1'
									: ''}"
							>
								{getVariationDisplayLabel(variation)}
								{#if index === reportedVariationIndex}
									<span
										class="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] text-white"
										title="Variation signalee"
									>
										!
									</span>
								{/if}
							</Tabs.Trigger>
						{/each}
					</Tabs.List>
				</div>

				{#each variations as _, index (index)}
					<Tabs.Content value={String(index)}>
						<VariationEditor
							bind:variation={variations[index]}
							genericFunctions={exercise.generic_functions ?? undefined}
							imageSlug={exercise.slug || undefined}
						/>
					</Tabs.Content>
				{/each}
			</Tabs.Root>
		</Card.Content>
	</Card.Root>
</div>
