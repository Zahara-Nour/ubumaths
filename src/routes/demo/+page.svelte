<script lang="ts">
	import MathField from '$lib/components/MathField.svelte';
	import DynamicMathField from '$lib/components/DynamicMathField.svelte';
	import FlipCard from '$lib/components/FlipCard.svelte';
	import LoggerDemo from '$lib/components/LoggerDemo.svelte';
	import ToastDemo from '$lib/components/ToastDemo.svelte';
	import { Button } from '$lib/components/ui/button';
	import type { MathfieldElement } from 'mathlive';
	import { createLogger } from '$lib/utils/logger';

	const logger = createLogger('+page.svelte');

	let latex = $state('');
	let mathfieldRef: any;
	let currentLatex = $state('');
	let flipped = $state(false);
	let flipped2 = $state(false);
	let flipped3 = $state(false);

	function handleInput(latex: string, _mf: MathfieldElement) {
		currentLatex = latex;
		logger.trace('Current LaTeX:', latex);
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
	<h1 class="text-foreground">Component Demos</h1>

	<div class="demo">
		<h2 class="text-foreground">Interactive Math Editor</h2>
		<MathField bind:value={latex} placeholder={'\\text' + '{' + 'Enter a formula...' + '}'} />

		<div class="output bg-muted">
			<h3 class="text-foreground">LaTeX Output:</h3>
			<pre class="text-foreground">{latex}</pre>
		</div>

		<DynamicMathField
			bind:this={mathfieldRef}
			initialValue="x=\frac{1}{2}"
			placeholder="Type math here..."
			oninput={handleInput}
		/>

		<p class="text-foreground">Current LaTeX: {currentLatex}</p>

		<Button size="sm" onclick={setFormula}>Set Formula</Button>
		<Button size="sm" onclick={getFormula}>Get Formula</Button>
		<Button size="sm" onclick={() => mathfieldRef?.focus()}>Focus</Button>

		<h2 class="text-foreground">Flip Card Example</h2>
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

		<Button onclick={() => (flipped = !flipped)} variant="secondary" class="flip-button">
			{flipped ? 'Show Front' : 'Show Back'}
		</Button>

		<h2 class="text-foreground">Compact Card</h2>
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

		<Button onclick={() => (flipped2 = !flipped2)} variant="secondary" class="flip-button">
			{flipped2 ? 'Show Front' : 'Show Back'}
		</Button>

		<h2 class="text-foreground">Large Card</h2>
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

		<Button onclick={() => (flipped3 = !flipped3)} variant="secondary" class="flip-button">
			{flipped3 ? 'Show Front' : 'Show Back'}
		</Button>

		<h2 class="mt-12 text-foreground">Logger System Demo</h2>
		<LoggerDemo />

		<h2 class="mt-12 text-foreground">Toast Notifications Demo</h2>
		<ToastDemo />
	</div>
</div>

<style lang="postcss">
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

	:global(.dark) .card-content {
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
	}

	.front {
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
	}

	.back {
		background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
		color: white;
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

	.flip-button {
		display: block;
		margin: 2rem auto 0;
	}
</style>
