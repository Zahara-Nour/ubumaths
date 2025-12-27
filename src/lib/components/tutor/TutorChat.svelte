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
	import { untrack } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Avatar from '$lib/components/ui/avatar';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { User, Trash2, HelpCircle } from 'lucide-svelte';
	import pereUbuImage from '$lib/assets/images/avatar-pereubu.png';
	import { MarkdownRenderer } from '$lib/components/markdown';
	import { convertLegacyLatexToMarkdown } from '$lib/utils/latex-syntax-adapter';
	import TutorUsageIndicator from './TutorUsageIndicator.svelte';
	import RichTextEditor from '$lib/components/rich-text/RichTextEditor.svelte';
	import { TUTOR_MAX_HELP_LEVEL } from '$lib/config/tutor-limits';
	import { createLogger } from '$lib/utils/logger';

	const logger = createLogger('TutorChat');

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
		assignmentId?: string;
		onConversationCreated?: (id: string) => void;
	}

	let {
		exerciseContext,
		initialHelpLevel = 0,
		assignmentId,
		onConversationCreated
	}: Props = $props();

	// Message types
	interface TextContent {
		type: 'text';
		text: string;
	}

	type MessageContent = string | Array<TextContent>;

	interface Message {
		id: string;
		role: 'user' | 'assistant';
		content: MessageContent;
		timestamp: number;
		avatarRotation?: number;
		isTyping?: boolean;
	}

	// State
	let messages = $state<Message[]>([]);
	let isLoading = $state(false);
	let loadingRotation = $state(0);
	let typingMessageIndex = $state<number | null>(null);
	let displayedText = $state<Record<number, string>>({});
	let helpLevel = $state(initialHelpLevel);
	let remaining = $state<{ exercise: number | null; hour: number; day: number }>({
		exercise: null,
		hour: 30,
		day: 100
	});

	// Error state for graceful degradation
	let componentError = $state<string | null>(null);

	// Persistence state
	let conversationId = $state<string | null>(null);
	let isLoadingConversation = $state(false);

	// Track current exercise to avoid race conditions
	let currentExerciseId = $state<string | null>(null);

	// Typing animation cleanup
	let typingAnimationTimeoutId: ReturnType<typeof setTimeout> | null = null;

	// AbortController for fetch requests
	let abortController: AbortController | null = null;

	// Refs
	let messagesContainer: HTMLDivElement | undefined;

	// Tiptap JSON node interface
	interface TiptapNode {
		type: string;
		attrs?: Record<string, unknown>;
		content?: TiptapNode[];
		text?: string;
	}

	/**
	 * Convert Tiptap JSON to plain text with LaTeX math
	 * Math nodes become $latex$
	 */
	function convertTiptapJsonToText(json: unknown): string {
		if (!json || typeof json !== 'object') return '';

		const doc = json as { type?: string; content?: TiptapNode[] };
		if (doc.type !== 'doc' || !doc.content) return '';

		const processNode = (node: TiptapNode): string => {
			switch (node.type) {
				case 'text':
					return node.text || '';
				case 'mathInline':
					// Math node - wrap in $...$
					return `$${(node.attrs?.latex as string) || ''}$`;
				case 'paragraph':
				case 'doc':
					return (node.content || []).map(processNode).join('');
				case 'hardBreak':
					return '\n';
				default:
					// For other nodes, try to process children
					if (node.content) {
						return node.content.map(processNode).join('');
					}
					return '';
			}
		};

		return doc.content.map(processNode).join('\n').trim();
	}

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

	// Cancel any ongoing typing animation
	function cancelTypingAnimation() {
		if (typingAnimationTimeoutId !== null) {
			clearTimeout(typingAnimationTimeoutId);
			typingAnimationTimeoutId = null;
		}
	}

	// Start typing animation
	function startTypingAnimation(messageIndex: number, fullText: string) {
		// Guard: Don't animate if message already exists with full text
		if (displayedText[messageIndex] === fullText) return;

		// Cancel any previous animation
		cancelTypingAnimation();

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

				typingAnimationTimeoutId = setTimeout(typeNextChar, typingSpeed);
			} else {
				// Typing complete
				typingAnimationTimeoutId = null;
				typingMessageIndex = null;
				messages[messageIndex].isTyping = false;

				if (messagesContainer) {
					messagesContainer.scrollTop = messagesContainer.scrollHeight;
				}
			}
		};

		// Initial scroll
		if (messagesContainer) {
			typingAnimationTimeoutId = setTimeout(() => {
				if (messagesContainer) {
					messagesContainer.scrollTop = messagesContainer.scrollHeight;
				}
				typeNextChar();
			}, 100);
		} else {
			typeNextChar();
		}
	}

	// Skip typing animation
	function skipTypingAnimation(messageIndex: number) {
		if (typingMessageIndex === messageIndex) {
			// Cancel the ongoing animation
			cancelTypingAnimation();

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

	// Cleanup typing animation and abort pending requests on component destroy
	$effect(() => {
		return () => {
			cancelTypingAnimation();
			abortController?.abort();
		};
	});

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

	// Fetch remaining quotas for an exercise
	// Takes expectedExerciseId to prevent race conditions when switching exercises
	async function fetchRemainingQuotas(exerciseId: string, expectedExerciseId: string) {
		try {
			const response = await fetch(`/api/tutor/remaining?exerciseId=${exerciseId}`);

			// Race condition check: abort if exercise changed during fetch
			if (currentExerciseId !== expectedExerciseId) {
				return;
			}

			if (response.ok) {
				const data = await response.json();
				if (data.remaining) {
					remaining = data.remaining;
				}
			}
		} catch (error) {
			logger.warn('Error fetching remaining quotas:', error);
		}
	}

	// Find or create conversation when exercise/assignment change
	async function findOrCreateConversation() {
		if (!exerciseContext?.exerciseId || !assignmentId) {
			return;
		}

		// Prevent re-triggering if already loading this exercise
		if (currentExerciseId === exerciseContext.exerciseId) {
			return;
		}

		// Store the exerciseId we're loading for
		const loadingExerciseId = exerciseContext.exerciseId;
		currentExerciseId = loadingExerciseId;

		// Reset state for new exercise
		messages = [];
		conversationId = null;
		helpLevel = initialHelpLevel;
		// Keep hour/day values to avoid visual flash, only reset exercise counter
		// The actual values will be fetched from the API and update these
		remaining = { exercise: null, hour: remaining.hour, day: remaining.day };

		isLoadingConversation = true;
		try {
			// Fetch remaining quotas in parallel with conversation lookup
			// Pass loadingExerciseId to prevent race conditions
			const quotasPromise = fetchRemainingQuotas(loadingExerciseId, loadingExerciseId);

			// Try to find existing conversation
			const searchParams = new URLSearchParams({
				exerciseId: loadingExerciseId,
				assignmentId: assignmentId
			});
			const getResponse = await fetch(`/api/tutor/conversations?${searchParams}`);

			// Check if exercise changed during fetch (race condition)
			if (currentExerciseId !== loadingExerciseId) {
				return; // Abort - user switched to different exercise
			}

			if (getResponse.ok) {
				const data = await getResponse.json();
				if (data.conversation) {
					conversationId = data.conversation.id;
					// Load existing messages (race condition check is inside loadMessages)
					await loadMessages(data.conversation.id, loadingExerciseId);

					// Check again after loading messages
					if (currentExerciseId !== loadingExerciseId) {
						return;
					}

					onConversationCreated?.(data.conversation.id);
					await quotasPromise; // Wait for quotas
					return;
				}
			}

			// Check if exercise changed before creating
			if (currentExerciseId !== loadingExerciseId) {
				return;
			}

			// Create new conversation
			const postResponse = await fetch('/api/tutor/conversations', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					exerciseId: loadingExerciseId,
					assignmentId: assignmentId,
					statement: exerciseContext.statement,
					topic: exerciseContext.topic
				})
			});

			// Check if exercise changed during creation
			if (currentExerciseId !== loadingExerciseId) {
				return;
			}

			if (postResponse.ok) {
				const data = await postResponse.json();
				conversationId = data.conversation.id;
				onConversationCreated?.(data.conversation.id);
			} else if (postResponse.status === 409) {
				// Conversation already exists - this can happen in race conditions
				// Re-query to get the existing conversation
				const retryParams = new URLSearchParams({
					exerciseId: loadingExerciseId,
					assignmentId: assignmentId
				});
				const retryResponse = await fetch(`/api/tutor/conversations?${retryParams}`);

				// Check race condition
				if (currentExerciseId !== loadingExerciseId) {
					return;
				}

				if (retryResponse.ok) {
					const retryData = await retryResponse.json();
					if (retryData.conversation) {
						conversationId = retryData.conversation.id;
						await loadMessages(retryData.conversation.id, loadingExerciseId);
						onConversationCreated?.(retryData.conversation.id);
					}
				}
			}

			await quotasPromise; // Wait for quotas
		} catch (error) {
			logger.error('Error finding/creating conversation:', error);
			componentError = 'Erreur lors du chargement de la conversation. Veuillez rafraîchir la page.';
		} finally {
			// Only clear loading if we're still on the same exercise
			if (currentExerciseId === exerciseContext?.exerciseId) {
				isLoadingConversation = false;
			}
		}
	}

	// Load messages for a conversation
	async function loadMessages(convId: string, expectedExerciseId: string) {
		try {
			const response = await fetch(`/api/tutor/conversations/${convId}/messages`);

			// Check for race condition before updating state
			if (currentExerciseId !== expectedExerciseId) {
				return;
			}

			if (response.ok) {
				const data = await response.json();
				// Convert API messages to local Message format
				messages = (data.messages || []).map(
					(msg: { id: string; role: string; content: string; created_at: string }) => ({
						id: msg.id,
						role: msg.role as 'user' | 'assistant',
						content: msg.content,
						timestamp: new Date(msg.created_at).getTime(),
						avatarRotation: msg.role === 'assistant' ? generateRandomRotation() : undefined
					})
				);
			}
		} catch (error) {
			logger.error('Error loading messages:', error);
		}
	}

	// Effect to load conversation when props change
	// Dependencies: exerciseContext?.exerciseId, assignmentId
	// Uses untrack to prevent tracking state reads inside the function
	$effect(() => {
		const exerciseId = exerciseContext?.exerciseId;
		const assignment = assignmentId;
		if (exerciseId && assignment) {
			untrack(() => findOrCreateConversation());
		}
	});

	// Handle rich text editor send
	async function handleRichTextSend(jsonContent: unknown) {
		const textContent = convertTiptapJsonToText(jsonContent);
		if (!textContent.trim()) return;
		await sendMessage(textContent);
	}

	// Send message to tutor API
	async function sendMessage(text: string) {
		if (!text.trim() || isLoading) return;

		// Cancel any pending request
		abortController?.abort();
		abortController = new AbortController();

		// Add user message
		const userMessage: Message = {
			id: `local-user-${Date.now()}`,
			role: 'user',
			content: text,
			timestamp: Date.now()
		};

		messages = [...messages, userMessage];
		isLoading = true;

		try {
			// Call API with tutorMode enabled and conversationId
			const requestBody = {
				tutorMode: true,
				messages: messages.slice(-10).map(({ role, content }) => ({ role, content })),
				exerciseContext,
				helpLevel,
				conversationId
			};

			const response = await fetch('/api/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(requestBody),
				signal: abortController.signal
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

			// Increment help level for next message (capped at max level)
			if (!data.tutorMetadata?.cheatDetected) {
				helpLevel = Math.min(helpLevel + 1, TUTOR_MAX_HELP_LEVEL);
			}

			// Add assistant response
			const newMessageIndex = messages.length;
			messages = [
				...messages,
				{
					id: `local-assistant-${Date.now()}`,
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
			// Ignore aborted requests - they're intentional
			if (error instanceof Error && error.name === 'AbortError') {
				return;
			}

			logger.error('Tutor API error:', error);
			const errorMsg = error instanceof Error ? error.message : 'Une erreur est survenue';
			toaster.error(errorMsg);

			// Add error message
			const errorMessage =
				'Cornegidouille ! Ma machine à enseigner a rencontré un problème. Veuillez réessayer dans un instant, de par ma chandelle verte !';
			const errorMessageIndex = messages.length;
			messages = [
				...messages,
				{
					id: `local-error-${Date.now()}`,
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
</script>

{#if componentError}
	<!-- Error Fallback UI -->
	<div
		class="flex h-full flex-col items-center justify-center rounded-lg border border-destructive bg-destructive/10 p-8 text-center"
	>
		<div class="mb-4 text-4xl">😵</div>
		<h3 class="mb-2 font-semibold text-destructive">Oups ! Une erreur est survenue</h3>
		<p class="mb-4 text-muted-foreground">{componentError}</p>
		<button
			type="button"
			class="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
			onclick={() => {
				componentError = null;
				findOrCreateConversation();
			}}
		>
			Réessayer
		</button>
	</div>
{:else}
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
				aria-label="Effacer la conversation"
			>
				<Trash2 class="h-5 w-5" aria-hidden="true" />
			</Button>
		</div>

		<!-- Usage Indicator -->
		<div class="border-b border-border bg-muted/30 px-4 py-2">
			<TutorUsageIndicator {remaining} isLoading={isLoadingConversation} />
		</div>

		<!-- Messages Container -->
		<div
			bind:this={messagesContainer}
			class="flex-1 space-y-4 overflow-y-auto bg-muted/30 p-4"
			style="max-height: calc(100vh - 320px); min-height: 300px;"
			role="log"
			aria-label="Historique de la conversation avec le tuteur"
			aria-live="polite"
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

			{#each messages as message, index (message.id)}
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
								<MarkdownRenderer
									content={convertLegacyLatexToMarkdown(getDisplayedText(index, message) || '')}
								/>
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
		<div class="border-t border-border bg-card p-2">
			{#if isLoadingConversation}
				<div
					class="flex items-center justify-center py-4 text-muted-foreground"
					role="status"
					aria-live="polite"
				>
					<span class="animate-pulse">Chargement de la conversation...</span>
				</div>
			{:else}
				<RichTextEditor
					mode="chat"
					onSend={handleRichTextSend}
					mathTemplates="full"
					disabled={isLoading}
					minHeight="60px"
					enterToSend
				/>
			{/if}
		</div>
	</div>
{/if}
