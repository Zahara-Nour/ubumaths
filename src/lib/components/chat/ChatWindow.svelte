<!--
	ChatWindow Component
	=====================

	Main chat interface with responsive layout:
	- Desktop (≥768px): Split view with conversation list + chat area
	- Mobile (<768px): Single view (conversations OR chat)

	Props:
		- userId: string
		- isTeacher: boolean

	Features:
		- Auto-loads conversations on mount
		- Real-time message updates via WebSocket
		- Responsive navigation (back button on mobile)
		- Create new 1-on-1 chats with friends
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { chatStore } from '$lib/stores/chat.svelte';
	import ChatConversationList from './ChatConversationList.svelte';
	import ChatMessageList from './ChatMessageList.svelte';
	import ChatComposer from './ChatComposer.svelte';
	import NewChatDialog from './NewChatDialog.svelte';
	import ReportMessageDialog from './ReportMessageDialog.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Avatar from '$lib/components/ui/avatar';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { ArrowLeft, MoreVertical, Users, UserPlus } from 'lucide-svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { uploadMultipleAttachments } from '$lib/utils/file-upload';

	// Component Props
	interface Props {
		userId: string;
		isTeacher: boolean;
		supabase: any; // SupabaseClient type
	}

	let { userId, isTeacher, supabase }: Props = $props();

	// Component State
	let isMobileView = $state(false);
	let showConversationList = $state(true); // For mobile: true = show list, false = show chat
	let showNewChatDialog = $state(false);
	let reportMessageId = $state<string | null>(null);

	// Initialize chat store
	onMount(() => {
		chatStore.init(supabase, userId);

		// Check window width for mobile detection
		checkMobileView();
		window.addEventListener('resize', checkMobileView);

		return () => {
			window.removeEventListener('resize', checkMobileView);
		};
	});

	/**
	 * Check if mobile view (< 768px)
	 */
	function checkMobileView(): void {
		isMobileView = window.innerWidth < 768;
	}

	/**
	 * Handle conversation selection
	 */
	function handleSelectConversation(conversationId: string): void {
		chatStore.setActiveConversation(conversationId);

		// On mobile, switch to chat view
		if (isMobileView) {
			showConversationList = false;
		}
	}

	/**
	 * Handle back button (mobile only)
	 */
	function handleBack(): void {
		showConversationList = true;
		chatStore.setActiveConversation(null);
	}

	/**
	 * Handle send message
	 */
	async function handleSendMessage(content: any, attachments: File[]): Promise<void> {
		if (!chatStore.activeConversationId) return;

		let attachmentRecords: Array<{
			file_name: string;
			file_type: string;
			file_size: number;
			storage_path: string;
			public_url: string;
		}> = [];

		// Upload attachments first if any
		if (attachments.length > 0) {
			// Create a temporary message ID for folder structure
			const tempMessageId = crypto.randomUUID();

			const uploadResults = await uploadMultipleAttachments(
				supabase,
				attachments,
				chatStore.activeConversationId,
				tempMessageId
			);

			// Check for upload failures
			const failures = uploadResults.filter((r) => !r.success);
			if (failures.length > 0) {
				failures.forEach((f) => toaster.error(f.error || 'Erreur d\'upload'));
				return;
			}

			// Collect successful uploads
			attachmentRecords = uploadResults
				.filter((r) => r.success && r.attachment)
				.map((r) => r.attachment!);
		}

		// Send message with attachments
		const message = await chatStore.sendMessage(
			chatStore.activeConversationId,
			content,
			attachmentRecords
		);

		if (!message) {
			toaster.error("Erreur lors de l'envoi du message");
		}
	}

	/**
	 * Handle typing indicator
	 */
	function handleTyping(isTyping: boolean): void {
		if (!chatStore.activeConversationId) return;
		chatStore.sendTypingIndicator(chatStore.activeConversationId, isTyping);
	}

	/**
	 * Handle new chat creation
	 */
	function handleNewChat(): void {
		showNewChatDialog = true;
	}

	/**
	 * Handle friend selection for new chat
	 */
	async function handleSelectFriend(friendId: string, friendName: string): Promise<void> {
		// Create or find existing 1-on-1 chat
		const conversationId = await chatStore.create1on1Chat(friendId);

		if (conversationId) {
			// Select the conversation
			chatStore.setActiveConversation(conversationId);
			showNewChatDialog = false;
			toaster.success(`Conversation avec ${friendName} ouverte`);

			// On mobile, switch to chat view
			if (isMobileView) {
				showConversationList = false;
			}
		} else {
			toaster.error('Erreur lors de la création de la conversation');
		}
	}

	/**
	 * Handle load more messages
	 */
	function handleLoadMore(): void {
		if (!chatStore.activeConversationId) return;

		const messages = chatStore.activeMessages;
		if (messages.length === 0) return;

		const oldestMessage = messages[0];
		chatStore.loadMessages(
			chatStore.activeConversationId,
			50,
			oldestMessage.id,
			oldestMessage.created_at
		);
	}

	/**
	 * Handle reaction toggle
	 */
	function handleReaction(messageId: string, emoji: string): void {
		chatStore.toggleReaction(messageId, emoji);
	}

	/**
	 * Handle report message
	 */
	function handleReport(messageId: string): void {
		reportMessageId = messageId;
	}

	/**
	 * Handle report submission
	 */
	async function handleSubmitReport(
		messageId: string,
		reason: string,
		details: string
	): Promise<void> {
		const success = await chatStore.reportMessage(
			messageId,
			reason as 'spam' | 'harassment' | 'inappropriate' | 'other',
			details
		);

		if (success) {
			toaster.success('Message signalé avec succès');
			reportMessageId = null;
		} else {
			toaster.error('Erreur lors du signalement');
		}
	}

	/**
	 * Get conversation display name
	 */
	function getConversationDisplayName(): string {
		const conv = chatStore.activeConversation;
		if (!conv) return '';

		if (conv.is_group && conv.name) {
			return conv.name;
		}

		if (conv.other_user_firstname && conv.other_user_lastname) {
			return `${conv.other_user_firstname} ${conv.other_user_lastname}`;
		}

		return 'Conversation';
	}

	/**
	 * Get conversation avatar
	 */
	function getConversationAvatar(): { src: string | null; fallback: string } {
		const conv = chatStore.activeConversation;
		if (!conv) return { src: null, fallback: '?' };

		if (conv.is_group) {
			return { src: null, fallback: '👥' };
		}

		const firstInitial = conv.other_user_firstname?.[0]?.toUpperCase() || '?';
		const lastInitial = conv.other_user_lastname?.[0]?.toUpperCase() || '';

		return {
			src: conv.other_user_avatar_url,
			fallback: firstInitial + lastInitial
		};
	}
