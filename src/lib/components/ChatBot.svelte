<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Avatar from '$lib/components/ui/avatar';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { personalities, type PersonalityKey } from '$lib/config/personalities';
	import { Trash2, Send, User } from 'lucide-svelte';
	import pereUbuImage from '$lib/assets/images/avatar-pereubu.png';

	interface Message {
		role: 'user' | 'assistant';
		content: string;
		timestamp: number;
		avatarRotation?: number;
		isTyping?: boolean;
	}

	interface Props {
		personalityKey?: PersonalityKey;
	}

	let { personalityKey = 'pereUbu' }: Props = $props();

	// State with Svelte 5 runes
	let messages = $state<Message[]>([]);
	let inputValue = $state('');
	let isLoading = $state(false);
	let loadingRotation = $state(0);
	let typingMessageIndex = $state<number | null>(null);
	let displayedText = $state<Record<number, string>>({});

	// Derived value - automatically updated
	const personality = $derived(personalities[personalityKey]);

	// Generate random rotation for avatar (-30 to 30 degrees)
	function generateRandomRotation(): number {
		return Math.floor(Math.random() * 61) - 30; // -30 to 30 degrees
	}

	// Start typing animation for a message
	function startTypingAnimation(messageIndex: number, fullText: string) {
		typingMessageIndex = messageIndex;
		displayedText[messageIndex] = '';

		let currentIndex = 0;
		const typingSpeed = 25; // 25ms per character (medium speed)

		const typeNextChar = () => {
			if (currentIndex < fullText.length) {
				displayedText[messageIndex] = fullText.slice(0, currentIndex + 1);
				currentIndex++;

				// Auto-scroll during typing if container is overflowing
				if (messagesContainer) {
					const isNearBottom = messagesContainer.scrollHeight - messagesContainer.scrollTop - messagesContainer.clientHeight < 100;
					if (isNearBottom) {
						messagesContainer.scrollTop = messagesContainer.scrollHeight;
					}
				}

				setTimeout(typeNextChar, typingSpeed);
			} else {
				// Typing complete
				typingMessageIndex = null;
				messages[messageIndex].isTyping = false;

				// Final scroll to ensure everything is visible
				if (messagesContainer) {
					messagesContainer.scrollTop = messagesContainer.scrollHeight;
				}
			}
		};

		// Scroll once when typing starts
		if (messagesContainer) {
			setTimeout(() => {
				messagesContainer.scrollTop = messagesContainer.scrollHeight;
			}, 100);
		}

		typeNextChar();
	}

	// Skip typing animation and show full text immediately
	function skipTypingAnimation(messageIndex: number) {
		if (typingMessageIndex === messageIndex) {
			const message = messages[messageIndex];
			displayedText[messageIndex] = message.content;
			typingMessageIndex = null;
			message.isTyping = false;

			// Scroll to bottom after skipping
			if (messagesContainer) {
				setTimeout(() => {
					messagesContainer.scrollTop = messagesContainer.scrollHeight;
				}, 50);
			}
		}
	}

	// Get displayed text for a message
	function getDisplayedText(messageIndex: number, message: Message): string {
		if (message.isTyping && messageIndex in displayedText) {
			return displayedText[messageIndex];
		}
		return message.content;
	}

	// Check if message is currently typing
	function isMessageTyping(messageIndex: number): boolean {
		return typingMessageIndex === messageIndex;
	}

	// Refs for DOM elements
	let messagesContainer: HTMLDivElement;
	let textareaElement: HTMLTextAreaElement;

	// Load history from localStorage on mount
	$effect(() => {
		const saved = localStorage.getItem('chatHistory');
		if (saved) {
			try {
				messages = JSON.parse(saved);
			} catch (e) {
				console.error('Error loading chat history:', e);
			}
		}
	});

	// Auto-save history to localStorage
	$effect(() => {
		if (messages.length > 0) {
			localStorage.setItem('chatHistory', JSON.stringify(messages));
		}
	});

	// Auto-scroll to bottom when messages change
	$effect(() => {
		if (messagesContainer && messages.length > 0) {
			setTimeout(() => {
				messagesContainer.scrollTop = messagesContainer.scrollHeight;
			}, 100);
		}
	});

	// Animate loading avatar rotation
	$effect(() => {
		let animationFrame: number;
		if (isLoading) {
			const animate = () => {
				loadingRotation = Math.sin(Date.now() / 300) * 20; // Oscillate between -20 and 20 degrees
				animationFrame = requestAnimationFrame(animate);
			};
			animate();
			return () => cancelAnimationFrame(animationFrame);
		}
	});

	async function sendMessage() {
		if (!inputValue.trim() || isLoading) return;

		// Add user message
		const userMessage: Message = {
			role: 'user',
			content: inputValue,
			timestamp: Date.now()
		};

		messages = [...messages, userMessage];
		inputValue = '';
		isLoading = true;

		// Reset textarea height after clearing input
		setTimeout(() => {
			if (textareaElement) {
				textareaElement.style.height = 'auto';
			}
		}, 0);

		try {
			// Call API with personality system prompt
			const response = await fetch('/api/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					messages: [
						{ role: 'system', content: personality.systemPrompt },
						...messages.slice(-10) // Keep only last 10 messages for context
					]
				})
			});

			if (!response.ok) {
				throw new Error(`API Error: ${response.status}`);
			}

			const data = await response.json();

			// Add bot response with random avatar rotation and typing animation
			const newMessageIndex = messages.length;
			messages = [
				...messages,
				{
					role: 'assistant',
					content: data.message,
					timestamp: Date.now(),
					avatarRotation: generateRandomRotation(),
					isTyping: true
				}
			];

			// Start typing animation for the new message
			startTypingAnimation(newMessageIndex, data.message);
		} catch (error) {
			console.error('Error:', error);
			toaster.error('Cornegidouille ! Une erreur est survenue. Veuillez réessayer.');

			// Add error message with random avatar rotation and typing animation
			const errorMessage =
				'Cornegidouille ! Ma machine à penser pataphysique a rencontré un problème. Veuillez réessayer dans un instant, de par ma chandelle verte !';
			const errorMessageIndex = messages.length;
			messages = [
				...messages,
				{
					role: 'assistant',
					content: errorMessage,
					timestamp: Date.now(),
					avatarRotation: generateRandomRotation(),
					isTyping: true
				}
			];

			// Start typing animation for error message
			startTypingAnimation(errorMessageIndex, errorMessage);
		} finally {
			isLoading = false;
		}
	}

	function clearHistory() {
		messages = [];
		localStorage.removeItem('chatHistory');
		toaster.success('Historique effacé !');
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			sendMessage();
		}
	}

	// Auto-resize textarea
	function handleInput(e: Event) {
		const target = e.target as HTMLTextAreaElement;
		target.style.height = 'auto';
		target.style.height = target.scrollHeight + 'px';
	}
