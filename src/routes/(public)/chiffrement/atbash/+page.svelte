<script lang="ts">
	import AlphabetStrip from '$lib/components/ciphers/AlphabetStrip.svelte';
	import CipherOutput from '$lib/components/ciphers/CipherOutput.svelte';
	import CipherWorkbench from '$lib/components/ciphers/CipherWorkbench.svelte';
	import { ALPHABET } from '$lib/ciphers/alphabet';
	import { atbash } from '$lib/ciphers/atbash';
	import { attempt } from '$lib/ciphers/outcome';
	import SeoHead from '$lib/seo/SeoHead.svelte';

	// Constantes
	const PLAIN = 'Le Czar ne doit rien savoir. Brûlez ce message après lecture.';
	const KEY = atbash(ALPHABET).text;
</script>

<SeoHead
	title="Chiffre Atbash : l’alphabet à l’envers — Chiphre"
	description="Le chiffre Atbash pas à pas : A devient Z, B devient Y. Chiffrer et déchiffrer sont la même opération, et ce chiffre sans clé se lit par qui connaît la méthode."
/>

<header class="flex flex-col gap-3">
	<h1 class="text-3xl font-bold">Atbash</h1>
	<p>
		Atbash vient de l’hébreu ancien : on remplace la première lettre de l’alphabet par la dernière,
		la deuxième par l’avant-dernière, et ainsi de suite. On en trouve des traces dans la Bible.
	</p>
	<p>
		Avec A = 0 et Z = 25, la lettre de rang <em>n</em> devient celle de rang 25 − <em>n</em>.
		Appliquez Atbash deux fois : vous retrouvez votre message, car 25 − (25 − <em>n</em>) =
		<em>n</em>. Chiffrer et déchiffrer, c’est la même opération.
	</p>
</header>

<CipherWorkbench
	encrypt={(text) => attempt(() => atbash(text))}
	decrypt={(text) => attempt(() => atbash(text))}
	initialPlain={PLAIN}
	initialCipher={atbash(PLAIN).text}
	initialCrack={atbash(PLAIN).text}
>
	{#snippet keyControls()}
		<AlphabetStrip key={KEY} />
	{/snippet}
	{#snippet crack(text)}
		<p class="text-sm">
			Atbash n’a pas de clé : quiconque connaît la méthode lit le message. Sa seule protection,
			c’est le secret de la méthode, et un secret de méthode finit toujours par s’éventer.
		</p>
		<CipherOutput
			outcome={attempt(() => atbash(text))}
			label="Message clair"
			testid="cipher-cracked"
		/>
	{/snippet}
</CipherWorkbench>
