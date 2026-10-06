<script lang="ts">
	import MySelect from '$lib/components/MySelect.svelte';
	import CipherWorkbench from '$lib/components/ciphers/CipherWorkbench.svelte';
	import HillAttack from '$lib/components/ciphers/HillAttack.svelte';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { CipherInputError } from '$lib/ciphers/errors';
	import {
		hillCollision,
		hillDecrypt,
		hillEncrypt,
		hillInverse,
		hillKeyFromKeyword,
		type HillKey
	} from '$lib/ciphers/hill';
	import { attempt, type CipherOutcome } from '$lib/ciphers/outcome';
	import SeoHead from '$lib/seo/SeoHead.svelte';

	// Types
	type KeyMode = 'numbers' | 'keyword';
	type KeyResult = { ok: true; key: HillKey } | { ok: false; message: string };

	// Constantes
	const PLAIN = 'Rendez-vous au moulin de Bougrelas avant l’aube.';
	const INTERCEPTED =
		'Rapport du Cabinet Noir. Les espions du Czar ont quitté la capitale cette nuit avec trois charrettes de phynances. Ils comptent traverser la Vistule au gué du moulin, puis rejoindre les Palotins qui les attendent derrière la forêt. La Mère Ubu demande qu’on les laisse passer et qu’on suive leurs traces jusqu’au camp.';
	const CRACK_KEY: HillKey = { a: 5, b: 17, c: 4, d: 15 };
	const MODE_ITEMS = [
		{ value: 'numbers', label: 'Quatre nombres' },
		{ value: 'keyword', label: 'Un mot-clé de 4 lettres' }
	];
	const VALUE_ITEMS = Array.from({ length: 26 }, (_, n) => ({
		value: String(n),
		label: String(n)
	}));
	const CELLS = ['a', 'b', 'c', 'd'] as const;

	// State
	let mode = $state<KeyMode>('numbers');
	let cells = $state<Record<(typeof CELLS)[number], string>>({ a: '3', b: '3', c: '2', d: '5' });
	let keyword = $state('HILL');

	const modeLabel = $derived(MODE_ITEMS.find((item) => item.value === mode)?.label ?? '');
	const keyResult = $derived(readKey(mode, cells, keyword));
	const inverse = $derived(keyResult.ok ? hillInverse(keyResult.key) : null);
	const collision = $derived(
		keyResult.ok && inverse && !inverse.ok ? hillCollision(keyResult.key) : null
	);

	// Functions
	function readKey(
		current: KeyMode,
		values: Record<(typeof CELLS)[number], string>,
		word: string
	): KeyResult {
		if (current === 'numbers') {
			return {
				ok: true,
				key: { a: Number(values.a), b: Number(values.b), c: Number(values.c), d: Number(values.d) }
			};
		}
		try {
			return { ok: true, key: hillKeyFromKeyword(word) };
		} catch (e) {
			if (e instanceof CipherInputError) return { ok: false, message: e.message };
			throw e;
		}
	}

	function withKey(run: (key: HillKey) => CipherOutcome): CipherOutcome {
		return keyResult.ok ? run(keyResult.key) : { ok: false, message: keyResult.message };
	}
</script>

<SeoHead
	title="Chiffre de Hill : matrices et décryptage — Chiphre"
	description="Le chiffre de Hill pas à pas : chiffrer par paires avec une matrice 2 × 2 modulo 26, calculer la matrice inverse pour déchiffrer, et décrypter par clair connu ou ligne par ligne."
/>

<header class="flex flex-col gap-3">
	<h1 class="text-3xl font-bold">Le chiffre de Hill</h1>
	<p>
		Imaginé par le mathématicien Lester Hill en 1929, ce chiffre traite les lettres
		<strong>par paires</strong>. Chaque paire devient un vecteur (x₁, x₂), qu’on multiplie par une
		matrice M = (a b ; c d), modulo 26. Une même lettre n’est donc plus toujours chiffrée pareil :
		tout dépend de sa voisine.
	</p>
	<p>
		Pour déchiffrer, il faut la matrice inverse M⁻¹. Elle n’existe que si le déterminant ad − bc est
		premier avec 26. Le message n’ayant pas toujours un nombre pair de lettres, on complète la
		dernière paire par un X.
	</p>
</header>

<CipherWorkbench
	encrypt={(text) => withKey((key) => attempt(() => hillEncrypt(text, key)))}
	decrypt={(text) => withKey((key) => attempt(() => hillDecrypt(text, key)))}
	initialPlain={PLAIN}
	initialCipher={hillEncrypt(PLAIN, { a: 3, b: 3, c: 2, d: 5 }).text}
	initialCrack={hillEncrypt(INTERCEPTED, CRACK_KEY).text}
>
	{#snippet keyControls()}
		<div class="flex flex-col gap-3">
			<MySelect
				type="single"
				bind:value={() => mode, (value) => (mode = value === 'keyword' ? 'keyword' : 'numbers')}
				items={MODE_ITEMS}
				triggerAriaLabel={`Fabriquer la matrice : ${modeLabel}`}
				fitContent
			/>
			{#if mode === 'numbers'}
				<div class="flex items-center gap-2">
					<span class="text-sm font-medium">M =</span>
					<div
						class="grid grid-cols-2 gap-1 border-x-2 border-foreground px-1"
						data-testid="hill-matrix"
					>
						{#each CELLS as cell (cell)}
							<MySelect
								type="single"
								bind:value={cells[cell]}
								items={VALUE_ITEMS}
								triggerAriaLabel={`Coefficient ${cell} : ${cells[cell]}`}
								fitContent
							/>
						{/each}
					</div>
				</div>
			{:else}
				<div class="flex flex-col gap-1">
					<Label for="hill-keyword">Mot-clé (4 lettres, lues ligne par ligne)</Label>
					<Input id="hill-keyword" bind:value={keyword} class="w-40 font-mono uppercase" />
				</div>
			{/if}
			{#if inverse}
				<ol class="flex flex-col gap-1 font-mono text-sm" data-testid="hill-inverse-steps">
					{#each inverse.steps as step, i (i)}
						<li>{step}</li>
					{/each}
				</ol>
			{/if}
			{#if collision}
				<p class="text-sm text-destructive" role="status" data-testid="hill-collision">
					Deux paires différentes, {collision.pairs[0]} et {collision.pairs[1]}, donnent toutes deux
					{collision.image} : impossible de savoir laquelle était écrite.
				</p>
			{/if}
		</div>
	{/snippet}
	{#snippet extra({ mode: tab, text })}
		{#if tab === 'encrypt' && keyResult.ok && hillEncrypt(text, keyResult.key).padded}
			<p class="text-sm text-muted-foreground" data-testid="hill-padded">
				Nombre impair de lettres : un X complète la dernière paire. Il réapparaîtra au
				déchiffrement.
			</p>
		{/if}
	{/snippet}
	{#snippet crack(text)}
		{#key text}
			<p class="text-sm">
				Indice du Cabinet Noir : les rapports interceptés commencent toujours par « RAPPORT ».
			</p>
			<HillAttack {text} knownStart="RAPP" />
		{/key}
	{/snippet}
</CipherWorkbench>
