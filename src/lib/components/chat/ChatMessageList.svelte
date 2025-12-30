<!--
	ChatMessageList Component
	==========================

	Displays a list of messages in a conversation with:
	- Rich text content (TipTap JSON)
	- User avatars
	- Timestamps
	- Emoji reactions
	- File attachments
	- Infinite scroll pagination

	Props:
		- messages: Message[]
		- currentUserId: string
		- hasMore: boolean
		- isLoading: boolean
		- onLoadMore: () => void
		- onReact: (messageId: string, emoji: string) => void
		- onReport: (messageId: string) => void

	Features:
		- Auto-scroll to bottom on new message
		- Group messages by date
		- Show "Today", "Yesterday", etc.
-->
<script lang="ts">
	import { onMount, tick } from 'svelte'; // onMount for future scroll handling
	import { MarkdownRenderer } from '$lib/components/markdown';
	import * as Avatar from '$lib/components/ui/avatar';
	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { MoreVertical, Flag, Download, Trash2 } from 'lucide-svelte';
	import DeleteMessageDialog from '$lib/components/moderation/DeleteMessageDialog.svelte';
	import type { Message } from '$lib/stores/chat.svelte';
	import { getAvatarUrl } from '$lib/utils/avatar';
	import { tipTapToMarkdown } from '$lib/components/rich-text/markdown-export';
	import type { JSONContent } from '@tiptap/core';

	// Component Props
	interface Props {
		messages: Message[];
		currentUserId: string;
		currentUserRole?: string;
		hasMore?: boolean;
		isLoading?: boolean;
		onLoadMore?: () => void;
		onReact?: (messageId: string, emoji: string) => void;
		onReport?: (messageId: string) => void;
		onDelete?: (messageId: string) => void;
	}

	let {
		messages,
		currentUserId,
		currentUserRole = 'student',
		hasMore = false,
		isLoading = false,
		onLoadMore,
		onReact,
		onReport,
		onDelete
	}: Props = $props();

	let messagesContainer = $state<HTMLDivElement | null>(null);
	let shouldAutoScroll = $state(true);
	let prevMessagesLength = $state(0);

	// Delete message dialog state
	let showDeleteDialog = $state(false);
	let messageToDelete = $state<string | null>(null);

	/**
	 * Common reaction emojis
	 */
	const reactionEmojis = ['👍', '❤️', '😂', '🎉', '😮', '😢', '🤔'];

	/**
	 * Open delete message dialog
	 */
	function openDeleteDialog(messageId: string): void {
		messageToDelete = messageId;
		showDeleteDialog = true;
	}

	/**
	 * Handle successful message deletion
	 */
	function handleDeleteSuccess(): void {
		if (messageToDelete && onDelete) {
			onDelete(messageToDelete);
		}
		messageToDelete = null;
	}

	/**
	 * Format timestamp
	 */
	function formatMessageTime(timestamp: string): string {
		const date = new Date(timestamp);
		return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
	}

	/**
	 * Format date header
	 */
	function formatDateHeader(timestamp: string): string {
		const date = new Date(timestamp);
		const today = new Date();
		const yesterday = new Date(today);
		yesterday.setDate(yesterday.getDate() - 1);

		if (date.toDateString() === today.toDateString()) {
			return "Aujourd'hui";
		} else if (date.toDateString() === yesterday.toDateString()) {
			return 'Hier';
		} else {
			return date.toLocaleDateString('fr-FR', {
				weekday: 'long',
				year: 'numeric',
				month: 'long',
				day: 'numeric'
			});
		}
	}

	/**
	 * Check if we should show date header
	 */
	function shouldShowDateHeader(index: number): boolean {
		if (index === 0) return true;

		const currentDate = new Date(messages[index].created_at ?? '').toDateString();
		const prevDate = new Date(messages[index - 1].created_at ?? '').toDateString();

		return currentDate !== prevDate;
	}

	/**
	 * Check if message is from current user
	 */
	function isOwnMessage(message: Message): boolean {
		return message.sender_id === currentUserId;
	}

	/**
	 * Get sender name
	 */
	function getSenderName(message: Message): string {
		if (!message.sender_firstname && !message.sender_lastname) {
			return 'Utilisateur inconnu';
		}
		return `${message.sender_firstname || ''} ${message.sender_lastname || ''}`.trim();
	}

	/**
	 * Handle scroll event for infinite scroll
	 */
	function handleScroll(): void {
		if (!messagesContainer || !onLoadMore) return;

		const { scrollTop, scrollHeight, clientHeight } = messagesContainer;

		// Check if scrolled to bottom
		shouldAutoScroll = scrollHeight - scrollTop - clientHeight < 100;

		// Load more if scrolled near top
		if (scrollTop < 100 && hasMore && !isLoading) {
			onLoadMore();
		}
	}

	/**
	 * Scroll to bottom
	 */
	async function scrollToBottom(smooth: boolean = false): Promise<void> {
		await tick();
		if (messagesContainer) {
			messagesContainer.scrollTo({
				top: messagesContainer.scrollHeight,
				behavior: smooth ? 'smooth' : 'auto'
			});
		}
	}

	/**
	 * Auto-scroll on new messages
	 */
	$effect(() => {
		if (messages.length > prevMessagesLength && shouldAutoScroll) {
			scrollToBottom(true);
		}
		prevMessagesLength = messages.length;
	});

	/**
	 * Initial scroll to bottom
	 */
	onMount(() => {
		scrollToBottom(false);
	});
