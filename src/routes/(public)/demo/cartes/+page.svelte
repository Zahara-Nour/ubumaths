<!--
	Vitrine : les cartes VIP (`/demo/cartes`)
	=========================================

	Quatre cartes écrites dans le code, une par rareté, avec leur effet
	holographique. Le catalogue lu en base reste sur `/dev/cartes` (chantier
	demo-debug, PR 6c).
-->
<script lang="ts">
	import BackLink from '$lib/components/navigation/BackLink.svelte';
	import VipCardHolo from '$lib/components/VipCardHolo.svelte';
	import type { VipCardRarity } from '$lib/types/vip-card';
	import { DEMO_CARDS } from './cartes';

	// Constantes
	const RARITY_LABELS: Record<VipCardRarity, { label: string; effect: string }> = {
		legendary: { label: 'Légendaire', effect: 'reflet doré scintillant' },
		epic: { label: 'Épique', effect: 'paillettes arc-en-ciel' },
		rare: { label: 'Rare', effect: 'galaxie holographique' },
		common: { label: 'Commune', effect: 'rayons verticaux' }
	};
</script>

<svelte:head>
	<title>Les cartes VIP — Chiphre</title>
	<meta name="robots" content="noindex" />
	<!-- Effets holographiques, comme `/dev/cartes` et le tableau de bord -->
	<link rel="stylesheet" href="/css/holo-cards/base.css" />
	<link rel="stylesheet" href="/css/holo-cards/cards.css" />
	<link rel="stylesheet" href="/css/holo-cards/regular-holo.css" />
	<link rel="stylesheet" href="/css/holo-cards/cosmos-holo.css" />
	<link rel="stylesheet" href="/css/holo-cards/rainbow-holo.css" />
	<link rel="stylesheet" href="/css/holo-cards/secret-rare.css" />
</svelte:head>

<div class="mx-auto max-w-5xl space-y-6 px-4 py-8">
	<BackLink href="/demo" label="Retour aux démonstrations" />

	<header class="space-y-2">
		<h1 class="text-3xl font-bold">Les cartes VIP</h1>
		<p class="text-muted-foreground">
			Les élèves gagnent des cartes VIP : offertes par le professeur, piochées avec les gidouilles
			gagnées en travaillant, ou échangées entre camarades. Chaque carte donne un privilège en
			classe ; plus elle est rare, plus son reflet est riche.
		</p>
		<p class="text-muted-foreground">
			Passez la souris sur une carte, ou inclinez votre téléphone. Un clic l'agrandit.
		</p>
	</header>

	<div class="grid grid-cols-1 gap-8 sm:grid-cols-2">
		{#each DEMO_CARDS as card, index (card.id)}
			<section class="flex flex-col items-center gap-3 text-center">
				<div class="w-full max-w-[260px]">
					<VipCardHolo {card} showcase={index === 0} />
				</div>
				<h2 class="text-xl font-semibold">{card.name}</h2>
				<p class="text-sm font-medium">
					{RARITY_LABELS[card.rarity].label} · {RARITY_LABELS[card.rarity].effect}
				</p>
				<p class="max-w-xs text-sm text-muted-foreground">{card.description}</p>
			</section>
		{/each}
	</div>
</div>
