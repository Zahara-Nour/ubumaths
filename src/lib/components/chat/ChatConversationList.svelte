<!--
	ChatConversationList Component
	===============================

	Displays a list of user's conversations with:
	- Last message preview
	- Unread count badge
	- User avatars (or group chat icon)
	- Online status indicators
	- Search/filter functionality

	Props:
		- conversations: Conversation[]
		- selectedConversationId?: string
		- onSelectConversation: (id: string) => void
		- onNewChat: () => void

	Responsive:
		- Desktop: Sidebar (300px width)
		- Mobile: Full screen list
-->
<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import * as Avatar from '$lib/components/ui/avatar';
	import { Badge } from '$lib/components/ui/badge';
	import OnlineStatus from '$lib/components/OnlineStatus.svelte';
	import { Search, MessageSquarePlus, Users } from 'lucide-svelte';
	import type { Conversation } from '$lib/stores/chat.svelte';

	// Component Props
	interface Props {
		conversations: Conversation[];
		selectedConversationId?: string;
		onSelectConversation: (id: string) => void;
		onNewChat: () => void;
	}

	let { conversations, selectedConversationId, onSelectConversation, onNewChat }: Props = $props();

	// Search state
	let searchQuery = $state('');

	/**
	 * Filter conversations based on search query
	 */
	let filteredConversations = $derived(() => {
		if (!searchQuery.trim()) {
			return conversations;
		}

		const query = searchQuery.toLowerCase();
		return conversations.filter((conv) => {
			// Search in conversation name (for group chats)
			if (conv.name && conv.name.toLowerCase().includes(query)) {
				return true;
			}

			// Search in other user's name (for 1-on-1 chats)
			if (
				conv.other_user_firstname?.toLowerCase().includes(query) ||
				conv.other_user_lastname?.toLowerCase().includes(query)
			) {
				return true;
			}

			// Search in last message preview
			if (conv.last_message_preview?.toLowerCase().includes(query)) {
				return true;
			}

			return false;
		});
	});

	/**
	 * Get conversation display name
	 */
	function getConversationName(conv: Conversation): string {
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
	function getConversationAvatar(conv: Conversation): {
		src: string | null;
		fallback: string;
	} {
		if (conv.is_group) {
			return {
				src: null,
				fallback: '👥'
			};
		}

		const firstInitial = conv.other_user_firstname?.[0]?.toUpperCase() || '?';
		const lastInitial = conv.other_user_lastname?.[0]?.toUpperCase() || '';

		return {
			src: conv.other_user_avatar_url,
			fallback: firstInitial + lastInitial
		};
	}

	/**
	 * Format timestamp
	 */
	function formatTimestamp(timestamp: string | null): string {
		if (!timestamp) return '';

		const date = new Date(timestamp);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / 60000);
		const diffHours = Math.floor(diffMs / 3600000);
		const diffDays = Math.floor(diffMs / 86400000);

		if (diffMins < 1) return "À l'instant";
		if (diffMins < 60) return `Il y a ${diffMins} min`;
		if (diffHours < 24) return `Il y a ${diffHours}h`;
		if (diffDays < 7) return `Il y a ${diffDays}j`;

		return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
	}
</script>

<div class="flex h-full flex-col bg-card">
	<!-- Header -->
	<div class="border-b border-border p-4">
		<div class="mb-3 flex items-center justify-between">
			<h2 class="text-lg font-semibold">Messages</h2>
			<Button size="sm" onclick={onNewChat}>
				<MessageSquarePlus class="h-4 w-4" />
			</Button>
		</div>

		<!-- Search Bar -->
		<div class="relative">
			<Search class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
			<Input type="text" placeholder="Rechercher..." bind:value={searchQuery} class="pl-9" />
		</div>
	</div>

	<!-- Conversations List -->
	<div class="flex-1 overflow-y-auto">
		{#if filteredConversations().length === 0}
			<div class="p-8 text-center text-muted-foreground">
				{#if searchQuery}
					<p>Aucune conversation trouvée</p>
				{:else}
					<p class="mb-2">Aucune conversation</p>
					<p class="text-sm">Commencez à discuter avec vos amis !</p>
				{/if}
			</div>
		{:else}
			{#each filteredConversations() as conversation (conversation.id)}
				{@const isSelected = selectedConversationId === conversation.id}
				{@const avatar = getConversationAvatar(conversation)}

				<button
					onclick={() => onSelectConversation(conversation.id)}
					class="w-full border-b border-border p-3 text-left transition-colors hover:bg-accent/50 {isSelected
						? 'bg-accent'
						: ''}"
				>
					<div class="flex items-start gap-3">
						<!-- Avatar with Online Status -->
						<div class="relative flex-shrink-0">
							<Avatar.Root class="h-12 w-12">
								{#if avatar.src}
									<Avatar.Image src={avatar.src} alt={getConversationName(conversation)} />
								{/if}
								<Avatar.Fallback class="bg-primary/10 text-primary">
									{avatar.fallback}
								</Avatar.Fallback>
							</Avatar.Root>

							<!-- Online status for 1-on-1 chats -->
							{#if !conversation.is_group && conversation.other_user_id}
								<div class="absolute right-0 bottom-0">
									<OnlineStatus userId={conversation.other_user_id} size="sm" />
								</div>
							{/if}

							<!-- Group chat indicator -->
							{#if conversation.is_group}
								<div
									class="absolute -right-1 -bottom-1 flex h-5 w-5 items-center justify-center rounded-full bg-muted text-muted-foreground"
								>
									<Users class="h-3 w-3" />
								</div>
							{/if}
						</div>

						<!-- Conversation Info -->
						<div class="min-w-0 flex-1">
							<div class="mb-1 flex items-baseline justify-between gap-2">
								<h3 class="truncate font-semibold text-foreground">
									{getConversationName(conversation)}
								</h3>
								<span class="flex-shrink-0 text-xs text-muted-foreground">
									{formatTimestamp(conversation.last_message_at)}
								</span>
							</div>

							<div class="flex items-center justify-between gap-2">
								<p class="truncate text-sm text-muted-foreground">
									{conversation.last_message_preview || 'Aucun message'}
								</p>

								<!-- Unread Badge -->
								{#if conversation.unread_count > 0}
									<Badge variant="default" class="flex-shrink-0">
										{conversation.unread_count}
									</Badge>
								{/if}
							</div>

							<!-- Group chat participant count -->
							{#if conversation.is_group}
								<p class="mt-1 text-xs text-muted-foreground">
									{conversation.participant_count} participant{conversation.participant_count > 1
										? 's'
										: ''}
								</p>
							{/if}
						</div>
					</div>
				</button>
			{/each}
		{/if}
	</div>
</div>
