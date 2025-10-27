<!--
  Mathémo - A Wordle-style game for learning French mathematical vocabulary

  Features:
  - 7 difficulty levels (6ème through Tale - French grade levels)
  - Adjustable attempts (3-10)
  - Accent normalization (type "algebre" for "algèbre")
  - Cross-level validation (can submit words from any difficulty)
  - localStorage persistence (resume on page refresh)
  - Physical keyboard + on-screen keyboard support
  - Confetti celebration on win
  - Font scaling integration (--font-scale CSS variable)

  Color scheme:
  - Blue (#5b8def) for exact/close matches
  - Gray (#c0c0c0) for missing letters
  - Different backgrounds for light/dark mode
-->
<script lang="ts">
	import { confetti } from '@neoconfetti/svelte';
	import { reducedMotion } from './reduced-motion.svelte';
	import { game } from './game.svelte';
	import dancing from '$lib/assets/images/dancing.gif';
	import type { Difficulty } from './types';
	import { Button } from '$lib/components/ui/button';
	import MySelect from '$lib/components/MySelect.svelte';

	// Random congratulations messages for when player wins
	const congrats = [
		'Nice !',
		'Good Job !',
		'Well Done !',
		'You nailed it !',
		'You rock !',
		'Great !'
	];

	// All available difficulty levels (French grade levels)
	const difficulties: Difficulty[] = ['6ème', '5ème', '4ème', '3ème', '2nde', '1ère', 'Tale'];

	// Create items array for Select component (Bits UI format)
	const difficultyItems = difficulties.map((d) => ({ value: d, label: d }));

	// ===== Local Component State =====

	/** Triggers wiggle animation when invalid word is submitted */
	let badGuess = $state(false);

	/** Track which row is currently animating (null if no animation) */
	let animatingRow = $state<number | null>(null);

	/** Indices of letters that are newly discovered in the animating row */
	let newlyDiscoveredIndices = $state<number[]>([]);

	/** Track selected difficulty for two-way binding with MySelect */
	let selectedDifficulty = $state<string>(game.difficulty);

	// ===== Derived Values (Computed from Game State) =====

	/** Has the player won the game? */
	let won = $derived(game.hasWon());

	/** Has the player lost the game? */
	let lost = $derived(game.hasLost());

	/** Is the game over (won or lost)? */
	let gameOver = $derived(game.isGameOver());

	/** Current guess being typed (may be incomplete) */
	let currentGuess = $derived(game.getCurrentGuess());

	/** Can the current guess be submitted? (at least 1 letter required) */
	let canSubmit = $derived(currentGuess.length > 0);

	/**
	 * Map of CSS classnames for keyboard styling
	 * Tracks which letters have been guessed and their status
	 * - 'exact': Letter in correct position (blue background)
	 * - 'close': Letter in word but wrong position (blue border)
	 * - 'missing': Letter not in word (gray)
	 */
	let classnames = $derived.by(() => {
		const map: Record<string, 'exact' | 'close' | 'missing'> = {};

		game.answers.forEach((answer, i) => {
			const guess = game.guesses[i];

			for (let i = 0; i < guess.length; i += 1) {
				const letter = guess[i];

				if (answer[i] === 'x') {
					map[letter] = 'exact';
				} else if (!map[letter]) {
					// Only update if not already marked as exact
					map[letter] = answer[i] === 'c' ? 'close' : 'missing';
				}
			}
		});

		return map;
	});

	/**
	 * Map of accessibility descriptions for screen readers
	 * Provides text descriptions of letter states
	 */
	let description = $derived.by(() => {
		const map: Record<string, string> = {};

		game.answers.forEach((answer, i) => {
			const guess = game.guesses[i];

			for (let i = 0; i < guess.length; i += 1) {
				const letter = guess[i];

				if (answer[i] === 'x') {
					map[letter] = 'correct';
				} else if (!map[letter]) {
					map[letter] = answer[i] === 'c' ? 'present' : 'absent';
				}
			}
		});

		return map;
	});

	// ===== Effects =====

	/**
	 * Watch for difficulty changes and start a new game
	 * Uses $effect to react to selectedDifficulty changes
	 */
	$effect(() => {
		if (selectedDifficulty !== game.difficulty && !gameOver) {
			game.startNewGame(selectedDifficulty as Difficulty, game.maxAttempts);
		}
	});

	// ===== Event Handlers =====

	/**
	 * Handle on-screen keyboard button clicks
	 * @param key - Letter to type, 'enter' to submit, or 'backspace' to delete
	 */
	function handleKeyClick(key: string) {
		if (key === 'enter') {
			if (!canSubmit) return;

			// Calculate newly discovered letters before submitting
			const currentGuessText = currentGuess;
			const currentRowIndex = game.currentRow;

			// Get all unique letters that matched (exact OR close) in ANY previous guess
			const previouslyMatchedLetters = new Set<string>();
			for (let i = 0; i < currentRowIndex; i++) {
				const guess = game.guesses[i];
				const feedback = game.answers[i];
				if (guess && feedback) {
					for (let j = 0; j < guess.length; j++) {
						const letter = guess[j].toLowerCase();
						const feedbackChar = feedback[j];
						// Only count letters that were exact ('x') or close ('c') matches
						if (feedbackChar === 'x' || feedbackChar === 'c') {
							previouslyMatchedLetters.add(letter);
						}
					}
				}
			}

			// Find indices of letters being matched for the FIRST TIME ever
			const newIndices: number[] = [];
			for (let i = 0; i < currentGuessText.length; i++) {
				const letter = currentGuessText[i].toLowerCase();
				// Only glow if this letter has never matched before
				if (!previouslyMatchedLetters.has(letter)) {
					newIndices.push(i);
				}
			}

			// Try to submit guess
			const valid = game.enterGuess();
			if (!valid) {
				// Trigger wiggle animation for invalid word
				badGuess = true;
				setTimeout(() => (badGuess = false), 500);
			} else {
				// Valid guess - trigger flip animation
				animatingRow = currentRowIndex;
				newlyDiscoveredIndices = newIndices;

				// Clear animation state after all animations complete
				setTimeout(() => {
					animatingRow = null;
					newlyDiscoveredIndices = [];
				}, 2500);
			}
		} else if (key === 'backspace') {
			game.updateGuess('backspace');
			badGuess = false;
		} else {
			// Regular letter
			game.updateGuess(key);
			badGuess = false;
		}
	}

	/**
	 * Handle physical keyboard input
	 * Supports: Enter, Backspace, and A-Z keys
	 * @param event - Keyboard event from window
	 */
	function handleKeydown(event: KeyboardEvent) {
		// Ignore keyboard input if game is over or meta key is pressed
		if (event.metaKey || gameOver) return;

		if (event.key === 'Enter') {
			handleKeyClick('enter');
		} else if (event.key === 'Backspace') {
			handleKeyClick('backspace');
		} else if (/^[a-z]$/i.test(event.key)) {
			// Only accept single letters
			handleKeyClick(event.key.toLowerCase());
		}
	}

	/**
	 * Adjust the maximum number of attempts
	 * @param delta - Amount to change (+1 or -1)
	 */
	function handleAdjustAttempts(delta: number) {
		game.adjustAttempts(delta);
	}

	/**
	 * Restart the game with same settings
	 * Clears localStorage and generates new word
	 */
	function handleRestart() {
		game.clearSaved();
		game.startNewGame(game.difficulty, game.maxAttempts);
		badGuess = false;
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<svelte:head>
	<title>Mathémo</title>
	<meta name="description" content="Un clone de Wordle adapté au cours de Maths" />
</svelte:head>

<div class="flex min-h-screen flex-col items-center justify-start gap-2 p-4 pt-4 sm:gap-4 sm:pt-8">
	<h1 class="text-3xl font-bold sm:text-4xl" style="font-family: 'pacifico'">Mathémo</h1>

	<!-- Controls: Difficulty and Attempts -->
	{#if !gameOver}
		<div class="flex flex-wrap items-center justify-center gap-2 sm:gap-4">
			<!-- Difficulty Selector -->
			<div class="flex items-center gap-1 sm:gap-2">
				<label for="difficulty" class="text-xs font-medium sm:text-sm">Niveau:</label>
				<MySelect
					type="single"
					bind:value={selectedDifficulty}
					items={difficultyItems}
					placeholder="Sélectionner un niveau"
				/>
			</div>

			<!-- Attempts Controls -->
			<div class="flex items-center gap-1 sm:gap-2">
				<span class="text-xs font-medium sm:text-sm">Tentatives:</span>
				<Button
					variant="outline"
					size="sm"
					onclick={() => handleAdjustAttempts(-1)}
					disabled={game.maxAttempts <= 3}
				>
					-
				</Button>
				<span class="text-lg font-bold">{game.maxAttempts}</span>
				<Button
					variant="outline"
					size="sm"
					onclick={() => handleAdjustAttempts(1)}
					disabled={game.maxAttempts >= 10}
				>
					+
				</Button>
			</div>
		</div>
	{/if}

	<!-- Game Grid -->
	<div
		class="grid"
		class:playing={!won}
		class:bad-guess={badGuess}
		style="--grid-size: {game.getSize()}; --max-attempts: {game.maxAttempts}"
	>
		{#each Array(game.maxAttempts) as _unused, row (row)}
			{@const current = row === game.currentRow && !gameOver}
			<h2 class="visually-hidden">Row {row + 1}</h2>
			<div class="row" class:current>
				{#each Array(game.getSize()) as _unused2, column (column)}
					{@const answer = game.answers[row]?.[column]}
					{@const value = game.guesses[row]?.[column] ?? ''}
					{@const selected = current && column === currentGuess.length}
					{@const exact = answer === 'x'}
					{@const close = answer === 'c'}
					{@const missing = answer === '_'}
					{@const clue = !value && current && !!game.correctLetters[column]}
					{@const isAnimating = animatingRow === row}
					{@const isNewDiscovery = newlyDiscoveredIndices.includes(column)}
					<div
						class="letter"
						class:exact={exact && !isAnimating}
						class:close={close && !isAnimating}
						class:missing={missing && !isAnimating}
						class:selected
						class:clue
						class:flipping={isAnimating}
						class:flipping-exact={isAnimating && exact}
						class:flipping-close={isAnimating && close}
						class:flipping-missing={isAnimating && missing}
						class:new-discovery={isNewDiscovery}
						style={isAnimating ? `animation-delay: ${column * 150}ms` : ''}
					>
						{value || (current ? game.correctLetters[column] : '')}
						<span class="visually-hidden">
							{#if exact}
								(correct)
							{:else if close}
								(present)
							{:else if missing}
								(absent)
							{:else}
								empty
							{/if}
						</span>
					</div>
				{/each}
			</div>
		{/each}
	</div>

	<!-- Controls: Keyboard or End Screen -->
	<div class="controls">
		{#if gameOver}
			<div class="flex items-center justify-center gap-8">
				{#if lost}
					<div class="flex flex-col">
						<p>Le mot mathématique était :</p>
						<span class="text-3xl font-bold text-primary">{game.answer}</span>
					</div>
				{:else if won}
					<div class="flex h-32 w-full justify-center">
						<img src={dancing} alt="célébration" />
					</div>
				{/if}
				<div class="ml-6 flex flex-col items-center">
					<div class="text-3xl" style="font-family: 'pacifico'">
						{won ? congrats[Math.floor(Math.random() * congrats.length)] : 'Game Over !'}
					</div>
					<Button onclick={handleRestart} class="my-2">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="24"
							height="24"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							class="mr-2"
						>
							<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
							<path d="M21 3v5h-5" />
							<path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
							<path d="M3 21v-5h5" />
						</svg>
						Rejouer
					</Button>
				</div>
			</div>
		{:else}
			<div class="keyboard">
				<button
					data-key="enter"
					class:selected={canSubmit}
					disabled={!canSubmit}
					onclick={() => handleKeyClick('enter')}
				>
					enter
				</button>

				<button data-key="backspace" onclick={() => handleKeyClick('backspace')}> back </button>

				{#each ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'] as row (row)}
					<div class="row">
						{#each row as letter (letter)}
							<button
								data-key={letter}
								class={classnames[letter]}
								disabled={currentGuess.length >= game.getSize()}
								onclick={() => handleKeyClick(letter)}
								aria-label="{letter} {description[letter] || ''}"
							>
								{letter}
							</button>
						{/each}
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>

{#if won}
	<div
		style="position: absolute; left: 50%; top: 30%"
		use:confetti={{
			particleCount: reducedMotion.reducedMotion ? 0 : undefined,
			force: 0.7,
			stageWidth: typeof window !== 'undefined' ? window.innerWidth : 800,
			stageHeight: typeof window !== 'undefined' ? window.innerHeight : 600,
			colors: ['#ff3e00', '#40b3ff', '#676778']
		}}
	></div>
{/if}

<style lang="postcss">
	/* ===== Grid Container ===== */
	.grid {
		/* Dynamic grid size based on target word length and number of attempts */
		/* Scale down cell size when there are more attempts to prevent overflow */
		--cell-size: calc(
			min(3rem, max(2rem, calc((100vh - 400px) / var(--max-attempts)))) * var(--font-scale)
		);
		align-self: center;
		justify-self: center;
		width: 100%;
		display: flex;
		flex-direction: column;
		justify-content: flex-start;
		gap: calc(0.2rem * var(--font-scale));
		/* Minimal margin to maximize available space */
		margin: calc(0.25rem * var(--font-scale)) 0;
	}

	/* Larger cell sizes and margins on taller screens */
	@media (min-height: 800px) {
		.grid {
			--cell-size: calc(
				min(3.5rem, max(2.5rem, calc((100vh - 500px) / var(--max-attempts)))) * var(--font-scale)
			);
			margin: calc(1rem * var(--font-scale)) 0;
		}
	}

	/* Individual grid rows (one per guess attempt) */
	.grid .row {
		display: grid;
		grid-template-columns: repeat(var(--grid-size), var(--cell-size));
		grid-gap: calc(0.2rem * var(--font-scale));
		height: var(--cell-size);
		justify-content: center;
	}

	/* Wiggle animation for invalid word submission */
	@media (prefers-reduced-motion: no-preference) {
		.grid.bad-guess .row.current {
			animation: wiggle 0.5s;
		}
	}

	/* Drop shadow on current row while game is active */
	.grid.playing .row.current {
		filter: drop-shadow(3px 3px 10px hsl(var(--muted)));
	}

	/* ===== Letter Cells ===== */

	/* Base letter cell styles (neutral/empty state) */
	.letter {
		aspect-ratio: 1; /* Square cells */
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		text-align: center;
		box-sizing: border-box;
		text-transform: lowercase;
		border: none;
		/* Font size scales with cell size */
		font-size: calc(var(--cell-size) * 0.6);
		border-radius: 2px;
		background: #e8e8e8; /* Light mode: light gray */
		margin: 0;
		color: #1a1a1a; /* Dark text on light background */
	}

	/* Dark mode letter cells */
	:global(.dark) .letter {
		background: #2a2a2a; /* Dark gray */
		color: #e8e8e8; /* Light text on dark background */
	}

	/* Clue letters (revealed after game over) */
	.clue {
		color: #666;
	}

	:global(.dark) .clue {
		color: #999;
	}

	/* Missing letter (not in word) */
	.letter.missing {
		background: #c0c0c0; /* Medium gray */
		color: #666;
	}

	:global(.dark) .letter.missing {
		background: #404040;
		color: #888;
	}

	/* Exact match (correct letter in correct position) */
	.letter.exact {
		background: #5b8def; /* Blue */
		color: white;
	}

	:global(.dark) .letter.exact {
		background: #4a7bd8; /* Slightly darker blue for dark mode */
		color: white;
	}

	/* Close match (correct letter in wrong position) */
	.letter.close {
		background: #c0c0c0; /* Same gray background as tried letters */
		color: #5b8def; /* Blue text */
		font-weight: bold;
	}

	:global(.dark) .letter.close {
		background: #404040; /* Same dark background as tried letters */
		color: #4a7bd8; /* Blue text for dark mode */
		font-weight: bold;
	}

	/* Selected/active cell (current typing position) */
	.selected {
		outline: none;
		border: max(2px, calc(var(--cell-size) * 0.08)) solid #f95454; /* Red blinking border */
		animation-name: blinking;
		animation-duration: 1.5s;
		animation-iteration-count: 100; /* Effectively infinite */
	}

	/* ===== Controls Area ===== */
	.controls {
		text-align: center;
		justify-content: center;
		/* More compact on mobile to fit with virtual keyboard */
		height: min(16vh, 8rem);
		flex-shrink: 0;
	}

	/* Larger controls area on taller screens */
	@media (min-height: 800px) {
		.controls {
			height: min(18vh, 10rem);
		}
	}

	/* ===== On-Screen Keyboard ===== */
	.keyboard {
		--gap: calc(0.2rem * var(--font-scale));
		position: relative;
		display: flex;
		flex-direction: column;
		gap: var(--gap);
		height: 100%;
	}

	/* Keyboard rows (QWERTY layout) */
	.keyboard .row {
		display: flex;
		justify-content: center;
		gap: calc(0.2rem * var(--font-scale));
		flex: 1;
	}

	/* Keyboard buttons (both enabled and disabled states) */
	.keyboard button,
	.keyboard button:disabled {
		--size: calc(min(8vw, 4vh, 40px) * var(--font-scale)); /* Responsive sizing */
		background: #d0d0d0; /* Light mode */
		margin: 0;
		color: #1a1a1a;
		width: var(--size);
		border: none;
		border-radius: 2px;
		font-size: calc(var(--size) * 0.5); /* Font size relative to button size */
		cursor: pointer;
		transition: all 0.1s; /* Smooth hover effects */
	}

	/* Dark mode keyboard buttons */
	:global(.dark) .keyboard button,
	:global(.dark) .keyboard button:disabled {
		background: #3a3a3a;
		color: #e8e8e8;
	}

	.keyboard button:hover:not(:disabled) {
		background: #b8b8b8;
	}

	:global(.dark) .keyboard button:hover:not(:disabled) {
		background: #4a4a4a;
	}

	.keyboard button.exact {
		background: #5b8def; /* Blue background - same as exact matches in grid */
		color: white;
	}

	:global(.dark) .keyboard button.exact {
		background: #4a7bd8; /* Slightly darker blue for dark mode - same as grid */
		color: white;
	}

	.keyboard button.missing {
		background: #c0c0c0;
		color: #666; /* Darker text so it's still visible */
		opacity: 0.7; /* Slightly faded to show it's not in the word */
	}

	:global(.dark) .keyboard button.missing {
		background: #404040;
		color: #999; /* Lighter text for dark mode */
		opacity: 0.7;
	}

	.keyboard button.close {
		background: #5b8def; /* Blue background - same as exact matches in grid */
		color: white;
	}

	:global(.dark) .keyboard button.close {
		background: #4a7bd8; /* Slightly darker blue for dark mode - same as grid */
		color: white;
	}

	.keyboard button:focus {
		background: #a0a0a0;
		color: #1a1a1a;
		outline: none;
	}

	:global(.dark) .keyboard button:focus {
		background: #5a5a5a;
		color: #e8e8e8;
		outline: none;
	}

	.keyboard button[data-key='enter'],
	.keyboard button[data-key='backspace'] {
		position: absolute;
		bottom: 0;
		width: calc(1.5 * var(--size));
		height: calc(1 / 3 * (100% - 2 * var(--gap)));
		text-transform: uppercase;
		font-size: calc(0.3 * var(--size));
		padding-top: calc(0.15 * var(--size));
	}

	.keyboard button[data-key='enter'] {
		right: calc(50% + 3.5 * var(--size) + 0.8rem);
	}

	.keyboard button[data-key='backspace'] {
		left: calc(50% + 3.5 * var(--size) + 0.8rem);
	}

	.keyboard button[data-key='enter']:disabled {
		opacity: 0.5;
	}

	@keyframes blinking {
		50% {
			border-color: hsl(var(--muted));
		}
	}

	@keyframes wiggle {
		0% {
			transform: translateX(0);
		}
		10% {
			transform: translateX(-2px);
		}
		30% {
			transform: translateX(4px);
		}
		50% {
			transform: translateX(-6px);
		}
		70% {
			transform: translateX(+4px);
		}
		90% {
			transform: translateX(-2px);
		}
		100% {
			transform: translateX(0);
		}
	}

	.visually-hidden {
		border: 0;
		clip: rect(0 0 0 0);
		height: auto;
		margin: 0;
		overflow: hidden;
		padding: 0;
		position: absolute;
		width: 1px;
		white-space: nowrap;
	}

	/* ===== Flip Card Animation ===== */

	/* Base styles for flipping letters - start neutral regardless of final state */
	.letter.flipping-exact,
	.letter.flipping-close,
	.letter.flipping-missing {
		background: #e8e8e8;
		color: #1a1a1a;
		font-weight: normal;
	}

	:global(.dark) .letter.flipping-exact,
	:global(.dark) .letter.flipping-close,
	:global(.dark) .letter.flipping-missing {
		background: #2a2a2a;
		color: #e8e8e8;
		font-weight: normal;
	}

	/* Flip animation - 3D rotation with color reveal at midpoint */
	@keyframes flip-to-exact {
		0% {
			transform: rotateX(0deg);
			background: #e8e8e8;
			color: #1a1a1a;
		}
		49.99% {
			transform: rotateX(90deg);
			background: #e8e8e8;
			color: #1a1a1a;
		}
		50% {
			transform: rotateX(90deg);
			background: #5b8def;
			color: white;
		}
		100% {
			transform: rotateX(0deg);
			background: #5b8def;
			color: white;
		}
	}

	@keyframes flip-to-close {
		0% {
			transform: rotateX(0deg);
			background: #e8e8e8;
			color: #1a1a1a;
			font-weight: normal;
		}
		49.99% {
			transform: rotateX(90deg);
			background: #e8e8e8;
			color: #1a1a1a;
			font-weight: normal;
		}
		50% {
			transform: rotateX(90deg);
			background: #c0c0c0;
			color: #5b8def;
			font-weight: bold;
		}
		100% {
			transform: rotateX(0deg);
			background: #c0c0c0;
			color: #5b8def;
			font-weight: bold;
		}
	}

	@keyframes flip-to-missing {
		0% {
			transform: rotateX(0deg);
			background: #e8e8e8;
			color: #1a1a1a;
		}
		49.99% {
			transform: rotateX(90deg);
			background: #e8e8e8;
			color: #1a1a1a;
		}
		50% {
			transform: rotateX(90deg);
			background: #c0c0c0;
			color: #666;
		}
		100% {
			transform: rotateX(0deg);
			background: #c0c0c0;
			color: #666;
		}
	}

	/* Dark mode flip animations */
	@keyframes flip-to-exact-dark {
		0% {
			transform: rotateX(0deg);
			background: #2a2a2a;
			color: #e8e8e8;
		}
		49.99% {
			transform: rotateX(90deg);
			background: #2a2a2a;
			color: #e8e8e8;
		}
		50% {
			transform: rotateX(90deg);
			background: #4a7bd8;
			color: white;
		}
		100% {
			transform: rotateX(0deg);
			background: #4a7bd8;
			color: white;
		}
	}

	@keyframes flip-to-close-dark {
		0% {
			transform: rotateX(0deg);
			background: #2a2a2a;
			color: #e8e8e8;
			font-weight: normal;
		}
		49.99% {
			transform: rotateX(90deg);
			background: #2a2a2a;
			color: #e8e8e8;
			font-weight: normal;
		}
		50% {
			transform: rotateX(90deg);
			background: #404040;
			color: #4a7bd8;
			font-weight: bold;
		}
		100% {
			transform: rotateX(0deg);
			background: #404040;
			color: #4a7bd8;
			font-weight: bold;
		}
	}

	@keyframes flip-to-missing-dark {
		0% {
			transform: rotateX(0deg);
			background: #2a2a2a;
			color: #e8e8e8;
		}
		49.99% {
			transform: rotateX(90deg);
			background: #2a2a2a;
			color: #e8e8e8;
		}
		50% {
			transform: rotateX(90deg);
			background: #404040;
			color: #888;
		}
		100% {
			transform: rotateX(0deg);
			background: #404040;
			color: #888;
		}
	}

	/* Glow pulse animation for newly discovered letters */
	@keyframes glow-pulse {
		0%,
		100% {
			box-shadow:
				0 0 10px rgba(91, 141, 239, 0.5),
				0 0 20px rgba(91, 141, 239, 0.3);
		}
		50% {
			box-shadow:
				0 0 30px rgba(91, 141, 239, 0.8),
				0 0 50px rgba(91, 141, 239, 0.5),
				0 0 70px rgba(91, 141, 239, 0.3);
		}
	}

	/* Dark mode glow pulse */
	@keyframes glow-pulse-dark {
		0%,
		100% {
			box-shadow:
				0 0 10px rgba(74, 123, 216, 0.5),
				0 0 20px rgba(74, 123, 216, 0.3);
		}
		50% {
			box-shadow:
				0 0 30px rgba(74, 123, 216, 0.8),
				0 0 50px rgba(74, 123, 216, 0.5),
				0 0 70px rgba(74, 123, 216, 0.3);
		}
	}

	/* Apply flip animation to letters when row is animating */
	@media (prefers-reduced-motion: no-preference) {
		/* Apply specific flip animation based on final state */
		.letter.flipping-exact {
			animation: flip-to-exact 0.6s ease-in-out;
			animation-fill-mode: forwards;
		}

		.letter.flipping-close {
			animation: flip-to-close 0.6s ease-in-out;
			animation-fill-mode: forwards;
		}

		.letter.flipping-missing {
			animation: flip-to-missing 0.6s ease-in-out;
			animation-fill-mode: forwards;
		}

		/* Dark mode uses different animations */
		:global(.dark) .letter.flipping-exact {
			animation: flip-to-exact-dark 0.6s ease-in-out;
			animation-fill-mode: forwards;
		}

		:global(.dark) .letter.flipping-close {
			animation: flip-to-close-dark 0.6s ease-in-out;
			animation-fill-mode: forwards;
		}

		:global(.dark) .letter.flipping-missing {
			animation: flip-to-missing-dark 0.6s ease-in-out;
			animation-fill-mode: forwards;
		}

		/* ONLY newly discovered letters get glow - combine with their flip animation */
		.letter.flipping-exact.new-discovery {
			animation:
				flip-to-exact 0.6s ease-in-out,
				glow-pulse 0.8s ease-in-out 0.6s 50;
			animation-fill-mode: forwards;
		}

		.letter.flipping-close.new-discovery {
			animation:
				flip-to-close 0.6s ease-in-out,
				glow-pulse 0.8s ease-in-out 0.6s 50;
			animation-fill-mode: forwards;
		}

		/* Missing letters don't get glow effect - they just flip normally */

		/* Dark mode new discoveries */
		:global(.dark) .letter.flipping-exact.new-discovery {
			animation:
				flip-to-exact-dark 0.6s ease-in-out,
				glow-pulse-dark 0.8s ease-in-out 0.6s 3;
			animation-fill-mode: forwards;
		}

		:global(.dark) .letter.flipping-close.new-discovery {
			animation:
				flip-to-close-dark 0.6s ease-in-out,
				glow-pulse-dark 0.8s ease-in-out 0.6s 3;
			animation-fill-mode: forwards;
		}

		/* Missing letters don't get glow effect in dark mode either */
	}

	/* For users who prefer reduced motion, skip animations */
	@media (prefers-reduced-motion: reduce) {
		.letter.flipping,
		.letter.new-discovery {
			animation: none;
		}
	}
</style>
