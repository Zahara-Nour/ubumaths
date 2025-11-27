<script lang="ts">
	/**
	 * QuestionCard Component
	 * ======================
	 *
	 * Displays a preview card for a migration question with status indicators.
	 *
	 * Features:
	 * - Shows question description and level
	 * - Status badge (clean/warning/error)
	 * - Warning/error count indicators
	 * - Click to view details
	 * - Responsive layout
	 */

	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import { cn } from '$lib/utils';
	import { AlertCircle, AlertTriangle, CheckCircle2, ChevronRight } from 'lucide-svelte';

	interface Props {
		question: {
			level: number;
			globalIndex: number;
			question: {
				description: string;
				subdescription?: string;
				grade?: string;
			};
			warnings: string[];
			errors: string[];
		};
		onclick?: () => void;
		class?: string;
	}

	let { question, onclick, class: className }: Props = $props();

	// Determine status
	const hasErrors = $derived(question.errors.length > 0);
	const hasWarnings = $derived(question.warnings.length > 0);
	const isClean = $derived(!hasErrors && !hasWarnings);

	// Status variant
	const statusVariant = $derived(hasErrors ? 'destructive' : hasWarnings ? 'warning' : 'success');

	// Status text
	const statusText = $derived(hasErrors ? 'Erreurs' : hasWarnings ? 'Avertissements' : 'Prêt');

	// Status icon
	const StatusIcon = $derived(hasErrors ? AlertCircle : hasWarnings ? AlertTriangle : CheckCircle2);
</script>

<Card.Root
	class={cn('cursor-pointer transition-all hover:border-primary hover:shadow-md', className, {
		'border-destructive/50 bg-destructive/5': hasErrors,
		'border-warning/50 bg-warning/5': hasWarnings && !hasErrors,
		'border-success/50': isClean
	})}
>
	<button
		onclick={() => onclick?.()}
		class="flex w-full items-start gap-4 p-4 text-left"
		type="button"
	>
		<!-- Level Badge -->
		<div class="flex shrink-0 flex-col items-center gap-1">
			<Badge variant="outline" class="font-mono text-xs">
				N{question.level}
			</Badge>
			{#if question.question.grade}
				<span class="text-xs text-muted-foreground">
					{question.question.grade}e
				</span>
			{/if}
		</div>

		<!-- Content -->
		<div class="flex-1 space-y-2">
			<!-- Description -->
			<h3 class="leading-snug font-medium">
				{question.question.description}
			</h3>

			<!-- Subdescription -->
			{#if question.question.subdescription}
				<p class="text-sm text-muted-foreground">
					{question.question.subdescription}
				</p>
			{/if}

			<!-- Status and Counts -->
			<div class="flex flex-wrap items-center gap-2">
				<!-- Status Badge -->
				<Badge variant={statusVariant} class="flex items-center gap-1 text-xs">
					<StatusIcon class="h-3 w-3" />
					{statusText}
				</Badge>

				<!-- Error Count -->
				{#if hasErrors}
					<Badge variant="destructive" class="text-xs">
						<AlertCircle class="mr-1 h-3 w-3" />
						{question.errors.length} erreur{question.errors.length > 1 ? 's' : ''}
					</Badge>
				{/if}

				<!-- Warning Count -->
				{#if hasWarnings}
					<Badge variant="warning" class="text-xs">
						<AlertTriangle class="mr-1 h-3 w-3" />
						{question.warnings.length} avertissement{question.warnings.length > 1 ? 's' : ''}
					</Badge>
				{/if}

				<!-- Global Index -->
				<span class="text-xs text-muted-foreground">
					Index: #{question.globalIndex}
				</span>
			</div>
		</div>

		<!-- Arrow -->
		<ChevronRight
			class="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1"
		/>
	</button>
</Card.Root>
