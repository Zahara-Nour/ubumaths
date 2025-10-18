<script>
	let {
		flipped = $bindable(false),
		front = $bindable(),
		back = $bindable(),
		class: className = ''
	} = $props();

	let frontHeight = $state(0);
	let backHeight = $state(0);

	let currentHeight = $derived(Math.max(frontHeight, backHeight));
</script>

<div class="flip-card {className}">
	<!-- Hidden measuring containers -->
	<div class="measure-container">
		<div bind:clientHeight={frontHeight}>
			{@render front?.()}
		</div>
	</div>
	<div class="measure-container">
		<div bind:clientHeight={backHeight}>
			{@render back?.()}
		</div>
	</div>

	<!-- Actual flip card -->
	<div class="flip-card-inner" class:flipped style="height: {currentHeight}px;">
		<div class="flip-card-face flip-card-front" style="height: {currentHeight}px;">
			{@render front?.()}
		</div>

		<div class="flip-card-face flip-card-back" style="height: {currentHeight}px;">
			{@render back?.()}
		</div>
	</div>
</div>

<style>
	.flip-card {
		perspective: 1000px;
		width: 100%;
	}

	.flip-card-inner {
		position: relative;
		width: 100%;
		transition:
			transform 0.6s cubic-bezier(0.33, 1, 0.68, 1),
			height 0.6s cubic-bezier(0.33, 1, 0.68, 1);
		transform-style: preserve-3d;
	}

	.flip-card-inner.flipped {
		transform: rotateY(180deg);
	}

	.flip-card-face {
		position: absolute;
		width: 100%;
		backface-visibility: hidden;
		-webkit-backface-visibility: hidden;
		box-sizing: border-box;
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}

	.flip-card-face > :global(*) {
		height: 100%;
	}

	.flip-card-front {
		transform: rotateY(0deg);
	}

	.flip-card-back {
		transform: rotateY(180deg);
	}

	.measure-container {
		position: absolute;
		top: 0;
		left: 0;
		visibility: hidden;
		pointer-events: none;
		width: 100%;
		z-index: -1;
	}

	.measure-container > div {
		width: 100%;
	}
</style>
