<!--
	TutorChat Component
	===================

	AI-powered math tutor chat interface with pedagogical guidance.
	Adapted from ChatBot but with tutor-specific features.

	FEATURES:
	- Context-aware tutoring based on exercise
	- Progressive help levels (0-7)
	- Quota tracking (per exercise, hour, day)
	- Cheat detection and refusal
	- Grade-level adaptation
	- Markdown + LaTeX rendering
	- Typing animation for responses

	PROPS:
	- exerciseContext?: Exercise context for targeted help
	- initialHelpLevel?: Starting help level (default: 0)

	USAGE:
	```svelte
	<TutorChat
	  exerciseContext={{
	    exerciseId: '123',
	    statement: 'Calculer 2 + 3',
	    topic: 'addition'
	  }}
	/>
	```

	@component
-->

<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Avatar from '$lib/components/ui/avatar';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { Send, User, Trash2, HelpCircle } from 'lucide-svelte';
	import pereUbuImage from '$lib/assets/images/avatar-pereubu.png';
	import { MarkdownRenderer } from '$lib/components/markdown';
	import { convertLegacyLatexToMarkdown } from '$lib/utils/latex-syntax-adapter';
	import TutorUsageIndicator from './TutorUsageIndicator.svelte';

	interface ExerciseContext {
		exerciseId?: string;
		statement: string;
		topic?: string;
		domain?: string;
		level?: number;
		studentGrade?: string;
		attempts?: Array<{ isCorrect: boolean; answer?: string }>;
	}

	interface Props {
		exerciseContext?: ExerciseContext;
		initialHelpLevel?: number;
	}

	let { exerciseContext, initialHelpLevel = 0 }: Props = $props();

	// Message types
	interface TextContent {
		type: 'text';
		text: string;
	}

	type MessageContent = string | Array<TextContent>;

	interface Message {
		role: 'user' | 'assistant';
		content: MessageContent;
		timestamp: number;
		avatarRotation?: number;
		isTyping?: boolean;
	}

	// State
	let messages = $state<Message[]>([]);
	let inputValue = $state('');
	let isLoading = $state(false);
	let loadingRotation = $state(0);
	let typingMessageIndex = $state<number | null>(null);
	let displayedText = $state<Record<number, string>>({});
	let helpLevel = $state(initialHelpLevel);
	let remaining = $state({ exercise: 15, hour: 30, day: 100 });

	// Refs
	let messagesContainer: HTMLDivElement | undefined;
	let textareaElement: HTMLTextAreaElement | undefined;

	// Generate random rotation for avatar
	function generateRandomRotation(): number {
		return Math.floor(Math.random() * 61) - 30; // -30 to 30 degrees
	}

	// Get text content from message
	function getMessageText(content: MessageContent): string {
		if (typeof content === 'string') return content;
		const textItem = content.find((item) => item.type === 'text') as TextContent | undefined;
		return textItem?.text || '';
	}

	// Start typing animation
	function startTypingAnimation(messageIndex: number, fullText: string) {
		typingMessageIndex = messageIndex;
		displayedText[messageIndex] = '';

		let currentIndex = 0;
		const typingSpeed = 15; // 15ms per character

		const typeNextChar = () => {
			if (currentIndex < fullText.length) {
				displayedText[messageIndex] = fullText.slice(0, currentIndex + 1);
				currentIndex++;

				// Auto-scroll during typing
				if (messagesContainer) {
					const isNearBottom =
						messagesContainer.scrollHeight -
							messagesContainer.scrollTop -
							messagesContainer.clientHeight <
						100;
					if (isNearBottom) {
						messagesContainer.scrollTop = messagesContainer.scrollHeight;
					}
				}

				setTimeout(typeNextChar, typingSpeed);
			} else {
				// Typing complete
				typingMessageIndex = null;
				messages[messageIndex].isTyping = false;

				if (messagesContainer) {
					messagesContainer.scrollTop = messagesContainer.scrollHeight;
				}
			}
		};

		// Initial scroll
		if (messagesContainer) {
			setTimeout(() => {
				if (messagesContainer) {
					messagesContainer.scrollTop = messagesContainer.scrollHeight;
				}
			}, 100);
		}

		typeNextChar();
	}

	// Skip typing animation
	function skipTypingAnimation(messageIndex: number) {
		if (typingMessageIndex === messageIndex) {
			const message = messages[messageIndex];
			displayedText[messageIndex] = getMessageText(message.content);
			typingMessageIndex = null;
			message.isTyping = false;

			if (messagesContainer) {
				setTimeout(() => {
					if (messagesContainer) {
						messagesContainer.scrollTop = messagesContainer.scrollHeight;
					}
				}, 50);
			}
		}
	}

	// Get displayed text for a message
	function getDisplayedText(messageIndex: number, message: Message): string {
		if (message.isTyping && messageIndex in displayedText) {
			return displayedText[messageIndex];
		}
		return getMessageText(message.content);
	}

	// Check if message is typing
	function isMessageTyping(messageIndex: number): boolean {
		return typingMessageIndex === messageIndex;
	}

	// Auto-scroll when messages change
	$effect(() => {
		if (messagesContainer && messages.length > 0) {
			setTimeout(() => {
				if (messagesContainer) {
					messagesContainer.scrollTop = messagesContainer.scrollHeight;
				}
			}, 100);
		}
	});

	// Animate loading avatar rotation
	$effect(() => {
		let animationFrame: number;
		if (isLoading) {
			const animate = () => {
				loadingRotation = Math.sin(Date.now() / 300) * 20;
				animationFrame = requestAnimationFrame(animate);
			};
			animate();
			return () => cancelAnimationFrame(animationFrame);
		}
	});

	// Send message to tutor API
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

		// Reset textarea height
		setTimeout(() => {
			if (textareaElement) {
				textareaElement.style.height = 'auto';
			}
		}, 0);

		try {
			// Call API with tutorMode enabled
			const response = await fetch('/api/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					tutorMode: true,
					messages: messages.slice(-10).map(({ role, content }) => ({ role, content })),
					exerciseContext,
					helpLevel
				})
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || `API Error: ${response.status}`);
			}

			const data = await response.json();

			// Update quotas from response
			if (data.tutorMetadata?.remaining) {
				remaining = data.tutorMetadata.remaining;
			}

			// Increment help level for next message (capped at 7)
			if (!data.tutorMetadata?.cheatDetected) {
				helpLevel = Math.min(helpLevel + 1, 7);
			}

			// Add assistant response
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

			// Start typing animation
			startTypingAnimation(newMessageIndex, data.message);
		} catch (error) {
			console.error('Tutor Error:', error);
			const errorMsg = error instanceof Error ? error.message : 'Une erreur est survenue';
			toaster.error(errorMsg);

			// Add error message
			const errorMessage =
				'Cornegidouille ! Ma machine à enseigner a rencontré un problème. Veuillez réessayer dans un instant, de par ma chandelle verte !';
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

			startTypingAnimation(errorMessageIndex, errorMessage);
		} finally {
			isLoading = false;
		}
	}

	// Clear chat history
	function clearHistory() {
		messages = [];
		helpLevel = initialHelpLevel;
		toaster.success('Conversation effacée !');
	}

	// Handle keyboard shortcuts
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			sendMessage();
		}
	}

	// Auto-resize textarea
	function handleInput(e: Event) {
		const target = e.target as HTMLTextAreaElement;
		if (target && target.style) {
			target.style.height = 'auto';
			target.style.height = target.scrollHeight + 'px';
		}
	}
