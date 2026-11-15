<!--
  Programmes de calcul : bac à sable public des blocs de calcul (chantier blockly, phase 0 du
  2026-11-15). Sans connexion, rien n'est enregistré ni jugé ; les blocs sont exécutés par
  l'interpréteur de Chiphre (ADR 0039), jamais par du JavaScript. Même éditeur que le geste de
  réponse ```calcul (`CalculEditeur`).
-->
<script lang="ts">
	import { resolve } from '$app/paths';
	import CalculEditeur from '$lib/components/blockly/CalculEditeur.svelte';
</script>

<svelte:head>
	<title>Programmes de calcul - Chiphre</title>
	<meta
		name="description"
		content="Construis un programme de calcul avec des blocs : choisis un nombre, calcule, affiche le résultat. Essaie-le sur tous les nombres que tu veux."
	/>
</svelte:head>

<div class="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-6">
	<div>
		<h1 class="text-2xl font-bold text-foreground">Programmes de calcul</h1>
		<p class="text-muted-foreground">
			Assemble des blocs pour calculer à partir du nombre choisi, tape un nombre dans « Essayer avec
			», puis clique sur « Lancer ».
		</p>
	</div>
	<CalculEditeur programme="" />
	<p class="text-sm text-muted-foreground">
		Essaie aussi <a href={resolve('/tortue')} class="font-medium text-primary underline"
			>La Tortue</a
		> : des blocs pour tracer des figures.
	</p>
</div>
