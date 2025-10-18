<script lang="ts">
	import { confetti } from '@neoconfetti/svelte'
	import { enhance } from '$app/forms'
	import { reduced_motion } from './reduced-motion'
	import dancing from '$lib/images/dancing.gif'
	import IconReload from '$lib/ui/icons/IconReload.svelte'
	import { fullScreen } from '$lib/stores'
	import PageHeader from '$lib/ui/PageHeader.svelte'

	export let data

	export let form

	const congrats = [
		'Nice !',
		'Good Job !',
		'Well Done !',
		'You nailed it !',
		'You rock !',
		'Great !',
	]

	let checking = false

	$: console.log('correctLetters', data.correctLetters)
	$: console.log('size', data.size)

	/** Whether or not the user has won */
	$: won = data.answers.at(-1) === 'xxxxxxxxxxxxxxxxx'.substring(0, data.size)

	/** The index of the current guess */
	$: i = won ? -1 : data.answers.length

	/** Whether the current guess can be submitted */
	$: submittable = true
	// $: submittable = data.guesses[i]?.length === data.size

	/**
	 * A map of classnames for all letters that have been guessed,
	 * used for styling the keyboard
	 */
	let classnames: Record<string, 'exact' | 'close' | 'missing'>

	/**
	 * A map of descriptions for all letters that have been guessed,
	 * used for adding text for assistive technology (e.g. screen readers)
	 */
	let description: Record<string, string>

	$: {
		classnames = {}
		description = {}

		data.answers.forEach((answer, i) => {
			const guess = data.guesses[i]

			for (let i = 0; i < guess.length; i += 1) {
				const letter = guess[i]

				if (answer[i] === 'x') {
					classnames[letter] = 'exact'
					description[letter] = 'correct'
				} else if (!classnames[letter]) {
					classnames[letter] = answer[i] === 'c' ? 'close' : 'missing'
					description[letter] = answer[i] === 'c' ? 'present' : 'absent'
				}
			}
		})
	}

	/**
	 * Modify the game state without making a trip to the server,
	 * if client-side JavaScript is enabled
	 */
	function update(event: MouseEvent) {
		const guess = data.guesses[i]
		const key = (event.target as HTMLButtonElement).getAttribute('data-key')

		if (key === 'backspace') {
			data.guesses[i] = guess.slice(0, -1)
			if (form?.badGuess) form.badGuess = false
		} else if (guess.length < data.size) {
			data.guesses[i] += key
		}
	}

	/**
	 * Trigger form logic in response to a keydown event, so that
	 * desktop users can use the keyboard to play the game
	 */
	function keydown(event: KeyboardEvent) {
		if (event.metaKey) return

		document
			.querySelector(`[data-key="${event.key}" i]`)
			?.dispatchEvent(new MouseEvent('click', { cancelable: true }))
	}
</script>

<svelte:window on:keydown={keydown} />

<svelte:head>
	<title>Mathemo</title>
	<meta name="description" content="Un clone de Wordle adapté au cours de Maths" />
</svelte:head>

