<!--
	VipCardLoading Component
	=========================
	Shows a mystery VIP card (back side) with gentle shake animation
	while waiting for the database to process the card award.

	Animation:
	- Gentle wobble (rotation -3° to +3°)
	- Subtle breathing scale (0.98 to 1.02)
	- Pulsing glow effect
	- Sparkles around the card
	- No progress bar, no timeout - purely magical
-->

<script lang="ts">
	import { cn } from '$lib/utils';

	interface Props {
		visible?: boolean;
		studentName?: string;
	}

	let {
		visible = true,
		studentName = 'Élève'
	}: Props = $props();

	// Generate random sparkles
	function generateSparkles() {
		const sparkles: Array<{ left: number; top: number; delay: number; duration: number }> = [];
		for (let i = 0; i < 15; i++) {
			sparkles.push({
				left: 20 + Math.random() * 60,
				top: 20 + Math.random() * 60,
				delay: Math.random() * 2000,
				duration: 1500 + Math.random() * 1500
			});
		}
		return sparkles;
	}

	const sparkles = generateSparkles();
</script>

<!-- Fullscreen Overlay -->
<div
	class={cn(
		'fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-500',
		visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
	)}
	role="status"
	aria-live="polite"
	aria-label="Attribution d'une carte VIP en cours"
>
	<!-- Backdrop -->
	<div class="absolute inset-0 bg-black/80 backdrop-blur-sm"></div>

	<!-- Content Container -->
	<div class="relative z-10 flex flex-col items-center gap-6">
		<!-- Sparkles Background -->
		<div class="absolute inset-0 pointer-events-none overflow-hidden w-screen h-screen">
			{#each sparkles as sparkle}
				<div
					class="absolute w-2 h-2 bg-yellow-300 rounded-full animate-sparkle"
					style="
						left: {sparkle.left}%;
						top: {sparkle.top}%;
						animation-delay: {sparkle.delay}ms;
						animation-duration: {sparkle.duration}ms;
					"
				></div>
			{/each}
		</div>

		<!-- Title -->
		<h2
			class={cn(
				'text-4xl font-black text-white text-center transition-all duration-700',
				'drop-shadow-[0_0_10px_rgba(255,215,0,0.5)] animate-glow',
				visible ? 'translate-y-0 opacity-100' : '-translate-y-10 opacity-0'
			)}
		>
			✨ Tirage de ta carte VIP... ✨
		</h2>

		<!-- Mystery Card with Gentle Shake -->
		<div
			class={cn(
				'mystery-card transition-all duration-700',
				visible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
			)}
		>
			<!-- Card Back (Luxury Gold Design) -->
			<div
				class="w-64 h-96 rounded-xl shadow-2xl overflow-hidden border-4 border-amber-400 relative"
			>
				<!-- Luxury Background -->
				<div class="w-full h-full bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 relative">
					<!-- Geometric Pattern Overlay -->
					<div class="absolute inset-0 opacity-20" style="background-image: repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(255,255,255,.3) 35px, rgba(255,255,255,.3) 70px);"></div>

					<!-- Radial Gradient Shine -->
					<div class="absolute inset-0 bg-gradient-radial from-white/30 via-transparent to-transparent"></div>

					<!-- Center VIP Logo -->
					<div class="absolute inset-0 flex flex-col items-center justify-center text-white">
						<div class="text-center">
							<div class="text-8xl font-black tracking-wider mb-2" style="text-shadow: 2px 2px 8px rgba(0,0,0,0.3);">
								VIP
							</div>
							<div class="text-base font-bold tracking-widest" style="text-shadow: 1px 1px 4px rgba(0,0,0,0.3);">
								CARTE PRIVILÈGE
							</div>
							<div class="mt-4 w-16 h-1 bg-white/50 mx-auto rounded-full"></div>
							<div class="mt-4 text-sm opacity-80">
								?
							</div>
						</div>
					</div>

					<!-- Corner Decorations -->
					<div class="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-white/60 rounded-tl-lg"></div>
					<div class="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-white/60 rounded-tr-lg"></div>
					<div class="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-white/60 rounded-bl-lg"></div>
					<div class="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-white/60 rounded-br-lg"></div>
				</div>
			</div>
		</div>

		<!-- Subtitle -->
		<p
			class={cn(
				'text-lg text-white/80 transition-all duration-700 delay-300',
				visible ? 'opacity-100' : 'opacity-0'
			)}
		>
			Sélection en cours pour {studentName}...
		</p>
	</div>
</div>

<style>
	/* Sparkle Animation */
	@keyframes sparkle {
		0%, 100% {
			opacity: 0;
			transform: scale(0);
		}
		50% {
			opacity: 1;
			transform: scale(1);
		}
	}

	.animate-sparkle {
		animation: sparkle 2s ease-in-out infinite;
	}

	/* Gentle Shake Animation for Mystery Card */
	@keyframes gentle-shake {
		0% {
			transform: rotate(-2deg) scale(0.98);
		}
		25% {
			transform: rotate(2deg) scale(1.02);
		}
		50% {
			transform: rotate(-3deg) scale(0.99);
		}
		75% {
			transform: rotate(3deg) scale(1.01);
		}
		100% {
			transform: rotate(-2deg) scale(0.98);
		}
	}

	/* Glow Pulse Animation */
	@keyframes glow-pulse {
		0%, 100% {
			box-shadow: 0 0 20px rgba(251, 191, 36, 0.4), 0 0 40px rgba(251, 191, 36, 0.2);
		}
		50% {
			box-shadow: 0 0 40px rgba(251, 191, 36, 0.8), 0 0 60px rgba(251, 191, 36, 0.4);
		}
	}

	/* Pulsing glow animation for title */
	@keyframes glow {
		0%, 100% {
			text-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
		}
		50% {
			text-shadow: 0 0 20px rgba(255, 215, 0, 0.8), 0 0 30px rgba(255, 215, 0, 0.6);
		}
	}

	.animate-glow {
		animation: glow 2s ease-in-out infinite;
	}

	/* Apply animations to mystery card */
	.mystery-card {
		animation: gentle-shake 3s ease-in-out infinite, glow-pulse 2s ease-in-out infinite;
	}

	/* Radial gradient utility */
	.bg-gradient-radial {
		background: radial-gradient(circle at center, rgba(255,255,255,0.3) 0%, transparent 70%);
	}
</style>