</script>

<div class="flex h-screen overflow-hidden bg-background">
	<!-- Desktop Layout OR Mobile Conversation List -->
	{#if !isMobileView || showConversationList}
		<div class="w-full md:w-80 md:border-r md:border-border">
			<ChatConversationList
				conversations={chatStore.conversations}
				selectedConversationId={chatStore.activeConversationId}
				onSelectConversation={handleSelectConversation}
				onNewChat={handleNewChat}
			/>
		</div>
	{/if}

	<!-- Desktop Chat Area OR Mobile Chat View -->
	{#if !isMobileView || !showConversationList}
		<div class="flex flex-1 flex-col {isMobileView ? 'w-full' : ''}">
			{#if chatStore.activeConversation}
				{@const avatar = getConversationAvatar()}

				<!-- Chat Header -->
				<div class="flex items-center gap-3 border-b border-border bg-card p-4">
					<!-- Back Button (Mobile Only) -->
					{#if isMobileView}
						<Button variant="ghost" size="sm" onclick={handleBack}>
							<ArrowLeft class="h-5 w-5" />
						</Button>
					{/if}

					<!-- Avatar -->
					<Avatar.Root class="h-10 w-10">
						{#if avatar.src}
							<Avatar.Image src={avatar.src} alt={getConversationDisplayName()} />
						{/if}
						<Avatar.Fallback class="bg-primary/10 text-primary">
							{avatar.fallback}
						</Avatar.Fallback>
					</Avatar.Root>

					<!-- Conversation Info -->
					<div class="flex-1 overflow-hidden">
						<h2 class="truncate font-semibold">{getConversationDisplayName()}</h2>
						{#if chatStore.activeConversation.is_group}
							<p class="text-sm text-muted-foreground">
								{chatStore.activeConversation.participant_count} participant{chatStore
									.activeConversation.participant_count > 1
									? 's'
									: ''}
							</p>
						{/if}
					</div>

					<!-- Actions Menu -->
					<DropdownMenu.Root>
						<DropdownMenu.Trigger class="cursor-pointer">
							<Button variant="ghost" size="sm">
								<MoreVertical class="h-5 w-5" />
							</Button>
						</DropdownMenu.Trigger>
						<DropdownMenu.Content>
							{#if chatStore.activeConversation.is_group}
								<DropdownMenu.Item>
									<Users class="mr-2 h-4 w-4" />
									Voir les participants
								</DropdownMenu.Item>
							{/if}
							<DropdownMenu.Item>
								<UserPlus class="mr-2 h-4 w-4" />
								Ajouter un participant
							</DropdownMenu.Item>
						</DropdownMenu.Content>
					</DropdownMenu.Root>
				</div>

				<!-- Messages Area -->
				<div class="flex-1 overflow-hidden">
					<ChatMessageList
						messages={chatStore.activeMessages}
						currentUserId={userId}
						typingUsers={chatStore.activeTypingUsers}
						hasMore={true}
						isLoading={chatStore.isLoadingMessages}
						onLoadMore={handleLoadMore}
						onReact={handleReaction}
						onReport={handleReport}
					/>
				</div>

				<!-- Composer Area -->
				<ChatComposer
					conversationId={chatStore.activeConversationId}
					isTeacher={isTeacher}
					onSend={handleSendMessage}
					onTyping={handleTyping}
				/>
			{:else}
				<!-- No Conversation Selected -->
				<div class="flex flex-1 items-center justify-center text-center text-muted-foreground">
					<div>
						<p class="mb-2 text-lg">Sélectionnez une conversation</p>
						<p class="text-sm">Choisissez une conversation pour commencer à discuter</p>
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>

<!-- Dialogs -->
<NewChatDialog
	bind:open={showNewChatDialog}
	onOpenChange={(open) => (showNewChatDialog = open)}
	onSelectFriend={handleSelectFriend}
	{supabase}
/>

<ReportMessageDialog
	bind:open={reportMessageId !== null}
	messageId={reportMessageId}
	onOpenChange={(open) => {
		if (!open) reportMessageId = null;
	}}
	onSubmit={handleSubmitReport}
/>
