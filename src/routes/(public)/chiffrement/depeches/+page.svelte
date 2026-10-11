<script lang="ts">
	import DispatchCampaign from '$lib/components/ciphers/DispatchCampaign.svelte';
	import SeoHead from '$lib/seo/SeoHead.svelte';
</script>

<SeoHead
	title="Les Dépêches du Czar : neuf messages secrets à décrypter — Chiphre"
	description="Neuf dépêches chiffrées interceptées par le Cabinet Noir : César, Atbash, Polybe, scytale, substitution, chiffre affine, Vigenère, Hill et RSA. Des indices et les outils de décryptage pour les casser une à une."
/>

<header class="flex flex-col gap-3">
	<h1 class="text-3xl font-bold">Les Dépêches du Czar</h1>
	<p>
		Le Czar Alexis prépare un mauvais coup depuis son palais d’Hiver, et ses messagers sillonnent le
		Royaume. Le Cabinet Noir de Turingrad intercepte leurs dépêches, toutes chiffrées. À vous,
		agent, de les décrypter, l’une après l’autre : chacune ouvre la suivante.
	</p>
</header>

<DispatchCampaign />
