<script lang="ts">
	import CipherWorkbench from '$lib/components/ciphers/CipherWorkbench.svelte';
	import VigenereCrack from '$lib/components/ciphers/VigenereCrack.svelte';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { letterIndex, lettersOnly } from '$lib/ciphers/alphabet';
	import { attempt } from '$lib/ciphers/outcome';
	import { vigenereDecrypt, vigenereEncrypt } from '$lib/ciphers/vigenere';
	import SeoHead from '$lib/seo/SeoHead.svelte';

	// Constantes
	const PLAIN = 'Les Palotins se retrouveront à minuit derrière les cuisines du palais.';
	const INTERCEPTED =
		'Le Cabinet Noir de Turingrad ouvre chaque matin les lettres du Royaume. Les secrétaires de la Mère Ubu comptent les lettres une à une, notent celles qui reviennent le plus souvent et comparent leurs listes avec celles du français. Quand le message est long, la lettre E finit toujours par se montrer, suivie de près par le A, le S et le I. Les espions du Czar croyaient leur chiffre impossible à percer, mais une clé trop courte se répète, et ce qui se répète finit toujours par se trahir.';

	// State
	let key = $state('UBU');
	const shifts = $derived(
		[...lettersOnly(key)].map((letter) => `${letter} = ${letterIndex(letter)}`)
	);
</script>

<SeoHead
	title="Chiffre de Vigenère : chiffrer, déchiffrer, décrypter — Chiphre"
	description="Le chiffre de Vigenère pas à pas : une clé répétée, un décalage par lettre, puis le décryptage par la méthode de Kasiski, l’indice de coïncidence et un César par colonne."
/>

<header class="flex flex-col gap-3">
	<h1 class="text-3xl font-bold">Le chiffre de Vigenère</h1>
	<p>
		Publié par Giovan Battista Bellaso en 1553 et popularisé par Blaise de Vigenère en 1586, ce
		chiffre fait un César dont le décalage
		<strong>change à chaque lettre</strong> : il est donné par les lettres d’un mot-clé, répété tout
		au long du message. Une même lettre claire n’est donc plus toujours chiffrée pareil, et l’analyse
		de fréquences ne suffit plus. On l’a surnommé « le chiffre indéchiffrable ».
	</p>
	<p>
		Il a résisté près de trois siècles, jusqu’à ce que Friedrich Kasiski publie sa méthode en 1863.
		Son point faible : une clé courte se répète, et ce qui se répète finit par se voir.
	</p>
</header>

<CipherWorkbench
	encrypt={(text) => attempt(() => vigenereEncrypt(text, key))}
	decrypt={(text) => attempt(() => vigenereDecrypt(text, key))}
	initialPlain={PLAIN}
	initialCipher={vigenereEncrypt(PLAIN, 'UBU').text}
	initialCrack={vigenereEncrypt(INTERCEPTED, 'MERDRE').text}
>
	{#snippet keyControls()}
		<div class="flex flex-col gap-1">
			<Label for="vigenere-key">Clé</Label>
			<Input id="vigenere-key" bind:value={key} class="max-w-xs font-mono uppercase" />
			{#if shifts.length > 0}
				<p class="text-sm text-muted-foreground">
					Décalages successifs : {shifts.join(', ')}, puis on recommence.
				</p>
			{/if}
		</div>
	{/snippet}
	{#snippet crack(text)}
		{#key text}
			<VigenereCrack {text} />
		{/key}
	{/snippet}
</CipherWorkbench>
