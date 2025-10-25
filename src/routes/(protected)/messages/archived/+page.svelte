<script lang="ts">
	import { privateMessages } from '$lib/stores/privateMessages.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import {
		Loader2,
		Star,
		Archive,
		ArchiveRestore,
		Trash2,
		MailOpen,
		PencilLine,
		MessageSquare,
		Search,
		X,
		Eye,
		EyeOff
	} from 'lucide-svelte';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { cn } from '$lib/utils';

	let searchQuery = $state('');
	let selectedIndex = $state(-1);
	let failedAvatars = $state<Set<string>>(new Set());

	// Load archived messages on mount
	onMount(() => {
		privateMessages.loadInbox('archived');
	});

	// Keyboard navigation
	onMount(() => {
		function handleKeyDown(e: KeyboardEvent) {
			const messages = filteredMessages();
			if (messages.length === 0) return;

			// Ignore if user is typing in search
			if (document.activeElement?.tagName === 'INPUT') return;

			if (e.key === 'ArrowDown') {
				e.preventDefault();
				selectedIndex = Math.min(selectedIndex + 1, messages.length - 1);
			} else if (e.key === 'ArrowUp') {
				e.preventDefault();
				selectedIndex = Math.max(selectedIndex - 1, 0);
			} else if (e.key === 'Enter' && selectedIndex >= 0) {
				e.preventDefault();
				viewMessage(messages[selectedIndex].message_id);
			} else if (e.key === 'Escape') {
				selectedIndex = -1;
			}
		}

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	});

	// Filter messages by search query
	const filteredMessages = $derived(() => {
		if (!searchQuery.trim()) return privateMessages.inbox;

		const query = searchQuery.toLowerCase();
		return privateMessages.inbox.filter(
			(message) =>
				message.subject.toLowerCase().includes(query) ||
				message.sender_name.toLowerCase().includes(query) ||
				message.plain_text?.toLowerCase().includes(query)
		);
	});

	// Format date
	function formatDate(dateStr: string): string {
		const date = new Date(dateStr);
		const now = new Date();
		const diff = now.getTime() - date.getTime();
		const days = Math.floor(diff / (1000 * 60 * 60 * 24));

		if (days === 0) {
			return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
		} else if (days === 1) {
			return 'Hier';
		} else if (days < 7) {
			return `Il y a ${days} jours`;
		} else {
			return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
		}
	}

	// Navigate to message
	function viewMessage(messageId: string) {
		goto(`/messages/${messageId}`).then(() => {});
	}

	// Toggle star
	async function toggleStar(messageId: string, event: MouseEvent) {
		event.stopPropagation();
		await privateMessages.toggleStar(messageId);
	}

	// Toggle read/unread
	async function toggleRead(messageId: string, event: MouseEvent) {
		event.stopPropagation();
		await privateMessages.toggleRead(messageId);
	}

	// Unarchive message (restore to inbox)
	async function unarchiveMessage(messageId: string, event: MouseEvent) {
		event.stopPropagation();
		await privateMessages.updateStatus(messageId, 'inbox');
	}

	// Delete message
	async function deleteMessage(messageId: string, event: MouseEvent) {
		event.stopPropagation();
		if (confirm('Êtes-vous sûr de vouloir supprimer ce message ?')) {
			await privateMessages.deleteMessage(messageId);
		}
	}

	// Handle avatar load error
	function handleAvatarError(messageId: string) {
		failedAvatars.add(messageId);
		failedAvatars = failedAvatars; // Trigger reactivity
	}
</script>

