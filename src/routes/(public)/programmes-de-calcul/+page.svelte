<!--
  Programmes de calcul : bac à sable public des blocs de calcul (chantier blockly, phase 0 du
  2026-11-15). Sans connexion, rien n'est enregistré ni jugé ; les blocs sont exécutés par
  l'interpréteur de Chiphre (ADR 0039), jamais par du JavaScript. Même éditeur que le geste de
  réponse ```calcul (`CalculEditeur`).

  Sélecteur « Blocs : 5e · 4e · 3e » (piste 4e / 3e, Q7) : 5e par défaut ; changer de niveau change
  la boîte à outils, les blocs posés restent (un bloc au-dessus du niveau est refusé au lancer).
-->
<script lang="ts">
	import SeoHead from '#lib/seo/SeoHead.svelte';
	import { resolve } from '$app/paths';
	import CalculEditeur from '#lib/components/blockly/CalculEditeur.svelte';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { NIVEAUX_CALCUL, type NiveauCalcul } from '#lib/shared/blockly/calcul/interpreteur.ts';

	let niveau = $state<NiveauCalcul>('5e');
</script>

<SeoHead
	title="Programmes de calcul : les construire avec des blocs | Chiphre"
	description="Construis un programme de calcul avec des blocs : choisis un nombre, calcule, affiche le résultat. Essaie-le sur tous les nombres que tu veux."
/>

<div class="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-6">
	<div>
		<h1 class="text-2xl font-bold text-foreground">Programmes de calcul</h1>
		<p class="text-muted-foreground">
			Assemble des blocs pour calculer à partir du nombre choisi, tape un nombre dans «&nbsp;Essayer
			avec&nbsp;», puis clique sur «&nbsp;Lancer&nbsp;».
		</p>
	</div>
	<div class="flex flex-wrap items-center gap-2" role="group" aria-labelledby="niveau-blocs">
		<span id="niveau-blocs" class="text-sm font-medium">Blocs :</span>
		{#each NIVEAUX_CALCUL as n (n)}
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
	<CalculEditeur programme="" {niveau} />
	<p class="text-sm text-muted-foreground">
		Essaie aussi <a href={resolve('tortue')} class="font-medium text-primary underline">La Tortue</a
		> : des blocs pour tracer des figures.
	</p>
</div>
