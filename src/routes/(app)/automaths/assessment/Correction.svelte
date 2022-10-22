<script>
	import CorrectionListItems from './CorrectionListItems.svelte'
	import { mdiHome, mdiReload, mdiScanHelper } from '@mdi/js'
	import Fab from '@smui/fab'
	import { Icon, Svg } from '@smui/common'
	import { onMount } from 'svelte'
	import { correct_color, incorrect_color, unoptimal_color } from '$lib/colors'
	import { Confetti } from 'svelte-confetti'
	import { getLogger } from '$lib/utils'
	import { goto } from '$app/navigation'
	import math from 'tinycas'
	import { STATUS_CORRECT, STATUS_UNOPTIMAL_FORM } from '$lib/questions/correction'

	export let items
	export let restart
	export let query
	export let classroom

	const { info, fail } = getLogger('Correction', 'info')
	let percent
	let displayDetails = false
	const toggleDetails = () => (displayDetails = !displayDetails)
	let colorResult
	let messageResult

	let total = 0
	let score = 0

	
	items.forEach((item) => {
		total += item.points
		score +=
			item.status == STATUS_CORRECT
				? item.points
				: item.status == STATUS_UNOPTIMAL_FORM
				? item.points / 2
				: 0
	})
	// inititalisation

	// Quand le composant de correction a fini de s'afficher,
	// le score a déjà été calculé, on l'enregistre
	onMount(async () => {
		if (!classroom) {
			percent = score / total

			if (percent === 1) {
				colorResult = correct_color
				messageResult = 'Perfect !'
			} else if (percent >= 0.8) {
				colorResult = correct_color
				messageResult = 'Good Job !'
			} else if (percent >= 0.5) {
				colorResult = unoptimal_color
				messageResult = 'Keep on !'
			} else {
				colorResult = incorrect_color
				messageResult = 'Try again !'
			}
		}
		// évaluation à sauvegarder
	})

	let displayHelp = false
	let congrats = false

	function toggleDisplayHelp() {
		displayHelp = !displayHelp
	}
</script>

<div>
	{#if score === total}
		<div
			style="
position: fixed;
top: -50px;
left: 0;
height: 100vh;
width: 100vw;
display: flex;
justify-content: center;
overflow: hidden;
pointer-events: none;
z-index:100"
		>
			<Confetti
				x="{[-5, 5]}"
				y="{[0, 0.1]}"
				delay="{[500, 2000]}"
				infinite
				size="15"
				duration="5000"
				amount="300"
				fallDistance="100vh"
			/>
		</div>
	{/if}
	<div class="my-3 flex justify-end">
		<Fab class="mx-1" color="secondary" on:click="{toggleDetails}" mini>
			<Icon component="{Svg}" viewBox="2 2 20 20">
				<path fill="currentColor" d="{mdiScanHelper}"></path>
			</Icon>
		</Fab>
	</div>

	{#if classroom}
		<div class="flex  justify-around w-full" style="overflow-x:auto;">
			<div class="w-full">
				<CorrectionListItems
					items="{items.filter((_, i) => i % 2 === 0)}"
					displayDetails="{displayDetails}"
					magnify="{classroom ? 2.5 : 1}"
				/>
			</div>
			<div class="ml-12 w-full">
				<CorrectionListItems
					items="{items.filter((_, i) => i % 2 === 1)}"
					displayDetails="{displayDetails}"
					magnify="{classroom ? 2.5 : 1}"
				/>
			</div>
		</div>
	{:else}
		<div class="flex w-full justify-center">
			<div style="width:650px">
				<CorrectionListItems
					items="{items}"
					displayDetails="{displayDetails}"
					magnify="{classroom ? 2.5 : 1}"
				/>
			</div>
		</div>
	{/if}

	{#if !classroom}
		<div
			class="{'p-2 flex items-center  justify-around'}"
			style="{`background:${colorResult}`}"
		>
			<div class="flex flex-col items-center justify-around h-full">
				<Fab
					class="mx-1 my-3"
					color="{classroom ? 'primary' : 'secondary'}"
					on:click="{() => (restart = true)}"
					mini
				>
					<Icon component="{Svg}" viewBox="2 2 20 20">
						<path fill="currentColor" d="{mdiReload}"></path>
					</Icon>
				</Fab>
				<Fab
					class="mx-1 my-3"
					color="{classroom ? 'primary' : 'secondary'}"
					on:click="{() => goto('/automaths' + query)}"
					mini
				>
					<Icon component="{Svg}" viewBox="2 2 20 20">
						<path fill="currentColor" d="{mdiHome}"></path>
					</Icon>
				</Fab>
			</div>
			<div class="flex flex-col items-center" style="color:white">
				<div class="my-2" style="font-size:2em; font-family:'pacifico'">
					{messageResult}
				</div>
				<div class="my-2">
					Score : <span style="font-size:1.5em;font-family:'pacifico'"
						>{math(score).toString({ comma: true })}</span
					> <span style="font-size:1.5em;"> / </span><span
						style="font-size:1.5em; font-family:'pacifico'">{total}</span
					>
				</div>
			</div>
			{#if percent === 1}
				<img alt="Great!" src="/images/great-150.png" />
			{:else if percent >= 0.8}
				<img alt="Good job!" src="/images/good-job-150.png" />
			{:else if percent >= 0.5}
				<img alt="Keep on!" src="/images/keep-on-150.png" />
			{:else}
				<img alt="Try again!" src="/images/try-again-150.png" />
			{/if}
		</div>
	{/if}
</div>

<style>
	/* pacifico-regular - latin */
</style>
