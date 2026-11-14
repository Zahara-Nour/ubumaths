<!--
  La Tortue : bac à sable public de programmation par blocs (chantier blockly, PR 3).
  Sans connexion, rien n'est enregistré ; les blocs sont exécutés par l'interpréteur de Chiphre
  (ADR 0039), jamais par du JavaScript.
-->
<script lang="ts">
	import { TortueBacASable } from '$lib/components/blockly';
</script>

<svelte:head>
	<title>La Tortue - Chiphre</title>
	<meta
		name="description"
		content="Programme une tortue avec des blocs : avancer, tourner, répéter. Elle trace ta figure sur un quadrillage."
	/>
</svelte:head>

<div class="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-6">
	<div>
		<h1 class="text-2xl font-bold text-foreground">La Tortue</h1>
		<p class="text-muted-foreground">
			Assemble des blocs pour faire avancer et tourner la tortue, puis clique sur « Lancer ».
		</p>
	</div>
	<TortueBacASable />
</div>
