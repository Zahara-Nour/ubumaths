<script lang="ts">
	/**
	 * CategoryProgress Component
	 * ==========================
	 *
	 * Displays progress statistics for a migration category.
	 * Shows approved/pending/rejected counts with color-coded badges
	 * and an optional progress bar.
	 *
	 * Props:
	 * - total: Total number of items
	 * - approved: Number of approved items (green)
	 * - pending: Number of pending items (yellow)
	 * - rejected: Number of rejected items (red)
	 * - showBar: Whether to show the progress bar (default: true)
	 * - compact: Compact mode for tree nodes (default: false)
	 */

	import { cn } from '$lib/utils';

	interface Props {
		total: number;
		approved?: number;
		pending?: number;
		rejected?: number;
		showBar?: boolean;
		compact?: boolean;
		class?: string;
	}

	let {
		total,
		approved = 0,
		pending = 0,
		rejected = 0,
		showBar = true,
		compact = false,
		class: className
	}: Props = $props();

	// Calculate percentages
	let approvedPercent = $derived(total > 0 ? (approved / total) * 100 : 0);
	let pendingPercent = $derived(total > 0 ? (pending / total) * 100 : 0);
	let rejectedPercent = $derived(total > 0 ? (rejected / total) * 100 : 0);

	// Determine status color based on progress (for future use)
	let _statusColor = $derived.by(() => {
		if (approved === total && total > 0) return 'text-green-600 dark:text-green-400';
		if (rejected > 0) return 'text-red-600 dark:text-red-400';
		if (approved > 0) return 'text-amber-600 dark:text-amber-400';
		return 'text-muted-foreground';
	});
</script>

{#if compact}
	<!-- Compact mode: single badge showing progress -->
	<span
		class={cn(
			'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium',
			approved === total && total > 0
				? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
				: approved > 0
					? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
					: 'bg-muted text-muted-foreground',
			className
		)}
	>
		{approved}/{total}
	</span>
{:else}
	<!-- Full mode: badges + optional progress bar -->
	<div class={cn('flex flex-col gap-2', className)}>
		<!-- Status badges -->
		<div class="flex flex-wrap gap-2">
			{#if approved > 0}
				<span
					class="inline-flex items-center gap-1 rounded-md bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400"
				>
					<span class="h-1.5 w-1.5 rounded-full bg-green-500"></span>
					{approved} approuve{approved > 1 ? 's' : ''}
				</span>
			{/if}

			{#if pending > 0}
				<span
					class="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
				>
					<span class="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
					{pending} en attente
				</span>
			{/if}

			{#if rejected > 0}
				<span
					class="inline-flex items-center gap-1 rounded-md bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400"
				>
					<span class="h-1.5 w-1.5 rounded-full bg-red-500"></span>
					{rejected} rejete{rejected > 1 ? 's' : ''}
				</span>
			{/if}

			{#if total === 0}
				<span class="text-xs text-muted-foreground">Aucun element</span>
			{/if}
		</div>

		<!-- Progress bar -->
		{#if showBar && total > 0}
			<div class="h-2 w-full overflow-hidden rounded-full bg-muted">
				<div class="flex h-full">
					{#if approvedPercent > 0}
						<div
							class="h-full bg-green-500 transition-all duration-300"
							style="width: {approvedPercent}%"
						></div>
					{/if}
					{#if pendingPercent > 0}
						<div
							class="h-full bg-amber-500 transition-all duration-300"
							style="width: {pendingPercent}%"
						></div>
					{/if}
					{#if rejectedPercent > 0}
						<div
							class="h-full bg-red-500 transition-all duration-300"
							style="width: {rejectedPercent}%"
						></div>
					{/if}
				</div>
			</div>
		{/if}
	</div>
{/if}