</script>

<div class="flex h-full flex-col rounded-lg border border-border bg-card shadow-lg">
	<!-- Header -->
	<div
		class="flex items-center justify-between gap-3 rounded-t-lg border-b border-border bg-primary p-4 text-primary-foreground"
	>
		<div class="flex items-center gap-3">
			<HelpCircle class="h-5 w-5" />
			<div>
				<h2
					class="font-semibold"
					style="font-size: calc(1.125rem * var(--font-scale)); line-height: calc(1.5rem * var(--font-scale));"
				>
					Père Ubu - Tuteur
				</h2>
				{#if exerciseContext}
					<p
						class="opacity-90"
						style="font-size: calc(0.75rem * var(--font-scale)); line-height: calc(1rem * var(--font-scale));"
					>
						Aide sur l'exercice
					</p>
				{/if}
			</div>
		</div>
		<Button
			variant="ghost"
			size="icon"
			onclick={clearHistory}
			disabled={messages.length === 0}
			class="text-primary-foreground hover:bg-white/20"
			title="Effacer la conversation"
		>
			<Trash2 class="h-5 w-5" />
		</Button>
	</div>

	<!-- Usage Indicator -->
	<div class="border-b border-border bg-muted/30 px-4 py-2">
		<TutorUsageIndicator {remaining} />
	</div>

	<!-- Messages Container -->
	<div
		bind:this={messagesContainer}
		class="flex-1 space-y-4 overflow-y-auto bg-muted/30 p-4"
		style="max-height: calc(100vh - 320px); min-height: 300px;"
	>
		{#if messages.length === 0}
			<div class="flex h-full items-center justify-center text-center">
				<div class="space-y-4">
					<div class="text-6xl">🎓</div>
					<div class="text-muted-foreground">
						<p
							class="font-medium"
							style="font-size: calc(1.125rem * var(--font-scale)); line-height: calc(1.75rem * var(--font-scale));"
						>
							Bienvenue dans ma salle de tutorat !
						</p>
						<p
							class="mt-1"
							style="font-size: calc(0.875rem * var(--font-scale)); line-height: calc(1.25rem * var(--font-scale));"
						>
							Je vais t'aider à comprendre sans te donner la réponse.
						</p>
					</div>
				</div>
			</div>
		{/if}

		{#each messages as message, index (message.timestamp)}
			<div class="flex gap-3 {message.role === 'user' ? 'justify-end' : 'justify-start'}">
				{#if message.role === 'assistant'}
					<Avatar.Root
						class="h-12 w-12 flex-shrink-0 transition-transform duration-300"
						style="transform: rotate({message.avatarRotation ?? 0}deg);"
					>
						<Avatar.Image src={pereUbuImage} alt="Père Ubu" />
						<Avatar.Fallback class="text-lg">🎓</Avatar.Fallback>
					</Avatar.Root>
				{/if}

				{#if message.role === 'assistant' && message.isTyping}
					<button
						type="button"
						class="max-w-[80%] cursor-pointer space-y-2 rounded-lg border border-border bg-card p-3 text-left shadow-sm transition-colors hover:bg-muted/50"
						onclick={() => skipTypingAnimation(index)}
						aria-label="Cliquez pour afficher le message complet"
					>
						<div
							class="leading-relaxed break-words"
							style="font-size: calc(0.875rem * var(--font-scale)); line-height: calc(1.25rem * var(--font-scale));"
						>
							<MarkdownRenderer
								content={convertLegacyLatexToMarkdown(getDisplayedText(index, message) || '')}
							/>
							{#if isMessageTyping(index)}
								<span class="ml-0.5 inline-block h-[1em] w-[2px] animate-pulse bg-current"></span>
							{/if}
						</div>

						<div
							class="text-right text-muted-foreground"
							style="font-size: calc(0.75rem * var(--font-scale)); line-height: calc(1rem * var(--font-scale));"
						>
							{new Date(message.timestamp).toLocaleTimeString('fr-FR', {
								hour: '2-digit',
								minute: '2-digit'
							})}
						</div>
					</button>
				{:else}
					<div
						class="max-w-[80%] space-y-2 rounded-lg p-3 shadow-sm {message.role === 'user'
							? 'bg-primary text-primary-foreground'
							: 'border border-border bg-card'}"
					>
						<div
							class="leading-relaxed break-words"
							style="font-size: calc(0.875rem * var(--font-scale)); line-height: calc(1.25rem * var(--font-scale));"
						>
							{#if message.role === 'assistant'}
								<MarkdownRenderer
									content={convertLegacyLatexToMarkdown(getDisplayedText(index, message) || '')}
								/>
							{:else}
								<span class="whitespace-pre-wrap">{getMessageText(message.content)}</span>
							{/if}
						</div>

						<div
							class="text-right {message.role === 'user'
								? 'text-primary-foreground/70'
								: 'text-muted-foreground'}"
							style="font-size: calc(0.75rem * var(--font-scale)); line-height: calc(1rem * var(--font-scale));"
						>
							{new Date(message.timestamp).toLocaleTimeString('fr-FR', {
								hour: '2-digit',
								minute: '2-digit'
							})}
						</div>
					</div>
				{/if}

				{#if message.role === 'user'}
					<Avatar.Root class="h-12 w-12 flex-shrink-0">
						<Avatar.Image src="" alt="Élève" />
						<Avatar.Fallback class="bg-muted">
							<User class="h-6 w-6 text-muted-foreground" />
						</Avatar.Fallback>
					</Avatar.Root>
				{/if}
			</div>
		{/each}

		{#if isLoading}
			<div class="flex justify-start gap-3">
				<Avatar.Root
					class="h-12 w-12 flex-shrink-0 transition-transform"
					style="transform: rotate({loadingRotation}deg);"
				>
					<Avatar.Image src={pereUbuImage} alt="Père Ubu" />
					<Avatar.Fallback class="text-lg">🎓</Avatar.Fallback>
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
						<span
							class="text-muted-foreground"
							style="font-size: calc(0.875rem * var(--font-scale)); line-height: calc(1.25rem * var(--font-scale));"
							>Le Père Ubu réfléchit...</span
						>
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
				placeholder="Pose ta question... (Entrée pour envoyer, Maj+Entrée pour nouvelle ligne)"
				disabled={isLoading}
				onkeydown={handleKeydown}
				oninput={handleInput}
				class="max-h-[200px] min-h-[80px] resize-none"
				style="font-size: calc(1rem * var(--font-scale)); line-height: calc(1.5rem * var(--font-scale));"
				rows={1}
			/>
			<Button
				onclick={sendMessage}
				disabled={isLoading || !inputValue.trim()}
				size="icon"
				class="h-[80px] w-[60px]"
			>
				<Send class="h-5 w-5" />
			</Button>
		</div>
	</div>
</div>
