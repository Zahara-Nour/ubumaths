<!--
	MessageReportsTable Component
	=============================

	Displays a table of message reports with ability to review them.

	Props:
		- reports: Array of message reports
		- onReview: Callback when a report is reviewed

	Features:
		- Table with columns: Date | Message | Raison | Signalé par | Status | Actions
		- Color-coded badges for status and reason
		- Click to open ReviewReportDialog
		- French date formatting
		- Client-side pagination (20 per page)
		- Empty state
		- Responsive design
-->
<script lang="ts">
	import * as Table from '$lib/components/ui/table';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { ChevronLeft, ChevronRight, Eye } from 'lucide-svelte';
	import { formatDistanceToNow } from 'date-fns';
	import { fr } from 'date-fns/locale';
	import ReviewReportDialog, {
		type ReportData
	} from '$lib/components/moderation/ReviewReportDialog.svelte';

	// Component Props
	interface Props {
		reports: ReportData[];
		onReview?: () => void;
	}

	let { reports, onReview = () => {} }: Props = $props();

	// State
	let showReviewDialog = $state(false);
	let selectedReport = $state<ReportData | null>(null);

	// Pagination state
	const ITEMS_PER_PAGE = 20;
	let currentPage = $state(1);

	/**
	 * Total number of pages
	 */
	const totalPages = $derived(Math.ceil(reports.length / ITEMS_PER_PAGE));

	/**
	 * Current page items
	 */
	const paginatedReports = $derived(() => {
		const start = (currentPage - 1) * ITEMS_PER_PAGE;
		const end = start + ITEMS_PER_PAGE;
		return reports.slice(start, end);
	});

	/**
	 * Count of pending reports
	 */
	const pendingCount = $derived(reports.filter((r) => r.status === 'pending').length);

	/**
	 * Navigate to previous page
	 */
	function previousPage(): void {
		if (currentPage > 1) {
			currentPage--;
		}
	}

	/**
	 * Navigate to next page
	 */
	function nextPage(): void {
		if (currentPage < totalPages) {
			currentPage++;
		}
	}

	/**
	 * Open review dialog
	 */
	function openReviewDialog(report: ReportData): void {
		selectedReport = report;
		showReviewDialog = true;
	}

	/**
	 * Handle successful review
	 */
	function handleReviewSuccess(): void {
		showReviewDialog = false;
		selectedReport = null;
		onReview();
	}

	/**
	 * Get badge variant for status
	 */
	function getStatusVariant(status: string): 'default' | 'destructive' | 'outline' | 'secondary' {
		if (status === 'pending') return 'destructive';
		if (status === 'actioned') return 'default';
		if (status === 'dismissed') return 'outline';
		return 'secondary';
	}

	/**
	 * Translate status to French
	 */
	function translateStatus(status: string): string {
		const translations: Record<string, string> = {
			pending: 'En attente',
			reviewed: 'Lu',
			dismissed: 'Rejeté',
			actioned: 'Traité'
		};
		return translations[status] || status;
	}

	/**
	 * Get badge variant for reason
	 */
	function getReasonVariant(reason: string): 'default' | 'destructive' | 'outline' | 'secondary' {
		if (reason === 'harassment') return 'destructive';
		if (reason === 'inappropriate') return 'default';
		return 'secondary';
	}

	/**
	 * Translate reason to French
	 */
	function translateReason(reason: string): string {
		const translations: Record<string, string> = {
			spam: 'Spam',
			harassment: 'Harcèlement',
			inappropriate: 'Inapproprié',
			other: 'Autre'
		};
		return translations[reason] || reason;
	}

	/**
	 * Format date as relative time
	 */
	function formatDate(dateString: string): string {
		try {
			return formatDistanceToNow(new Date(dateString), {
				addSuffix: true,
				locale: fr
			});
		} catch {
			return dateString;
		}
	}

	/**
	 * Get user name
	 */
	function getUserName(firstname: string | null, lastname: string | null): string {
		if (!firstname && !lastname) return 'Inconnu';
		return `${firstname || ''} ${lastname || ''}`.trim();
	}

	/**
	 * Truncate text
	 */
	function truncate(text: string | null, maxLength: number = 50): string {
		if (!text) return '[Vide]';
		if (text.length <= maxLength) return text;
		return text.substring(0, maxLength) + '...';
	}
