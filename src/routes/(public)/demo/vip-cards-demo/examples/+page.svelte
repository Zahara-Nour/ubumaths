<script lang="ts">
	import VipCardHolo from '$lib/components/VipCardHolo.svelte';
	import { Button } from '$lib/components/ui/button';
	import { resolve } from '$app/paths';
	import { templateToVipCard } from '$lib/stores/vipCardTemplates.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Use a legendary card for all examples (convert to VipCard format)
	const enabledCards = data.templates.filter((c) => c.is_enabled).map(templateToVipCard);
	const exampleCard = enabledCards.find((c) => c.rarity === 'legendary') || enabledCards[0];

	// Track showcase restarts by incrementing a key
	let showcaseKey = $state(0);

	function restartShowcase() {
		showcaseKey++;
	}

	// Track card flip state for each example
	let showBack1 = $state(false);
	let showBack2 = $state(false);
	let showBack3 = $state(false);
	let showBack4 = $state(false);
	let showBack5 = $state(false);
	let showBack6 = $state(false);
	let showBack7 = $state(false);
	let showBack8 = $state(false);
	let showBack9 = $state(false);
	let showBack10 = $state(false);
	let showBack11 = $state(false);
	let showBack12 = $state(false);
</script>

<svelte:head>
	<title>VIP Cards - Configuration Examples</title>
</svelte:head>

<main class="examples-page">
	<header class="examples-header">
		<h1>Configuration Examples</h1>
		<p class="subtitle">Explore different ways to use the VipCardHolo component</p>

		<nav class="examples-nav">
			<a href={resolve('/demo/vip-cards-demo')}>← Back to Gallery</a>
		</nav>
	</header>

	<!-- Example Grid -->
	<div class="examples-grid">
		<!-- 1. Full Effects (Default) -->
		<section class="example-card">
			<div class="example-demo">
				<VipCardHolo card={exampleCard} showBack={showBack1} />
			</div>
			<div class="example-code">
				<h3>🎨 Full Effects (Default)</h3>
				<p>All features enabled: 3D tilt, popover, gyroscope, and holographic effects</p>
				<pre><code>&lt;VipCardHolo card=&#123;card&#125; /&gt;</code></pre>
				<ul class="features-list">
					<li>✅ 3D mouse tracking</li>
					<li>✅ Click to expand</li>
					<li>✅ Mobile gyroscope</li>
					<li>✅ Holographic effect</li>
				</ul>
				<div class="restart-button">
					<Button onclick={() => (showBack1 = !showBack1)} variant="outline">
						{showBack1 ? '👁️ Show Front' : '🔙 Show Back'}
					</Button>
				</div>
			</div>
		</section>

		<!-- 2. 3D Only (No Popover) -->
		<section class="example-card">
			<div class="example-demo">
				<VipCardHolo card={exampleCard} enablePopover={false} showBack={showBack2} />
			</div>
			<div class="example-code">
				<h3>🎯 3D Only (No Popover)</h3>
				<p>Interactive 3D tilt without click-to-expand functionality</p>
				<pre><code
						>&lt;VipCardHolo
  card=&#123;card&#125;
  enablePopover=&#123;false&#125;
/&gt;</code
					></pre>
				<ul class="features-list">
					<li>✅ 3D mouse tracking</li>
					<li>❌ Click to expand</li>
					<li>✅ Mobile gyroscope</li>
					<li>✅ Holographic effect</li>
				</ul>
				<div class="restart-button">
					<Button onclick={() => (showBack2 = !showBack2)} variant="outline">
						{showBack2 ? '👁️ Show Front' : '🔙 Show Back'}
					</Button>
				</div>
			</div>
		</section>

		<!-- 3. Static with Holo Effect -->
		<section class="example-card">
			<div class="example-demo">
				<VipCardHolo
					card={exampleCard}
					enable3d={false}
					enablePopover={false}
					showBack={showBack3}
				/>
			</div>
			<div class="example-code">
				<h3>✨ Static with Holo Effect</h3>
				<p>Just the beautiful holographic shine, no 3D or popover</p>
				<pre><code
						>&lt;VipCardHolo
  card=&#123;card&#125;
  enable3d=&#123;false&#125;
  enablePopover=&#123;false&#125;
