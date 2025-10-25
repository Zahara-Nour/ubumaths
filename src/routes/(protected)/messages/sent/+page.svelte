<script lang="ts">
	import { privateMessages } from '$lib/stores/privateMessages.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Loader2, Send, PencilLine, MessageSquare, Search, X } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	let searchQuery = $state('');

	// Load sent messages on mount
	onMount(() => {
		privateMessages.loadSent();
	});

	// Filter messages by search query
	const filteredMessages = $derived(() => {
		if (!searchQuery.trim()) return privateMessages.sent;

		const query = searchQuery.toLowerCase();
		return privateMessages.sent.filter((message) => {
			const recipients =
				message.recipients
					?.map((r) => r.name)
					.join(' ')
					.toLowerCase() || '';
			return (
				message.subject.toLowerCase().includes(query) ||
				recipients.includes(query) ||
				message.plain_text?.toLowerCase().includes(query)
			);
		});
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
</script>

<div class="flex h-full flex-col">
	<!-- Header -->
	<div class="border-b border-border bg-card p-4">
		<div class="flex items-center justify-between">
			<div>
				<h1 class="text-2xl font-bold text-foreground">Messages envoyés</h1>
				<p class="text-sm text-muted-foreground">
					{filteredMessages().length} message{filteredMessages().length !== 1 ? 's' : ''}
					{#if searchQuery.trim()}
						<span class="text-muted-foreground">
							sur {privateMessages.sent.length}
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
				placeholder="Rechercher par destinataire, sujet ou contenu..."
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
	</div>

	<!-- Messages list -->
	<div class="flex-1 overflow-y-auto">
		{#if privateMessages.isLoading}
			<div class="flex h-full items-center justify-center">
				<Loader2 class="h-8 w-8 animate-spin text-muted-foreground" />
			</div>
		{:else if filteredMessages().length === 0}
			<div class="flex h-full flex-col items-center justify-center text-center">
				<Send class="mb-4 h-16 w-16 text-muted-foreground" />
				{#if searchQuery.trim()}
					<h3 class="text-lg font-semibold text-foreground">Aucun résultat</h3>
					<p class="mt-2 text-sm text-muted-foreground">
						Aucun message ne correspond à votre recherche
					</p>
					<Button onclick={() => (searchQuery = '')} variant="outline" class="mt-4">
						Effacer la recherche
					</Button>
				{:else}
					<h3 class="text-lg font-semibold text-foreground">Aucun message envoyé</h3>
					<p class="mt-2 text-sm text-muted-foreground">
						Vous n'avez pas encore envoyé de messages
					</p>
					<Button onclick={() => goto('/messages/compose').then(() => {})} class="mt-4">
						<PencilLine class="mr-2 h-4 w-4" />
						Envoyer votre premier message
					</Button>
				{/if}
			</div>
		{:else}
			<div class="divide-y divide-border">
				{#each filteredMessages() as message (message.id)}
					<button
						onclick={() => viewMessage(message.message_id)}
						class="group flex w-full items-start gap-4 p-4 text-left transition-colors hover:bg-muted/50"
					>
						<!-- Icon -->
						<div class="flex-shrink-0">
							<div
								class="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary"
							>
								<Send class="h-5 w-5" />
							</div>
						</div>

						<!-- Content -->
						<div class="min-w-0 flex-1">
							<div class="flex items-start justify-between gap-2">
								<div class="min-w-0 flex-1">
									<div class="flex items-center gap-2">
										<span class="text-sm text-muted-foreground">À :</span>
										{#if message.is_group_message}
											<span class="font-medium text-foreground">
												Message de groupe ({message.recipient_count} destinataires)
											</span>
											<span class="rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
												Groupe
											</span>
										{:else}
											<span class="font-medium text-foreground">
												{message.recipients?.map((r) => r.name).join(', ') || 'Destinataires'}
											</span>
										{/if}
									</div>
									<h3 class="mt-1 truncate text-sm font-semibold text-foreground">
										{message.subject}
									</h3>
									<p class="mt-1 truncate text-sm text-muted-foreground">
										{message.plain_text}
									</p>
									<div class="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
										<span>{formatDate(message.sent_at)}</span>
										{#if message.has_attachments}
											<span>• 📎</span>
										{/if}
										{#if message.thread_root_id || message.parent_message_id}
											<span class="flex items-center gap-1">
												• <MessageSquare class="h-3 w-3" /> Conversation
											</span>
										{/if}
									</div>
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
