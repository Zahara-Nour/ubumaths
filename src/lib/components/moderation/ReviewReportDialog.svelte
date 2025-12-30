<!--
	ReviewReportDialog Component
	============================

	Dialog to review a message report (teacher action).

	Props:
		- open: Dialog open state (bindable)
		- report: The report to review
		- onSuccess: Callback after successful review

	Features:
		- Display reported message with context (10 previous messages)
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
	import RestrictUserDialog from './RestrictUserDialog.svelte';
	import { CheckCircle, XCircle, AlertTriangle, Loader2, Trash2, UserX } from 'lucide-svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { formatDistanceToNow, format } from 'date-fns';
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

	// Context message type from API
	interface ContextMessage {
		id: string;
		conversation_id: string;
		sender_id: string;
		sender_firstname: string | null;
		sender_lastname: string | null;
		sender_avatar_url: string | null;
		content: unknown;
		plain_text: string | null;
		created_at: string;
		is_reported_message: boolean;
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
	let restrictUser = $state(false);
	let showRestrictDialog = $state(false);
	let reviewNotes = $state('');
	let isSubmitting = $state(false);
	let contextMessages = $state<ContextMessage[]>([]);
	let isLoadingContext = $state(false);

	/**
	 * Character count
	 */
	const characterCount = $derived(reviewNotes.length);

	/**
	 * Get conversation ID from context messages
	 */
	const conversationId = $derived.by(() => {
		if (contextMessages.length > 0) {
			return contextMessages[0].conversation_id;
		}
		return null;
	});

	/**
	 * Get sender full name
	 */
	const senderName = $derived.by(() => {
		if (!report) return '';
		return getSenderName(report.sender_firstname, report.sender_lastname);
	});

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

			// If user wants to restrict the author, open the restriction dialog
			if (restrictUser && report) {
				showRestrictDialog = true;
				// Don't close or call onSuccess yet - wait for restriction to complete
			} else {
				closeDialog();
				onSuccess();
			}
		} catch (err) {
			console.error('Failed to review report:', err);
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
		restrictUser = false;
		reviewNotes = '';
		contextMessages = [];
	}

	/**
	 * Load context messages for the reported message
	 */
	async function loadContext(messageId: string): Promise<void> {
		isLoadingContext = true;
		try {
			const response = await fetch(`/api/moderation/messages/${messageId}/context?count=10`);
			if (response.ok) {
				const data = await response.json();
				contextMessages = data.messages || [];
			} else {
				console.error('Failed to load context:', await response.text());
				contextMessages = [];
			}
		} catch (error) {
			console.error('Failed to load context:', error);
			contextMessages = [];
		} finally {
			isLoadingContext = false;
		}
	}

	/**
	 * Format time for context messages
	 */
	function formatMessageTime(dateString: string): string {
		try {
			return format(new Date(dateString), 'HH:mm', { locale: fr });
		} catch {
			return '';
		}
	}

	/**
	 * Reset form and load context when report changes
	 */
	$effect(() => {
		if (report) {
			decision = 'reviewed';
			deleteMessage = false;
			restrictUser = false;
			reviewNotes = '';
			contextMessages = [];
			// Load context messages
			loadContext(report.message_id);
		}
	});

	/**
	 * Close restriction dialog and main dialog when restriction is done
	 */
	function handleRestrictionComplete(): void {
		showRestrictDialog = false;
		closeDialog();
		onSuccess(); // Refresh data after restriction is created
	}
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

				<!-- Conversation Context -->
				<div class="space-y-2">
					<div class="flex items-center justify-between">
						<Label>Contexte de la conversation</Label>
						<span class="text-xs text-muted-foreground">
							{report.conversation_name || 'Conversation'}
						</span>
					</div>
					<div class="max-h-64 overflow-y-auto rounded-lg border border-border bg-background p-3">
						{#if isLoadingContext}
							<div class="flex items-center justify-center py-4 text-muted-foreground">
								<Loader2 class="mr-2 h-4 w-4 animate-spin" />
								<span class="text-sm">Chargement du contexte...</span>
							</div>
						{:else if contextMessages.length === 0}
							<!-- Fallback to just the reported message -->
							<div class="rounded-md border-l-4 border-destructive bg-destructive/10 p-3">
								<div class="mb-1 flex items-center justify-between text-xs">
									<span class="font-semibold text-destructive">
										{getSenderName(report.sender_firstname, report.sender_lastname)}
									</span>
								</div>
								<p class="text-sm whitespace-pre-wrap">
									{report.message_plain_text || '[Contenu non disponible]'}
								</p>
							</div>
						{:else}
							<div class="space-y-2">
								{#each contextMessages as msg (msg.id)}
									<div
										class="rounded-md p-2 {msg.is_reported_message
											? 'border-l-4 border-destructive bg-destructive/10'
											: 'bg-muted/50'}"
									>
										<div class="mb-1 flex items-center justify-between text-xs">
											<span
												class="font-semibold {msg.is_reported_message ? 'text-destructive' : ''}"
											>
												{getSenderName(msg.sender_firstname, msg.sender_lastname)}
												{#if msg.is_reported_message}
													<Badge variant="destructive" class="ml-1 px-1 py-0 text-[10px]">
														signalé
													</Badge>
												{/if}
											</span>
											<span class="text-muted-foreground">
												{formatMessageTime(msg.created_at)}
											</span>
										</div>
										<p class="text-sm whitespace-pre-wrap">
											{msg.plain_text || '[Contenu non disponible]'}
										</p>
									</div>
								{/each}
							</div>
						{/if}
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

				<!-- Action options (only if actioned) -->
				{#if decision === 'actioned'}
					<div class="space-y-3">
						<!-- Delete Message Checkbox -->
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

						<!-- Restrict User Checkbox -->
						<div class="rounded-lg border border-orange-500/50 bg-orange-500/10 p-3">
							<MyCheckbox bind:checked={restrictUser} disabled={isSubmitting}>
								<div class="flex items-center gap-2">
									<UserX class="h-4 w-4 text-orange-600" />
									<span>Restreindre l'auteur</span>
								</div>
							</MyCheckbox>
							<p class="mt-1 ml-6 text-sm text-muted-foreground">
								Configurer une restriction (mute, timeout, ban) après le traitement
							</p>
						</div>
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

<!-- Nested Restrict User Dialog -->
{#if report}
	<RestrictUserDialog
		bind:open={showRestrictDialog}
		userId={report.sender_id}
		userName={senderName}
		{conversationId}
		onSuccess={handleRestrictionComplete}
	/>
{/if}