/&gt;</code
					></pre>
				<ul class="features-list">
					<li>❌ 3D mouse tracking</li>
					<li>❌ Click to expand</li>
					<li>❌ Mobile gyroscope</li>
					<li>✅ Holographic effect</li>
				</ul>
				<div class="restart-button">
					<Button onclick={() => (showBack3 = !showBack3)} variant="outline">
						{showBack3 ? '👁️ Show Front' : '🔙 Show Back'}
					</Button>
				</div>
			</div>
		</section>

		<!-- 4. 3D Only (No Holo) -->
		<section class="example-card">
			<div class="example-demo">
				<VipCardHolo
					card={exampleCard}
					enableHoloEffect={false}
					enablePopover={false}
					showBack={showBack4}
				/>
			</div>
			<div class="example-code">
				<h3>🎮 3D Only (No Holo)</h3>
				<p>Interactive 3D tilt without the holographic effect</p>
				<pre><code
						>&lt;VipCardHolo
  card=&#123;card&#125;
  enableHoloEffect=&#123;false&#125;
  enablePopover=&#123;false&#125;
/&gt;</code
					></pre>
				<ul class="features-list">
					<li>✅ 3D mouse tracking</li>
					<li>❌ Click to expand</li>
					<li>✅ Mobile gyroscope</li>
					<li>❌ Holographic effect</li>
				</ul>
				<div class="restart-button">
					<Button onclick={() => (showBack4 = !showBack4)} variant="outline">
						{showBack4 ? '👁️ Show Front' : '🔙 Show Back'}
					</Button>
				</div>
			</div>
		</section>

		<!-- 5. Popover Only -->
		<section class="example-card">
			<div class="example-demo">
				<VipCardHolo
					card={exampleCard}
					enable3d={false}
					enableGyroscope={false}
					enableHoloEffect={false}
					showBack={showBack5}
				/>
			</div>
			<div class="example-code">
				<h3>🔍 Popover Only</h3>
				<p>Static card with click-to-expand feature</p>
				<pre><code
						>&lt;VipCardHolo
  card=&#123;card&#125;
  enable3d=&#123;false&#125;
  enableGyroscope=&#123;false&#125;
  enableHoloEffect=&#123;false&#125;
/&gt;</code
					></pre>
				<ul class="features-list">
					<li>❌ 3D mouse tracking</li>
					<li>✅ Click to expand</li>
					<li>❌ Mobile gyroscope</li>
					<li>❌ Holographic effect</li>
				</ul>
				<div class="restart-button">
					<Button onclick={() => (showBack5 = !showBack5)} variant="outline">
						{showBack5 ? '👁️ Show Front' : '🔙 Show Back'}
					</Button>
				</div>
			</div>
		</section>

		<!-- 6. Completely Static -->
		<section class="example-card">
			<div class="example-demo">
				<VipCardHolo
					card={exampleCard}
					enable3d={false}
					enablePopover={false}
					enableGyroscope={false}
					enableHoloEffect={false}
					showBack={showBack6}
				/>
			</div>
			<div class="example-code">
				<h3>🖼️ Completely Static</h3>
				<p>Just a plain image, all effects disabled</p>
				<pre><code
						>&lt;VipCardHolo
  card=&#123;card&#125;
  enable3d=&#123;false&#125;
  enablePopover=&#123;false&#125;
  enableGyroscope=&#123;false&#125;
  enableHoloEffect=&#123;false&#125;
