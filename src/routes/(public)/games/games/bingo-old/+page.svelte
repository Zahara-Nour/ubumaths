<script lang="ts">
	import QuestionCard from '$lib/ui/QuestionCard.svelte'
	import type { Game } from './types'
	import CorrectionGrid from './CorrectionGrid.svelte'
	import games from './games'
	import type { AnsweredQuestion, Timer } from '../../../../types/type'
	import generateQuestion from '$lib/questions/generateQuestion'
	import { prepareAnsweredQuestion, prepareCorrectedQuestion } from '$lib/questions/correction'
	import CircularProgress from '$lib/ui/CircularProgress.svelte'
	import { onDestroy } from 'svelte'
	import { createTimer } from '$lib/timer'
	import { tick as svelte_tick } from 'svelte'
	import { getToastStore } from '@skeletonlabs/skeleton'
	import { page } from '$app/stores'
	import PageHeader from '$lib/ui/PageHeader.svelte'
	import { fullScreen } from '$lib/stores'
	import Grid from '$lib/ui/icons/IconGrid.svelte'
	import IconGrid from '$lib/ui/icons/IconGrid.svelte'

	const toastStore = getToastStore()
	let game: Game
	let draws: Array<AnsweredQuestion> = []
	const results: number[] = []
	let availables: Array<number> = []
	let chosen = ''
	let current = -1
	let percentage = 100
	let timer: Timer
	let delay: number
	let finish = false
	let pause = false
	let displayGrid = false

	let question: AnsweredQuestion
	let drawStackRef: HTMLDivElement

	$: chosen = $page.url.searchParams.get('game')
		? JSON.parse(decodeURI($page.url.searchParams.get('game') as string))
		: ''

	onDestroy(() => {
		if (timer) timer.stop()
	})

	$: start(chosen)

	function start(chosen: string) {
		if (chosen) {
			game = games[chosen]
			console.log('game', game, games, Object.keys(games))
			console.log(Object.keys(games)[1] === chosen)
			console.log(chosen)
			console.log(Object.keys(games)[1])
			if (game.length !== 90) {
				console.log('Le jeu doit contenir 90 questions')
				toastStore.trigger({
					message: 'Le jeu doit contenir 90 questions',
					background: 'bg-error-500',
				})
			}
			const solutions = game
				.map(
					(q) =>
						prepareCorrectedQuestion(prepareAnsweredQuestion(generateQuestion({ ...q, id: '' })))
							.solutions[0] as string,
				)
				.sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
			console.log('solutions', solutions)
			availables = Array(game.length)
				.fill(0)
				.map((_, i) => i + 1)
			drawQuestion()
		}
	}
	function top(secondsRemaining: number) {
		// top toutes les 1s
		console.log('top', secondsRemaining)
	}

	function togglePause() {
		if (!displayGrid) {
			if (pause) {
				timer.resume()
			} else {
				timer.pause()
			}
			pause = !pause
		}
	}

	function handleKeydown(ev: KeyboardEvent) {
		if (ev.code === 'Space') {
			ev.preventDefault()
			togglePause()
		}
	}

	async function drawQuestion() {
		if (timer) timer.stop()
		current++
		if (current) {
			draws.push(question)
			draws = draws
			console.log('draws.push', question)
			await svelte_tick()
			drawStackRef.scrollTop = drawStackRef.scrollHeight
		}
		if (current < game.length) {
			console.log('availables', availables)
			const n = availables[Math.floor(Math.random() * availables.length)]
			console.log('n', n)
			availables.splice(availables.indexOf(n), 1)
			// force update
			availables = availables
			const q = game[n - 1]
			console.log('q', q)
			question = prepareAnsweredQuestion(generateQuestion({ ...q, id: '' }))
			// delay = question.delay || question.defaultDelay || 10
			delay = 2
			percentage = 0
			timer = createTimer({
				delay,
				top,
				tick,
				timeout: drawQuestion,
			})
			timer.start()
		} else {
			finish = true
		}
	}

	function tick(msRemaining: number) {
		// top toutes les 10ms
		// en ms
		percentage = ((msRemaining / 1000) * 100) / delay
	}
</script>

<svelte:window on:keydown={handleKeydown} />
<div class="container mx-auto px-4 pt-2">
	{#if !$fullScreen}
		<PageHeader title="Bingo mathématique" />
	{/if}
	{#if chosen}
		<div class="overflow-y-hidden" style={$fullScreen ? 'height:90vh' : 'height:80vh'}>
			<div class="flex h-full gap-8 overflow-y-hidden">
				<div class="flex h-full grow items-center justify-center">
					{#if finish}
						Finish !
					{:else}
						<div class="flex flex-col items-center">
							<CircularProgress number={current + 1} {percentage} />

							<button
								on:click={() => {
									displayGrid = !displayGrid
								}}
								disabled={!pause}
								class="btn-icon variant-filled-primary text-xl"><IconGrid /></button
							>
						</div>
						{#if displayGrid}
							<CorrectionGrid {availables} />
						{:else}
							<QuestionCard class="max-w-xl text-3xl" card={question} />
						{/if}
					{/if}
				</div>
				{#if !displayGrid}
					<div class="h-full max-h-full w-64 overflow-y-auto" bind:this={drawStackRef}>
						{#each draws as draw}
							<QuestionCard class="my-2 max-w-xl" card={draw} />
						{/each}
					</div>
				{/if}
			</div>
		</div>
	{:else}
		<div
			class="mt-12 flex flex-col items-center justify-center gap-16 text-3xl"
			style="font-family: 'Baloo 2', sans-serif;"
		>
			{#each Object.entries(games) as [description, game] (description)}
				<a
					class="anchor"
					style="text-decoration:none"
					href="/jeux/bingo?game={encodeURI(JSON.stringify(description))}">{description}</a
				>
			{/each}
		</div>
	{/if}
</div>
