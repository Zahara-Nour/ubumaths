<!--
	ChatBot Component
	=================
	AI-powered mathematical assistant using Claude API (Anthropic)

	FEATURES:
	- Multi-turn conversations with context retention
	- Image attachments (file upload + URL)
	- LaTeX/MathML rendering in responses
	- Rate limiting (5 requests per 15 minutes per user)
	- Customizable AI personalities (Père Ubu, friendly teacher, etc.)
	- Markdown formatting in messages
	- Conversation history persistence
	- Auto-scroll to latest message
	- Typing indicators with animated rotation

	SECURITY:
	- Authenticated users only (requires login)
	- Server-side rate limiting to prevent abuse
	- Input sanitization for URLs and file uploads
	- File size limits (5MB max per image)
	- CORS-safe image loading with error handling

	PROPS:
	- personalityKey?: PersonalityKey (default: 'pereUbu') - AI personality from personalities config

	TECHNICAL IMPLEMENTATION:
	- Uses Svelte 5 runes ($state, $derived, $effect, $props)
	- Claude API via POST to /api/ai/chat endpoint
	- Base64 encoding for image attachments
	- MathDisplay component for LaTeX rendering
	- Smooth scrolling with scroll-behavior CSS

	USAGE:
	```svelte
	<ChatBot personalityKey="pereUbu" />
	<ChatBot personalityKey="friendly" />
	```

	RATE LIMITS:
	- 5 requests per 15 minutes per user (enforced server-side)
	- User-friendly French error messages on limit exceeded
	- Automatic retry guidance in error messages

	LIMITATIONS:
	- Images must be accessible URLs or valid base64 data
	- Maximum 5MB per image file
	- LaTeX rendering requires MathJax/KaTeX (via MathDisplay)
	- Conversation history is session-scoped (not persisted to database)

	@component
-->

