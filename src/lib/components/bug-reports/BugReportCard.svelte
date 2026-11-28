<script lang="ts">
	/**
	 * Bug Report Card
	 *
	 * Displays a single bug report with status, category, and metadata.
	 *
	 * E89 : la case à cocher de sélection est elle-même un bouton (bits-ui) ; elle vit à côté
	 * du bouton de la carte, jamais dedans (un bouton dans un bouton est du HTML invalide, que
	 * le navigateur répare en déplaçant les nœuds).
	 */
	import { cn } from '#lib/utils.ts';
	import type {
		BugReportWithAuthor,
		BugReportCategory,
		BugReportSeverity,
		BugReportStatus
	} from '#lib/types/bug-reports.ts';
	import {
		BUG_REPORT_CATEGORY_ICONS,
		BUG_REPORT_CATEGORY_LABELS,
		BUG_REPORT_SEVERITY_COLORS
	} from '#lib/types/bug-reports.ts';
	import BugReportStatusBadge from './BugReportStatusBadge.svelte';
	import MyCheckbox from '#lib/components/MyCheckbox.svelte';
	import { formatDistanceToNow } from 'date-fns';
	import { fr } from 'date-fns/locale';

	interface Props {
		report: BugReportWithAuthor;
		onclick?: () => void;
		class?: string;
		selectable?: boolean;
		selected?: boolean;
		onSelectionChange?: (selected: boolean) => void;
	}

	let {
		report,
		onclick,
		class: className,
		selectable = false,
		selected = false,
		onSelectionChange
	}: Props = $props();

	const categoryIcon = $derived(BUG_REPORT_CATEGORY_ICONS[report.category as BugReportCategory]);
	const categoryLabel = $derived(BUG_REPORT_CATEGORY_LABELS[report.category as BugReportCategory]);
	const severityColor = $derived(BUG_REPORT_SEVERITY_COLORS[report.severity as BugReportSeverity]);

	const timeAgo = $derived(
		formatDistanceToNow(new Date(report.created_at), { addSuffix: true, locale: fr })
	);

	const authorName = $derived(
		report.author
			? (report.author as { full_name: string | null; email: string }).full_name ||
					(report.author as { email: string }).email
			: 'Utilisateur'
	);

	// Handle selection change — 'indeterminate' treated as false (no partial selection at card level)
	function handleSelectionChange(checked: boolean | 'indeterminate') {
		if (checked !== 'indeterminate') {
			onSelectionChange?.(checked);
		}
	}
</script>

<div
	class={cn(
		'flex w-full items-start gap-3 rounded-lg border bg-card p-4',
		'transition-colors hover:bg-muted/50',
		'focus-within:ring-2 focus-within:ring-ring',
		className
	)}
>
	{#if selectable}
		<div class="flex-shrink-0 pt-1">
			<MyCheckbox
				checked={selected}
				onCheckedChange={handleSelectionChange}
				aria-label={`Sélectionner le rapport « ${report.title} »`}
			/>
		</div>
	{/if}

	<button
		type="button"
		onclick={() => onclick?.()}
		class="min-w-0 flex-1 text-left focus:outline-none"
	>
		<span class="flex flex-col-reverse items-start gap-2 sm:flex-row sm:justify-between sm:gap-3">
			<span class="block w-full min-w-0 sm:w-auto sm:flex-1">
				<!-- Title with category icon -->
				<span class="flex items-center gap-2">
					<span class="text-lg">{categoryIcon}</span>
					<span class="truncate font-medium">{report.title}</span>
				</span>

				<!-- Description preview -->
				<span class="mt-1 line-clamp-2 text-sm text-muted-foreground">
					{report.description}
				</span>

				<!-- Metadata -->
				<span class="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
					<span class={cn('font-medium', severityColor)}>
						{report.severity.charAt(0).toUpperCase() + report.severity.slice(1)}
					</span>
					<span>•</span>
					<span>{categoryLabel}</span>
					<span>•</span>
					<span>{timeAgo}</span>
					{#if report.author}
						<span>•</span>
						<span>{authorName}</span>
					{/if}
				</span>

				<!-- Resolution notes preview -->
				{#if report.resolution_notes}
					<span class="mt-2 block rounded bg-muted p-2 text-sm">
						<span class="font-medium">Réponse :</span>
						<span class="line-clamp-1 text-muted-foreground">{report.resolution_notes}</span>
					</span>
				{/if}
			</span>

			<!-- Status badge -->
			<BugReportStatusBadge status={report.status as BugReportStatus} />
		</span>

		<!-- Screenshot indicator -->
		{#if report.screenshot_url}
			<span class="mt-2 block text-xs text-muted-foreground">📷 Capture d'écran attachée</span>
		{/if}

		<!-- Auto-generated indicator -->
		{#if report.auto_generated}
			<span class="mt-2 block text-xs text-orange-600 dark:text-orange-400">
				⚡ Rapport généré automatiquement (freeze détecté)
			</span>
		{/if}
	</button>
</div>
