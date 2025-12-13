<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { AlertTriangle } from 'lucide-svelte';
	import ReportStatusBadge from './ReportStatusBadge.svelte';
	import ReportDetailsPopover from './ReportDetailsPopover.svelte';
	import ReportErrorDialog from './ReportErrorDialog.svelte';
	import type { StudentErrorReportView } from '$lib/types/worksheets';

	interface Props {
		assignmentId: string;
		exerciseId: string;
		exercisePosition: number;
		existingReport: StudentErrorReportView | null;
		onReportCreated: (report: StudentErrorReportView) => void;
	}

	let { assignmentId, exerciseId, exercisePosition, existingReport, onReportCreated }: Props =
		$props();

	let dialogOpen = $state(false);

	// Only consider pending reports as "blocking" - rejected/fixed reports allow new submissions
	let hasPendingReport = $derived(existingReport?.status === 'pending');

	function handleOpenDialog() {
		// Allow reporting if no pending report exists
		if (!hasPendingReport) {
			dialogOpen = true;
		}
	}

	function handleOpenChange(open: boolean) {
		dialogOpen = open;
	}
</script>

<div class="flex items-center gap-2">
	{#if hasPendingReport && existingReport}
		<!-- Show status badge and details only for pending reports -->
		<div class="flex items-center gap-1">
			<ReportStatusBadge status={existingReport.status} />
			<ReportDetailsPopover report={existingReport} />
		</div>
	{:else}
		<!-- Show report button when no pending report exists (allows re-reporting after rejection/fix) -->
		<Button
			variant="ghost"
			size="sm"
			onclick={handleOpenDialog}
			class="h-8 gap-1 text-muted-foreground hover:text-foreground"
			aria-label="Signaler une erreur dans cet exercice"
		>
			<AlertTriangle class="h-4 w-4" />
			<span class="text-xs">Signaler</span>
		</Button>
	{/if}
</div>

<!-- Report Dialog -->
<ReportErrorDialog
	open={dialogOpen}
	{assignmentId}
	{exerciseId}
	{exercisePosition}
	onOpenChange={handleOpenChange}
	{onReportCreated}
/>
