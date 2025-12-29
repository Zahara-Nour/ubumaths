<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Popover from '$lib/components/ui/popover';
	import { Separator } from '$lib/components/ui/separator';
	import { AlertTriangle } from 'lucide-svelte';
	import ReportStatusBadge from './ReportStatusBadge.svelte';
	import ReportErrorDialog from './ReportErrorDialog.svelte';
	import RichTextDisplay from '$lib/components/rich-text/RichTextDisplay.svelte';
	import type { StudentErrorReportView } from '$lib/types/worksheets';

	const MAX_REPORTS = 10;

	interface Props {
		assignmentId: string;
		exerciseId: string;
		exercisePosition: number;
		existingReports: StudentErrorReportView[];
		onReportCreated: (report: StudentErrorReportView) => void;
	}

	let { assignmentId, exerciseId, exercisePosition, existingReports, onReportCreated }: Props =
		$props();

	let dialogOpen = $state(false);
	let popoverOpen = $state(false);

	// Computed values
	let reportCount = $derived(existingReports.length);
	let canAddReport = $derived(reportCount < MAX_REPORTS);
	let hasReports = $derived(reportCount > 0);

	// Parse description content (TipTap JSON format)
	function parseDescription(description: unknown): object {
		try {
			if (typeof description === 'string') {
				return JSON.parse(description);
			}
			return description as object;
		} catch {
			const text = typeof description === 'string' ? description : String(description);
			return {
				type: 'doc',
				content: [{ type: 'paragraph', content: [{ type: 'text', text }] }]
			};
		}
	}

	// Format date for display
	function formatDate(isoDate: string): string {
		const date = new Date(isoDate);
		return date.toLocaleDateString('fr-FR', {
			day: 'numeric',
			month: 'short',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function handleOpenDialog() {
		if (canAddReport) {
			popoverOpen = false;
			dialogOpen = true;
		}
	}

	function handleOpenChange(open: boolean) {
		dialogOpen = open;
	}
</script>

<div class="flex items-center gap-2">
	{#if hasReports}
		<!-- Reports counter with popover -->
		<Popover.Root bind:open={popoverOpen}>
			<Popover.Trigger>
				{#snippet child({ props })}
					<Button
						{...props}
						variant="ghost"
						size="sm"
						class="h-8 gap-1 text-muted-foreground hover:text-foreground"
						aria-label="Voir les signalements ({reportCount})"
					>
						<AlertTriangle class="h-4 w-4" />
						<span class="text-xs font-medium">{reportCount}</span>
					</Button>
				{/snippet}
			</Popover.Trigger>
			<Popover.Content class="max-h-96 w-80 overflow-y-auto">
				<div class="space-y-3">
					<div class="flex items-center justify-between">
						<h4 class="font-semibold">
							{reportCount} signalement{reportCount > 1 ? 's' : ''}
						</h4>
						{#if canAddReport}
							<Button variant="outline" size="sm" onclick={handleOpenDialog}>+ Signaler</Button>
						{:else}
							<span class="text-xs text-muted-foreground">Limite atteinte</span>
						{/if}
					</div>

					<Separator />

					<div class="space-y-3">
						{#each existingReports as report (report.id)}
							<div class="space-y-1.5">
								<div class="flex items-center justify-between gap-2">
									<ReportStatusBadge status={report.status} />
									<span class="text-xs text-muted-foreground">
										{formatDate(report.created_at)}
									</span>
								</div>
								<RichTextDisplay
									content={parseDescription(report.description)}
									class="text-sm text-muted-foreground"
								/>
								{#if report.response}
									<div class="mt-1 rounded-md bg-muted/50 p-2">
										<p class="mb-1 text-xs font-medium text-muted-foreground">Réponse :</p>
										<RichTextDisplay content={parseDescription(report.response)} class="text-xs" />
									</div>
								{/if}
							</div>
							{#if existingReports.indexOf(report) < existingReports.length - 1}
								<Separator class="my-2" />
							{/if}
						{/each}
					</div>
				</div>
			</Popover.Content>
		</Popover.Root>
	{/if}

	<!-- Report button (only visible if no existing reports) -->
	{#if canAddReport && !hasReports}
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
