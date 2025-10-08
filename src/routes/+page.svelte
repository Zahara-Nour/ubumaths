<script lang="ts">
	import MathField from '$lib/components/MathField.svelte';
	import DynamicMathField from '$lib/components/DynamicMathField.svelte';
	import FlipCard from '$lib/components/FlipCard.svelte';
	import type { MathfieldElement } from 'mathlive';

	let latex = $state('');
	let mathfieldRef: any;
	let currentLatex = $state('');
	let flipped = $state(false);
	let flipped2 = $state(false);
	let flipped3 = $state(false);

	function handleInput(latex: string, mf: MathfieldElement) {
		currentLatex = latex;
		console.log('Current LaTeX:', latex);
	}

	function setFormula() {
		mathfieldRef?.setValue('x^2 + y^2 = r^2');
	}

	function getFormula() {
		const value = mathfieldRef?.getValue();
		alert(`Current value: ${value}`);
	}
</script>

<div class="container">
	<h1>MathLive Example</h1>

	<div class="demo">
		<h2>Interactive Math Editor</h2>
		<MathField bind:value={latex} placeholder={'\\text' + '{' + 'Enter a formula...' + '}'} />

		<div class="output">
			<h3>LaTeX Output:</h3>
			<pre>{latex}</pre>
		</div>

		<DynamicMathField
			bind:this={mathfieldRef}
			initialValue="x=\frac{1}{2}"
			placeholder="Type math here..."
			oninput={handleInput}
		/>

		<p>Current LaTeX: {currentLatex}</p>

		<button onclick={setFormula}>Set Formula</button>
		<button onclick={getFormula}>Get Formula</button>
		<button onclick={() => mathfieldRef?.focus()}>Focus</button>

		<h2>Flip Card Example</h2>
		<FlipCard bind:flipped>
			{#snippet front()}
				<div class="card-content front">
					<h3>Front Side</h3>
					<p>Click the button to flip the card!</p>
					<p>This is the front content.</p>
				</div>
			{/snippet}

			{#snippet back()}
				<div class="card-content back">
					<h3>Back Side</h3>
					<p>The height adapts dynamically!</p>
					<p>This side has more content to demonstrate the dynamic height feature.</p>
					<p>
						Notice how the card smoothly transitions to accommodate the different content heights.
					</p>
					<ul>
						<li>First item</li>
						<li>Second item</li>
						<li>Third item</li>
					</ul>
				</div>
			{/snippet}
		</FlipCard>

		<button onclick={() => (flipped = !flipped)} class="flip-button">
			{flipped ? 'Show Front' : 'Show Back'}
		</button>

		<h2>Compact Card</h2>
		<FlipCard bind:flipped={flipped2}>
			{#snippet front()}
				<div class="card-content compact-front">
					<h3>Short</h3>
					<p>Minimal content</p>
				</div>
			{/snippet}

			{#snippet back()}
				<div class="card-content compact-back">
					<h3>Also Short</h3>
					<p>Same size!</p>
				</div>
			{/snippet}
		</FlipCard>

		<button onclick={() => (flipped2 = !flipped2)} class="flip-button">
			{flipped2 ? 'Show Front' : 'Show Back'}
		</button>

		<h2>Large Card</h2>
		<FlipCard bind:flipped={flipped3}>
			{#snippet front()}
				<div class="card-content large-front">
					<h3>Very Long Front</h3>
					<p>This card has a lot of content on the front side.</p>
					<ul>
						<li>Item one with details</li>
						<li>Item two with more information</li>
						<li>Item three with even more content</li>
						<li>Item four keeps going</li>
						<li>Item five adds more height</li>
					</ul>
					<p>Even more text at the bottom to make it really tall!</p>
				</div>
			{/snippet}

			{#snippet back()}
				<div class="card-content large-back">
					<h3>Shorter Back</h3>
					<p>This side has less content.</p>
					<p>But it will match the front's height!</p>
				</div>
			{/snippet}
		</FlipCard>

		<button onclick={() => (flipped3 = !flipped3)} class="flip-button">
			{flipped3 ? 'Show Front' : 'Show Back'}
		</button>
	</div>
</div>

<style>
	.container {
		max-width: 800px;
		margin: 2rem auto;
		padding: 0 1rem;
	}

	h1 {
		font-size: 2rem;
		font-weight: bold;
		margin-bottom: 2rem;
	}

	.demo {
		margin-bottom: 2rem;
	}

	h2 {
		font-size: 1.5rem;
		font-weight: 600;
		margin-bottom: 1rem;
	}

	.output {
		margin-top: 1.5rem;
		padding: 1rem;
		background-color: #f3f4f6;
		border-radius: 0.5rem;
	}

	h3 {
		font-size: 1.125rem;
		font-weight: 600;
		margin-bottom: 0.5rem;
	}

	pre {
		font-family: monospace;
		white-space: pre-wrap;
		word-break: break-all;
	}

	.card-content {
		padding: 2rem;
		border-radius: 12px;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
	}

	.front {
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
	}

	.back {
		background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
		color: white;
	}

	.flip-button {
		display: block;
		margin: 2rem auto 0;
		padding: 0.75rem 2rem;
		font-size: 1rem;
		font-weight: 600;
		color: white;
		background: #4f46e5;
		border: none;
		border-radius: 8px;
		cursor: pointer;
		transition: background 0.2s;
	}

	.flip-button:hover {
		background: #4338ca;
	}

	.flip-button:active {
		transform: scale(0.98);
	}

	.compact-front {
		background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
		color: #333;
	}

	.compact-back {
		background: linear-gradient(135deg, #30cfd0 0%, #330867 100%);
		color: white;
	}

	.large-front {
		background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
		color: #333;
	}

	.large-back {
		background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%);
		color: #333;
	}
</style>
