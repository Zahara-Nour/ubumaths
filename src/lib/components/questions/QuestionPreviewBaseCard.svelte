<!--
	QuestionPreviewBaseCard Component
	==================================

	Base card component for displaying QuestionInstance information.
	Single-sided card with collapsible sections showing all instance data.

	Features:
	- Displays resolved instance data (statement, answer, variables, etc.)
	- MathLive rendering for LaTeX expressions
	- Collapsible sections (metadata, variables, correction, technical)
	- Statement truncation with expand option
	- Badges for type, level, and grades
	- Optional clickable for modal integration
	- Responsive and clean layout

	Props:
	- instance: QuestionInstance (required)
	- Display options: truncateStatement, showDescription, etc.
	- Sections visibility: showMetadata, showVariables, etc.
	- Sections collapsed state: metadataCollapsed, variablesCollapsed, etc.
	- Interactivity: clickable, onclick

	Usage:
		<QuestionPreviewBaseCard
			{instance}
			truncateStatement={true}
			showVariables={true}
			variablesCollapsed={true}
		/>
-->

<script lang="ts">
	import type { QuestionInstance } from '$lib/questions/types';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import * as Collapsible from '$lib/components/ui/collapsible';
	import { Button } from '$lib/components/ui/button';
	import { MarkdownRenderer } from '$lib/components/markdown';
	import {
		ChevronDown,
		ChevronRight,
		BookOpen,
		Hash,
		CheckCircle,
		List,
		Info,
		FileText
	} from 'lucide-svelte';
	import { cn } from '$lib/utils';

	// ============================================================================
	// PROPS
	// ============================================================================

	interface Props {
		instance: QuestionInstance;

		// Display options
		truncateStatement?: boolean; // Truncate statement text
		statementMaxLength?: number; // Max length for truncation (default: 200)
		showDescription?: boolean; // Show description if present
		showExerciseInstruction?: boolean; // Show exercise instruction if present

		// Sections visibility
		showMetadata?: boolean; // Show metadata section (default: true)
		showVariables?: boolean; // Show variables section (default: true)
		showAnswer?: boolean; // Show answer section (default: true)
		showCorrection?: boolean; // Show correction if present (default: true)
		showChoices?: boolean; // Show choices if QCM (default: true)
		showTechnicalInfo?: boolean; // Show technical info (default: true)

		// Sections collapsed state
		metadataCollapsed?: boolean; // Metadata collapsed (default: false = open)
		variablesCollapsed?: boolean; // Variables collapsed (default: true = closed)
		correctionCollapsed?: boolean; // Correction collapsed (default: true = closed)
		technicalCollapsed?: boolean; // Technical collapsed (default: true = closed)

		// Interactivity
		clickable?: boolean; // Make card clickable (default: false)
		onclick?: (instance: QuestionInstance) => void; // Click handler

		// Styling
		class?: string;
	}

	let {
		instance,
		truncateStatement = false,
		statementMaxLength = 200,
		showDescription = true,
		showExerciseInstruction = true,
		showMetadata = true,
		showVariables = true,
		showAnswer = true,
		showCorrection = true,
		showChoices = true,
		showTechnicalInfo = true,
		metadataCollapsed = false,
		variablesCollapsed = true,
		correctionCollapsed = true,
		technicalCollapsed = true,
		clickable = false,
		onclick,
		class: className = ''
	}: Props = $props();

	// ============================================================================
	// STATE
	// ============================================================================

	let isMetadataOpen = $state(!metadataCollapsed);
	let isVariablesOpen = $state(!variablesCollapsed);
	let isCorrectionOpen = $state(!correctionCollapsed);
	let isTechnicalOpen = $state(!technicalCollapsed);
	let isStatementExpanded = $state(false);

	// ============================================================================
	// DERIVED STATE
	// ============================================================================

	// Statement markdown - instance.statement is now ResolvedMarkdown (string)
	const statementMarkdown = $derived(instance.statement);
	const needsTruncation = $derived(
		truncateStatement && !isStatementExpanded && statementMarkdown.length > statementMaxLength
	);
	const displayedStatement = $derived(
		needsTruncation ? statementMarkdown.substring(0, statementMaxLength) + '...' : statementMarkdown
	);

	// Correction markdown - instance.correction is ResolvedCorrection (object) or undefined
	// Build correction markdown from ResolvedCorrection object
	const correctionMarkdown = $derived.by(() => {
		const correction = instance.correction;
		if (!correction) return '';
		const parts: string[] = [];
		if (correction.steps && correction.steps.length > 0) {
			parts.push(...correction.steps);
		}
		if (correction.feedback?.correct) {
			parts.push(correction.feedback.correct);
		}
		return parts.join('\n\n');
	});
	const hasCorrection = $derived(correctionMarkdown.length > 0 && showCorrection);

	// Variables
	const hasVariables = $derived(
		instance.resolvedVariables && instance.resolvedVariables.length > 0 && showVariables
	);
	const variableCount = $derived(instance.resolvedVariables?.length || 0);

	// Choices (QCM)
	const hasChoices = $derived(
		instance.type === 'multiple_choice' &&
			instance.shuffledChoices &&
			instance.shuffledChoices.length > 0 &&
			showChoices
	);

	// Answer as array (solution from QuestionInstance)
	const answerArray = $derived(
		Array.isArray(instance.solution) ? instance.solution : [instance.solution]
	);

	// ============================================================================
	// EVENT HANDLERS
	// ============================================================================

	function handleCardClick() {
		if (clickable && onclick) {
			onclick(instance);
		}
	}

	function handleExpandStatement() {
		isStatementExpanded = !isStatementExpanded;
	}

	// ============================================================================
	// HELPER FUNCTIONS
	// ============================================================================

	/**
	 * Format date for display
	 */
	function formatDate(isoString: string | undefined): string {
		if (!isoString) return 'N/A';
		const date = new Date(isoString);
		return date.toLocaleString('fr-FR', {
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	/**
	 * Get badge variant for grade
	 */
	function getGradeBadgeVariant(_grade: string): 'default' | 'secondary' | 'outline' {
		// Simple logic: you can customize
		return 'outline';
	}

	/**
	 * Format template ID for display (truncate)
	 */
	function formatTemplateId(id: string): string {
		return id.length > 12 ? id.substring(0, 12) + '...' : id;
	}
</script>

<Card.Root
	class={cn(
		'relative transition-all duration-200',
		clickable && 'cursor-pointer hover:shadow-lg',
		className
	)}
	onclick={handleCardClick}
>
	<!-- ========== HEADER ========== -->
	<Card.Header class="space-y-3">
		<!-- Title and Type -->
		<div class="flex items-start justify-between gap-3">
			<Card.Title class="flex-1 text-xl">
				<MarkdownRenderer content={instance.title || 'Question sans titre'} />
			</Card.Title>
			<div class="flex flex-shrink-0 items-center gap-2">
				<Badge variant="secondary" class="text-xs">{instance.type}</Badge>
				<Badge variant="default" class="text-xs">{instance.level}</Badge>
			</div>
		</div>

		<!-- Description (if present and enabled) -->
		{#if showDescription && instance.description}
			<Card.Description class="text-sm">
				<MarkdownRenderer content={instance.description} />
			</Card.Description>
		{/if}

		<!-- Exercise Instruction (if present and enabled) -->
		{#if showExerciseInstruction && instance.exerciseInstruction}
			<div class="flex items-start gap-2 rounded-md bg-muted/50 p-2 text-sm">
				<FileText class="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
				<MarkdownRenderer content={instance.exerciseInstruction} />
			</div>
		{/if}
	</Card.Header>

	<Card.Content class="space-y-4">
		<!-- ========== METADATA SECTION ========== -->
		{#if showMetadata}
			<Collapsible.Root bind:open={isMetadataOpen}>
				<div class="space-y-2">
					<Collapsible.Trigger
						class="flex w-full items-center justify-between rounded-md p-2 transition-colors hover:bg-muted/50"
					>
						<div class="flex items-center gap-2">
							<BookOpen class="h-4 w-4" />
							<span class="font-semibold">Métadonnées</span>
						</div>
						{#if isMetadataOpen}
							<ChevronDown class="h-4 w-4" />
						{:else}
							<ChevronRight class="h-4 w-4" />
						{/if}
					</Collapsible.Trigger>

					<Collapsible.Content class="space-y-3 px-2">
						<!-- Theme, Domain, Subdomain -->
						<div class="space-y-1 text-sm">
							<div class="flex items-center gap-2">
								<span class="font-medium text-muted-foreground">Thème:</span>
								<span>{instance.theme}</span>
							</div>
							<div class="flex items-center gap-2">
								<span class="font-medium text-muted-foreground">Domaine:</span>
								<span>{instance.domain}</span>
							</div>
							{#if instance.subdomain}
								<div class="flex items-center gap-2">
									<span class="font-medium text-muted-foreground">Sous-domaine:</span>
									<span>{instance.subdomain}</span>
								</div>
							{/if}
						</div>

						<!-- Grades -->
						<div class="flex items-center gap-2">
							<span class="text-sm font-medium text-muted-foreground">Niveaux:</span>
							<div class="flex flex-wrap gap-1">
								{#each instance.grades as grade (grade)}
									<Badge variant={getGradeBadgeVariant(grade)} class="text-xs">
										{grade}
									</Badge>
								{/each}
							</div>
						</div>

						<!-- Delay (if present) -->
						{#if instance.delay}
							<div class="flex items-center gap-2 text-sm">
								<span class="font-medium text-muted-foreground">Délai:</span>
								<span>{instance.delay} secondes</span>
							</div>
						{/if}

						<!-- Precision (if present) -->
						{#if instance.precision}
							<div class="flex items-center gap-2 text-sm">
								<span class="font-medium text-muted-foreground">Précision:</span>
								<span>{instance.precision.type}</span>
							</div>
						{/if}
					</Collapsible.Content>
				</div>
			</Collapsible.Root>
		{/if}

		<!-- ========== STATEMENT SECTION ========== -->
		<div class="space-y-2">
			<div class="flex items-center gap-2">
				<FileText class="h-4 w-4 text-muted-foreground" />
				<span class="text-sm font-semibold">Énoncé</span>
			</div>
			<div class="rounded-lg border bg-card p-4">
				<MarkdownRenderer content={displayedStatement} />

				<!-- Expand/Collapse Button -->
				{#if truncateStatement && statementMarkdown.length > statementMaxLength}
					<Button
						variant="ghost"
						size="sm"
						onclick={handleExpandStatement}
						class="mt-2 w-full text-xs"
					>
						{isStatementExpanded ? 'Voir moins' : 'Voir plus'}
						{#if isStatementExpanded}
							<ChevronDown class="ml-1 h-3 w-3" />
						{:else}
							<ChevronRight class="ml-1 h-3 w-3" />
						{/if}
					</Button>
				{/if}
			</div>
		</div>

		<!-- ========== VARIABLES SECTION ========== -->
		{#if hasVariables}
			<Collapsible.Root bind:open={isVariablesOpen}>
				<div class="space-y-2">
					<Collapsible.Trigger
						class="flex w-full items-center justify-between rounded-md p-2 transition-colors hover:bg-muted/50"
					>
						<div class="flex items-center gap-2">
							<Hash class="h-4 w-4" />
							<span class="font-semibold">Variables résolues ({variableCount})</span>
						</div>
						{#if isVariablesOpen}
							<ChevronDown class="h-4 w-4" />
						{:else}
							<ChevronRight class="h-4 w-4" />
						{/if}
					</Collapsible.Trigger>

					<Collapsible.Content class="px-2">
						<div class="grid gap-2 sm:grid-cols-2">
							{#each instance.resolvedVariables || [] as variable, i (i)}
								<div class="flex items-start gap-2 rounded border bg-muted/50 p-2 text-sm">
									<code class="flex-shrink-0 font-semibold">{variable.name}:</code>
									<code class="break-all">
										<MarkdownRenderer content={`$$${variable.value}$$`} />
									</code>
								</div>
							{/each}
						</div>
					</Collapsible.Content>
				</div>
			</Collapsible.Root>
		{/if}

		<!-- ========== ANSWER SECTION ========== -->
		{#if showAnswer}
			<div class="space-y-2">
				<div class="flex items-center gap-2">
					<CheckCircle class="h-4 w-4 text-green-600" />
					<span class="text-sm font-semibold">Réponse attendue</span>
				</div>
				<div class="rounded-lg border-2 border-green-600 bg-green-50 p-3 dark:bg-green-950/20">
					{#if answerArray.length > 1}
						<ul class="space-y-1">
							{#each answerArray as ans, i (i)}
								<li class="flex items-center gap-2">
									<Badge class="bg-green-600">{i + 1}</Badge>
									<MarkdownRenderer content={`$$${String(ans)}$$`} />
								</li>
							{/each}
						</ul>
					{:else}
						<MarkdownRenderer content={`$$${String(answerArray[0])}$$`} />
					{/if}
				</div>
			</div>
		{/if}

		<!-- ========== CHOICES SECTION (QCM) ========== -->
		{#if hasChoices}
			<div class="space-y-2">
				<div class="flex items-center gap-2">
					<List class="h-4 w-4 text-muted-foreground" />
					<span class="text-sm font-semibold">Choix (mélangés)</span>
				</div>
				<div class="space-y-2">
					{#each instance.shuffledChoices || [] as choice, i (i)}
						{@const isCorrect =
							(typeof instance.solution === 'string' && instance.solution === String(i)) ||
							(Array.isArray(instance.solution) && instance.solution.includes(String(i)))}
						<div
							class={cn(
								'flex items-center gap-3 rounded border p-3',
								isCorrect
									? 'border-green-500 bg-green-50 dark:bg-green-950/20'
									: 'border-border bg-card'
							)}
						>
							<Badge variant={isCorrect ? 'default' : 'outline'}>
								{String.fromCharCode(65 + i)}
							</Badge>
							<div class="flex-1">
								<MarkdownRenderer content={choice.content} />
							</div>
							{#if isCorrect}
								<CheckCircle class="h-5 w-5 flex-shrink-0 text-green-600" />
							{/if}
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- ========== CORRECTION SECTION ========== -->
		{#if hasCorrection}
			<Collapsible.Root bind:open={isCorrectionOpen}>
				<div class="space-y-2">
					<Collapsible.Trigger
						class="flex w-full items-center justify-between rounded-md p-2 transition-colors hover:bg-muted/50"
					>
						<div class="flex items-center gap-2">
							<CheckCircle class="h-4 w-4" />
							<span class="font-semibold">Correction</span>
						</div>
						{#if isCorrectionOpen}
							<ChevronDown class="h-4 w-4" />
						{:else}
							<ChevronRight class="h-4 w-4" />
						{/if}
					</Collapsible.Trigger>

					<Collapsible.Content class="px-2">
						<div class="space-y-3 rounded-lg border bg-muted/50 p-4">
							<MarkdownRenderer content={correctionMarkdown} />
						</div>
					</Collapsible.Content>
				</div>
			</Collapsible.Root>
		{/if}

		<!-- ========== TECHNICAL INFO SECTION ========== -->
		{#if showTechnicalInfo}
			<Collapsible.Root bind:open={isTechnicalOpen}>
				<div class="space-y-2">
					<Collapsible.Trigger
						class="flex w-full items-center justify-between rounded-md p-2 transition-colors hover:bg-muted/50"
					>
						<div class="flex items-center gap-2">
							<Info class="h-4 w-4" />
							<span class="font-semibold">Informations techniques</span>
						</div>
						{#if isTechnicalOpen}
							<ChevronDown class="h-4 w-4" />
						{:else}
							<ChevronRight class="h-4 w-4" />
						{/if}
					</Collapsible.Trigger>

					<Collapsible.Content class="space-y-2 px-2 text-sm">
						<div class="grid gap-2 rounded-lg border bg-muted/30 p-3">
							<div class="flex items-center justify-between">
								<span class="font-medium text-muted-foreground">Template ID:</span>
								<code class="text-xs">{formatTemplateId(instance.templateId)}</code>
							</div>

							{#if instance.selectedVariationIndex !== undefined}
								<div class="flex items-center justify-between">
									<span class="font-medium text-muted-foreground">Variation:</span>
									<span>{instance.selectedVariationIndex + 1}</span>
								</div>
							{/if}

							{#if instance.seed !== undefined}
								<div class="flex items-center justify-between">
									<span class="font-medium text-muted-foreground">Seed:</span>
									<code class="text-xs">{instance.seed}</code>
								</div>
							{/if}

							{#if instance.generatedAt}
								<div class="flex items-center justify-between">
									<span class="font-medium text-muted-foreground">Généré le:</span>
									<span class="text-xs">{formatDate(instance.generatedAt)}</span>
								</div>
							{/if}
						</div>
					</Collapsible.Content>
				</div>
			</Collapsible.Root>
		{/if}
	</Card.Content>
</Card.Root>
