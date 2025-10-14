<script lang="ts">
	import ChatBot from '$lib/components/ChatBot.svelte';
	import { ArrowLeft } from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button';
	import pereUbuImage from '$lib/assets/images/pereubu.png';

	// Pere Ubu quotes for interaction
	const pereUbuQuotes = [
		'Cornegidouille ! Les mathématiques sont ma passion !',
		'De par ma chandelle verte, tu vas comprendre !',
		'Merdre ! Quelle belle équation !',
		'Par ma science phynancière, tout devient clair !',
		'Tudieu ! Les nombres sont mes amis !',
		'Hornphynance ! Voilà qui est bien calculé !',
		"Ventrebleu ! Les fractions sont un jeu d'enfant !",
		'Par ma gidouille ! Les mathématiques pataphysiques règnent !'
	];

	let lastQuoteIndex = $state(-1);
	let showSpeechBubble = $state(false);
	let currentQuote = $state('');

	function handlePereUbuClick() {
		// Get a random quote different from the last one
		let randomIndex;
		do {
			randomIndex = Math.floor(Math.random() * pereUbuQuotes.length);
		} while (randomIndex === lastQuoteIndex && pereUbuQuotes.length > 1);

		lastQuoteIndex = randomIndex;
		currentQuote = pereUbuQuotes[randomIndex];

		// Show speech bubble
		showSpeechBubble = true;

		// Hide after 4 seconds
		setTimeout(() => {
			showSpeechBubble = false;
		}, 4000);
	}
</script>

<svelte:head>
	<title>Père Ubu - Professeur Pataphysique | UbuMaths</title>
	<meta
		name="description"
		content="Discutez avec le Père Ubu, votre professeur de mathématiques le plus absurde ! Posez vos questions et recevez des explications... pataphysiques."
	/>
</svelte:head>

<div class="container mx-auto max-w-5xl p-4">
	<!-- Back Button -->
	<div class="mb-4">
		<Button variant="ghost" href="/" class="gap-2">
			<ArrowLeft class="h-4 w-4" />
			Retour à l'accueil
		</Button>
	</div>

	<!-- Chatbot Component with Rocking Pere Ubu -->
	<div class="relative mx-auto max-w-4xl">
		<!-- Rocking Pere Ubu Image with Speech Bubble (hidden on mobile) -->
		<div class="absolute top-1/2 -left-60 hidden -translate-y-1/2 lg:block">
			<!-- Speech Bubble -->
			{#if showSpeechBubble}
				<div
					class="speech-bubble animate-in fade-in zoom-in-95 absolute -top-32 left-1/2 w-64 -translate-x-1/2 rounded-2xl border-2 border-primary bg-white px-4 py-3 text-foreground shadow-xl duration-300"
				>
					<p class="text-center text-sm font-medium">{currentQuote}</p>
					<!-- Speech bubble pointer -->
					<div class="speech-pointer"></div>
				</div>
			{/if}

			<!-- Pere Ubu Button -->
			<button
				onclick={handlePereUbuClick}
				class="relative cursor-pointer transition-transform hover:scale-105"
				title="Cliquez pour une citation du Père Ubu !"
				aria-label="Père Ubu qui se balance"
			>
				<img
					src={pereUbuImage}
					alt="Père Ubu qui se balance"
					class="rocking-animation h-72 w-72 object-contain"
				/>
			</button>
		</div>

		<ChatBot personalityKey="pereUbu" />
	</div>
</div>

<style>
	/* Rocking chair animation - slow and comical */
	@keyframes rock {
		0%,
		100% {
			transform: rotate(-8deg);
		}
		50% {
			transform: rotate(8deg);
		}
	}

	:global(.rocking-animation) {
		animation: rock 4s ease-in-out infinite;
		transform-origin: center bottom;
	}

	/* Pause animation on hover for interaction */
	:global(button:hover .rocking-animation) {
		animation-play-state: paused;
	}

	/* Comic speech bubble pointer */
	.speech-pointer {
		position: absolute;
		bottom: -12px;
		left: 50%;
		transform: translateX(-50%);
		width: 0;
		height: 0;
		border-left: 12px solid transparent;
		border-right: 12px solid transparent;
		border-top: 12px solid hsl(var(--primary));
	}

	.speech-pointer::after {
		content: '';
		position: absolute;
		bottom: 2px;
		left: -10px;
		width: 0;
		height: 0;
		border-left: 10px solid transparent;
		border-right: 10px solid transparent;
		border-top: 10px solid white;
	}

	/* Comic speech bubble style */
	.speech-bubble {
		position: relative;
		font-family: 'Comic Sans MS', 'Comic Sans', cursive, sans-serif;
	}
</style>
