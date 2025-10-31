<!--
	CustomFlashCard Component
	=========================

	Displays custom SRS flashcards (non-template) with flip functionality.

	Features:
	- Front/back flip animation
	- MathLive rendering for LaTeX
	- Similar UX to FlashCard but simplified for custom content
	- FlipCard-style height management

	Props:
	- frontContent: ContentField[] (front side)
	- backContent: ContentField[] (back side)
	- onFlip: Callback when flipped
	- size: 'sm' | 'md' | 'lg'
-->

<script lang="ts">
	import MathDisplay from '$lib/components/MathDisplay.svelte';
	import * as Card from '$lib/components/ui/card';
	import { RotateCw } from 'lucide-svelte';
	import { cn } from '$lib/utils';
	import type { ContentField } from '$lib/questions/types';

	interface Props {
		frontContent: ContentField[];
		backContent: ContentField[];
		onFlip?: (isFlipped: boolean) => void;
		size?: 'sm' | 'md' | 'lg';
	}

	let { frontContent, backContent, onFlip, size = 'md' }: Props = $props();

	// State
	let isFlipped = $state(false);
	let frontHeight = $state(0);
	let backHeight = $state(0);
	let maxViewportHeight = $state(0);

	// Element references
	let frontElement: HTMLElement | null = null;
	let backElement: HTMLElement | null = null;

	// Derived
	const currentHeight = $derived(
		Math.min(Math.max(frontHeight, backHeight), maxViewportHeight || 10000)
	);
	const isScrollable = $derived(Math.max(frontHeight, backHeight) > maxViewportHeight);

	// Calculate max viewport height
	$effect(() => {
		if (typeof window !== 'undefined') {
			maxViewportHeight = window.innerHeight * 0.8;
		}
	});

	// Measure heights
	$effect(() => {
		if (!frontElement || !backElement) return;

		const observer = new ResizeObserver((entries) => {
			for (const entry of entries) {
				if (entry.target === frontElement) {
					frontHeight = entry.contentRect.height;
				} else if (entry.target === backElement) {
					backHeight = entry.contentRect.height;
				}
			}
		});

		observer.observe(frontElement);
		observer.observe(backElement);

		return () => observer.disconnect();
	});

	/**
	 * Handle flip
	 */
	function handleFlip() {
		isFlipped = !isFlipped;
		onFlip?.(isFlipped);
	}

	/**
	 * Size classes
	 */
	const sizeClasses = {
		sm: 'max-w-md',
		md: 'max-w-2xl',
		lg: 'max-w-4xl'
	};
</script>

