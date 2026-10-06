<script lang="ts">
	import MySelect from '$lib/components/MySelect.svelte';
	import CipherWorkbench from '$lib/components/ciphers/CipherWorkbench.svelte';
	import RsaCrack from '$lib/components/ciphers/RsaCrack.svelte';
	import { ALPHABET_SIZE, formatNumber, letterIndex, lettersOnly } from '$lib/ciphers/alphabet';
	import { CipherInputError } from '$lib/ciphers/errors';
	import { attempt, type CipherOutcome } from '$lib/ciphers/outcome';
	import {
		RSA_PRIMES,
		modPow,
		rsaDecrypt,
		rsaEncrypt,
		rsaKeys,
		validExponents,
		type RsaKeys
	} from '$lib/ciphers/rsa';
	import SeoHead from '$lib/seo/SeoHead.svelte';

	// Types
	type KeysResult = { ok: true; keys: RsaKeys } | { ok: false; message: string };

	// Constantes
	const PLAIN = 'Le trésor est caché sous la troisième pierre.';
	const INTERCEPTED =
		'Dépêche du Czar : nos espions attendent le signal au pont de Varsovie à minuit.';
	const CZAR_KEYS = rsaKeys(43, 47, 5);
	const [DEFAULT_P, DEFAULT_Q, DEFAULT_E] = [31, 37, 7];
	const PRIME_ITEMS = RSA_PRIMES.map((p) => ({ value: String(p), label: String(p) }));

	// State
	let pValue = $state(String(DEFAULT_P));
	let qValue = $state(String(DEFAULT_Q));
	let eValue = $state(String(DEFAULT_E));

	const p = $derived(Number(pValue));
	const q = $derived(Number(qValue));
	const exponents = $derived(validExponents((p - 1) * (q - 1)));
	const exponentItems = $derived(exponents.map((e) => ({ value: String(e), label: String(e) })));
	const keysResult = $derived(readKeys(p, q, Number(eValue)));

	// Functions
	function readKeys(primeP: number, primeQ: number, e: number): KeysResult {
		try {
			return { ok: true, keys: rsaKeys(primeP, primeQ, e) };
		} catch (error) {
			if (error instanceof CipherInputError) return { ok: false, message: error.message };
			throw error;
		}
	}

	/** Change p ou q ; si e n'est plus premier avec φ(n), prend le plus petit exposant valide */
	function changePrime(name: 'p' | 'q', value: string) {
		if (name === 'p') pValue = value;
		else qValue = value;
		const valid = validExponents((Number(pValue) - 1) * (Number(qValue) - 1));
		if (!valid.includes(Number(eValue)) && valid.length > 0) eValue = String(valid[0]);
	}

	function withKeys(run: (keys: RsaKeys) => CipherOutcome): CipherOutcome {
		return keysResult.ok ? run(keysResult.keys) : { ok: false, message: keysResult.message };
	}

	/** Le premier bloc du message, pour détailler son exponentiation rapide */
	function firstBlock(text: string): number | null {
		const letters = lettersOnly(text);
		if (letters.length === 0) return null;
		const [x1, x2] = Array.from((letters + 'X').slice(0, 2), letterIndex);
		return ALPHABET_SIZE * x1 + x2;
	}

	function formatMultiplier(n: number): string {
		return n.toLocaleString('fr-FR');
	}
</script>

<SeoHead
	title="RSA de poche : clés, Euclide étendu et exponentiation rapide — Chiphre"
	description="Le chiffrement RSA avec de petits nombres : fabriquer les clés avec l’algorithme d’Euclide étendu, chiffrer par exponentiation rapide, et décrypter en factorisant n."
/>

<header class="flex flex-col gap-3">
	<h1 class="text-3xl font-bold">RSA de poche</h1>
	<p>
		Publié en 1977 par Ronald Rivest, Adi Shamir et Leonard Adleman, RSA protège aujourd’hui encore
		une bonne part des échanges sur Internet. C’est le premier chiffrement à clé publique utilisable
		(l’idée venait de Whitfield Diffie et Martin Hellman, en 1976) : la clé qui chiffre est
		<strong>publique</strong>. N’importe qui peut chiffrer un message pour vous, mais seul celui qui
		connaît la clé privée sait le déchiffrer.
	</p>
	<p>
		On choisit deux nombres premiers p et q, puis n = p × q et φ(n) = (p − 1)(q − 1). La clé
		publique est (n, e), avec e premier avec φ(n) ; la clé privée est l’inverse d de e modulo φ(n).
		Pour chiffrer un nombre m, on calcule c = mᵉ mod n ; pour déchiffrer, m = cᵈ mod n. Ici, les
		lettres vont par paires : m = 26 × x₁ + x₂, entre 0 et 675.
	</p>
	<aside class="rounded-lg border bg-card p-4 text-sm text-card-foreground">
		<strong>Pourquoi ça marche ?</strong> Comme e × d = 1 + k × φ(n), on a (mᵉ)ᵈ = m × (mᵠ⁽ⁿ⁾)ᵏ. Si p
		ne divise pas m, le petit théorème de Fermat donne mᵖ⁻¹ ≡ 1 (mod p), donc mᵠ⁽ⁿ⁾ = (mᵖ⁻¹)^(q − 1)
		≡ 1 et (mᵉ)ᵈ ≡ m (mod p). Si p divise m, les deux membres sont nuls modulo p. De même modulo q ;
		p et q étant premiers entre eux, l’égalité vaut modulo n = p × q.
	</aside>
</header>

