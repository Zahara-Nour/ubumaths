<script>
	// import Spinner from './Spinner.svelte'
	import math from 'tinycas'
	import { mdiOrbitVariant } from '@mdi/js'
	import Fab, { Icon } from '@smui/fab'
	import { Svg } from '@smui/common'
	import Paper from '@smui/paper'
	import { formatToHtml } from '$lib/stores'
	import { mdc_colors, correct_color } from '$lib/colors'
	import CorrectionLine from './CorrectionLine.svelte'

	export let card
	export let toggleFlip = () => {}
	export let h = 0
	export let w = 0
	export let height = 0
	export let width = 0
	export let magnify
	export let correction
	export let detailedCorrection = card.detailedCorrection
	export let masked = false


	function getSolution(card) {
		let nSol = -1
		let s

		function replaceSol() {
			nSol += 1
			return math(card.solutions[nSol]).latex
		}

		if (card.choices) {
			if (card.type === 'choices') {
				s = '<div class="flex flex-wrap justify-start">'
				card.choices.forEach((choice, i) => {
					let color = 'grey'
					if (card.solutions.includes(i)) {
						color = correct_color
					}

					s += `<span
					class="rounded-lg  m-2 p-1"
					style="border: 4px solid ${color}"
				>`

					if (choice.image) {
						s += `<img src="${choice.base64}" style="max-width:min(400px,80%);max-height:40vh;" alt="choice ${i}"/>`
					} else {
						s += `<div class="text-base " style="{font-size:1rem}">`
						s += choice.text
						s += '</div>'
					}
					s += '</span>'
				})

				s += '</div>'
			} else {
				s = card.solutions[0]
				s = card.choices[s]
				if (s.text) {
					s = s.text
				} else if (s.image) {
					s = `<img src=${s.image}>`
				}
			}
		} else {
			if (card.answerFields && card.type !== 'equation') {
				s = $formatToHtml(card.answerFields.replace(/\?/g, replaceSol))
			} else {
				s = card.solutions[0]
				s = '$$' + math(s).latex + '$$'
			}
		}
		return s
	}

	$: if (!masked) console.log('back card details',card.num, details)
	$: solution = $formatToHtml(getSolution(card))
	$: details = detailedCorrection || []
</script>

<div bind:clientHeight="{h}" bind:clientWidth="{w}">
	<Paper
		elevation="{12}"
		style="{height
			? `height:${height}px;`
			: '' + width
			? `width:${width - 48}px;`
			: ''}"
	>
		<div class="h-full flex flex-col items-center justify-between">
			<!-- correction des réponses de l'utilisateur -->

			<!-- si mode correction, on affiche la correction détaillée -->
			{#if correction}
				<div
					class="correction-title"
					style="{` color:${mdc_colors['lime-500']};  position:absolute;top:1em; left:0px`}"
				>
					Détails
				</div>
				<div class="z-0 relative" style="{`font-size:${magnify}rem`}">
					<!-- {#each details as detail}
						<div class="correction-line">
							{@html detail.text ? detail.text : detail}
						</div>
					{/each} -->
					{#each details as line}
						<div class="correction-line z-0">
							<CorrectionLine line="{line}" />
						</div>
					{/each}
				</div>

				<div class=" w-full flex justify-end">
					<Fab color="secondary" on:click="{toggleFlip}" mini>
						<Icon component="{Svg}" viewBox="2 2 20 20">
							<path fill="currentColor" d="{mdiOrbitVariant}"></path>
						</Icon>
					</Fab>
				</div>
			{:else}
				<!-- solution générique -->
				<div
					style="{` color:${mdc_colors['lime-500']}; font-size:${magnify}rem`}"
				>
					Réponse :
				</div>
				<div class="my-5 z-0 relative" style="{`font-size:${2 * magnify}rem`}">
					{@html solution}
				</div>
				{#if card.imageCorrection}
					{#await card.imageCorrectionBase64P}
						loading image
					{:then base64}
						<div style="display:inline-block;background-color:white;">
							<img
								src="{base64}"
								class="my-3 w-full max-w-lg"
								style="max-height:40vh; object-fit: contain;"
								alt="Alright Buddy!"
							/>
						</div>
					{:catch error}
						{error}
					{/await}
				{/if}
				{#if details}
					<div class="my-2 z-0 relative" style="{`font-size:${magnify}rem`}">
						<!-- {#each details as detail}
							<p>
								{@html detail.text ? detail.text : detail}
							</p>
						{/each} -->
						{#each details as line}
							<div class=" correction-line z-0">
								<CorrectionLine line="{line}" />
							</div>
						{/each}
					</div>
				{/if}
				<div class="mt-3 w-full flex justify-end">
					<Fab color="secondary" on:click="{toggleFlip}" mini>
						<Icon component="{Svg}" viewBox="2 2 20 20">
							<path fill="currentColor" d="{mdiOrbitVariant}"></path>
						</Icon>
					</Fab>
				</div>
			{/if}
		</div>
	</Paper>
</div>

<!-- <div class="card">
  <div class="content">
    Back
  </div>
	<div class="buttons">
		<Fab color="secondary" on:click="{toggleFlip}" mini>
			<Icon component="{Svg}" viewBox="2 2 20 20">
				<path fill="currentColor" d="{mdiOrbitVariant}"></path>
			</Icon>
		</Fab>
	</div>
</div> -->
<style>
	.correction-line {
		margin-top: 9px;
		margin-bottom: 9px;
	}

	.correction-line:first-child {
		margin-top: 0px;
		margin-bottom: 9px;
	}

	.correction-line:last-child {
		margin-top: 9px;
		margin-bottom: 0px;
	}

	.correction-title {
		transform: rotate(-45deg);
	}
</style>
