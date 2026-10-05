<script lang="ts">
	import SeoHead from '$lib/seo/SeoHead.svelte';
	import CalculatorContainer from '$lib/components/calculator/CalculatorContainer.svelte';
</script>

<SeoHead
	title="Calculatrice | Chiphre"
	description="Calculatrice en ligne pour les mathématiques du collège et du lycée, directement dans le navigateur."
/>

<div class="container mx-auto p-4">
	<h1 class="mb-6 text-2xl font-bold">Calculatrice</h1>
	<CalculatorContainer />
</div>
