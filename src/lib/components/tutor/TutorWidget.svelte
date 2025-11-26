<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { X, Minimize2, Maximize2 } from 'lucide-svelte';
	import TutorChat from './TutorChat.svelte';
	import pereUbuImage from '$lib/assets/images/avatar-pereubu.png';

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
	}

	let { exerciseContext }: Props = $props();

	// Widget state
	let isOpen = $state(false);
	let isMinimized = $state(false);
</script>

<!--
	TutorWidget Component
	=====================

	Floating widget that provides access to the tutor from anywhere.
	Can be expanded/collapsed and minimized.

	FEATURES:
	- Floating button in bottom-right corner
	- Expandable chat panel
	- Minimize/maximize controls
	- Persistent across page (session-scoped)
	- Responsive positioning
	- Z-index above other content

	PROPS:
	- exerciseContext?: Optional exercise context for targeted help

	USAGE:
	```svelte
	<TutorWidget />
	<!-- Or with context -->
<TutorWidget exerciseContext={{ statement: 'Calculate...', topic: 'algebra' }} />
``` @component -->

<!-- Floating button when closed -->
{#if !isOpen}
	<button
		onclick={() => (isOpen = true)}
		class="fixed right-4 bottom-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg transition-transform hover:scale-105 focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:outline-none"
		aria-label="Ouvrir le tuteur Père Ubu"
	>
		<img src={pereUbuImage} alt="Père Ubu" class="h-10 w-10 rounded-full" />
	</button>
{:else}
	<!-- Chat panel when open -->
	<div
		class="fixed right-4 bottom-4 z-50 flex flex-col rounded-lg border border-border bg-card shadow-2xl transition-all duration-200 {isMinimized
			? 'h-14 w-80'
			: 'h-[600px] max-h-[calc(100vh-2rem)] w-[450px]'}"
	>
		<!-- Header -->
		<div
			class="flex items-center justify-between gap-2 rounded-t-lg border-b border-border bg-primary p-3 text-primary-foreground"
		>
			<div class="flex items-center gap-2">
				<img src={pereUbuImage} alt="Père Ubu" class="h-8 w-8 rounded-full" />
				<span
					class="font-medium"
					style="font-size: calc(0.875rem * var(--font-scale)); line-height: calc(1.25rem * var(--font-scale));"
				>
					Père Ubu - Tuteur
				</span>
			</div>
			<div class="flex gap-1">
				<Button
					variant="ghost"
					size="icon"
					class="h-8 w-8 text-primary-foreground hover:bg-white/20"
					onclick={() => (isMinimized = !isMinimized)}
					aria-label={isMinimized ? 'Agrandir' : 'Réduire'}
				>
					{#if isMinimized}
						<Maximize2 class="h-4 w-4" />
					{:else}
						<Minimize2 class="h-4 w-4" />
					{/if}
				</Button>
				<Button
					variant="ghost"
					size="icon"
					class="h-8 w-8 text-primary-foreground hover:bg-white/20"
					onclick={() => (isOpen = false)}
					aria-label="Fermer"
				>
					<X class="h-4 w-4" />
				</Button>
			</div>
		</div>

		<!-- Chat content (hidden when minimized) -->
		{#if !isMinimized}
			<div class="flex-1 overflow-hidden">
				<TutorChat {exerciseContext} />
			</div>
		{/if}
	</div>
{/if}
