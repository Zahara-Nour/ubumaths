<script lang="ts">
	import MySelect from '$lib/components/MySelect.svelte';
	import AlphabetStrip from '$lib/components/ciphers/AlphabetStrip.svelte';
	import CaesarBruteForce from '$lib/components/ciphers/CaesarBruteForce.svelte';
	import CipherWorkbench from '$lib/components/ciphers/CipherWorkbench.svelte';
	import FrequencyChart from '$lib/components/ciphers/FrequencyChart.svelte';
	import { ALPHABET } from '$lib/ciphers/alphabet';
	import { caesarDecrypt, caesarEncrypt } from '$lib/ciphers/caesar';
	import { attempt } from '$lib/ciphers/outcome';
	import SeoHead from '$lib/seo/SeoHead.svelte';

	// Constantes
	const PLAIN = 'Rendez-vous à minuit au bord de la Vistule. Apportez les phynances !';
	const INTERCEPTED =
		'Le Père Ubu ne sait pas compter, mais la Mère Ubu tient les comptes du royaume et surveille les phynances de toute la Pologne.';
	const SHIFT_ITEMS = Array.from({ length: 26 }, (_, k) => ({
		value: String(k),
		label: String(k)
	}));

	// State
	let shiftValue = $state('3');
	const shift = $derived(Number(shiftValue));
	const key = $derived(caesarEncrypt(ALPHABET, shift).text);
</script>

<SeoHead
	title="Chiffre de César : chiffrer, déchiffrer, décrypter — Chiphre"
	description="Le chiffre de César pas à pas : décalage des lettres, calcul modulo 26, force brute des 26 clés et analyse de fréquences pour décrypter sans la clé."
/>

<header class="flex flex-col gap-3">
	<h1 class="text-3xl font-bold">Le chiffre de César</h1>
	<p>
		L’historien Suétone raconte que Jules César, dans ses lettres secrètes, remplaçait chaque lettre
		par celle qui se trouve <strong>trois rangs plus loin</strong> dans l’alphabet : A devient D, B devient
		E… Le Père Ubu, qui se prend volontiers pour un empereur romain, en a fait son chiffre préféré.
	</p>
	<p>
		On numérote les lettres de A = 0 à Z = 25 et on ajoute le décalage. Arrivé au bout, on repart au
		début : 24 + 3 = 27, et 27 − 26 = 1, donc Y devient B. C’est un calcul <strong>modulo 26</strong
		>.
	</p>
</header>

<CipherWorkbench
	encrypt={(text) => attempt(() => caesarEncrypt(text, shift))}
	decrypt={(text) => attempt(() => caesarDecrypt(text, shift))}
	initialPlain={PLAIN}
	initialCipher={caesarEncrypt(PLAIN, 3).text}
	initialCrack={caesarEncrypt(INTERCEPTED, 11).text}
>
	{#snippet keyControls()}
		<div class="flex flex-col gap-3">
			<div class="flex items-center gap-3">
				<span class="text-sm font-medium">Décalage</span>
				<MySelect
					type="single"
					bind:value={shiftValue}
					items={SHIFT_ITEMS}
					triggerAriaLabel={`Décalage : ${shiftValue}`}
					fitContent
				/>
			</div>
			<AlphabetStrip {key} />
		</div>
	{/snippet}
	{#snippet crack(text)}
		<p class="text-sm">
			César n’a que 26 clés : on peut toutes les essayer. Pour choisir la bonne, la Mère Ubu, qui
			sait compter, compare les fréquences des lettres à celles du français : le E y est roi.
		</p>
		<CaesarBruteForce {text} />
		<FrequencyChart {text} />
	{/snippet}
</CipherWorkbench>
