<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { User, Hash, Calendar, MessageSquare, CheckCircle2, XCircle } from 'lucide-svelte';
	import RichTextDisplay from '$lib/components/rich-text/RichTextDisplay.svelte';
	import type { TeacherErrorReportView } from '$lib/types/worksheets';

	// Props
	let {
		report,
		worksheetId
	}: {
		report: TeacherErrorReportView;
		worksheetId: string;
	} = $props();

	// Navigate to the report review page
	function handleReview() {
		goto(
			`/dashboard/teacher/contenu/worksheets/${worksheetId}/assignments/${report.assignment_id}/reports/${report.id}`
		);
	}

	// Derived values
	let studentName = $derived(
		report.student_first_name || report.student_last_name
			? `${report.student_first_name || ''} ${report.student_last_name || ''}`.trim()
			: 'Étudiant inconnu'
	);

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

	// Parse JSON description (TipTap format)
	let descriptionContent = $derived.by(() => {
		try {
			return JSON.parse(report.description);
		} catch {
			// Fallback for plain text or invalid JSON
			return {
				type: 'doc',
				content: [{ type: 'paragraph', content: [{ type: 'text', text: report.description }] }]
			};
		}
	});

	// Parse JSON response if exists
	let responseContent = $derived.by(() => {
		if (!report.response) return null;
		try {
			return JSON.parse(report.response);
		} catch {
			// Fallback for plain text
			return {
				type: 'doc',
				content: [{ type: 'paragraph', content: [{ type: 'text', text: report.response }] }]
			};
		}
	});
</script>

<Card.Root class="transition-colors hover:bg-muted/30">
	<Card.Content class="p-4">
		<div class="flex items-start justify-between gap-4">
			<!-- Left side: Report info -->
			<div class="min-w-0 flex-1 space-y-3">
				<!-- Header: Student name and exercise -->
				<div class="flex flex-wrap items-center gap-2">
					<div class="flex items-center gap-1.5 text-sm font-medium">
						<User class="h-4 w-4 text-muted-foreground" />
						<span>{studentName}</span>
					</div>
					<span class="text-muted-foreground">•</span>
					<div class="flex items-center gap-1.5 text-sm text-muted-foreground">
						<Hash class="h-4 w-4" />
						<span>Exercice {report.exercise_position}</span>
					</div>
				</div>

				<!-- Description -->
				<div class="space-y-1">
					<p class="text-sm text-muted-foreground">Description:</p>
					<RichTextDisplay content={descriptionContent} class="text-sm" />
				</div>

				<!-- Teacher response (if exists) -->
				{#if responseContent}
					<div class="space-y-1 rounded-md bg-muted/50 p-3">
						<div class="flex items-center gap-1.5 text-sm font-medium">
							<MessageSquare class="h-4 w-4" />
							<span>Réponse de l'enseignant:</span>
						</div>
						<RichTextDisplay content={responseContent} class="text-sm" />
					</div>
				{/if}

				<!-- Created date and student name -->
				<div class="flex items-center gap-1.5 text-xs text-muted-foreground">
					<Calendar class="h-3.5 w-3.5" />
					<span>Signalé par <strong>{studentName}</strong> le {formattedDate}</span>
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

				<!-- Review button (only for pending reports) -->
				{#if report.status === 'pending'}
					<Button size="sm" onclick={handleReview}>Traiter</Button>
				{/if}
			</div>
		</div>
	</Card.Content>
</Card.Root>
