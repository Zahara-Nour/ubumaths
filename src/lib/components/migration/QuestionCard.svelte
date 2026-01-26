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
	 * - Review status badge (approved/rejected/pending)
	 * - Warning/error count indicators
	 * - Click to view details
	 * - Responsive layout
	 */

	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import { cn } from '$lib/utils';
	import { AlertCircle, AlertTriangle, CheckCircle2, ChevronRight, XCircle } from 'lucide-svelte';

	type ReviewStatus = 'pending' | 'approved' | 'rejected';

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
		reviewStatus?: ReviewStatus;
		onclick?: () => void;
		class?: string;
	}

	let { question, reviewStatus = 'pending', onclick, class: className }: Props = $props();

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
		'border-green-500/50 bg-green-500/5': reviewStatus === 'approved',
		'border-red-500/50 bg-red-500/5': reviewStatus === 'rejected',
		'border-destructive/50 bg-destructive/5': reviewStatus === 'pending' && hasErrors,
		'border-warning/50 bg-warning/5': reviewStatus === 'pending' && hasWarnings && !hasErrors,
		'border-success/50': reviewStatus === 'pending' && isClean
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
				<!-- Review Status Badge -->
				{#if reviewStatus === 'approved'}
					<Badge class="bg-green-600 text-xs text-white">
						<CheckCircle2 class="mr-1 h-3 w-3" />
						Approuvee
					</Badge>
				{:else if reviewStatus === 'rejected'}
					<Badge variant="destructive" class="text-xs">
						<XCircle class="mr-1 h-3 w-3" />
						Rejetee
					</Badge>
				{:else}
					<!-- Transformation Status Badge -->
					<Badge variant={statusVariant} class="flex items-center gap-1 text-xs">
						<StatusIcon class="h-3 w-3" />
						{statusText}
					</Badge>
				{/if}

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
