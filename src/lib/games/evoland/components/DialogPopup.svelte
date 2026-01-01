<script lang="ts">
	/**
	 * Evoland Dialog Popup
	 *
	 * Displays chest unlocks, NPC dialogs, and game messages.
	 * Styled to match the retro pixel-art aesthetic with typewriter effect.
	 */

	import { onMount } from 'svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';

	// Props
	interface Props {
		/** Dialog title */
		title: string;
		/** Dialog message content */
		message: string;
		/** Optional icon to display */
		icon?: string;
		/** Called when dialog is closed */
		onClose: () => void;
	}

	let { title, message, icon, onClose }: Props = $props();

	// Typewriter effect state
	let displayedMessage = $state('');
	let isTyping = $state(true);
	let typewriterIndex = $state(0);

	// Typewriter speed (ms per character)
	const TYPEWRITER_SPEED = 30;

	onMount(() => {
		const timer = setInterval(() => {
			if (typewriterIndex < message.length) {
				displayedMessage = message.slice(0, typewriterIndex + 1);
				typewriterIndex++;
			} else {
				isTyping = false;
				clearInterval(timer);
			}
		}, TYPEWRITER_SPEED);

		return () => clearInterval(timer);
	});

	// Skip typewriter animation
	function skipAnimation() {
		displayedMessage = message;
		typewriterIndex = message.length;
		isTyping = false;
	}

	// Handle continue
	function handleContinue() {
		if (isTyping) {
			skipAnimation();
		} else {
			onClose();
		}
	}

	// Handle keydown
	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ' ' || event.key === 'Escape') {
			event.preventDefault();
			handleContinue();
		}
	}
</script>

<Dialog.Root open={true} onOpenChange={(open) => open === false && onClose()}>
	<Dialog.Content
		class="dialog-popup"
		onkeydown={handleKeyDown}
		aria-describedby="dialog-message"
		aria-modal="true"
	>
		<Dialog.Header>
			{#if icon}
				<div class="dialog-icon" aria-hidden="true">{icon}</div>
			{/if}
			<Dialog.Title class="dialog-title">{title}</Dialog.Title>
		</Dialog.Header>

		<div class="dialog-body" id="dialog-message">
			<p class="dialog-message">
				{displayedMessage}
				{#if isTyping}
					<span class="cursor" aria-hidden="true">▌</span>
				{/if}
			</p>
		</div>

		<Dialog.Footer>
			<Button variant="outline" class="dialog-button" onclick={handleContinue}>
				{isTyping ? 'Skip' : 'Continue'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<style>
	:global(.dialog-popup) {
		font-family: 'Press Start 2P', monospace;
		background-color: #1a1a2e !important;
		border: 4px solid #eee !important;
		border-radius: 0 !important;
		max-width: 400px !important;
	}

	:global(.dialog-title) {
		font-size: 14px !important;
		color: #ffc107 !important;
		text-align: center !important;
	}

	.dialog-icon {
		font-size: 48px;
		text-align: center;
		margin-bottom: 8px;
	}

	.dialog-body {
		padding: 16px 0;
	}

	.dialog-message {
		font-size: 10px;
		line-height: 1.8;
		color: #fff;
		text-align: left;
		min-height: 60px;
	}

	.cursor {
		animation: blink 0.5s infinite;
	}

	@keyframes blink {
		0%,
		50% {
			opacity: 1;
		}
		51%,
		100% {
			opacity: 0;
		}
	}

	:global(.dialog-button) {
		font-family: 'Press Start 2P', monospace !important;
		font-size: 10px !important;
		border-radius: 0 !important;
		width: 100% !important;
	}
</style>
