<script lang="ts">
	import { onMount } from 'svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { cn } from '$lib/utils';

	interface Achievement {
		name: string;
		icon: string;
		difficulty: string | null;
	}

	interface Props {
		achievement: Achievement;
		onClose: () => void;
		autoDismiss?: number; // Auto-dismiss after X milliseconds (default: 5000)
	}

	let { achievement, onClose, autoDismiss = 5000 }: Props = $props();

	let isVisible = $state(false);
	let autoDismissTimer: ReturnType<typeof setTimeout> | null = null;

	/**
	 * Translate difficulty to French
	 */
	function translateDifficulty(diff: string): string {
		switch (diff) {
			case 'beginner':
				return 'Débutant';
			case 'intermediate':
				return 'Intermédiaire';
			case 'expert':
				return 'Expert';
			default:
				return diff;
		}
	}

	/**
	 * Handle close action
	 */
	function handleClose() {
		isVisible = false;
		// Wait for animation to complete before calling onClose
		setTimeout(onClose, 300);
	}

	// Mount animation and auto-dismiss
	onMount(() => {
		// Trigger entrance animation
		requestAnimationFrame(() => {
			isVisible = true;
		});

		// Setup auto-dismiss if enabled
		if (autoDismiss > 0) {
			autoDismissTimer = setTimeout(handleClose, autoDismiss);
		}

		// Cleanup
		return () => {
			if (autoDismissTimer) {
				clearTimeout(autoDismissTimer);
			}
		};
	});
</script>

<!-- Toast container - fixed positioning -->
<div
	class={cn(
		'fixed top-4 right-4 z-50 w-full max-w-md transition-all duration-300 ease-out',
		isVisible ? 'translate-x-0 scale-100 opacity-100' : 'translate-x-full scale-95 opacity-0'
	)}
	role="alert"
	aria-live="assertive"
	aria-atomic="true"
>
	<!-- Toast card -->
	<div
		class="rounded-lg border-2 border-primary-foreground/20 bg-primary p-6 text-primary-foreground shadow-2xl backdrop-blur-sm"
	>
		<!-- Close button -->
		<button
			onclick={handleClose}
			class="absolute top-2 right-2 text-primary-foreground/70 transition-colors hover:text-primary-foreground"
			aria-label="Fermer la notification"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				class="h-5 w-5"
			>
				<line x1="18" y1="6" x2="6" y2="18"></line>
				<line x1="6" y1="6" x2="18" y2="18"></line>
			</svg>
		</button>

		<!-- Content -->
		<div class="flex items-center gap-4 pr-6">
			<!-- Icon with pulse animation -->
			<div class="flex-shrink-0 animate-[pulse_1s_ease-in-out_3]">
				<span class="text-6xl" aria-hidden="true">{achievement.icon}</span>
			</div>

			<!-- Text content -->
			<div class="min-w-0 flex-1">
				<p class="text-sm font-semibold tracking-wide uppercase opacity-90">Succès débloqué !</p>
				<h3 class="mt-1 text-2xl leading-tight font-bold">{achievement.name}</h3>
				{#if achievement.difficulty}
					<Badge
						variant="secondary"
						class="mt-2 border-primary-foreground/30 bg-primary-foreground/20 text-primary-foreground"
					>
						{translateDifficulty(achievement.difficulty)}
					</Badge>
				{/if}
			</div>
		</div>

		<!-- Optional: View all achievements button -->
		<div class="mt-4 border-t border-primary-foreground/20 pt-4">
			<a href="/dashboard/student/minesweeper/achievements" class="block">
				<Button
					variant="secondary"
					size="sm"
					class="w-full border-primary-foreground/30 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20"
				>
					Voir tous mes succès
				</Button>
			</a>
		</div>
	</div>
</div>

<style>
	/* Custom pulse animation for the icon */
	@keyframes pulse {
		0%,
		100% {
			transform: scale(1);
		}
		50% {
			transform: scale(1.1);
		}
	}
</style>
