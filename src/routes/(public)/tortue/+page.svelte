<!--
  La Tortue : bac à sable public de programmation par blocs (chantier blockly, PR 3).
  Sans connexion, rien n'est enregistré ; les blocs sont exécutés par l'interpréteur de Chiphre
  (ADR 0039), jamais par du JavaScript.

  Sélecteur « Blocs : base · 4e · 3e » (chantier `tortue-variables`, Q6) : base par défaut ;
  changer de niveau change la boîte à outils, les blocs posés restent (un bloc au-dessus du niveau
  est refusé au lancer).
-->
<script lang="ts">
	import SeoHead from '#lib/seo/SeoHead.svelte';
	import { resolve } from '$app/paths';
	import { TortueBacASable } from '#lib/components/blockly/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { NIVEAUX_TORTUE, type NiveauTortue } from '#lib/shared/blockly/tortue/interpreteur.ts';

	// =============================================================================
	// Variables
	// =============================================================================

	let niveau = $state<NiveauTortue>('base');
</script>

<SeoHead
	title="La Tortue : programmer par blocs et tracer des figures | Chiphre"
	description="Programme une tortue avec des blocs : avancer, tourner, répéter. Elle trace ta figure sur un quadrillage."
/>

<div class="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-6">
	<div>
		<h1 class="text-2xl font-bold text-foreground">La Tortue</h1>
		<p class="text-muted-foreground">
			Assemble des blocs pour faire avancer et tourner la tortue, puis clique sur « Lancer ».
		</p>
	</div>
	<div class="flex flex-wrap items-center gap-2" role="group" aria-labelledby="niveau-blocs">
		<span id="niveau-blocs" class="text-sm font-medium">Blocs :</span>
		{#each NIVEAUX_TORTUE as n (n)}
			<Button
				type="button"
				size="sm"
				variant={niveau === n ? 'default' : 'outline'}
				aria-pressed={niveau === n}
				onclick={() => (niveau = n)}
			>
				{n}
			</Button>
		{/each}
	</div>
	<TortueBacASable {niveau} />
	<p class="text-sm text-muted-foreground">
		Essaie aussi
		<a href={resolve('programmes-de-calcul')} class="font-medium text-primary underline"
			>Programmes de calcul</a
		> : des blocs pour calculer à partir d’un nombre choisi.
	</p>
</div>
