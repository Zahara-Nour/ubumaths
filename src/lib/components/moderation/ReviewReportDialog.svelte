<!--
	ReviewReportDialog Component
	============================

	Dialog to review a message report (teacher action).

	Props:
		- open: Dialog open state (bindable)
		- report: The report to review
		- onSuccess: Callback after successful review

	Features:
		- Display reported message content
		- Radio group for decision (dismissed | reviewed | actioned)
		- Checkbox to delete message (if actioned)
		- Textarea for review notes
		- Form validation
		- Loading state
		- Toast notifications
-->
<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import * as RadioGroup from '$lib/components/ui/radio-group';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Button } from '$lib/components/ui/button';
	import MyCheckbox from '$lib/components/MyCheckbox.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { CheckCircle, XCircle, AlertTriangle, Loader2, Trash2 } from 'lucide-svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { formatDistanceToNow } from 'date-fns';
	import { fr } from 'date-fns/locale';

	// Report type from RPC response
	export interface ReportData {
		report_id: string;
		message_id: string;
		message_content: unknown;
		message_plain_text: string | null;
		message_created_at: string;
		sender_id: string;
		sender_firstname: string | null;
		sender_lastname: string | null;
		conversation_name: string | null;
		reported_by: string;
		reporter_firstname: string | null;
		reporter_lastname: string | null;
		reason: 'spam' | 'harassment' | 'inappropriate' | 'other';
		details: string | null;
		status: string;
		created_at: string;
	}

	// Component Props
	interface Props {
		open?: boolean;
		report: ReportData | null;
		onSuccess?: () => void;
	}

	let { open = $bindable(false), report, onSuccess = () => {} }: Props = $props();

	// State
	let decision = $state<'dismissed' | 'reviewed' | 'actioned'>('reviewed');
	let deleteMessage = $state(false);
	let reviewNotes = $state('');
	let isSubmitting = $state(false);

	/**
	 * Character count
	 */
	const characterCount = $derived(reviewNotes.length);

	/**
	 * Decision descriptions
	 */
	const decisionDescriptions = {
		dismissed: 'Le signalement est infondé, aucune violation constatée',
		reviewed: 'Le signalement est noté mais aucune action nécessaire',
		actioned: 'Le signalement est valide, des mesures sont prises'
	};

	/**
	 * Translate reason to French
	 */
	function translateReason(reason: string): string {
		const translations: Record<string, string> = {
			spam: 'Spam',
			harassment: 'Harcèlement',
			inappropriate: 'Contenu inapproprié',
			other: 'Autre'
		};
		return translations[reason] || reason;
	}

	/**
	 * Get reason badge variant
	 */
	function getReasonVariant(reason: string): 'default' | 'destructive' | 'outline' | 'secondary' {
		if (reason === 'harassment') return 'destructive';
		if (reason === 'inappropriate') return 'default';
		return 'secondary';
	}

	/**
	 * Format date
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
	 * Get sender name
	 */
	function getSenderName(firstname: string | null, lastname: string | null): string {
		if (!firstname && !lastname) return 'Utilisateur inconnu';
		return `${firstname || ''} ${lastname || ''}`.trim();
	}

	/**
	 * Submit review
	 */
	async function submitReview(): Promise<void> {
		if (!report) return;

		isSubmitting = true;

		try {
			const response = await fetch(`/api/moderation/reports/${report.report_id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					status: decision,
					reviewNotes: reviewNotes.trim() || undefined,
					deleteMessage: decision === 'actioned' ? deleteMessage : false
				})
			});

			if (!response.ok) {
				const error = await response.text();
				throw new Error(error || 'Failed to review report');
			}

			const actionMessage =
				decision === 'dismissed'
					? 'Signalement rejeté'
					: decision === 'actioned'
						? deleteMessage
							? 'Signalement traité et message supprimé'
							: 'Signalement traité'
						: 'Signalement marqué comme lu';

			toaster.success(actionMessage);
			closeDialog();
			onSuccess();
		} catch (error) {
			console.error('Failed to review report:', error);
			toaster.error('Erreur lors du traitement du signalement');
		} finally {
			isSubmitting = false;
		}
	}

	/**
	 * Close dialog and reset form
	 */
	function closeDialog(): void {
		open = false;
		decision = 'reviewed';
		deleteMessage = false;
		reviewNotes = '';
	}

	/**
	 * Reset form when report changes
	 */
	$effect(() => {
		if (report) {
			decision = 'reviewed';
			deleteMessage = false;
			reviewNotes = '';
		}
	});
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="flex max-h-[90vh] max-w-lg flex-col">
		<Dialog.Header class="flex-shrink-0">
			<Dialog.Title>Traiter le signalement</Dialog.Title>
			<Dialog.Description>Examinez le message signalé et prenez une décision.</Dialog.Description>
		</Dialog.Header>

		{#if report}
			<div class="min-h-0 flex-1 space-y-4 overflow-y-auto py-4">
				<!-- Report Info -->
				<div class="space-y-3 rounded-lg border border-border bg-muted/50 p-4">
					<div class="flex items-center justify-between">
						<Badge variant={getReasonVariant(report.reason)}>
							{translateReason(report.reason)}
						</Badge>
						<span class="text-xs text-muted-foreground">
							{formatDate(report.created_at)}
						</span>
					</div>

					<!-- Reporter -->
					<div class="text-sm">
						<span class="text-muted-foreground">Signalé par :</span>
						<span class="ml-1 font-medium">
							{getSenderName(report.reporter_firstname, report.reporter_lastname)}
						</span>
					</div>

					<!-- Details if provided -->
					{#if report.details}
						<div class="text-sm">
							<span class="text-muted-foreground">Détails :</span>
							<p class="mt-1 italic">&laquo; {report.details} &raquo;</p>
						</div>
					{/if}
				</div>

				<!-- Reported Message -->
				<div class="space-y-2">
					<Label>Message signalé</Label>
					<div class="rounded-lg border border-border bg-background p-4">
						<div class="mb-2 flex items-center justify-between text-sm">
							<span class="font-medium">
								{getSenderName(report.sender_firstname, report.sender_lastname)}
							</span>
							<span class="text-xs text-muted-foreground">
								{report.conversation_name || 'Conversation'}
							</span>
						</div>
						<p class="text-sm whitespace-pre-wrap">
							{report.message_plain_text || '[Contenu non disponible]'}
						</p>
					</div>
				</div>

				<!-- Decision -->
				<div class="space-y-2">
					<Label>Décision</Label>
					<RadioGroup.Root bind:value={decision} class="space-y-2">
						<div class="flex items-center space-x-2">
							<RadioGroup.Item value="dismissed" id="dismissed" />
							<Label for="dismissed" class="flex cursor-pointer items-center gap-2 font-normal">
								<XCircle class="h-4 w-4 text-muted-foreground" />
								<div>
									<div class="font-medium">Rejeter</div>
									<div class="text-sm text-muted-foreground">
										{decisionDescriptions.dismissed}
									</div>
								</div>
							</Label>
						</div>

						<div class="flex items-center space-x-2">
							<RadioGroup.Item value="reviewed" id="reviewed" />
							<Label for="reviewed" class="flex cursor-pointer items-center gap-2 font-normal">
								<CheckCircle class="h-4 w-4 text-blue-600" />
								<div>
									<div class="font-medium">Marquer comme lu</div>
									<div class="text-sm text-muted-foreground">
										{decisionDescriptions.reviewed}
									</div>
								</div>
							</Label>
						</div>

						<div class="flex items-center space-x-2">
							<RadioGroup.Item value="actioned" id="actioned" />
							<Label for="actioned" class="flex cursor-pointer items-center gap-2 font-normal">
								<AlertTriangle class="h-4 w-4 text-destructive" />
								<div>
									<div class="font-medium">Agir</div>
									<div class="text-sm text-muted-foreground">
										{decisionDescriptions.actioned}
									</div>
								</div>
							</Label>
						</div>
					</RadioGroup.Root>
				</div>

				<!-- Delete Message Checkbox (only if actioned) -->
				{#if decision === 'actioned'}
					<div class="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
						<MyCheckbox bind:checked={deleteMessage} disabled={isSubmitting}>
							<div class="flex items-center gap-2">
								<Trash2 class="h-4 w-4 text-destructive" />
								<span>Supprimer le message</span>
							</div>
						</MyCheckbox>
						<p class="mt-1 ml-6 text-sm text-muted-foreground">
							Le message sera masqué pour tous les participants
						</p>
					</div>
				{/if}

				<!-- Review Notes -->
				<div class="space-y-2">
					<Label for="review-notes">Notes (optionnel)</Label>
					<Textarea
						id="review-notes"
						bind:value={reviewNotes}
						placeholder="Notes internes sur votre décision..."
						rows={3}
						disabled={isSubmitting}
						class="resize-none"
					/>
					<p class="text-sm text-muted-foreground">
						{characterCount} / 1000 caractères
					</p>
				</div>
			</div>

			<Dialog.Footer class="flex-shrink-0">
				<Button variant="outline" onclick={closeDialog} disabled={isSubmitting}>Annuler</Button>
				<Button
					onclick={submitReview}
					disabled={isSubmitting}
					variant={decision === 'actioned' ? 'destructive' : 'default'}
				>
					{#if isSubmitting}
						<Loader2 class="mr-2 h-4 w-4 animate-spin" />
					{/if}
					{#if decision === 'dismissed'}
						Rejeter le signalement
					{:else if decision === 'reviewed'}
						Marquer comme lu
					{:else}
						Traiter le signalement
					{/if}
				</Button>
			</Dialog.Footer>
		{/if}
	</Dialog.Content>
</Dialog.Root>
