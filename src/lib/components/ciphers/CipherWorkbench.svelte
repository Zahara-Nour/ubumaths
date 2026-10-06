<!--
	Établi d'un chiffre : trois onglets, Chiffrer · Déchiffrer · Décrypter.
	Déchiffrer suppose la clé ; décrypter, c'est s'en passer.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Textarea } from '$lib/components/ui/textarea';
	import type { CipherOutcome } from '$lib/ciphers/outcome';
	import { readDecryptParam } from '$lib/ciphers/tool-link';
	import CipherOutput from './CipherOutput.svelte';

	// Types
	type Tab = 'encrypt' | 'decrypt' | 'crack';

	interface Props {
		encrypt: (text: string) => CipherOutcome;
		decrypt: (text: string) => CipherOutcome;
		initialPlain: string;
		initialCipher: string;
		initialCrack: string;
		/** Réglage de la clé, commun à Chiffrer et Déchiffrer (rendu une seule fois) */
		keyControls?: Snippet;
		/** Complément sous le résultat (la scytale y montre son bâton) */
		extra?: Snippet<[{ mode: 'encrypt' | 'decrypt'; text: string }]>;
		/** Outils de décryptage, appliqués au message de l'onglet */
		crack: Snippet<[string]>;
		blocksOption?: boolean;
		cipherPlaceholder?: string;
	}

	// Props
	let {
		encrypt,
		decrypt,
		initialPlain,
		initialCipher,
		initialCrack,
		keyControls,
		extra,
		crack,
		blocksOption = true,
		cipherPlaceholder = 'Message chiffré'
	}: Props = $props();

	// State — valeurs initiales seulement : le visiteur les change ensuite.
	// Un message passé dans l'URL (lien d'une dépêche) ouvre l'onglet Décrypter. Lu une
	// seule fois : les liens de la campagne viennent toujours d'une autre page.
	const fromUrl = readDecryptParam(page.url.searchParams);
	let tab = $state<Tab>(fromUrl === null ? 'encrypt' : 'crack');
	// svelte-ignore state_referenced_locally
	let plain = $state(initialPlain);
	// svelte-ignore state_referenced_locally
	let cipher = $state(initialCipher);
	// svelte-ignore state_referenced_locally
	let crackText = $state(fromUrl ?? initialCrack);

	const encrypted = $derived(encrypt(plain));
	const decrypted = $derived(decrypt(cipher));

	// Functions
	function sendToDecrypt(text: string) {
		cipher = text;
		tab = 'decrypt';
	}

	function sendToCrack(text: string) {
		crackText = text;
		tab = 'crack';
	}
</script>

<Tabs.Root bind:value={tab} class="flex flex-col gap-4">
	<Tabs.List class="self-start">
		<Tabs.Trigger value="encrypt">Chiffrer</Tabs.Trigger>
		<Tabs.Trigger value="decrypt">Déchiffrer</Tabs.Trigger>
		<Tabs.Trigger value="crack">Décrypter</Tabs.Trigger>
	</Tabs.List>

	<!-- Une seule clé pour Chiffrer et Déchiffrer ; Décrypter s'en passe -->
	{#if tab !== 'crack'}
		{@render keyControls?.()}
	{/if}

	<Tabs.Content value="encrypt" class="flex flex-col gap-4">
		<p class="text-sm text-muted-foreground">Avec la clé, on cache le message.</p>
		<div class="flex flex-col gap-2">
			<Label for="cipher-plain">Message clair</Label>
			<Textarea id="cipher-plain" bind:value={plain} placeholder="Votre message" />
		</div>
		<CipherOutput
			outcome={encrypted}
			label="Message chiffré"
			testid="cipher-encrypted"
			{blocksOption}
		>
			{#snippet actions(text)}
				<Button variant="secondary" size="sm" onclick={() => sendToDecrypt(text)} disabled={!text}>
					Le déchiffrer
				</Button>
				<Button variant="ghost" size="sm" onclick={() => sendToCrack(text)} disabled={!text}>
					Le décrypter sans la clé
				</Button>
			{/snippet}
		</CipherOutput>
		{@render extra?.({ mode: 'encrypt', text: plain })}
	</Tabs.Content>

	<Tabs.Content value="decrypt" class="flex flex-col gap-4">
		<p class="text-sm text-muted-foreground">Avec la clé, on retrouve le message.</p>
		<div class="flex flex-col gap-2">
			<Label for="cipher-cipher">Message chiffré</Label>
			<Textarea id="cipher-cipher" bind:value={cipher} placeholder={cipherPlaceholder} />
		</div>
		<CipherOutput
			outcome={decrypted}
			label="Message clair"
			testid="cipher-decrypted"
			{blocksOption}
		/>
		{@render extra?.({ mode: 'decrypt', text: cipher })}
	</Tabs.Content>

	<Tabs.Content value="crack" class="flex flex-col gap-4">
		<p class="text-sm text-muted-foreground">
			Sans la clé, on cherche quand même : c'est le travail du Cabinet Noir.
		</p>
		<div class="flex flex-col gap-2">
			<Label for="cipher-crack">Message intercepté</Label>
			<Textarea id="cipher-crack" bind:value={crackText} placeholder={cipherPlaceholder} />
		</div>
		{@render crack(crackText)}
	</Tabs.Content>
</Tabs.Root>
