<script lang="ts">
	import VipCardHolo from '$lib/components/VipCardHolo.svelte';
	import { VIP_CARDS } from '$lib/types/vip-card';

	// Group cards by rarity
	const legendaryCards = VIP_CARDS.filter((c) => c.rarity === 'legendary');
	const epicCards = VIP_CARDS.filter((c) => c.rarity === 'epic');
	const rareCards = VIP_CARDS.filter((c) => c.rarity === 'rare');
	const commonCards = VIP_CARDS.filter((c) => c.rarity === 'common');

	// Showcase card (first legendary)
	const showcaseCard = legendaryCards[0];
</script>

<svelte:head>
	<title>Cartes VIP Holographiques - Démo</title>
</svelte:head>

<main class="demo-page">
	<header class="demo-header">
		<h1>Cartes VIP Holographiques</h1>
		<p class="subtitle">Effet holographique interactif inspiré des cartes Pokémon</p>

		<nav class="demo-nav">
			<a href="/">← Retour à l'application</a>
			<span class="nav-separator">|</span>
			<a href="/vip-cards-demo/examples">📖 Configuration Examples</a>
		</nav>

		<div class="intro-section">
			<p>
				Découvrez les cartes VIP avec des effets holographiques magnifiques qui réagissent au
				mouvement de votre souris et à l'inclinaison de votre appareil mobile.
			</p>
			<p>
				Cliquez sur une carte pour l'agrandir et explorer l'effet en détail. Les effets changent
				selon la rareté de la carte.
			</p>
		</div>
	</header>

	<!-- Showcase Card -->
	<section class="showcase-section">
		<h2>Carte Mise en Avant</h2>
		<div class="showcase-container">
			<div class="card-container">
				<VipCardHolo card={showcaseCard} showcase={true} />
				<div class="card-name showcase-name">{showcaseCard.name}</div>
			</div>
		</div>
	</section>

	<!-- Rarity Legend -->
	<section class="rarity-legend">
		<h2>Effets par Rareté</h2>
		<div class="legend-grid">
			<div class="legend-item legendary">
				<div class="legend-badge">Légendaire</div>
				<p>Effet Secret Rare (or scintillant)</p>
			</div>
			<div class="legend-item epic">
				<div class="legend-badge">Épique</div>
				<p>Effet Rainbow (paillettes arc-en-ciel)</p>
			</div>
			<div class="legend-item rare">
				<div class="legend-badge">Rare</div>
				<p>Effet Cosmos (galaxie holographique)</p>
			</div>
			<div class="legend-item common">
				<div class="legend-badge">Commune</div>
				<p>Effet Holo (rayons verticaux)</p>
			</div>
		</div>
	</section>

	<!-- Legendary Cards -->
	{#if legendaryCards.length > 0}
		<section class="cards-section">
			<h2>✨ Cartes Légendaires ({legendaryCards.length})</h2>
			<div class="cards-grid">
				{#each legendaryCards as card}
					<div class="card-container">
						<VipCardHolo {card} />
						<div class="card-name">{card.name}</div>
					</div>
				{/each}
			</div>
		</section>
	{/if}

	<!-- Epic Cards -->
	{#if epicCards.length > 0}
		<section class="cards-section">
			<h2>💎 Cartes Épiques ({epicCards.length})</h2>
			<div class="cards-grid">
				{#each epicCards as card}
					<div class="card-container">
						<VipCardHolo {card} />
						<div class="card-name">{card.name}</div>
					</div>
				{/each}
			</div>
		</section>
	{/if}

	<!-- Rare Cards -->
	{#if rareCards.length > 0}
		<section class="cards-section">
			<h2>⭐ Cartes Rares ({rareCards.length})</h2>
			<div class="cards-grid">
				{#each rareCards as card}
					<div class="card-container">
						<VipCardHolo {card} />
						<div class="card-name">{card.name}</div>
					</div>
				{/each}
			</div>
		</section>
	{/if}

	<!-- Common Cards -->
	{#if commonCards.length > 0}
		<section class="cards-section">
			<h2>🎴 Cartes Communes ({commonCards.length})</h2>
			<div class="cards-grid">
				{#each commonCards as card}
					<div class="card-container">
						<VipCardHolo {card} />
						<div class="card-name">{card.name}</div>
					</div>
				{/each}
			</div>
		</section>
	{/if}

	<!-- Back to Top -->
	<div class="back-to-top">
		<a href="#top">↑ Retour en haut</a>
	</div>
</main>

<style>
	.demo-page {
		max-width: 1400px;
		margin: 0 auto;
		padding: 40px 20px;
		color: white;
		background: linear-gradient(135deg, hsl(220, 13%, 18%) 0%, hsl(220, 13%, 10%) 100%);
		min-height: 100vh;
	}

	.demo-header {
		text-align: center;
		margin-bottom: 60px;
	}

	.demo-header h1 {
		font-size: 3em;
		margin-bottom: 10px;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.subtitle {
		font-size: 1.2em;
		opacity: 0.8;
		margin-bottom: 30px;
	}

	.demo-nav {
		margin: 20px 0;
	}

	.demo-nav a {
		color: hsl(187, 85%, 60%);
		text-decoration: none;
		font-size: 1.1em;
		transition: color 0.3s;
	}

	.demo-nav a:hover {
		color: hsl(207, 100%, 94%);
	}

	.nav-separator {
		margin: 0 15px;
		opacity: 0.5;
	}

	.intro-section {
		max-width: 800px;
		margin: 30px auto;
		background: rgba(255, 255, 255, 0.05);
		padding: 20px 30px;
		border-radius: 10px;
		border-left: 4px solid hsl(187, 85%, 60%);
	}

	.intro-section p {
		margin: 10px 0;
		line-height: 1.6;
	}

	.showcase-section {
		margin: 60px 0;
		text-align: center;
	}

	.showcase-section h2 {
		font-size: 2em;
		margin-bottom: 40px;
	}

	.showcase-container {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 500px;
		max-width: 400px;
		margin: 0 auto;
	}

	.rarity-legend {
		margin: 60px 0;
	}

	.rarity-legend h2 {
		font-size: 2em;
		margin-bottom: 30px;
		text-align: center;
	}

	.legend-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 20px;
		max-width: 1000px;
		margin: 0 auto;
	}

	.legend-item {
		background: rgba(255, 255, 255, 0.05);
		padding: 20px;
		border-radius: 10px;
		text-align: center;
		border: 2px solid;
	}

	.legend-item.legendary {
		border-color: hsl(46, 95%, 50%);
	}

	.legend-item.epic {
		border-color: hsl(280, 60%, 55%);
	}

	.legend-item.rare {
		border-color: hsl(176, 54%, 49%);
	}

	.legend-item.common {
		border-color: hsl(0, 0%, 60%);
	}

	.legend-badge {
		font-size: 1.2em;
		font-weight: bold;
		margin-bottom: 10px;
	}

	.legend-item.legendary .legend-badge {
		color: hsl(46, 95%, 60%);
	}

	.legend-item.epic .legend-badge {
		color: hsl(280, 60%, 65%);
	}

	.legend-item.rare .legend-badge {
		color: hsl(176, 54%, 59%);
	}

	.legend-item.common .legend-badge {
		color: hsl(0, 0%, 70%);
	}

	.legend-item p {
		margin: 0;
		opacity: 0.8;
	}

	.cards-section {
		margin: 80px 0;
	}

	.cards-section h2 {
		font-size: 2em;
		margin-bottom: 40px;
		text-align: center;
	}

	.cards-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 40px;
		justify-items: center;
	}

	.card-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 15px;
	}

	.card-name {
		font-size: 1.1em;
		font-weight: 500;
		text-align: center;
		color: hsl(187, 85%, 70%);
		opacity: 0.9;
		max-width: 250px;
		word-wrap: break-word;
	}

	.card-name.showcase-name {
		font-size: 1.5em;
		font-weight: 600;
		margin-top: 10px;
	}

	.back-to-top {
		position: fixed;
		bottom: 30px;
		right: 30px;
	}

	.back-to-top a {
		display: inline-block;
		background: hsl(187, 85%, 60%);
		color: hsl(192, 87%, 15%);
		padding: 12px 24px;
		border-radius: 30px;
		text-decoration: none;
		font-weight: bold;
		box-shadow: 0 7px 13px -5px currentColor;
		transition: all 0.3s;
	}

	.back-to-top a:hover {
		background: hsl(207, 100%, 70%);
		transform: translateY(-2px);
	}

	@media (max-width: 768px) {
		.demo-header h1 {
			font-size: 2em;
		}

		.cards-grid {
			grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
			gap: 30px;
		}

		.legend-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