<div class="flex h-full flex-col">
	<!-- Header -->
	<div class="border-b border-border bg-card p-4">
		<div class="flex items-center justify-between">
			<div>
				<h1 class="text-2xl font-bold text-foreground">Messages archivés</h1>
				<p class="text-sm text-muted-foreground">
					{filteredMessages().length} message{filteredMessages().length !== 1 ? 's' : ''}
					{#if searchQuery.trim()}
						<span class="text-muted-foreground">
							sur {privateMessages.inbox.length}
						</span>
					{/if}
				</p>
			</div>
			<Button onclick={() => goto('/messages/compose').then(() => {})}>
				<PencilLine class="mr-2 h-4 w-4" />
				Nouveau message
			</Button>
		</div>

		<!-- Search bar -->
		<div class="relative mt-4">
			<Search class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
			<Input
				type="text"
				placeholder="Rechercher par expéditeur, sujet ou contenu..."
				bind:value={searchQuery}
				class="pr-10 pl-10"
			/>
			{#if searchQuery}
				<button
					onclick={() => (searchQuery = '')}
					class="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
				>
					<X class="h-4 w-4" />
				</button>
			{/if}
		</div>

		<!-- Keyboard shortcuts hint -->
		{#if filteredMessages().length > 0}
			<p class="mt-2 text-xs text-muted-foreground">
				<kbd class="rounded border border-border bg-muted px-1 py-0.5">↑↓</kbd> pour naviguer •
				<kbd class="rounded border border-border bg-muted px-1 py-0.5">Enter</kbd> pour ouvrir •
				<kbd class="rounded border border-border bg-muted px-1 py-0.5">Esc</kbd> pour désélectionner
			</p>
		{/if}
	</div>

	<!-- Messages list -->
	<div class="flex-1 overflow-y-auto">
		{#if privateMessages.isLoading}
			<div class="flex h-full items-center justify-center">
				<Loader2 class="h-8 w-8 animate-spin text-muted-foreground" />
			</div>
		{:else if filteredMessages().length === 0}
			<div class="flex h-full flex-col items-center justify-center text-center">
				<Archive class="mb-4 h-16 w-16 text-muted-foreground" />
				{#if searchQuery.trim()}
					<h3 class="text-lg font-semibold text-foreground">Aucun résultat</h3>
					<p class="mt-2 text-sm text-muted-foreground">
						Aucun message ne correspond à votre recherche
					</p>
					<Button onclick={() => (searchQuery = '')} variant="outline" class="mt-4">
						Effacer la recherche
					</Button>
				{:else}
					<h3 class="text-lg font-semibold text-foreground">Aucun message archivé</h3>
					<p class="mt-2 text-sm text-muted-foreground">Vous n'avez aucun message archivé</p>
				{/if}
			</div>
		{:else}
			<div class="divide-y divide-border">
				{#each filteredMessages() as message, index (message.id)}
					<button
						onclick={() => viewMessage(message.message_id)}
						class="group flex w-full items-start gap-4 p-4 text-left transition-colors hover:bg-muted/50"
						class:bg-muted={!message.read_at}
						class:ring-2={selectedIndex === index}
						class:ring-primary={selectedIndex === index}
						class:ring-inset={selectedIndex === index}
					>
						<!-- Avatar -->
						<div class="flex-shrink-0">
							{#if message.sender_avatar_url && !failedAvatars.has(message.message_id)}
								<img
									src={message.sender_avatar_url}
									alt={message.sender_name}
									class="h-10 w-10 rounded-full object-cover"
									onerror={() => handleAvatarError(message.message_id)}
								/>
							{:else}
								<div
									class="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground"
								>
									{message.sender_name?.charAt(0)?.toUpperCase() || '?'}
								</div>
							{/if}
						</div>

						<!-- Content -->
						<div class="min-w-0 flex-1">
							<div class="flex items-start justify-between gap-2">
								<div class="min-w-0 flex-1">
									<div class="flex items-center gap-2">
										<span class="font-semibold text-foreground" class:font-bold={!message.read_at}>
											{message.sender_name}
										</span>
										{#if message.is_group_message}
											<span class="rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
												Groupe
											</span>
										{/if}
										{#if !message.read_at}
											<MailOpen class="h-4 w-4 text-primary" />
										{/if}
									</div>
									<h3
										class="truncate text-sm font-medium text-foreground"
										class:font-semibold={!message.read_at}
									>
										{message.subject}
									</h3>
									<p class="mt-1 truncate text-sm text-muted-foreground">
										{message.plain_text}
									</p>
									<div class="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
										<span>{formatDate(message.sent_at)}</span>
										{#if message.has_attachments}
											<span>• 📎 {message.attachment_count}</span>
										{/if}
										{#if message.thread_root_id || message.parent_message_id}
											<span class="flex items-center gap-1">
												• <MessageSquare class="h-3 w-3" /> Conversation
											</span>
										{/if}
										{#if message.is_group_message}
											<span>• {message.recipient_count} destinataires</span>
										{/if}
									</div>
								</div>

								<!-- Actions -->
								<div
									class="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100"
								>
									<Button
										variant="ghost"
										size="sm"
										onclick={(e) => toggleRead(message.message_id, e)}
										class="h-8 w-8 p-0"
										title={message.read_at ? 'Marquer comme non lu' : 'Marquer comme lu'}
									>
										{#if message.read_at}
											<EyeOff class="h-4 w-4" />
										{:else}
											<Eye class="h-4 w-4" />
										{/if}
									</Button>
									<Button
										variant="ghost"
										size="sm"
										onclick={(e) => toggleStar(message.message_id, e)}
										class="h-8 w-8 p-0"
									>
										<Star
											class={cn('h-4 w-4', message.is_starred && 'fill-yellow-500 text-yellow-500')}
										/>
									</Button>
									<Button
										variant="ghost"
										size="sm"
										onclick={(e) => unarchiveMessage(message.message_id, e)}
										class="h-8 w-8 p-0"
										title="Désarchiver"
									>
										<ArchiveRestore class="h-4 w-4" />
									</Button>
									<Button
										variant="ghost"
										size="sm"
										onclick={(e) => deleteMessage(message.message_id, e)}
										class="h-8 w-8 p-0"
									>
										<Trash2 class="h-4 w-4" />
									</Button>
								</div>
							</div>
						</div>
					</button>
				{/each}
			</div>
		{/if}
	</div>
</div>

<style>
	button:focus-visible {
		outline: 2px solid hsl(var(--primary));
		outline-offset: 2px;
	}
</style>
