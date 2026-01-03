<!--
	TradeChatDrawer Component
	=========================
	Mobile drawer for in-trade chat messaging.
	Uses Shadcn Sheet component for drawer behavior.

	Features:
	- Slides up from bottom
	- Message list with auto-scroll
	- Simple text input
	- Close button

	Props:
	- open: boolean
	- messages: TradeChatMessage[]
	- currentUserId: string
	- onSend: (message: string) => void
	- onClose: () => void
-->
<script lang="ts">
	import * as Sheet from '$lib/components/ui/sheet';
	import { Button } from '$lib/components/ui/button';
	import { MessageCircle, Send } from 'lucide-svelte';
	import type { TradeChatMessage } from '$lib/stores/tradeRealtime.svelte';

	interface Props {
		open: boolean;
		messages: TradeChatMessage[];
		currentUserId: string;
		onSend: (message: string) => void;
		onClose: () => void;
	}

	let { open, messages, currentUserId, onSend, onClose }: Props = $props();

	// Local state for input
	let messageInput = $state('');
	let messagesContainer = $state<HTMLDivElement | null>(null);

	// Auto-scroll to bottom when messages change
	$effect(() => {
		if (messages.length > 0 && messagesContainer) {
			// Small delay to ensure DOM is updated
			setTimeout(() => {
				if (messagesContainer) {
					messagesContainer.scrollTop = messagesContainer.scrollHeight;
				}
			}, 50);
		}
	});

	/**
	 * Handle message submission
	 */
	function handleSubmit(event: Event): void {
		event.preventDefault();
		const trimmed = messageInput.trim();
		if (trimmed) {
			onSend(trimmed);
			messageInput = '';
		}
	}

	/**
	 * Format timestamp
	 */
	function formatTime(timestamp: string): string {
		return new Date(timestamp).toLocaleTimeString('fr-FR', {
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	/**
	 * Check if message is from current user
	 */
	function isOwnMessage(message: TradeChatMessage): boolean {
		return message.senderId === currentUserId;
	}
</script>

<Sheet.Root bind:open onOpenChange={(value) => !value && onClose()}>
	<Sheet.Content side="bottom" class="flex h-[70vh] flex-col">
		<Sheet.Header>
			<Sheet.Title class="flex items-center gap-2">
				<MessageCircle class="h-5 w-5" />
				Chat
			</Sheet.Title>
			<Sheet.Description>Discutez avec votre partenaire d'echange</Sheet.Description>
		</Sheet.Header>

		<!-- Messages -->
		<div bind:this={messagesContainer} class="flex-1 overflow-auto p-4">
			{#if messages.length === 0}
				<p class="py-8 text-center text-sm text-muted-foreground">
					Aucun message. Commencez la discussion !
				</p>
			{:else}
				<div class="space-y-3">
					{#each messages as message (message.id)}
						{@const isOwn = isOwnMessage(message)}
						<div class="flex {isOwn ? 'justify-end' : 'justify-start'}">
							<div
								class="max-w-[80%] rounded-lg px-3 py-2 {isOwn
									? 'bg-primary text-primary-foreground'
									: 'bg-muted text-foreground'}"
							>
								<p class="text-sm">{message.message}</p>
								<p class="mt-1 text-xs opacity-70">
									{formatTime(message.createdAt)}
								</p>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Input -->
		<Sheet.Footer class="border-t p-4">
			<form onsubmit={handleSubmit} class="flex w-full gap-2">
				<input
					type="text"
					bind:value={messageInput}
					placeholder="Ecrivez un message..."
					maxlength="500"
					class="flex-1 rounded-md border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
				/>
				<Button type="submit" size="sm" disabled={!messageInput.trim()}>
					<Send class="h-4 w-4" />
				</Button>
			</form>
		</Sheet.Footer>
	</Sheet.Content>
</Sheet.Root>