{#if !$fullScreen}
	<PageHeader title="Mathémo" />
{/if}

<form
	method="POST"
	action="?/enter"
	use:enhance={() => {
		// prevent default callback from resetting the form
		return ({ update }) => {
			update({ reset: false })
		}
	}}
>
	<div
		class="grid"
		class:playing={!won}
		class:bad-guess={form?.badGuess}
		style="--grid-size: {data.size}"
	>
		{#each Array(6) as _, row}
			{@const current = row === i}
			<h2 class="visually-hidden">Row {row + 1}</h2>
			<div class="row" class:current>
				{#each Array(data.size) as _, column}
					{@const answer = data.answers[row]?.[column]}
					{@const value = data.guesses[row]?.[column] ?? ''}
					{@const selected = current && column === data.guesses[row].length}
					{@const exact = answer === 'x'}
					{@const close = answer === 'c'}
					{@const missing = answer === '_'}
					{@const clue = !value && current && !!data.correctLetters[column]}
					<div class="letter" class:exact class:close class:missing class:selected class:clue>
						{value || (current ? data.correctLetters[column] : '')}
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
						<input name="guess" disabled={!current} type="hidden" {value} />
					</div>
				{/each}
			</div>
		{/each}
		<input name="size" type="hidden" value={data.size} />
	</div>

	<div class="controls">
		{#if won || data.answers.length >= 6}
			<div class="flex items-center justify-center gap-8">
				{#if !won && data.answer}
					<div class="flex flex-col">
						<p>Le mot mathématique était :</p>
						<span class="text-primary-500 text-3xl font-bold">{data.answer}</span>
					</div>
				{:else if won}
					<div class="flex h-32 w-full justify-center">
						<img src={dancing} alt="célébration" />
					</div>
				{/if}
				<div class="ml-6 flex flex-col items-center">
					<div class="text-3xl" style="font-family:'pacifico'">
						{won ? congrats[Math.floor(Math.random() * congrats.length)] : 'Game Over !'}
					</div>
					<button
						data-key="enter"
						class=" btn-icon variant-filled-primary my-2"
						formaction="?/restart"
					>
						<IconReload />
					</button>
				</div>
			</div>
		{:else}
			<div class="keyboard">
				<button data-key="enter" class:selected={submittable} disabled={!submittable}>enter</button>

				<button
					on:click|preventDefault={update}
					data-key="backspace"
					formaction="?/update"
					name="key"
					value="backspace"
				>
					back
				</button>

				{#each ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'] as row}
					<div class="row">
						{#each row as letter}
							<button
								on:click|preventDefault={update}
								data-key={letter}
								class={classnames[letter]}
								disabled={data.guesses[i].length === data.size}
								formaction="?/update"
								name="key"
								value={letter}
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
</form>

{#if won}
	<div
		style="position: absolute; left: 50%; top: 30%"
		use:confetti={{
			particleCount: $reduced_motion ? 0 : undefined,
			force: 0.7,
			stageWidth: window.innerWidth,
			stageHeight: window.innerHeight,
			colors: ['#ff3e00', '#40b3ff', '#676778'],
		}}
	/>
{/if}

<style lang="postcss">
	form {
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		flex: 1;
	}

	.how-to-play {
		color: var(--color-text);
	}

	.how-to-play::before {
		content: 'i';
		display: inline-block;
		font-size: 0.8em;
		font-weight: 900;
		width: 1em;
		height: 1em;
		padding: 0.2em;
		line-height: 1;
		border: 1.5px solid var(--color-text);
		border-radius: 50%;
		text-align: center;
		margin: 0 0.5em 0 0;
		position: relative;
		top: -0.05em;
	}

	.grid {
		/* --width: min(100vw, 40vh, 380px); */
		--width: calc(var(--grid-size) * 3.5rem);
		--height: calc(7 * 3rem);
		max-width: var(--width);
		max-height: var(--height);
		align-self: center;
		justify-self: center;
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		justify-content: flex-start;
	}

	.grid .row {
		display: grid;
		grid-template-columns: repeat(var(--grid-size), 1fr);
		grid-gap: 0.2rem;
		margin: 0 0 0.2rem 0;
	}

	@media (prefers-reduced-motion: no-preference) {
		.grid.bad-guess .row.current {
			animation: wiggle 0.5s;
		}
	}

	.grid.playing .row.current {
		filter: drop-shadow(3px 3px 10px rgba(var(--color-surface-800)));
	}

	.letter {
		aspect-ratio: 1;
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		text-align: center;
		box-sizing: border-box;
		text-transform: lowercase;
		border: none;
		font-size: 2rem;
		border-radius: 2px;
		background: rgba(var(--color-surface-200));
		margin: 0;
		color: rgba(var(--on-surface));
	}

	.clue {
		@apply text-surface-600;
	}

	.letter.missing {
		background: rgba(var(--color-surface-400));
		color: rgba(var(--on-surface));
		@apply text-surface-700;
	}

	.letter.exact {
		background: rgba(var(--color-primary-500));
		color: rgba(var(--on-primary));
	}

	.letter.close {
		border: 3px solid rgba(var(--color-primary-500));
	}

	.selected {
		outline: none;
		border: 3px solid #f95454;
		animation-name: blinking;
		animation-duration: 1.5s;
		animation-iteration-count: 100;
	}

	.controls {
		text-align: center;
		justify-content: center;
		height: min(18vh, 10rem);
	}

	.keyboard {
		--gap: 0.2rem;
		position: relative;
		display: flex;
		flex-direction: column;
		gap: var(--gap);
		height: 100%;
	}

	.keyboard .row {
		display: flex;
		justify-content: center;
		gap: 0.2rem;
		flex: 1;
	}

	.keyboard button,
	.keyboard button:disabled {
		--size: min(8vw, 4vh, 40px);
		background: rgba(var(--color-surface-300));
		margin: 0;
		color: rgba(var(--on-surface));
		width: var(--size);
		border: none;
		border-radius: 2px;
		font-size: calc(var(--size) * 0.5);
		margin: 0;
	}

	.keyboard button.exact {
		background: rgba(var(--color-primary-500));
		color: rgba(var(--on-primary));
	}

	.keyboard button.missing {
		background: rgba(var(--color-surface-400));
		color: rgba(var(--color-surface-400));
	}

	.keyboard button.close {
		border: 4px solid rgba(var(--color-primary-500));
	}

	.keyboard button:focus {
		background: rgba(var(--color-tertiary-500));
		color: rgba(var(--on-tertiary));
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
			border-color: #e1ddd5;
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
</style>
