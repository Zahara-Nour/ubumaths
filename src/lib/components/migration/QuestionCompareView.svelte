<script lang="ts">
	/**
	 * QuestionCompareView Component
	 * ==============================
	 *
	 * Side-by-side comparison of old vs transformed question formats.
	 *
	 * Features:
	 * - Two-column layout (responsive: stacks on mobile)
	 * - JSON syntax highlighting for complex data
	 * - Warnings section (amber/yellow)
	 * - Errors section (red)
	 * - Approve/Reject actions
	 * - Dark mode support
	 */

	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-svelte';
	import { cn } from '$lib/utils';
	import ReviewActions from './ReviewActions.svelte';

	interface Props {
		original: Record<string, unknown>; // Old question format
		transformed: Record<string, unknown> | null; // New format (null if transformation failed)
		warnings: string[];
		errors: string[];
		onApprove?: () => void;
		onReject?: (reason: string) => void;
		class?: string;
	}

	let {
		original,
		transformed,
		warnings,
		errors,
		onApprove,
		onReject,
		class: className
	}: Props = $props();

	// Status indicators
	const hasErrors = $derived(errors.length > 0);
	const hasWarnings = $derived(warnings.length > 0);
	const isClean = $derived(!hasErrors && !hasWarnings);

	/**
	 * Format a value for display
	 */
	function formatValue(value: unknown): string {
		if (value === null || value === undefined) {
			return 'null';
		}
		if (typeof value === 'string') {
			return value;
		}
		if (Array.isArray(value) || typeof value === 'object') {
			return JSON.stringify(value, null, 2);
		}
		return String(value);
	}

	/**
	 * Extract key fields from old format
	 */
	const oldFields = $derived({
		description: original.description || '',
		subdescription: original.subdescription || '',
		enounces: original.enounces || [],
		solutionss: original.solutionss || [],
		options: original.options || [],
		grade: original.grade || ''
	});

	/**
	 * Extract key fields from new format
	 */
	const newFields = $derived(
		transformed
			? {
					name: transformed.name || '',
					description: transformed.description || '',
					enounce_template: transformed.enounce_template || '',
					solution_template: transformed.solution_template || '',
					validation_rules: transformed.validation_rules || [],
					grade_level: transformed.grade_level || null
				}
			: null
	);
</script>