<CipherWorkbench
	encrypt={(text) => withKeys((keys) => attempt(() => rsaEncrypt(text, keys)))}
	decrypt={(text) => withKeys((keys) => attempt(() => rsaDecrypt(text, keys)))}
	initialPlain={PLAIN}
	initialCipher={rsaEncrypt(PLAIN, rsaKeys(DEFAULT_P, DEFAULT_Q, DEFAULT_E)).text}
	initialCrack={rsaEncrypt(INTERCEPTED, CZAR_KEYS).text}
	blocksOption={false}
	cipherPlaceholder="Nombres séparés par des espaces"
>
	{#snippet keyControls()}
		<div class="flex flex-col gap-3">
			<div class="flex flex-wrap items-center gap-x-6 gap-y-2">
				<span class="flex items-center gap-2">
					<span class="text-sm font-medium">p</span>
					<MySelect
						type="single"
						bind:value={() => pValue, (value) => changePrime('p', value)}
						items={PRIME_ITEMS}
						triggerAriaLabel={`p : ${pValue}`}
						fitContent
					/>
				</span>
				<span class="flex items-center gap-2">
					<span class="text-sm font-medium">q</span>
					<MySelect
						type="single"
						bind:value={() => qValue, (value) => changePrime('q', value)}
						items={PRIME_ITEMS}
						triggerAriaLabel={`q : ${qValue}`}
						fitContent
					/>
				</span>
				<span class="flex items-center gap-2">
					<span class="text-sm font-medium">e</span>
					<MySelect
						type="single"
						bind:value={eValue}
						items={exponentItems}
						triggerAriaLabel={`e : ${eValue}`}
						fitContent
					/>
				</span>
			</div>
			{#if keysResult.ok}
				{@const keys = keysResult.keys}
				<ol class="flex flex-col gap-1 font-mono text-sm" data-testid="rsa-key-steps">
					{#each keys.steps as step, i (i)}
						<li>{step}</li>
					{/each}
				</ol>
				<p id="rsa-euclid-caption" class="text-sm text-muted-foreground">
					Euclide étendu, en tableau : chaque ligne vérifie r = u × {keys.phi} + v × {keys.e}.
				</p>
				<div class="overflow-x-auto">
					<table
						class="font-mono text-sm"
						data-testid="rsa-euclid"
						aria-labelledby="rsa-euclid-caption"
					>
						<thead>
							<tr class="text-muted-foreground">
								<th class="pr-4 text-right font-normal">r</th>
								<th class="pr-4 text-right font-normal">q</th>
								<th class="pr-4 text-right font-normal">u</th>
								<th class="text-right font-normal">v</th>
							</tr>
						</thead>
						<tbody>
							{#each keys.euclid as row, i (i)}
								<tr>
									<td class="pr-4 text-right">{row.r}</td>
									<td class="pr-4 text-right">{row.q ?? ''}</td>
									<td class="pr-4 text-right">{formatNumber(row.u)}</td>
									<td class="text-right">{formatNumber(row.v)}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{:else}
				<p class="text-sm text-destructive" role="status" data-testid="rsa-key-error">
					{keysResult.message}
				</p>
			{/if}
		</div>
	{/snippet}
	{#snippet extra({ mode, text })}
		{@const block = mode === 'encrypt' && keysResult.ok ? firstBlock(text) : null}
		{#if mode === 'encrypt' && lettersOnly(text).length % 2 === 1}
			<p class="text-sm text-muted-foreground">
				Nombre impair de lettres : un X complète le dernier bloc.
			</p>
		{/if}
		{#if block !== null && keysResult.ok}
			{@const keys = keysResult.keys}
			{@const pow = modPow(block, keys.e, keys.n)}
			<section class="flex flex-col gap-2" aria-labelledby="rsa-pow-title" data-testid="rsa-pow">
				<h3
					id="rsa-pow-title"
					class="text-sm font-semibold"
					aria-label={`Exponentiation rapide du premier bloc : ${block} puissance ${keys.e} modulo ${keys.n}`}
				>
					Exponentiation rapide du premier bloc : {block}<sup>{keys.e}</sup> mod {keys.n}
				</h3>
				<p class="text-sm text-muted-foreground">
					e = {keys.e} s’écrit {pow.binary} en binaire. On élève au carré, encore et encore, et l’on
					ne multiplie que les carrés des bits à 1 : {pow.multiplications} multiplication{pow.multiplications >
					1
						? 's'
						: ''} au lieu de {formatMultiplier(keys.e - 1)}.
				</p>
				<ol class="flex flex-col gap-1 font-mono text-sm">
					{#each pow.squares as square (square.exponent)}
						<li
							class={square.used ? 'font-bold text-primary' : 'text-muted-foreground'}
							aria-label={`${block} puissance ${square.exponent} congru à ${square.value} modulo ${keys.n}${square.used ? ', retenu' : ''}`}
						>
							{block}<sup>{square.exponent}</sup> ≡ {square.value} (mod {keys.n}){square.used
								? ' ✓'
								: ''}
						</li>
					{/each}
				</ol>
				<p class="font-mono text-sm">
					Produit des carrés retenus : {pow.result}
				</p>
			</section>
		{/if}
	{/snippet}
	{#snippet crack(text)}
		<p class="text-sm">
			Le Czar a publié sa clé publique : (n, e) = ({CZAR_KEYS.n}, {CZAR_KEYS.e}). Le Cabinet Noir a
			intercepté sa dépêche.
		</p>
		<!-- Pas de {#key} : n et e saisis par le visiteur survivent à un changement de message -->
		<RsaCrack {text} initialN={CZAR_KEYS.n} initialE={CZAR_KEYS.e} />
	{/snippet}
</CipherWorkbench>