/&gt;</code
					></pre>
				<ul class="features-list">
					<li>❌ 3D mouse tracking</li>
					<li>❌ Click to expand</li>
					<li>❌ Mobile gyroscope</li>
					<li>❌ Holographic effect</li>
				</ul>
				<div class="restart-button">
					<Button onclick={() => (showBack6 = !showBack6)} variant="outline">
						{showBack6 ? '👁️ Show Front' : '🔙 Show Back'}
					</Button>
				</div>
			</div>
		</section>

		<!-- 7. With Count Badge -->
		<section class="example-card">
			<div class="example-demo">
				<VipCardHolo card={exampleCard} count={5} showBack={showBack7} />
			</div>
			<div class="example-code">
				<h3>🔢 With Count Badge</h3>
				<p>Show quantity when student has multiple copies</p>
				<pre><code
						>&lt;VipCardHolo
  card=&#123;card&#125;
  count=&#123;5&#125;
/&gt;</code
					></pre>
				<ul class="features-list">
					<li>✅ 3D mouse tracking</li>
					<li>✅ Click to expand</li>
					<li>✅ Mobile gyroscope</li>
					<li>✅ Holographic effect</li>
					<li>✨ Count badge displayed</li>
				</ul>
				<div class="restart-button">
					<Button onclick={() => (showBack7 = !showBack7)} variant="outline">
						{showBack7 ? '👁️ Show Front' : '🔙 Show Back'}
					</Button>
				</div>
			</div>
		</section>

		<!-- 8. Showcase Mode -->
		<section class="example-card">
			<div class="example-demo">
				{#key showcaseKey}
					<VipCardHolo card={exampleCard} showcase={true} showBack={showBack8} />
				{/key}
			</div>
			<div class="example-code">
				<h3>🎭 Showcase Mode</h3>
				<p>Auto-rotating animation for presentations (starts 2s after mount, runs for 4s)</p>
				<pre><code
						>&lt;VipCardHolo
  card=&#123;card&#125;
  showcase=&#123;true&#125;
/&gt;</code
					></pre>
				<ul class="features-list">
					<li>✅ 3D mouse tracking</li>
					<li>✅ Click to expand</li>
					<li>✅ Mobile gyroscope</li>
					<li>✅ Holographic effect</li>
					<li>🎪 Auto-rotation animation</li>
				</ul>
				<div class="restart-button">
					<Button onclick={restartShowcase} variant="outline">🔄 Restart Animation</Button>
					<Button onclick={() => (showBack8 = !showBack8)} variant="outline">
						{showBack8 ? '👁️ Show Front' : '🔙 Show Back'}
					</Button>
				</div>
			</div>
		</section>

		<!-- 9. Flip Card (Front/Back Control) -->
		<section class="example-card">
			<div class="example-demo">
				<VipCardHolo
					card={exampleCard}
					showBack={showBack9}
					enable3d={false}
					enablePopover={false}
					enableHoloEffect={false}
				/>
			</div>
			<div class="example-code">
				<h3>🔄 Card Flip Control</h3>
				<p>Control which side of the card is visible (front or back)</p>
				<pre><code
						>&lt;VipCardHolo
  card=&#123;card&#125;
  showBack=&#123;{showBack9}&#125;
  enable3d=&#123;false&#125;
  enablePopover=&#123;false&#125;
  enableHoloEffect=&#123;false&#125;
/&gt;</code
					></pre>
				<ul class="features-list">
					<li>❌ 3D mouse tracking</li>
					<li>❌ Click to expand</li>
					<li>❌ Mobile gyroscope</li>
					<li>❌ Holographic effect</li>
					<li>🔄 Manual front/back control</li>
				</ul>
				<div class="restart-button">
					<Button onclick={() => (showBack9 = !showBack9)} variant="outline">
						{showBack9 ? '👁️ Show Front' : '🔙 Show Back'}
					</Button>
					<p class="current-side">
						Currently showing: <strong>{showBack9 ? 'Back' : 'Front'}</strong>
					</p>
				</div>
			</div>
		</section>

		<!-- 10. Description Overlay on Hover -->
		<section class="example-card">
			<div class="example-demo">
				<VipCardHolo card={exampleCard} enableDescriptionOverlay={true} showBack={showBack10} />
			</div>
			<div class="example-code">
				<h3>📝 Description Overlay</h3>
				<p>Hover to reveal card name and description with gradient overlay</p>
				<pre><code
						>&lt;VipCardHolo
  card=&#123;card&#125;
  enableDescriptionOverlay=&#123;true&#125;
/&gt;</code
					></pre>
				<ul class="features-list">
					<li>✅ 3D mouse tracking</li>
					<li>✅ Click to expand</li>
					<li>✅ Mobile gyroscope</li>
					<li>✅ Holographic effect</li>
					<li>📝 Description overlay on hover</li>
				</ul>
				<div class="restart-button">
					<Button onclick={() => (showBack10 = !showBack10)} variant="outline">
						{showBack10 ? '👁️ Show Front' : '🔙 Show Back'}
					</Button>
				</div>
			</div>
		</section>

		<!-- 11. Rarity Indicator -->
		<section class="example-card">
			<div class="example-demo">
				<VipCardHolo card={exampleCard} enableRarityIndicator={true} showBack={showBack11} />
			</div>
			<div class="example-code">
				<h3>💎 Rarity Indicator</h3>
				<p>Gem icon in top-left corner showing card rarity with colored glow</p>
				<pre><code
						>&lt;VipCardHolo
  card=&#123;card&#125;
  enableRarityIndicator=&#123;true&#125;
/&gt;</code
					></pre>
				<ul class="features-list">
					<li>✅ 3D mouse tracking</li>
					<li>✅ Click to expand</li>
					<li>✅ Mobile gyroscope</li>
					<li>✅ Holographic effect</li>
					<li>💎 Rarity gem indicator (legendary = gold glow)</li>
				</ul>
				<div class="restart-button">
					<Button onclick={() => (showBack11 = !showBack11)} variant="outline">
						{showBack11 ? '👁️ Show Front' : '🔙 Show Back'}
					</Button>
				</div>
			</div>
		</section>

		<!-- 12. Everything Enabled -->
		<section class="example-card">
			<div class="example-demo">
				<VipCardHolo
					card={exampleCard}
					count={3}
					enable3d={true}
					enablePopover={true}
					enableGyroscope={true}
					enableHoloEffect={true}
					enableDescriptionOverlay={true}
					enableRarityIndicator={true}
					showBack={showBack12}
				/>
			</div>
			<div class="example-code">
				<h3>🎯 All Features Enabled</h3>
				<p>Complete experience with all features active</p>
				<pre><code
						>&lt;VipCardHolo
  card=&#123;card&#125;
  count=&#123;3&#125;
  enable3d=&#123;true&#125;
  enablePopover=&#123;true&#125;
  enableGyroscope=&#123;true&#125;
  enableHoloEffect=&#123;true&#125;
  enableDescriptionOverlay=&#123;true&#125;
  enableRarityIndicator=&#123;true&#125;
/&gt;</code
					></pre>
				<ul class="features-list">
					<li>✅ 3D mouse tracking</li>
					<li>✅ Click to expand</li>
					<li>✅ Mobile gyroscope</li>
					<li>✅ Holographic effect</li>
					<li>✅ Count badge (×3)</li>
					<li>✅ Description overlay on hover</li>
					<li>✅ Rarity gem indicator</li>
					<li>✅ Front/back flip control</li>
				</ul>
				<div class="restart-button">
					<Button onclick={() => (showBack12 = !showBack12)} variant="outline">
						{showBack12 ? '👁️ Show Front' : '🔙 Show Back'}
					</Button>
				</div>
			</div>
		</section>
	</div>

	<!-- Props Reference -->
	<section class="props-reference">
		<h2>Complete Props Reference</h2>
		<div class="reference-table">
			<table>
				<thead>
					<tr>
						<th>Prop</th>
						<th>Type</th>
						<th>Default</th>
						<th>Description</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td><code>card</code></td>
						<td>VipCard</td>
						<td>required</td>
						<td>The VIP card data object</td>
					</tr>
					<tr>
						<td><code>count</code></td>
						<td>number</td>
						<td>1</td>
						<td>Display count badge (if > 1)</td>
					</tr>
					<tr>
						<td><code>showcase</code></td>
						<td>boolean</td>
						<td>false</td>
						<td>Enable auto-rotation animation</td>
					</tr>
					<tr>
						<td><code>enable3d</code></td>
						<td>boolean</td>
						<td>true</td>
						<td>Enable 3D mouse/touch tracking</td>
					</tr>
					<tr>
						<td><code>enablePopover</code></td>
						<td>boolean</td>
						<td>true</td>
						<td>Enable click-to-expand feature</td>
					</tr>
					<tr>
						<td><code>enableGyroscope</code></td>
						<td>boolean</td>
						<td>true</td>
						<td>Enable mobile gyroscope tilt</td>
					</tr>
					<tr>
						<td><code>enableHoloEffect</code></td>
						<td>boolean</td>
						<td>true</td>
						<td>Enable holographic shine effect</td>
					</tr>
					<tr>
						<td><code>showBack</code></td>
						<td>boolean</td>
						<td>false</td>
						<td>Show card back instead of front</td>
					</tr>
					<tr>
						<td><code>enableDescriptionOverlay</code></td>
						<td>boolean</td>
						<td>false</td>
						<td>Show gradient overlay with description on hover</td>
					</tr>
					<tr>
						<td><code>enableRarityIndicator</code></td>
						<td>boolean</td>
						<td>false</td>
						<td>Show gem icon in top-left with rarity color and glow</td>
					</tr>
				</tbody>
			</table>
		</div>
	</section>

	<!-- Use Cases -->
	<section class="use-cases">
		<h2>Common Use Cases</h2>
		<div class="use-cases-grid">
			<div class="use-case">
				<h3>📱 Student Dashboard</h3>
				<pre><code
						>&lt;VipCardHolo
  card=&#123;card&#125;
  count=&#123;card.count&#125;
/&gt;</code
					></pre>
				<p>Full interactive experience with count badges</p>
			</div>

			<div class="use-case">
				<h3>📋 Compact List View</h3>
				<pre><code
						>&lt;VipCardHolo
  card=&#123;card&#125;
  enable3d=&#123;false&#125;
  enablePopover=&#123;false&#125;
/&gt;</code
					></pre>
				<p>Static cards with holographic shine only</p>
			</div>

			<div class="use-case">
				<h3>🎁 Reward Reveal</h3>
				<pre><code
						>&lt;VipCardHolo
  card=&#123;newCard&#125;
  showcase=&#123;true&#125;
/&gt;</code
					></pre>
				<p>Animated showcase for new card reveals</p>
			</div>

			<div class="use-case">
				<h3>🛒 Shop Preview</h3>
				<pre><code
						>&lt;VipCardHolo
  card=&#123;card&#125;
  enablePopover=&#123;false&#125;
/&gt;</code
					></pre>
				<p>Interactive 3D preview without popover</p>
			</div>
		</div>
	</section>
</main>

<style>
	.examples-page {
		max-width: 1600px;
		margin: 0 auto;
		padding: 40px 20px;
		color: white;
		background: linear-gradient(135deg, hsl(220, 13%, 18%) 0%, hsl(220, 13%, 10%) 100%);
		min-height: 100vh;
	}

	.examples-header {
		text-align: center;
		margin-bottom: 60px;
	}

	.examples-header h1 {
		font-size: 2.5em;
		margin-bottom: 10px;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.subtitle {
		font-size: 1.2em;
		opacity: 0.8;
		margin-bottom: 20px;
	}

	.examples-nav {
		margin: 20px 0;
	}

	.examples-nav a {
		color: hsl(187, 85%, 60%);
		text-decoration: none;
		font-size: 1.1em;
		transition: color 0.3s;
	}

	.examples-nav a:hover {
		color: hsl(207, 100%, 94%);
	}

	.examples-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
		gap: 40px;
		margin-bottom: 80px;
	}

	.example-card {
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 15px;
		padding: 30px;
		display: grid;
		grid-template-columns: 200px 1fr;
		gap: 30px;
		align-items: start;
	}

	.example-demo {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 300px;
	}

	.example-code h3 {
		margin-top: 0;
		margin-bottom: 10px;
		font-size: 1.3em;
	}

	.example-code p {
		margin-bottom: 15px;
		opacity: 0.8;
		line-height: 1.5;
	}

	.example-code pre {
		background: rgba(0, 0, 0, 0.3);
		padding: 15px;
		border-radius: 8px;
		overflow-x: auto;
		margin-bottom: 15px;
		border-left: 3px solid hsl(187, 85%, 60%);
	}

	.example-code code {
		font-family: 'Courier New', monospace;
		font-size: 0.9em;
		color: hsl(187, 85%, 70%);
		line-height: 1.6;
	}

	.features-list {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.features-list li {
		padding: 5px 0;
		font-size: 0.9em;
		opacity: 0.9;
	}

	.restart-button {
		margin-top: 20px;
		padding-top: 15px;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
	}

	.current-side {
		margin-top: 15px;
		font-size: 0.95em;
		opacity: 0.9;
	}

	.current-side strong {
		color: hsl(187, 85%, 70%);
	}

	.props-reference {
		margin: 80px 0;
	}

	.props-reference h2 {
		font-size: 2em;
		margin-bottom: 30px;
		text-align: center;
	}

	.reference-table {
		background: rgba(255, 255, 255, 0.03);
		border-radius: 15px;
		padding: 30px;
		overflow-x: auto;
	}

	table {
		width: 100%;
		border-collapse: collapse;
	}

	thead tr {
		border-bottom: 2px solid rgba(255, 255, 255, 0.2);
	}

	th {
		text-align: left;
		padding: 15px;
		font-weight: bold;
		color: hsl(187, 85%, 60%);
	}

	td {
		padding: 15px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.05);
	}

	td code {
		background: rgba(0, 0, 0, 0.3);
		padding: 3px 8px;
		border-radius: 4px;
		font-family: 'Courier New', monospace;
		color: hsl(187, 85%, 70%);
	}

	.use-cases {
		margin: 80px 0;
	}

	.use-cases h2 {
		font-size: 2em;
		margin-bottom: 30px;
		text-align: center;
	}

	.use-cases-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 30px;
	}

	.use-case {
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 15px;
		padding: 25px;
	}

	.use-case h3 {
		margin-top: 0;
		margin-bottom: 15px;
		font-size: 1.2em;
	}

	.use-case pre {
		background: rgba(0, 0, 0, 0.3);
		padding: 15px;
		border-radius: 8px;
		overflow-x: auto;
		margin-bottom: 15px;
		border-left: 3px solid hsl(187, 85%, 60%);
	}

	.use-case code {
		font-family: 'Courier New', monospace;
		font-size: 0.85em;
		color: hsl(187, 85%, 70%);
		line-height: 1.6;
	}

	.use-case p {
		margin: 0;
		opacity: 0.8;
		font-size: 0.95em;
	}

	@media (max-width: 1200px) {
		.examples-grid {
			grid-template-columns: 1fr;
		}

		.example-card {
			grid-template-columns: 1fr;
			gap: 20px;
		}

		.example-demo {
			min-height: 400px;
		}
	}

	@media (max-width: 768px) {
		.examples-header h1 {
			font-size: 2em;
		}

		.use-cases-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