<div class={cn('space-y-6', className)}>
	<!-- Comparison Grid -->
	<div class="grid gap-6 lg:grid-cols-2">
		<!-- Old Format Column -->
		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2">
					<span>Format Original</span>
					<Badge variant="outline" class="font-mono text-xs">Ancien</Badge>
				</Card.Title>
			</Card.Header>
			<Card.Content class="space-y-4">
				<!-- Description -->
				<div>
					<h4 class="mb-1 text-sm font-medium text-muted-foreground">description</h4>
					<p class="text-sm">{oldFields.description}</p>
				</div>

				<!-- Subdescription -->
				{#if oldFields.subdescription}
					<div>
						<h4 class="mb-1 text-sm font-medium text-muted-foreground">subdescription</h4>
						<p class="text-sm">{oldFields.subdescription}</p>
					</div>
				{/if}

				<!-- Grade -->
				{#if oldFields.grade}
					<div>
						<h4 class="mb-1 text-sm font-medium text-muted-foreground">grade</h4>
						<p class="text-sm">{oldFields.grade}e</p>
					</div>
				{/if}

				<!-- Enounces -->
				<div>
					<h4 class="mb-1 text-sm font-medium text-muted-foreground">
						enounces ({Array.isArray(oldFields.enounces) ? oldFields.enounces.length : 0})
					</h4>
					<pre class="overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs">{formatValue(
							oldFields.enounces
						)}</pre>
				</div>

				<!-- Solutions -->
				<div>
					<h4 class="mb-1 text-sm font-medium text-muted-foreground">
						solutionss ({Array.isArray(oldFields.solutionss) ? oldFields.solutionss.length : 0})
					</h4>
					<pre class="overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs">{formatValue(
							oldFields.solutionss
						)}</pre>
				</div>

				<!-- Options -->
				{#if Array.isArray(oldFields.options) && oldFields.options.length > 0}
					<div>
						<h4 class="mb-1 text-sm font-medium text-muted-foreground">
							options ({oldFields.options.length})
						</h4>
						<pre class="overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs">{formatValue(
								oldFields.options
							)}</pre>
					</div>
				{/if}
			</Card.Content>
		</Card.Root>

		<!-- New Format Column -->
		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2">
					<span>Format Transformé</span>
					<Badge
						variant={hasErrors ? 'destructive' : hasWarnings ? 'warning' : 'success'}
						class="font-mono text-xs"
					>
						{hasErrors ? 'Erreur' : hasWarnings ? 'Attention' : 'Nouveau'}
					</Badge>
				</Card.Title>
			</Card.Header>
			<Card.Content class="space-y-4">
				{#if newFields}
					<!-- Name -->
					<div>
						<h4 class="mb-1 text-sm font-medium text-muted-foreground">name</h4>
						<p class="text-sm">{newFields.name}</p>
					</div>

					<!-- Description -->
					{#if newFields.description}
						<div>
							<h4 class="mb-1 text-sm font-medium text-muted-foreground">description</h4>
							<p class="text-sm">{newFields.description}</p>
						</div>
					{/if}

					<!-- Grade Level -->
					{#if newFields.grade_level !== null}
						<div>
							<h4 class="mb-1 text-sm font-medium text-muted-foreground">grade_level</h4>
							<p class="text-sm">{newFields.grade_level}e</p>
						</div>
					{/if}

					<!-- Enounce Template -->
					<div>
						<h4 class="mb-1 text-sm font-medium text-muted-foreground">enounce_template</h4>
						<pre
							class="overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs">{newFields.enounce_template}</pre>
					</div>

					<!-- Solution Template -->
					<div>
						<h4 class="mb-1 text-sm font-medium text-muted-foreground">solution_template</h4>
						<pre
							class="overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs">{newFields.solution_template}</pre>
					</div>

					<!-- Validation Rules -->
					<div>
						<h4 class="mb-1 text-sm font-medium text-muted-foreground">
							validation_rules ({Array.isArray(newFields.validation_rules)
								? newFields.validation_rules.length
								: 0})
						</h4>
						<pre class="overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs">{formatValue(
								newFields.validation_rules
							)}</pre>
					</div>
				{:else}
					<!-- Transformation Failed -->
					<div class="flex flex-col items-center justify-center py-12 text-center">
						<AlertCircle class="mb-3 h-12 w-12 text-destructive" />
						<p class="text-sm text-muted-foreground">
							La transformation a échoué. Consultez les erreurs ci-dessous.
						</p>
					</div>
				{/if}
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Warnings Section -->
	{#if hasWarnings}
		<Card.Root class="border-warning/50 bg-warning/5">
			<Card.Header>
				<Card.Title class="text-warning flex items-center gap-2">
					<AlertTriangle class="h-5 w-5" />
					Avertissements ({warnings.length})
				</Card.Title>
			</Card.Header>
			<Card.Content>
				<ul class="space-y-2">
					{#each warnings as warning, i (i)}
						<li class="flex items-start gap-2 text-sm">
							<AlertTriangle class="text-warning mt-0.5 h-4 w-4 shrink-0" />
							<span>{warning}</span>
						</li>
					{/each}
				</ul>
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- Errors Section -->
	{#if hasErrors}
		<Card.Root class="border-destructive/50 bg-destructive/5">
			<Card.Header>
				<Card.Title class="flex items-center gap-2 text-destructive">
					<AlertCircle class="h-5 w-5" />
					Erreurs ({errors.length})
				</Card.Title>
			</Card.Header>
			<Card.Content>
				<ul class="space-y-2">
					{#each errors as error, i (i)}
						<li class="flex items-start gap-2 text-sm">
							<AlertCircle class="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
							<span>{error}</span>
						</li>
					{/each}
				</ul>
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- Success Indicator (if clean) -->
	{#if isClean}
		<Card.Root class="border-success/50 bg-success/5">
			<Card.Content class="py-6">
				<div class="flex items-center justify-center gap-2 text-success">
					<CheckCircle2 class="h-5 w-5" />
					<p class="font-medium">Transformation réussie sans avertissements</p>
				</div>
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- Review Actions -->
	{#if onApprove || onReject}
		<ReviewActions {onApprove} {onReject} disabled={hasErrors} />
	{/if}
</div>
