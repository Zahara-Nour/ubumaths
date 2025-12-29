<script lang="ts">
	/**
	 * Bug Report Card
	 *
	 * Displays a single bug report with status, category, and metadata.
	 */
	import { cn } from '$lib/utils';
	import type { BugReportWithAuthor } from '$lib/types/bug-reports';
	import {
		BUG_REPORT_CATEGORY_ICONS,
		BUG_REPORT_CATEGORY_LABELS,
		BUG_REPORT_SEVERITY_COLORS
	} from '$lib/types/bug-reports';
	import BugReportStatusBadge from './BugReportStatusBadge.svelte';
	import { formatDistanceToNow } from 'date-fns';
	import { fr } from 'date-fns/locale';

	interface Props {
		report: BugReportWithAuthor;
		onclick?: () => void;
		class?: string;
	}

	let { report, onclick, class: className }: Props = $props();

	const categoryIcon = $derived(BUG_REPORT_CATEGORY_ICONS[report.category]);
	const categoryLabel = $derived(BUG_REPORT_CATEGORY_LABELS[report.category]);
	const severityColor = $derived(BUG_REPORT_SEVERITY_COLORS[report.severity]);

	const timeAgo = $derived(
		formatDistanceToNow(new Date(report.created_at), { addSuffix: true, locale: fr })
	);

	const authorName = $derived(
		report.author
			? (report.author as { full_name: string | null; email: string }).full_name ||
					(report.author as { email: string }).email
			: 'Utilisateur'
	);
</script>

<button
	type="button"
	{onclick}
	class={cn(
		'w-full rounded-lg border bg-card p-4 text-left',
		'transition-colors hover:bg-muted/50',
		'focus:ring-2 focus:ring-ring focus:outline-none',
		className
	)}
>
	<div class="flex items-start justify-between gap-3">
		<div class="min-w-0 flex-1">
			<!-- Title with category icon -->
			<div class="flex items-center gap-2">
				<span class="text-lg">{categoryIcon}</span>
				<h3 class="truncate font-medium">{report.title}</h3>
			</div>

			<!-- Description preview -->
			<p class="mt-1 line-clamp-2 text-sm text-muted-foreground">
				{report.description}
			</p>

			<!-- Metadata -->
			<div class="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
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
			</div>

			<!-- Resolution notes preview -->
			{#if report.resolution_notes}
				<div class="mt-2 rounded bg-muted p-2 text-sm">
					<span class="font-medium">Réponse :</span>
					<span class="line-clamp-1 text-muted-foreground">{report.resolution_notes}</span>
				</div>
			{/if}
		</div>

		<!-- Status badge -->
		<BugReportStatusBadge status={report.status} />
	</div>

	<!-- Screenshot indicator -->
	{#if report.screenshot_url}
		<div class="mt-2 text-xs text-muted-foreground">📷 Capture d'écran attachée</div>
	{/if}

	<!-- Auto-generated indicator -->
	{#if report.auto_generated}
		<div class="mt-2 text-xs text-orange-600 dark:text-orange-400">
			⚡ Rapport généré automatiquement (freeze détecté)
		</div>
	{/if}
</button>
