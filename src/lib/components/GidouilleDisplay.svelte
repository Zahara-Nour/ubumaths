<script lang="ts">
	import gidouilleImage from '$lib/assets/images/gidouille.png';

	interface Props {
		count: number;
	}

	let { count }: Props = $props();

	// Generate random positions for floating gidouilles
	const floatingGidouilles = Array.from({ length: 5 }, (_, i) => ({
		delay: i * 0.2,
		x: Math.random() * 80 - 40, // Random X offset
		rotation: Math.random() * 360
	}));
</script>

<div class="relative overflow-hidden rounded-lg border border-border bg-gradient-to-br from-amber-50 to-orange-100 p-6 dark:from-amber-950 dark:to-orange-950">
	<!-- Title -->
	<div class="mb-4 text-center">
		<h2 class="text-2xl font-bold text-amber-900 dark:text-amber-100">Trésor de Gidouilles</h2>
	</div>

	<!-- Treasure Chest with Gidouilles -->
	<div class="relative flex flex-col items-center justify-center">
		<!-- Main treasure chest icon (using emoji for now) -->
		<div class="relative z-10 text-8xl animate-bounce" style="animation-duration: 2s;">
			💰
		</div>

		<!-- Large centered gidouille count -->
		<div class="relative z-20 -mt-8 flex items-center gap-3 rounded-full bg-white px-6 py-3 shadow-lg dark:bg-gray-800">
			<img src={gidouilleImage} alt="Gidouille" class="h-8 w-8" />
			<span class="text-3xl font-bold text-amber-600 dark:text-amber-400">{count}</span>
		</div>

		<!-- Floating/spilling gidouilles -->
		<div class="pointer-events-none absolute inset-0">
			{#each floatingGidouilles as gidouille, i}
				<img
					src={gidouilleImage}
					alt=""
					class="absolute h-6 w-6 animate-float opacity-80"
					style="
						left: calc(50% + {gidouille.x}px);
						top: 30%;
						animation-delay: {gidouille.delay}s;
						transform: rotate({gidouille.rotation}deg);
					"
				/>
			{/each}
		</div>
	</div>

	<!-- Fun message -->
	<p class="mt-4 text-center text-sm text-amber-800 dark:text-amber-200">
		Continue à gagner des gidouilles pour débloquer des cartes VIP !
	</p>
</div>

<style>
	@keyframes float {
		0%,
		100% {
			transform: translateY(0) rotate(0deg);
			opacity: 0;
		}
		50% {
			opacity: 0.8;
		}
		100% {
			transform: translateY(-100px) rotate(360deg);
			opacity: 0;
		}
	}

	.animate-float {
		animation: float 3s ease-in-out infinite;
	}
</style>