<div class={cn('custom-flash-card-wrapper mx-auto w-full', sizeClasses[size])}>
	<div
		class="flip-container"
		class:flipped={isFlipped}
		style="height: {currentHeight > 0 ? currentHeight + 'px' : 'auto'}; perspective: 1000px;"
	>
		<div
			class="flip-inner"
			class:flipped={isFlipped}
			style="height: {currentHeight > 0 ? currentHeight + 'px' : 'auto'};"
		>
			<!-- FRONT FACE -->
			<div
				bind:this={frontElement}
				class={cn('flip-face flip-front', isScrollable && 'scrollable')}
				style="height: {currentHeight > 0 ? currentHeight + 'px' : 'auto'};"
			>
				<Card.Root class="h-full">
					<Card.Header>
						<Card.Title>Question</Card.Title>
					</Card.Header>

					<Card.Content class="space-y-4">
						<div class="content-section rounded-lg border bg-card p-4">
							{#each frontContent as field, i (i)}
								{#if field.type === 'text'}
									<MathDisplay text={field.content} />
								{:else if field.type === 'image'}
									<img
										src={field.content}
										alt={field.alt || 'Image'}
										class="my-4 max-w-full rounded-lg"
									/>
								{/if}
							{/each}
						</div>
					</Card.Content>
				</Card.Root>

				<!-- Flip Button -->
				<button
					class="flip-button"
					onclick={handleFlip}
					aria-label="Voir la réponse"
					title="Voir la réponse"
				>
					<RotateCw class="h-5 w-5" />
				</button>
			</div>

			<!-- BACK FACE -->
			<div
				bind:this={backElement}
				class={cn('flip-face flip-back', isScrollable && 'scrollable')}
				style="height: {currentHeight > 0 ? currentHeight + 'px' : 'auto'};"
			>
				<Card.Root class="h-full">
					<Card.Header>
						<Card.Title>Réponse</Card.Title>
					</Card.Header>

					<Card.Content class="space-y-4">
						<div class="content-section rounded-lg border bg-card p-4">
							{#each backContent as field, i (i)}
								{#if field.type === 'text'}
									<MathDisplay text={field.content} />
								{:else if field.type === 'image'}
									<img
										src={field.content}
										alt={field.alt || 'Image'}
										class="my-4 max-w-full rounded-lg"
									/>
								{/if}
							{/each}
						</div>
					</Card.Content>
				</Card.Root>

				<!-- Flip Button (Back) -->
				<button
					class="flip-button"
					onclick={handleFlip}
					aria-label="Retour à la question"
					title="Retour à la question"
				>
					<RotateCw class="h-5 w-5" />
				</button>
			</div>
		</div>
	</div>
</div>

<style>
	/* Flip Container */
	.flip-container {
		position: relative;
		width: 100%;
		perspective: 1000px;
	}

	.flip-inner {
		position: relative;
		width: 100%;
		transform-style: preserve-3d;
		transition:
			transform 0.6s cubic-bezier(0.33, 1, 0.68, 1),
			height 0.6s cubic-bezier(0.33, 1, 0.68, 1);
	}

	.flip-inner.flipped {
		transform: rotateY(180deg);
	}

	.flip-face {
		position: absolute;
		width: 100%;
		backface-visibility: hidden;
		-webkit-backface-visibility: hidden;
		box-sizing: border-box;
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}

	.flip-front {
		transform: rotateY(0deg);
	}

	.flip-back {
		transform: rotateY(180deg);
	}

	.flip-face.scrollable {
		overflow-y: auto;
		scrollbar-width: thin;
		scrollbar-color: hsl(var(--muted)) transparent;
	}

	.flip-face.scrollable::-webkit-scrollbar {
		width: 8px;
	}

	.flip-face.scrollable::-webkit-scrollbar-track {
		background: transparent;
	}

	.flip-face.scrollable::-webkit-scrollbar-thumb {
		background: hsl(var(--muted));
		border-radius: 4px;
	}

	/* Flip Button */
	.flip-button {
		position: absolute;
		bottom: calc(1rem * var(--font-scale, 1));
		right: calc(1rem * var(--font-scale, 1));
		z-index: 10;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: calc(3rem * var(--font-scale, 1));
		height: calc(3rem * var(--font-scale, 1));
		border-radius: 50%;
		background: hsl(var(--primary));
		color: hsl(var(--primary-foreground));
		border: none;
		cursor: pointer;
		box-shadow:
			0 4px 6px rgba(0, 0, 0, 0.1),
			0 2px 4px rgba(0, 0, 0, 0.06);
		transition: all 0.3s ease;
	}

	.flip-button:hover {
		transform: scale(1.1) rotate(180deg);
		box-shadow:
			0 10px 15px rgba(0, 0, 0, 0.1),
			0 4px 6px rgba(0, 0, 0, 0.05);
	}

	.flip-button:active {
		transform: scale(1.05) rotate(180deg);
	}

	/* Content Section */
	.content-section {
		animation: fadeIn 0.3s ease-in-out;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* Responsive */
	@media (max-width: 640px) {
		.flip-button {
			width: calc(2.5rem * var(--font-scale, 1));
			height: calc(2.5rem * var(--font-scale, 1));
			bottom: calc(0.75rem * var(--font-scale, 1));
			right: calc(0.75rem * var(--font-scale, 1));
		}
	}
</style>
