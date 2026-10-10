<script lang="ts">
	import MySelect from '$lib/components/MySelect.svelte';
	import AffineAttack from '$lib/components/ciphers/AffineAttack.svelte';
	import AlphabetStrip from '$lib/components/ciphers/AlphabetStrip.svelte';
	import CipherWorkbench from '$lib/components/ciphers/CipherWorkbench.svelte';
	import { ALPHABET } from '$lib/ciphers/alphabet';
	import { VALID_A, affineCollisions, affineDecrypt, affineEncrypt } from '$lib/ciphers/affine';
	import { inverseSearch } from '$lib/ciphers/modular';
	import { attempt } from '$lib/ciphers/outcome';
	import SeoHead from '$lib/seo/SeoHead.svelte';

	// Constantes
	const PLAIN = 'Le Czar arrive par la Vistule avec trois cents cosaques.';
	const INTERCEPTED =
		'Les secrétaires du Cabinet Noir ouvrent les dépêches du Czar, comptent les lettres et cherchent la plus fréquente, qui cache presque toujours un E.';
	const A_ITEMS = Array.from({ length: 25 }, (_, i) => ({
		value: String(i + 1),
		label: String(i + 1)
	}));
	const B_ITEMS = Array.from({ length: 26 }, (_, b) => ({ value: String(b), label: String(b) }));
	const SHOWN_COLLISIONS = 4;

	// State
	let aValue = $state('5');
	let bValue = $state('8');
	const a = $derived(Number(aValue));
	const b = $derived(Number(bValue));
	const inverse = $derived(inverseSearch(a));
	const collisions = $derived(affineCollisions(a, b));
</script>

<SeoHead
	title="Chiffre affine : clé, inverse modulaire et décryptage — Chiphre"
	description="Le chiffre affine pas à pas : y = ax + b modulo 26, pourquoi a doit être premier avec 26, l’inverse modulaire pour déchiffrer, et l’attaque par deux lettres pour décrypter."
/>

<header class="flex flex-col gap-3">
	<h1 class="text-3xl font-bold">Le chiffre affine</h1>
	<p>
		On numérote les lettres de A = 0 à Z = 25, puis la lettre de rang <em>x</em> devient celle de
		rang
		<strong>a·x + b modulo 26</strong>. César (a = 1) et Atbash (a = 25, b = 25) en sont deux cas
		particuliers.
	</p>
	<p>
		Pour déchiffrer, il faut « diviser » par a, c’est-à-dire multiplier par son
		<strong>inverse modulo 26</strong> : un nombre a′ tel que a × a′ laisse 1 dans la division par 26.
		Il n’existe que si a est premier avec 26. Sinon, deux lettres différentes donnent la même lettre
		chiffrée, et plus rien ne permet de revenir en arrière.
	</p>
</header>

<CipherWorkbench
	encrypt={(text) => attempt(() => affineEncrypt(text, a, b))}
	decrypt={(text) => attempt(() => affineDecrypt(text, a, b))}
	initialPlain={PLAIN}
	initialCipher={affineEncrypt(PLAIN, 5, 8).text}
	initialCrack={affineEncrypt(INTERCEPTED, 7, 3).text}
>
	{#snippet keyControls()}
		<div class="flex flex-col gap-3">
			<div class="flex flex-wrap items-center gap-x-6 gap-y-2">
				<span class="flex items-center gap-2">
					<span class="text-sm font-medium">a</span>
					<MySelect
						type="single"
						bind:value={aValue}
						items={A_ITEMS}
						triggerAriaLabel={`a : ${aValue}`}
						fitContent
					/>
				</span>
				<span class="flex items-center gap-2">
					<span class="text-sm font-medium">b</span>
					<MySelect
						type="single"
						bind:value={bValue}
						items={B_ITEMS}
						triggerAriaLabel={`b : ${bValue}`}
						fitContent
					/>
				</span>
			</div>
			{#if inverse}
				<p class="text-sm" data-testid="affine-inverse">
					Inverse de {a} modulo 26 : <strong>{inverse.inverse}</strong>, car {inverse.detail}.
				</p>
				<AlphabetStrip key={affineEncrypt(ALPHABET, a, b).text} />
			{:else}
				<div
					class="flex flex-col gap-1 text-sm text-destructive"
					role="status"
					data-testid="affine-collisions"
				>
					<p>
						a = {a} n’est pas premier avec 26 : des lettres différentes donnent la même lettre chiffrée.
					</p>
					<ul class="font-mono">
						{#each collisions.slice(0, SHOWN_COLLISIONS) as collision (collision.image)}
							<li>{collision.letters.join(' et ')} → {collision.image}</li>
						{/each}
						{#if collisions.length > SHOWN_COLLISIONS}
							<li>… et {collisions.length - SHOWN_COLLISIONS} autres collisions</li>
						{/if}
					</ul>
					<p class="text-foreground">Valeurs de a qui fonctionnent : {VALID_A.join(', ')}.</p>
				</div>
			{/if}
		</div>
	{/snippet}
	{#snippet crack(text)}
		<AffineAttack {text} />
	{/snippet}
</CipherWorkbench>
