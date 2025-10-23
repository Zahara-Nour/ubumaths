<script lang="ts">
	import { page } from '$app/state';
	import { privateMessages } from '$lib/stores/privateMessages.svelte';
	import { Button } from '$lib/components/ui/button';
	import {
		Loader2,
		ArrowLeft,
		Reply,
		MessageSquare,
		Download,
		Paperclip,
		FileText,
		FileImage,
		FileVideo,
		FileAudio,
		File
	} from 'lucide-svelte';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import RichTextDisplay from '$lib/components/rich-text/RichTextDisplay.svelte';

	const threadRootId = $derived(page.params.id);

	let failedAvatars = $state<Set<string>>(new Set());

	// Load thread on mount
	onMount(async () => {
		if (threadRootId) {
			await privateMessages.loadThread(threadRootId);
		}
	});

	const thread = $derived(privateMessages.currentThread);

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

	// Reply to message in thread
	function replyToThread() {
		if (!threadRootId) return;
		// Get the root message (first in thread)
		const rootMessage = thread[0];
		if (!rootMessage) return;

		const params = new URLSearchParams({
			replyTo: threadRootId,
			subject: rootMessage.subject.startsWith('Re: ')
				? rootMessage.subject
				: `Re: ${rootMessage.subject}`,
			recipientId: rootMessage.sender_id
		});
		goto(`/messages/compose?${params.toString()}`);
	}
</script>

<div class="flex h-full flex-col">
	<!-- Header -->
	<div class="border-b border-border bg-card p-4">
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-3">
				<Button variant="ghost" size="sm" onclick={() => goto('/messages/inbox')}>
					<ArrowLeft class="h-4 w-4" />
				</Button>
				<div>
					<h1 class="text-lg font-bold text-foreground">
						<MessageSquare class="inline h-5 w-5" />
						Fil de discussion
					</h1>
					{#if thread.length > 0}
						<p class="text-sm text-muted-foreground">{thread.length} message(s)</p>
					{/if}
				</div>
			</div>
			<div class="flex items-center gap-2">
				<Button onclick={replyToThread}>
					<Reply class="mr-2 h-4 w-4" />
					Répondre
				</Button>
			</div>
		</div>
	</div>

	<!-- Thread content -->
	<div class="flex-1 overflow-y-auto">
		{#if privateMessages.isLoading}
			<div class="flex h-full items-center justify-center">
				<Loader2 class="h-8 w-8 animate-spin text-muted-foreground" />
			</div>
		{:else if !thread || thread.length === 0}
			<div class="flex h-full flex-col items-center justify-center text-center">
				<MessageSquare class="mb-4 h-12 w-12 text-muted-foreground" />
				<h3 class="text-lg font-semibold text-foreground">Aucun message trouvé</h3>
				<p class="mt-2 text-sm text-muted-foreground">
					Ce fil de discussion n'existe pas ou vous n'y avez pas accès
				</p>
				<Button onclick={() => goto('/messages/inbox')} class="mt-4">
					Retour à la boîte de réception
				</Button>
			</div>
		{:else}
			<div class="mx-auto max-w-4xl space-y-6 p-6">
				{#each thread as message, index}
					<div
						class="rounded-lg border border-border bg-card p-6 transition-shadow hover:shadow-md"
						class:ml-8={index > 0}
					>
						<!-- Message header -->
						<div class="mb-4 flex items-start justify-between border-b border-border pb-4">
							<div class="flex items-start gap-3">
								<!-- Sender avatar -->
								{#if message.sender_avatar_url && !failedAvatars.has(message.sender_id)}
									<img
										src={message.sender_avatar_url}
										alt={message.sender_name}
										class="h-10 w-10 rounded-full object-cover"
										onerror={() => handleAvatarError(message.sender_id)}
									/>
								{:else}
									<div
										class="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground"
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
								</div>
							</div>

							<!-- Reply indicator -->
							{#if index > 0}
								<div class="rounded bg-primary/10 px-2 py-1 text-xs text-primary">
									<Reply class="mr-1 inline h-3 w-3" />
									Réponse
								</div>
							{/if}
						</div>

						<!-- Subject (only for root message) -->
						{#if index === 0}
							<h2 class="mb-4 text-xl font-bold text-foreground">{message.subject}</h2>
						{/if}

						<!-- Message content -->
						<div class="mt-4">
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
							<div class="mt-4 border-t border-border pt-4">
								<div class="mb-3 flex items-center gap-2">
									<Paperclip class="h-4 w-4 text-muted-foreground" />
									<div class="text-sm font-semibold text-foreground">
										Pièces jointes ({message.attachments.length})
									</div>
								</div>
								<div class="space-y-2">
									{#each message.attachments as attachment}
										{@const FileIcon = getFileIcon(attachment.file_type)}
										<div
											class="group flex items-center gap-3 rounded-lg border border-border bg-background p-2 text-sm transition-colors hover:bg-muted/50"
										>
											<div
												class="flex h-8 w-8 items-center justify-center rounded bg-primary/10 text-primary"
											>
												<FileIcon class="h-4 w-4" />
											</div>
											<div class="min-w-0 flex-1">
												<div class="truncate text-sm font-medium text-foreground">
													{attachment.file_name}
												</div>
												<div class="text-xs text-muted-foreground">
													{formatFileSize(attachment.file_size)}
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
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>
