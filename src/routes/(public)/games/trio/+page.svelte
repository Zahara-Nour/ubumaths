<script lang="ts">
	import SeoHead from '#lib/seo/SeoHead.svelte';
	import Trio from './Trio.svelte';
</script>

<SeoHead
	title="Trio : jeu de calcul mental en ligne | Chiphre"
	description="Trouvez trois nombres alignés qui satisfont une équation mathématique. Entraînez-vous au calcul mental tout en résolvant des puzzles !"
/>

<div class="container mx-auto px-4 py-8">
	<div class="mb-8 text-center">
		<h1 class="mb-2 text-4xl font-bold text-foreground">Trio</h1>
	</div>

	<Trio />
</div>
