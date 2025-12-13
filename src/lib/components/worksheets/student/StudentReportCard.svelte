<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Calendar, MessageSquare, Hash, FileText, XCircle, CheckCircle2 } from 'lucide-svelte';
	import type { StudentErrorReportWithDisplay } from '$lib/types/worksheets';

	// Props
	let {
		report,
		onCancel
	}: {
		report: StudentErrorReportWithDisplay;
		onCancel?: (report: StudentErrorReportWithDisplay) => void;
	} = $props();

	// Derived values
	let displayTitle = $derived(report.assignment_title || report.worksheet_title);

	let statusLabel = $derived(
		report.status === 'pending' ? 'En attente' : report.status === 'fixed' ? 'Corrigé' : 'Rejeté'
	);

	let statusVariant = $derived<'default' | 'secondary' | 'destructive'>(
		report.status === 'pending'
			? 'default'
			: report.status === 'fixed'
				? 'secondary'
				: 'destructive'
	);

	let statusIcon = $derived(
		report.status === 'fixed' ? CheckCircle2 : report.status === 'rejected' ? XCircle : null
	);

	let formattedDate = $derived.by(() => {
		try {
			return new Date(report.created_at).toLocaleDateString('fr-FR', {
				day: 'numeric',
				month: 'long',
				year: 'numeric',
				hour: '2-digit',
				minute: '2-digit'
			});
		} catch {
			return 'Date invalide';
		}
	});

	let canCancel = $derived(report.status === 'pending' && onCancel !== undefined);
</script>

<Card.Root class="transition-colors hover:bg-muted/30">
	<Card.Content class="p-4">
		<div class="flex items-start justify-between gap-4">
			<!-- Left side: Report info -->
			<div class="min-w-0 flex-1 space-y-3">
				<!-- Header: Worksheet/Assignment title and exercise position -->
				<div class="flex flex-wrap items-center gap-2">
					<div class="flex items-center gap-1.5 text-sm font-medium">
						<FileText class="h-4 w-4 text-muted-foreground" />
						<span>{displayTitle}</span>
					</div>
					<span class="text-muted-foreground">-</span>
					<div class="flex items-center gap-1.5 text-sm text-muted-foreground">
						<Hash class="h-4 w-4" />
						<span>Exercice {report.exercise_position}</span>
					</div>
				</div>

				<!-- Description -->
				<div class="space-y-1">
					<p class="text-sm text-muted-foreground">Description:</p>
					<p class="text-sm break-words whitespace-pre-wrap">{report.description}</p>
				</div>

				<!-- Teacher response (if exists) -->
				{#if report.response}
					<div class="space-y-1 rounded-md bg-muted/50 p-3">
						<div class="flex items-center gap-1.5 text-sm font-medium">
							<MessageSquare class="h-4 w-4" />
							<span>Réponse de l'enseignant:</span>
						</div>
						<p class="text-sm break-words whitespace-pre-wrap">{report.response}</p>
					</div>
				{/if}

				<!-- Created date -->
				<div class="flex items-center gap-1.5 text-xs text-muted-foreground">
					<Calendar class="h-3.5 w-3.5" />
					<span>Signalé le {formattedDate}</span>
				</div>
			</div>

			<!-- Right side: Status and actions -->
			<div class="flex flex-col items-end gap-3">
				<!-- Status badge -->
				<Badge variant={statusVariant} class="flex items-center gap-1.5">
					{#if statusIcon}
						{@const Icon = statusIcon}
						<Icon class="h-3.5 w-3.5" />
					{/if}
					{statusLabel}
				</Badge>

				<!-- Cancel button (only for pending reports) -->
				{#if canCancel}
					<Button
						size="sm"
						variant="outline"
						onclick={() => onCancel?.(report)}
						class="text-destructive hover:bg-destructive/10"
					>
						<XCircle class="mr-1.5 h-4 w-4" />
						Annuler
					</Button>
				{/if}
			</div>
		</div>
	</Card.Content>
</Card.Root>