</script>

{#if reports.length === 0}
	<div
		class="flex min-h-[400px] items-center justify-center rounded-lg border border-border bg-muted/50 p-8"
	>
		<div class="text-center">
			<p class="text-lg font-medium text-muted-foreground">Aucun signalement</p>
			<p class="mt-2 text-sm text-muted-foreground">
				Les signalements de messages apparaîtront ici
			</p>
		</div>
	</div>
{:else}
	<div class="space-y-4">
		<!-- Summary -->
		{#if pendingCount > 0}
			<div class="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
				<p class="text-sm font-medium text-destructive">
					{pendingCount} signalement{pendingCount > 1 ? 's' : ''} en attente de traitement
				</p>
			</div>
		{/if}

		<!-- Table -->
		<div class="rounded-lg border border-border">
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head class="w-[140px]">Date</Table.Head>
						<Table.Head>Message</Table.Head>
						<Table.Head class="w-[120px]">Raison</Table.Head>
						<Table.Head class="w-[150px]">Signalé par</Table.Head>
						<Table.Head class="w-[100px]">Status</Table.Head>
						<Table.Head class="w-[80px] text-right">Actions</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each paginatedReports() as report (report.report_id)}
						<Table.Row
							class={report.status === 'pending' ? 'bg-destructive/5 hover:bg-destructive/10' : ''}
						>
							<Table.Cell class="text-sm text-muted-foreground">
								{formatDate(report.created_at)}
							</Table.Cell>
							<Table.Cell>
								<div class="space-y-1">
									<p class="text-sm font-medium">
										{getUserName(report.sender_firstname, report.sender_lastname)}
									</p>
									<p class="text-sm text-muted-foreground">
										{truncate(report.message_plain_text, 60)}
									</p>
								</div>
							</Table.Cell>
							<Table.Cell>
								<Badge variant={getReasonVariant(report.reason)}>
									{translateReason(report.reason)}
								</Badge>
							</Table.Cell>
							<Table.Cell class="text-sm">
								{getUserName(report.reporter_firstname, report.reporter_lastname)}
							</Table.Cell>
							<Table.Cell>
								<Badge variant={getStatusVariant(report.status)}>
									{translateStatus(report.status)}
								</Badge>
							</Table.Cell>
							<Table.Cell class="text-right">
								<Button
									variant="ghost"
									size="sm"
									onclick={() => openReviewDialog(report)}
									title="Examiner le signalement"
								>
									<Eye class="h-4 w-4" />
									<span class="sr-only">Examiner</span>
								</Button>
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</div>

		<!-- Pagination -->
		{#if totalPages > 1}
			<div class="flex items-center justify-between">
				<p class="text-sm text-muted-foreground">
					Page {currentPage} sur {totalPages}
				</p>
				<div class="flex items-center gap-2">
					<Button variant="outline" size="sm" onclick={previousPage} disabled={currentPage === 1}>
						<ChevronLeft class="h-4 w-4" />
						Précédent
					</Button>
					<Button
						variant="outline"
						size="sm"
						onclick={nextPage}
						disabled={currentPage === totalPages}
					>
						Suivant
						<ChevronRight class="h-4 w-4" />
					</Button>
				</div>
			</div>
		{/if}
	</div>
{/if}

<!-- Review Dialog -->
<ReviewReportDialog
	bind:open={showReviewDialog}
	report={selectedReport}
	onSuccess={handleReviewSuccess}
/>
