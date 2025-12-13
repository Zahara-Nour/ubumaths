<!--
	ChatComposer Component
	=======================

	Message composition area with:
	- RichTextEditor integration
	- File attachment support (teachers only)
	- Typing indicator emission
	- Send button

	Props:
		- conversationId: string
		- isTeacher: boolean
		- onSend: (content: any, attachments: File[]) => Promise<void>
		- onTyping: (isTyping: boolean) => void

	Features:
		- Debounced typing indicators
		- File preview before upload
		- Disabled state while sending
-->
<script lang="ts">
	import RichTextEditor from '$lib/components/rich-text/RichTextEditor.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Paperclip, X } from 'lucide-svelte';
	import { toaster } from '$lib/stores/toaster.svelte';

	// Component Props
	interface Props {
		conversationId: string;
		isTeacher?: boolean;
		disabled?: boolean;
		onSend: (content: unknown, attachments: File[]) => Promise<void>;
		onTyping: (isTyping: boolean) => void;
	}

	let {
		conversationId: _conversationId,
		isTeacher = false,
		disabled = false,
		onSend,
		onTyping
	}: Props = $props(); // conversationId for future features

	// Component State
	let attachments = $state<File[]>([]);
	let isSending = $state(false);
	let fileInput = $state<HTMLInputElement | null>(null);
	let typingTimeout = $state<number | null>(null);

	/**
	 * Handle file selection
	 */
	function handleFileSelect(event: Event): void {
		const input = event.target as HTMLInputElement;
		if (!input.files || input.files.length === 0) return;

		const newFiles = Array.from(input.files);

		// Validate file sizes (1MB limit)
		for (const file of newFiles) {
			if (file.size > 1048576) {
				// 1MB in bytes
				toaster.error(`Le fichier "${file.name}" dépasse la limite de 1MB`);
				return;
			}
		}

		// Add files to attachments
		attachments = [...attachments, ...newFiles];

		// Clear input
		if (input) {
			input.value = '';
		}
	}

	/**
	 * Remove attachment
	 */
	function removeAttachment(index: number): void {
		attachments = attachments.filter((_, i) => i !== index);
	}

	/**
	 * Format file size
	 */
	function formatFileSize(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1048576) return `${Math.round(bytes / 1024)} KB`;
		return `${(bytes / 1048576).toFixed(2)} MB`;
	}

	/**
	 * Handle message send
	 */
	async function handleSend(content: unknown): Promise<void> {
		// Prevent sending if disabled or already sending
		if (disabled || isSending) return;

		// Stop typing indicator
		onTyping(false);
		if (typingTimeout) {
			clearTimeout(typingTimeout);
			typingTimeout = null;
		}

		isSending = true;

		try {
			await onSend(content, attachments);

			// Clear attachments after successful send
			attachments = [];
		} catch (error) {
			console.error('Error sending message:', error);
			toaster.error("Erreur lors de l'envoi du message");
		} finally {
			isSending = false;
		}
	}

	/**
	 * Handle typing indicator (debounced)
	 */
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	function handleTypingIndicator(): void {
		// For future typing indicators
		// Send typing = true
		onTyping(true);

		// Clear existing timeout
		if (typingTimeout) {
			clearTimeout(typingTimeout);
		}

		// Set typing = false after 3 seconds of inactivity
		typingTimeout = setTimeout(() => {
			onTyping(false);
		}, 3000) as unknown as number;
	}

	/**
	 * Cleanup on unmount
	 */
	$effect(() => {
		return () => {
			if (typingTimeout) {
				clearTimeout(typingTimeout);
			}
		};
	});
</script>

<div class="border-t border-border bg-card p-4 {disabled ? 'pointer-events-none opacity-50' : ''}">
	<!-- File Attachments Preview -->
	{#if attachments.length > 0}
		<div class="mb-3 space-y-2">
			{#each attachments as file, index (index)}
				<div class="flex items-center justify-between rounded-lg border border-border bg-muted p-2">
					<div class="flex items-center gap-2 overflow-hidden">
						<Paperclip class="h-4 w-4 flex-shrink-0 text-muted-foreground" />
						<span class="truncate text-sm">{file.name}</span>
						<span class="flex-shrink-0 text-xs text-muted-foreground">
							({formatFileSize(file.size)})
						</span>
					</div>
					<Button
						variant="ghost"
						size="sm"
						onclick={() => removeAttachment(index)}
						class="h-6 w-6 p-0"
					>
						<X class="h-4 w-4" />
					</Button>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Editor Container -->
	<div class="flex items-end gap-2">
		<!-- Attachment Button (Teachers Only) -->
		{#if isTeacher}
			<div>
				<input
					type="file"
					bind:this={fileInput}
					onchange={handleFileSelect}
					class="hidden"
					multiple
					accept="image/*,.pdf,.doc,.docx,.txt"
				/>
				<Button
					variant="ghost"
					size="sm"
					onclick={() => fileInput?.click()}
					disabled={isSending}
					title="Joindre un fichier (1MB max)"
				>
					<Paperclip class="h-5 w-5" />
				</Button>
			</div>
		{/if}

		<!-- Rich Text Editor -->
		<div class="flex-1">
			<RichTextEditor mode="chat" onSend={handleSend} />
		</div>
	</div>

	<!-- Disabled Overlay While Sending -->
	{#if isSending}
		<div class="absolute inset-0 flex items-center justify-center bg-background/50">
			<p class="text-sm text-muted-foreground">Envoi en cours...</p>
		</div>
	{/if}
</div>
