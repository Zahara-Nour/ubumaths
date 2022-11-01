<script>
	import BackCard from './BackCard.svelte'
	import FrontCard from './FrontCard.svelte'
	import { fontSize } from '$lib/stores'

	export let card
	export let interactive = false
	export let flashcard = null
	export let showDescription = false
	export let commit = null
	export let magnify = 1
	export let correction = false
	export let immediateCommit = false
	let updatedFlashCard

	let flip = false
	const toggleFlip = () => (flip = !flip)

	let hfront_masked = 0 // height front masked
	let hback_masked = 0 // width back masked

	let height // height for displayed card
	let width = 0

	let simpleCorrection = null
	let detailedCorrection = null

	async function updateHeight() {
		// console.log('updateHeight')npm
		height = Math.max(hfront_masked, hback_masked)
		// console.log('updated height', height)
		// console.log('height', height)
	}

	$: console.log('questionCard flash', flashcard)

	$: if (card) {
		updatedFlashCard =
			flashcard === null
				? (correction &&
						!!card.correctionDetails &&
						!!card.correctionDetails.length) ||
				  (!interactive && !correction)
				: flashcard
	}

	// $: console.log('interactive', interactive)
	// $: console.log('correction', correction)
	// $: console.log('flashcard', updatedFlashCard)

	$: if (card) {
		// console.log('changing card')
		flip = false
	}

	// $: console.log('hback_masked', hback_masked)
	// $: console.log('hfront_masked', hfront_masked)
	// $: console.log('height', height)
	// $: if (updatedFlashCard && hfront_masked && hback_masked) {
	// 	updateHeight()
	// }

	// $: if (!updatedFlashCard && hfront_masked) {
	// 	updateHeight()
	// }

	$: if (hfront_masked || hback_masked) {
		updateHeight()
	}

	$: if ($fontSize) {
		// console.log('changing size')
		height = 0
	}
	$: console.log('updatedFlashcard', updatedFlashCard)
</script>

<div class="card" style="{height ? `height:${height}px;` : ''}">
	<div class="flipper" class:flip style="{height ? 'height:100%;' : ''}">
		<div class="front" style="{height ? 'height:100%' : ''}">
			<FrontCard
				card="{card}"
				toggleFlip="{toggleFlip}"
				flashcard="{updatedFlashCard}"
				showDescription="{showDescription}"
				height="{height}"
				commit="{commit}"
				magnify="{magnify}"
				bind:interactive
				bind:correction
				bind:w="{width}"
				bind:simpleCorrection
				bind:detailedCorrection
				immediateCommit="{immediateCommit}"
			/>
		</div>
		{#if updatedFlashCard}
			<div class="back" style="{height ? 'height:100%;' : ''}">
				<BackCard
					card="{card}"
					toggleFlip="{toggleFlip}"
					height="{height}"
					magnify="{magnify}"
					correction="{correction}"
					simpleCorrection="{simpleCorrection}"
					detailedCorrection="{detailedCorrection}"
				/>
			</div>
		{/if}
	</div>
</div>

<div
	class="absolute"
	style="{(width ? `width:${width}px;` : '') + 'top:-100%;left:-100000%;'}"
>
	<!-- <div > -->
	<FrontCard
		card="{card}"
		flashcard="{updatedFlashCard}"
		showDescription="{showDescription}"
		bind:h="{hfront_masked}"
		masked="{true}"
		interactive="{interactive}"
		magnify="{magnify}"
		correction="{correction}"
		immediateCommit="{immediateCommit}"
	/>

	{#if updatedFlashCard}
		<BackCard
			card="{card}"
			bind:h="{hback_masked}"
			magnify="{magnify}"
			correction="{correction}"
			simpleCorrection="{simpleCorrection}"
			detailedCorrection="{detailedCorrection}"
		/>
	{/if}
</div>

<style>
	.card {
		width: 100%;
		height: 100%;
		perspective: 1000px;
	}

	.flip {
		transform: rotateY(180deg);
	}

	.flipper {
		transition: 0.6s;
		transform-style: preserve-3d;
		height: 100%;
		position: relative;
		width: 100%;
	}

	/* hide back of pane during swap */
	.front,
	.back {
		-webkit-backface-visibility: hidden;
		backface-visibility: hidden;
		height: 100%;
		width: 100%;
		position: absolute;
		top: 0;
		left: 0;
	}

	/* front pane, placed above back */
	.front {
		z-index: 2;
		/* for firefox 31 */
		transform: rotateY(0deg);
	}

	/* back, initially hidden pane */
	.back {
		transform: rotateY(180deg);
	}
</style>
