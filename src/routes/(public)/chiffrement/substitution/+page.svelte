<script lang="ts">
	import MySelect from '$lib/components/MySelect.svelte';
	import AlphabetStrip from '$lib/components/ciphers/AlphabetStrip.svelte';
	import CipherWorkbench from '$lib/components/ciphers/CipherWorkbench.svelte';
	import SubstitutionSolver from '$lib/components/ciphers/SubstitutionSolver.svelte';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { attempt } from '$lib/ciphers/outcome';
	import {
		keyFromKeyword,
		substitutionDecrypt,
		substitutionEncrypt,
		validateKey
	} from '$lib/ciphers/substitution';
	import SeoHead from '$lib/seo/SeoHead.svelte';

	// Types
	type KeyMode = 'keyword' | 'full';

	// Constantes
	const PLAIN = 'Les Palotins attendront le signal sous le grand pont de Varsovie.';
	const INTERCEPTED =
		'Au Cabinet Noir de Turingrad, on ouvre toutes les lettres du Royaume. Les espions du Czar écrivent en chiffre, mais les secrétaires de la Mère Ubu comptent les lettres une à une : la plus fréquente est presque toujours un E, puis viennent le A, le S, le I et le N. Avec un peu de patience, le message se dévoile.';
	const MODE_ITEMS = [
		{ value: 'keyword', label: 'À partir d’un mot-clé' },
		{ value: 'full', label: 'Clé complète (26 lettres)' }
	];
	const CRACK_KEY = keyFromKeyword('CORNEGIDOUILLE');

	// State
	let mode = $state<KeyMode>('keyword');
	let rawKey = $state('UBU ROI');

	const key = $derived(mode === 'keyword' ? keyFromKeyword(rawKey) : rawKey);
	const validation = $derived(validateKey(key));
	const modeLabel = $derived(MODE_ITEMS.find((item) => item.value === mode)?.label ?? '');
</script>

<SeoHead
	title="Chiffre par substitution : mot-clé et analyse de fréquences — Chiphre"
	description="Le chiffre par substitution pas à pas : fabriquer un alphabet chiffré à partir d’un mot-clé, chiffrer, déchiffrer, puis décrypter sans la clé grâce à l’analyse de fréquences."
/>

<header class="flex flex-col gap-3">
	<h1 class="text-3xl font-bold">La substitution</h1>
	<p>
		Au lieu de décaler l’alphabet, on le mélange : chaque lettre est remplacée par une autre,
		toujours la même. Pour retenir la clé, on part d’un mot-clé : <strong>UBU ROI</strong> donne UBROI
		(sans les doublons), suivi des lettres restantes dans l’ordre.
	</p>
	<p>
		Il existe 26 × 25 × 24 × … × 1 alphabets mélangés, soit plus de 400 millions de milliards de
		milliards : impossible de tous les essayer. Pourtant, dès le IXᵉ siècle, le savant arabe
		Al-Kindi a montré comment casser ce chiffre en comptant les lettres.
	</p>
</header>

<CipherWorkbench
	encrypt={(text) => attempt(() => substitutionEncrypt(text, key))}
	decrypt={(text) => attempt(() => substitutionDecrypt(text, key))}
	initialPlain={PLAIN}
	initialCipher={substitutionEncrypt(PLAIN, keyFromKeyword('UBU ROI')).text}
	initialCrack={substitutionEncrypt(INTERCEPTED, CRACK_KEY).text}
>
	{#snippet keyControls()}
		<div class="flex flex-col gap-3">
			<div class="flex flex-wrap items-end gap-3">
				<MySelect
					type="single"
					bind:value={() => mode, (value) => (mode = value === 'full' ? 'full' : 'keyword')}
					items={MODE_ITEMS}
					triggerAriaLabel={`Fabriquer la clé : ${modeLabel}`}
					fitContent
				/>
				<div class="flex min-w-48 flex-1 flex-col gap-1">
					<Label for="substitution-key">{mode === 'keyword' ? 'Mot-clé' : 'Clé (26 lettres)'}</Label
					>
					<Input id="substitution-key" bind:value={rawKey} class="font-mono uppercase" />
				</div>
			</div>
			{#if validation.ok}
				<AlphabetStrip key={validation.key} />
			{/if}
		</div>
	{/snippet}
	{#snippet crack(text)}
		<p class="text-sm">
			Une substitution déplace les lettres mais garde leurs fréquences : la lettre chiffrée la plus
			fréquente cache sans doute un E. Faites des hypothèses, le message se dévoile au fur et à
			mesure.
		</p>
		<SubstitutionSolver {text} />
	{/snippet}
</CipherWorkbench>