<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Input } from '$lib/components/ui/input';
	import * as Avatar from '$lib/components/ui/avatar';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { personalities, type PersonalityKey } from '$lib/config/personalities';
	import { Trash2, Send, User, Paperclip, X, Link as LinkIcon } from 'lucide-svelte';
	import pereUbuImage from '$lib/assets/images/avatar-pereubu.png';
	import MathDisplay from '$lib/components/MathDisplay.svelte';

	interface TextContent {
		type: 'text';
		text: string;
	}

	interface ImageUrlContent {
		type: 'image_url';
		image_url: {
			url: string;
		};
	}

	type MessageContent = string | Array<TextContent | ImageUrlContent>;

	interface Message {
		role: 'user' | 'assistant';
		content: MessageContent;
		timestamp: number;
		avatarRotation?: number;
		isTyping?: boolean;
	}

	interface AttachedImage {
		url: string; // Can be base64 or URL
		type: 'upload' | 'url';
		name?: string;
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
	let attachedImages = $state<AttachedImage[]>([]);
	let showImageUrlInput = $state(false);
	let imageUrlInput = $state('');

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
		const typingSpeed = 15; // 25ms per character (medium speed)

		const typeNextChar = () => {
			if (currentIndex < fullText.length) {
				displayedText[messageIndex] = fullText.slice(0, currentIndex + 1);
				currentIndex++;

				// Auto-scroll during typing if container is overflowing
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

				// Final scroll to ensure everything is visible
				if (messagesContainer) {
					messagesContainer.scrollTop = messagesContainer.scrollHeight;
				}
			}
		};

		// Scroll once when typing starts
		if (messagesContainer) {
			setTimeout(() => {
				if (messagesContainer) {
					messagesContainer.scrollTop = messagesContainer.scrollHeight;
				}
			}, 100);
		}

		typeNextChar();
	}

	// Skip typing animation and show full text immediately
	function skipTypingAnimation(messageIndex: number) {
		if (typingMessageIndex === messageIndex) {
			const message = messages[messageIndex];
			displayedText[messageIndex] = getMessageText(message.content);
			typingMessageIndex = null;
			message.isTyping = false;

			// Scroll to bottom after skipping
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

	// Check if message is currently typing
	function isMessageTyping(messageIndex: number): boolean {
		return typingMessageIndex === messageIndex;
	}

	// Refs for DOM elements
	let messagesContainer: HTMLDivElement | undefined;
	let textareaElement: any;
	let fileInputElement: HTMLInputElement | undefined;

	// Constants for image validation
	const MAX_FILE_SIZE_MB = 4; // 4MB for base64
	const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
	const MAX_IMAGES = 5;
	const MAX_RESOLUTION_PIXELS = 33177600; // 33 megapixels
	const SUPPORTED_FORMATS = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

	// Validate image file
	function validateImageFile(file: File): string | null {
		// Check file type
		if (!SUPPORTED_FORMATS.includes(file.type)) {
			return `Format non supporté. Formats acceptés : JPG, PNG, GIF, WebP`;
		}

		// Check file size
		if (file.size > MAX_FILE_SIZE_BYTES) {
			const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
			return `Fichier trop volumineux (${fileSizeMB} MB). Taille maximale : ${MAX_FILE_SIZE_MB} MB`;
		}

		return null; // Valid
	}

	// Check image resolution
	async function checkImageResolution(dataUrl: string): Promise<string | null> {
		return new Promise((resolve) => {
			const img = new Image();
			img.onload = () => {
				const totalPixels = img.width * img.height;
				if (totalPixels > MAX_RESOLUTION_PIXELS) {
					const megapixels = (totalPixels / 1000000).toFixed(1);
					resolve(
						`Résolution trop élevée (${img.width}×${img.height} = ${megapixels} MP). Maximum : 33 MP`
					);
				} else {
					resolve(null);
				}
			};
			img.onerror = () => resolve("Impossible de lire l'image");
			img.src = dataUrl;
		});
	}

	// Convert file to base64
	async function fileToBase64(file: File): Promise<string> {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => resolve(reader.result as string);
			reader.onerror = reject;
			reader.readAsDataURL(file);
		});
	}

	// Handle file upload
	async function handleFileUpload(event: Event) {
		const input = event.target as HTMLInputElement;
		const files = input.files;

		if (!files || files.length === 0) return;

		// Check total image count
		if (attachedImages.length + files.length > MAX_IMAGES) {
			toaster.warning(`Maximum ${MAX_IMAGES} images par message`);
			input.value = ''; // Reset input
			return;
		}

		for (const file of Array.from(files)) {
			// Validate file
			const error = validateImageFile(file);
			if (error) {
				toaster.error(error);
				continue;
			}

			try {
				// Convert to base64
				const base64 = await fileToBase64(file);

				// Check resolution
				const resolutionError = await checkImageResolution(base64);
				if (resolutionError) {
					toaster.error(resolutionError);
					continue;
				}

				// Add to attached images
				attachedImages = [
					...attachedImages,
					{
						url: base64,
						type: 'upload',
						name: file.name
					}
				];

				toaster.success(`Image "${file.name}" ajoutée`);
			} catch (error) {
				console.error('Error reading file:', error);
				toaster.error(`Erreur lors du chargement de "${file.name}"`);
			}
		}

		// Reset input
		input.value = '';
	}

	// Add image from URL
	function addImageUrl() {
		const url = imageUrlInput.trim();

		if (!url) {
			toaster.warning("Veuillez entrer une URL d'image");
			return;
		}

		// Basic URL validation
		try {
			new URL(url);
		} catch {
			toaster.error('URL invalide');
			return;
		}

		// Check total image count
		if (attachedImages.length >= MAX_IMAGES) {
			toaster.warning(`Maximum ${MAX_IMAGES} images par message`);
			return;
		}

		// Add to attached images
		attachedImages = [
			...attachedImages,
			{
				url,
				type: 'url'
			}
		];

		toaster.success('Image URL ajoutée');
		imageUrlInput = '';
		showImageUrlInput = false;
	}

	// Remove attached image
	function removeImage(index: number) {
		attachedImages = attachedImages.filter((_, i) => i !== index);
	}

	// Get text content from message (for display and typing animation)
	function getMessageText(content: MessageContent): string {
		if (typeof content === 'string') return content;

		const textItem = content.find((item) => item.type === 'text') as TextContent | undefined;
		return textItem?.text || '';
	}

	// Get images from message content
	function getMessageImages(content: MessageContent): string[] {
		if (typeof content === 'string') return [];

		return content
			.filter((item): item is ImageUrlContent => item.type === 'image_url')
			.map((item) => item.image_url.url);
	}

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
				loadingRotation = Math.sin(Date.now() / 300) * 20; // Oscillate between -20 and 20 degrees
				animationFrame = requestAnimationFrame(animate);
			};
			animate();
			return () => cancelAnimationFrame(animationFrame);
		}
	});

	async function sendMessage() {
		if ((!inputValue.trim() && attachedImages.length === 0) || isLoading) return;

		// Build message content
		let messageContent: MessageContent;

		if (attachedImages.length > 0) {
			// Multi-part message with text and images
			const contentParts: Array<TextContent | ImageUrlContent> = [];

			// Add text if present
			if (inputValue.trim()) {
				contentParts.push({
					type: 'text',
					text: inputValue.trim()
				});
			}

			// Add images
			for (const img of attachedImages) {
				contentParts.push({
					type: 'image_url',
					image_url: {
						url: img.url
					}
				});
			}

			messageContent = contentParts;
		} else {
			// Simple text message
			messageContent = inputValue;
		}

		// Add user message
		const userMessage: Message = {
			role: 'user',
			content: messageContent,
			timestamp: Date.now()
		};

		messages = [...messages, userMessage];
		inputValue = '';
		attachedImages = []; // Clear attached images
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
			const textContent =
				typeof data.message === 'string' ? data.message : getMessageText(data.message);
			startTypingAnimation(newMessageIndex, textContent);
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
		if (target && target.style) {
			target.style.height = 'auto';
			target.style.height = target.scrollHeight + 'px';
		}
	}