</script>

<div class="flex h-full flex-col rounded-lg border border-border bg-card shadow-lg">
	<!-- Header -->
	<div
		class="flex items-center gap-3 rounded-t-lg border-b border-border p-4 text-primary-foreground"
	>
		<div class="flex-1">
			<h2 class="text-xl font-semibold">{personality.name}</h2>
			<p class="text-sm opacity-90">{personality.description}</p>
		</div>
		<Button
			variant="ghost"
			size="icon"
			onclick={clearHistory}
			disabled={messages.length === 0}
			class="text-primary-foreground hover:bg-white/20"
			title="Effacer l'historique"
		>
			<Trash2 class="h-5 w-5" />
		</Button>
	</div>

	<!-- Messages Container -->
	<div
		bind:this={messagesContainer}
		class="flex-1 space-y-4 overflow-y-auto bg-muted/30 p-4"
		style="max-height: calc(100vh - 280px); min-height: 400px;"
	>
		{#if messages.length === 0}
			<div class="flex h-full items-center justify-center text-center">
				<div class="space-y-4">
					<div class="text-6xl">{personality.avatar}</div>
					<div class="text-muted-foreground">
						<p class="text-lg font-medium">
							Cornegidouille ! Bienvenue dans ma salle de classe pataphysique !
						</p>
						<p class="mt-1 text-sm">Posez-moi vos questions mathématiques... si vous l'osez !</p>
					</div>
				</div>
			</div>
		{/if}

		{#each messages as message, index (message.timestamp)}
			<div class="flex gap-3 {message.role === 'user' ? 'justify-end' : 'justify-start'}">
				{#if message.role === 'assistant'}
					<!-- Père Ubu Avatar (left side) with random rotation -->
					<Avatar.Root
						class="h-12 w-12 flex-shrink-0 transition-transform duration-300"
						style="transform: rotate({message.avatarRotation ?? 0}deg);"
					>
						<Avatar.Image src={pereUbuImage} alt="Père Ubu" />
						<Avatar.Fallback class="text-lg">{personality.avatar}</Avatar.Fallback>
					</Avatar.Root>
				{/if}

				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<div
					class="max-w-[80%] rounded-lg p-3 shadow-sm {message.role === 'user'
						? 'bg-primary text-primary-foreground'
						: 'border border-border bg-card'} {message.role === 'assistant' && message.isTyping
						? 'cursor-pointer transition-colors hover:bg-muted/50'
						: ''}"
					onclick={() => message.role === 'assistant' && skipTypingAnimation(index)}
				>
					<div class="text-sm leading-relaxed break-words whitespace-pre-wrap">
						{getDisplayedText(index, message)}{#if isMessageTyping(index)}<span
								class="ml-0.5 inline-block h-[1em] w-[2px] animate-pulse bg-current"
							></span>{/if}
					</div>
					<div
						class="mt-2 text-right text-xs {message.role === 'user'
							? 'text-primary-foreground/70'
							: 'text-muted-foreground'}"
					>
						{new Date(message.timestamp).toLocaleTimeString('fr-FR', {
							hour: '2-digit',
							minute: '2-digit'
						})}
					</div>
				</div>

				{#if message.role === 'user'}
					<!-- User Avatar (right side) -->
					<Avatar.Root class="h-12 w-12 flex-shrink-0">
						<Avatar.Image src="" alt="User" />
						<Avatar.Fallback class="bg-muted">
							<User class="h-6 w-6 text-muted-foreground" />
						</Avatar.Fallback>
					</Avatar.Root>
				{/if}
			</div>
		{/each}

		{#if isLoading}
			<div class="flex justify-start gap-3">
				<!-- Père Ubu Avatar for loading state with wobble animation -->
				<Avatar.Root
					class="h-12 w-12 flex-shrink-0 transition-transform"
					style="transform: rotate({loadingRotation}deg);"
				>
					<Avatar.Image src={pereUbuImage} alt="Père Ubu" />
					<Avatar.Fallback class="text-lg">{personality.avatar}</Avatar.Fallback>
				</Avatar.Root>

				<div class="max-w-[80%] rounded-lg border border-border bg-card p-3 shadow-sm">
					<div class="flex items-center gap-2">
						<div class="flex gap-1">
							<span class="h-2 w-2 animate-bounce rounded-full bg-muted-foreground"></span>
							<span
								class="h-2 w-2 animate-bounce rounded-full bg-muted-foreground"
								style="animation-delay: 0.2s"
							></span>
							<span
								class="h-2 w-2 animate-bounce rounded-full bg-muted-foreground"
								style="animation-delay: 0.4s"
							></span>
						</div>
						<span class="text-sm text-muted-foreground">Le Père Ubu réfléchit...</span>
					</div>
				</div>
			</div>
		{/if}
	</div>

	<!-- Input Area -->
	<div class="border-t border-border bg-card p-4">
		<div class="flex gap-2">
			<Textarea
				bind:this={textareaElement}
				bind:value={inputValue}
				placeholder="..."
				disabled={isLoading}
				onkeydown={handleKeydown}
				oninput={handleInput}
				class="max-h-[200px] min-h-[60px] resize-none"
				rows={1}
			/>
			<Button
				onclick={sendMessage}
				disabled={isLoading || !inputValue.trim()}
				size="icon"
				class="h-[60px] w-[60px]"
			>
				<Send class="h-5 w-5" />
			</Button>
		</div>
	</div>
</div>
