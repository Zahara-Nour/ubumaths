<script lang="ts">
	import { page } from '$app/state';
	import { privateMessages } from '$lib/stores/privateMessages.svelte';
	import { Button } from '$lib/components/ui/button';
	import {
		Loader2,
		Reply,
		Star,
		Archive,
		Trash2,
		Download,
		ArrowLeft,
		MessageSquare,
		Eye,
		EyeOff,
		FileText,
		FileImage,
		FileVideo,
		FileAudio,
		File,
		Paperclip
	} from 'lucide-svelte';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import RichTextDisplay from '$lib/components/rich-text/RichTextDisplay.svelte';
	import { cn } from '$lib/utils';

	const messageId = $derived(page.params.id);

	let failedAvatars = $state<Set<string>>(new Set());

	// Load message on mount
	onMount(async () => {
		if (messageId) {
			await privateMessages.loadMessage(messageId);
		}
	});

	const message = $derived(privateMessages.currentMessage);

	// Handle avatar load error
	function handleAvatarError(userId: string) {
		failedAvatars.add(userId);
		failedAvatars = failedAvatars; // Trigger reactivity
	}

	// Format date
	function formatDate(dateStr: string): string {
		const date = new Date(dateStr);
		return date.toLocaleString('fr-FR', {
			day: 'numeric',
			month: 'long',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	// Format file size
	function formatFileSize(bytes: number): string {
		if (bytes < 1024) return bytes + ' B';
		if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
		return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
	}

	// Get file icon based on type
	function getFileIcon(fileType: string) {
		if (fileType.startsWith('image/')) return FileImage;
		if (fileType.startsWith('video/')) return FileVideo;
		if (fileType.startsWith('audio/')) return FileAudio;
		if (fileType.includes('pdf') || fileType.includes('document') || fileType.includes('text'))
			return FileText;
		return File;
	}

	// Toggle star
	async function toggleStar() {
		if (!message) return;
		await privateMessages.toggleStar(message.message_id);
	}

	// Toggle read/unread
	async function toggleRead() {
		if (!message) return;
		await privateMessages.toggleRead(message.message_id);
	}

	// Archive message
	async function archiveMessage() {
		if (!message) return;
		await privateMessages.updateStatus(message.message_id, 'archived');
		goto('/messages/inbox').then(() => {});
	}

	// Delete message
	async function deleteMessage() {
		if (!message) return;
		if (confirm('Êtes-vous sûr de vouloir supprimer ce message ?')) {
			await privateMessages.deleteMessage(message.message_id);
			goto('/messages/inbox').then(() => {});
		}
	}

	// Reply to message
	function replyToMessage() {
		if (!message) return;
		// Pass message context for reply
		const params = new URLSearchParams({
			replyTo: message.message_id,
			subject: message.subject.startsWith('Re: ') ? message.subject : `Re: ${message.subject}`,
			recipientId: message.sender_id
		});
		goto(`/messages/compose?${params.toString()}`);
	}

	// View full conversation thread
	function viewThread() {
		if (!message) return;
		const rootId = message.thread_root_id || message.message_id;
		goto(`/messages/thread/${rootId}`).then(() => {});
	}

	// Check if message is part of a thread
	const isPartOfThread = $derived(
		message && (message.thread_root_id !== null || message.parent_message_id !== null)
	);
</script>

<div class="flex h-full flex-col">
	<!-- Header -->
	<div class="border-b border-border bg-card p-4">
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-3">
				<Button variant="ghost" size="sm" onclick={() => goto('/messages/inbox').then(() => {})}>
					<ArrowLeft class="h-4 w-4" />
				</Button>
				<div>
					<h1 class="text-lg font-bold text-foreground">Message</h1>
				</div>
			</div>
			<div class="flex items-center gap-2">
				<Button
					variant="ghost"
					size="sm"
					onclick={toggleRead}
					title={message?.read_at ? 'Marquer comme non lu' : 'Marquer comme lu'}
				>
					{#if message?.read_at}
						<EyeOff class="h-4 w-4" />
					{:else}
						<Eye class="h-4 w-4" />
					{/if}
				</Button>
				<Button variant="ghost" size="sm" onclick={toggleStar}>
					<Star class={cn('h-4 w-4', message?.is_starred && 'fill-yellow-500 text-yellow-500')} />
				</Button>
				<Button variant="ghost" size="sm" onclick={archiveMessage}>
					<Archive class="h-4 w-4" />
				</Button>
				<Button variant="ghost" size="sm" onclick={deleteMessage}>
					<Trash2 class="h-4 w-4" />
				</Button>
				{#if isPartOfThread}
					<Button variant="outline" onclick={viewThread}>
						<MessageSquare class="mr-2 h-4 w-4" />
						Voir la conversation
					</Button>
				{/if}
				<Button onclick={replyToMessage}>
					<Reply class="mr-2 h-4 w-4" />
					Répondre
				</Button>
			</div>
		</div>
	</div>

	<!-- Message content -->
	<div class="flex-1 overflow-y-auto">
		{#if privateMessages.isLoading}
			<div class="flex h-full items-center justify-center">
				<Loader2 class="h-8 w-8 animate-spin text-muted-foreground" />
			</div>
		{:else if !message}
			<div class="flex h-full flex-col items-center justify-center text-center">
				<h3 class="text-lg font-semibold text-foreground">Message non trouvé</h3>
				<p class="mt-2 text-sm text-muted-foreground">
					Ce message n'existe pas ou vous n'y avez pas accès
				</p>
				<Button onclick={() => goto('/messages/inbox').then(() => {})} class="mt-4">
					Retour à la boîte de réception
				</Button>
			</div>
		{:else}
			<div class="mx-auto max-w-4xl p-6">
				<!-- Subject -->
				<h2 class="text-2xl font-bold text-foreground">{message.subject}</h2>

				<!-- Meta info -->
				<div class="mt-4 flex items-start justify-between border-b border-border pb-4">
					<div class="flex items-start gap-3">
						<!-- Sender avatar -->
						{#if message.sender_avatar_url && !failedAvatars.has(message.sender_id)}
							<img
								src={message.sender_avatar_url}
								alt={message.sender_name}
								class="h-12 w-12 rounded-full object-cover"
								onerror={() => handleAvatarError(message.sender_id)}
							/>
						{:else}
							<div
								class="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground"
							>
								{message.sender_name?.charAt(0)?.toUpperCase() || '?'}
							</div>
						{/if}

						<div>
							<div class="font-semibold text-foreground">
								{message.sender_name || 'Expéditeur inconnu'}
							</div>
							<div class="text-sm text-muted-foreground">
								{message.sender_role === 'teacher' ? 'Professeur' : 'Élève'}
							</div>
							<div class="mt-1 text-xs text-muted-foreground">
								{formatDate(message.sent_at)}
							</div>
							{#if message.is_group_message}
								<div class="mt-1">
									<span class="rounded bg-primary/10 px-2 py-0.5 text-xs text-primary">
										Message de groupe • {message.recipient_count} destinataires
									</span>
								</div>
							{/if}
						</div>
					</div>

					<!-- Recipients -->
					{#if message.recipients && message.recipients.length > 0 && !message.is_group_message}
						<div class="text-right">
							<div class="text-sm text-muted-foreground">À :</div>
							<div class="mt-1 space-y-1">
								{#each message.recipients as recipient (recipient.id)}
									<div class="flex items-center justify-end gap-2">
										{#if recipient.avatar_url && !failedAvatars.has(recipient.id)}
											<img
												src={recipient.avatar_url}
												alt={recipient.name || 'Destinataire'}
												class="h-6 w-6 rounded-full object-cover"
												onerror={() => handleAvatarError(recipient.id)}
											/>
										{:else}
											<div
												class="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs text-primary"
											>
												{recipient.name?.charAt(0)?.toUpperCase() || '?'}
											</div>
										{/if}
										<span class="text-sm font-medium"
											>{recipient.name || 'Destinataire inconnu'}</span
										>
									</div>
								{/each}
							</div>
						</div>
					{/if}
				</div>

				<!-- Message content -->
				<div class="mt-6">
					{#if message.content}
						<RichTextDisplay
							content={message.content}
							class="prose prose-sm max-w-none dark:prose-invert"
						/>
					{:else}
						<p class="text-muted-foreground">Aucun contenu</p>
					{/if}
				</div>

				<!-- Attachments -->
				{#if message.attachments && message.attachments.length > 0}
					<div class="mt-6 border-t border-border pt-6">
						<div class="mb-4 flex items-center gap-2">
							<Paperclip class="h-5 w-5 text-muted-foreground" />
							<h3 class="text-sm font-semibold text-foreground">
								Pièces jointes ({message.attachments.length})
							</h3>
						</div>
						<div class="space-y-2">
							{#each message.attachments as attachment (attachment.id)}
								{@const FileIcon = getFileIcon(attachment.file_type)}
								<div
									class="group flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-muted/50"
								>
									<div
										class="flex h-10 w-10 items-center justify-center rounded bg-primary/10 text-primary"
									>
										<FileIcon class="h-5 w-5" />
									</div>
									<div class="min-w-0 flex-1">
										<div class="truncate text-sm font-medium text-foreground">
											{attachment.file_name}
										</div>
										<div class="text-xs text-muted-foreground">
											{formatFileSize(attachment.file_size)} • {attachment.file_type}
										</div>
									</div>
									<a
										href={attachment.public_url}
										download={attachment.file_name}
										target="_blank"
										rel="noopener noreferrer"
										class="opacity-0 transition-opacity group-hover:opacity-100"
									>
										<Button variant="ghost" size="sm" title="Télécharger">
											<Download class="h-4 w-4" />
										</Button>
									</a>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Actions -->
				<div class="mt-8 flex items-center gap-3 border-t border-border pt-6">
					<Button onclick={replyToMessage}>
						<Reply class="mr-2 h-4 w-4" />
						Répondre
					</Button>
					{#if isPartOfThread}
						<Button variant="outline" onclick={viewThread}>
							<MessageSquare class="mr-2 h-4 w-4" />
							Voir la conversation
						</Button>
					{/if}
					<Button variant="outline" onclick={archiveMessage}>
						<Archive class="mr-2 h-4 w-4" />
						Archiver
					</Button>
					<Button variant="outline" onclick={deleteMessage}>
						<Trash2 class="mr-2 h-4 w-4" />
						Supprimer
					</Button>
				</div>
			</div>
		{/if}
	</div>
</div>