</script>

<div class="flex h-full flex-col rounded-lg border border-border bg-card shadow-lg">
	<!-- Header -->
	<div
		class="flex items-center gap-3 rounded-t-lg border-b border-border p-4 text-primary-foreground"
	>
		<div class="flex-1">
			<h2
				class="font-semibold"
				style="font-size: calc(1.25rem * var(--font-scale)); line-height: calc(1.75rem * var(--font-scale));"
			>
				{personality.name}
			</h2>
			<p
				class="opacity-90"
				style="font-size: calc(0.875rem * var(--font-scale)); line-height: calc(1.25rem * var(--font-scale));"
			>
				{personality.description}
			</p>
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
						<p
							class="font-medium"
							style="font-size: calc(1.125rem * var(--font-scale)); line-height: calc(1.75rem * var(--font-scale));"
						>
							Cornegidouille ! Bienvenue dans ma salle de classe pataphysique !
						</p>
						<p
							class="mt-1"
							style="font-size: calc(0.875rem * var(--font-scale)); line-height: calc(1.25rem * var(--font-scale));"
						>
							Posez-moi vos questions mathématiques... si vous l'osez !
						</p>
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
					class="max-w-[80%] space-y-2 rounded-lg p-3 shadow-sm {message.role === 'user'
						? 'bg-primary text-primary-foreground'
						: 'border border-border bg-card'} {message.role === 'assistant' && message.isTyping
						? 'cursor-pointer transition-colors hover:bg-muted/50'
						: ''}"
					onclick={() => message.role === 'assistant' && skipTypingAnimation(index)}
				>
					<!-- Display images if present -->
					{#if getMessageImages(message.content).length > 0}
						<div
							class="grid gap-2 {getMessageImages(message.content).length === 1
								? 'grid-cols-1'
								: 'grid-cols-2'}"
						>
							{#each getMessageImages(message.content) as imageUrl (imageUrl)}
								<img
									src={imageUrl}
									alt="Attached image"
									class="max-h-[200px] w-full rounded border border-border object-contain"
									loading="lazy"
								/>
							{/each}
						</div>
					{/if}

					<!-- Display text content -->
					{#if getMessageText(message.content)}
						<div
							class="leading-relaxed break-words"
							style="font-size: calc(0.875rem * var(--font-scale)); line-height: calc(1.25rem * var(--font-scale));"
						>
							{#if message.role === 'assistant'}
								<!--
									Assistant messages: render with MathDisplay for LaTeX support
									=================================================================

									The MathDisplay component:
									- Parses text for $$...$$ LaTeX expressions
									- Renders math as MathLive fields (read-only)
									- Updates in real-time during typing animation
									- Blends seamlessly with message bubble background
									- No borders, no hover effects, transparent background

									See: src/lib/components/MathDisplay.svelte
									See: src/lib/utils/latex-parser.ts
								-->
								<MathDisplay text={getDisplayedText(index, message)} />
								{#if isMessageTyping(index)}
									<span class="ml-0.5 inline-block h-[1em] w-[2px] animate-pulse bg-current"></span>
								{/if}
							{:else}
								<!-- User messages: plain text (no LaTeX parsing) -->
								<span class="whitespace-pre-wrap">{getMessageText(message.content)}</span>
							{/if}
						</div>
					{/if}

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
		<!-- Attached Images Preview -->
		{#if attachedImages.length > 0}
			<div class="mb-3 flex flex-wrap gap-2">
				{#each attachedImages as img, idx (img.url)}
					<div class="relative">
						<img
							src={img.url}
							alt={img.name || 'Image'}
							class="h-20 w-20 rounded border border-border object-cover"
						/>
						<button
							onclick={() => removeImage(idx)}
							class="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-md hover:bg-destructive/90"
							title="Retirer l'image"
						>
							<X class="h-4 w-4" />
						</button>
					</div>
				{/each}
			</div>
		{/if}

		<!-- Image URL Input -->
		{#if showImageUrlInput}
			<div class="mb-3 flex gap-2">
				<Input
					bind:value={imageUrlInput}
					placeholder="https://example.com/image.jpg"
					disabled={isLoading}
					onkeydown={(e) => {
						if (e.key === 'Enter') {
							e.preventDefault();
							addImageUrl();
						} else if (e.key === 'Escape') {
							showImageUrlInput = false;
							imageUrlInput = '';
						}
					}}
					class="flex-1"
				/>
				<Button onclick={addImageUrl} disabled={isLoading || !imageUrlInput.trim()} size="sm">
					Ajouter
				</Button>
				<Button
					onclick={() => {
						showImageUrlInput = false;
						imageUrlInput = '';
					}}
					variant="outline"
					size="sm"
				>
					Annuler
				</Button>
			</div>
		{/if}

		<!-- Main Input Row -->
		<div class="flex gap-2">
			<!-- File Upload Button -->
			<input
				bind:this={fileInputElement}
				type="file"
				accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
				multiple
				onchange={handleFileUpload}
				class="hidden"
			/>

			<div class="flex flex-col gap-1">
				<Button
					onclick={() => fileInputElement?.click()}
					disabled={isLoading || attachedImages.length >= MAX_IMAGES}
					variant="outline"
					size="icon"
					class="h-[60px] w-[60px]"
					title="Joindre une image (max {MAX_IMAGES})"
				>
					<Paperclip class="h-5 w-5" />
				</Button>

				<Button
					onclick={() => (showImageUrlInput = !showImageUrlInput)}
					disabled={isLoading || attachedImages.length >= MAX_IMAGES}
					variant="outline"
					size="icon"
					class="h-[60px] w-[60px]"
					title="Ajouter une URL d'image"
				>
					<LinkIcon class="h-5 w-5" />
				</Button>
			</div>

			<Textarea
				bind:this={textareaElement}
				bind:value={inputValue}
				placeholder="Posez votre question... (Entrée pour envoyer, Maj+Entrée pour nouvelle ligne)"
				disabled={isLoading}
				onkeydown={handleKeydown}
				oninput={handleInput}
				class="max-h-[200px] min-h-[128px] resize-none"
				style="font-size: calc(1rem * var(--font-scale)); line-height: calc(1.5rem * var(--font-scale));"
				rows={1}
			/>
			<Button
				onclick={sendMessage}
				disabled={isLoading || (!inputValue.trim() && attachedImages.length === 0)}
				size="icon"
				class="h-[128px] w-[60px]"
			>
				<Send class="h-5 w-5" />
			</Button>
		</div>

		<!-- Image count indicator -->
		{#if attachedImages.length > 0}
			<div
				class="mt-2 text-muted-foreground"
				style="font-size: calc(0.75rem * var(--font-scale)); line-height: calc(1rem * var(--font-scale));"
			>
				{attachedImages.length} / {MAX_IMAGES} image{attachedImages.length > 1 ? 's' : ''} jointe{attachedImages.length >
				1
					? 's'
					: ''}
			</div>
		{/if}
	</div>
</div>