</script>

<div class="flex h-full flex-col">
	<!-- Messages Container -->
	<div bind:this={messagesContainer} onscroll={handleScroll} class="flex-1 overflow-y-auto p-4">
		{#if isLoading && messages.length === 0}
			<div class="flex h-full items-center justify-center text-muted-foreground">
				<p>Chargement des messages...</p>
			</div>
		{:else if messages.length === 0}
			<div class="flex h-full items-center justify-center text-center text-muted-foreground">
				<div>
					<p class="mb-2 text-lg">Aucun message</p>
					<p class="text-sm">Envoyez votre premier message !</p>
				</div>
			</div>
		{:else}
			{#if isLoading && hasMore}
				<div class="mb-4 text-center text-sm text-muted-foreground">
					<p>Chargement...</p>
				</div>
			{/if}

			{#each messages as message, index (message.id)}
				<!-- Date Header -->
				{#if shouldShowDateHeader(index)}
					<div class="my-4 text-center">
						<span class="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
							{formatDateHeader(message.created_at ?? '')}
						</span>
					</div>
				{/if}

				<!-- Message -->
				<div class="mb-4 flex gap-3 {isOwnMessage(message) ? 'flex-row-reverse' : 'flex-row'}">
					<!-- Avatar (only for other users) -->
					{#if !isOwnMessage(message)}
						<div class="flex-shrink-0">
							<Avatar.Root class="h-8 w-8">
								<Avatar.Image
									src={getAvatarUrl({ avatar_url: message.sender_avatar_url })}
									alt={getSenderName(message)}
								/>
								<Avatar.Fallback class="bg-primary/10 text-xs text-primary">
									{message.sender_firstname?.[0]?.toUpperCase() || '?'}
								</Avatar.Fallback>
							</Avatar.Root>
						</div>
					{/if}

					<!-- Message Content -->
					<div
						class="flex max-w-[70%] min-w-0 flex-col {isOwnMessage(message)
							? 'items-end'
							: 'items-start'}"
					>
						<!-- Sender Name (only for other users) -->
						{#if !isOwnMessage(message)}
							<span class="mb-1 text-xs font-semibold text-foreground">
								{getSenderName(message)}
							</span>
						{/if}

						<!-- Message Bubble -->
						<div
							class="group relative rounded-lg px-4 py-2 {isOwnMessage(message)
								? 'bg-primary text-primary-foreground'
								: 'bg-muted text-foreground'}"
						>
							<!-- Flagged Warning -->
							{#if message.is_flagged}
								<div class="mb-2 rounded bg-destructive/10 p-2 text-xs text-destructive">
									⚠️ Ce message a été signalé automatiquement
								</div>
							{/if}

							<!-- Rich Text Content or Deleted State -->
							{#if message.deleted_at}
								<div class="text-muted-foreground italic">Message supprimé par un modérateur</div>
							{:else}
								<div
									class="leading-relaxed break-words {isOwnMessage(message)
										? 'text-primary-foreground'
										: ''}"
								>
									<MarkdownRenderer content={tipTapToMarkdown(message.content as JSONContent)} />
								</div>
							{/if}

							<!-- Attachments -->
							{#if message.attachments && message.attachments.length > 0}
								<div class="mt-2 space-y-2">
									{#each message.attachments as attachment (attachment.id)}
										<a
											href={attachment.public_url}
											target="_blank"
											rel="noopener noreferrer"
											data-sveltekit-preload-data="off"
											class="flex items-center gap-2 rounded border border-border bg-background/50 p-2 text-sm hover:bg-background"
										>
											<Download class="h-4 w-4" />
											<span class="truncate">{attachment.file_name}</span>
											<span class="text-xs text-muted-foreground">
												({Math.round(attachment.file_size / 1024)}KB)
											</span>
										</a>
									{/each}
								</div>
							{/if}

							<!-- Message Actions (3-dot menu) -->
							<div
								class="absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100"
							>
								<DropdownMenu.Root>
									<DropdownMenu.Trigger class="cursor-pointer">
										<Button variant="ghost" size="sm" class="h-6 w-6 p-0">
											<MoreVertical class="h-4 w-4" />
										</Button>
									</DropdownMenu.Trigger>
									<DropdownMenu.Content>
										{#if onReport && !isOwnMessage(message) && !message.deleted_at}
											<DropdownMenu.Item onclick={() => onReport?.(message.id)}>
												<Flag class="mr-2 h-4 w-4" />
												Signaler
											</DropdownMenu.Item>
										{/if}
										{#if (currentUserRole === 'teacher' || currentUserRole === 'admin') && !message.deleted_at}
											{#if onReport && !isOwnMessage(message)}
												<DropdownMenu.Separator />
											{/if}
											<DropdownMenu.Item
												onclick={() => openDeleteDialog(message.id)}
												class="text-destructive focus:text-destructive"
											>
												<Trash2 class="mr-2 h-4 w-4" />
												Supprimer le message
											</DropdownMenu.Item>
										{/if}
									</DropdownMenu.Content>
								</DropdownMenu.Root>
							</div>
						</div>

						<!-- Timestamp & Reactions -->
						<div class="mt-1 flex items-center gap-2">
							<span class="text-xs text-muted-foreground">
								{formatMessageTime(message.created_at ?? '')}
								{#if message.edited_at}
									<span class="italic">(modifié)</span>
								{/if}
							</span>

							<!-- Reactions -->
							{#if message.reactions && message.reactions.length > 0}
								<div class="flex gap-1">
									{#each message.reactions as reaction (reaction.emoji)}
										<button
											onclick={() => onReact?.(message.id, reaction.emoji)}
											class="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs transition-colors hover:bg-muted/80 {reaction.user_reacted
												? 'ring-1 ring-primary'
												: ''}"
										>
											<span>{reaction.emoji}</span>
											<span class="text-muted-foreground">{reaction.count}</span>
										</button>
									{/each}
								</div>
							{/if}
						</div>

						<!-- Quick Reactions -->
						{#if onReact}
							<div class="mt-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
								{#each reactionEmojis as emoji (emoji)}
									<button
										onclick={() => onReact?.(message.id, emoji)}
										class="rounded p-1 text-sm transition-colors hover:bg-muted"
										title="Réagir avec {emoji}"
									>
										{emoji}
									</button>
								{/each}
							</div>
						{/if}
					</div>
				</div>
			{/each}
		{/if}
	</div>
</div>

<!-- Delete Message Dialog -->
<DeleteMessageDialog
	bind:open={showDeleteDialog}
	messageId={messageToDelete}
	onSuccess={handleDeleteSuccess}
/>
