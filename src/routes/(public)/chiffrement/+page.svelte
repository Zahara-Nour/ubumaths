<script lang="ts">
	import { resolve } from '$app/paths';
	import SeoHead from '$lib/seo/SeoHead.svelte';

	// Constantes
	const COLLEGE_CIPHERS = [
		{
			path: '/chiffrement/cesar',
			name: 'Le chiffre de César',
			kind: 'Substitution',
			summary: 'Chaque lettre avance de quelques rangs dans l’alphabet. Le préféré du Père Ubu.'
		},
		{
			path: '/chiffrement/atbash',
			name: 'Atbash',
			kind: 'Substitution',
			summary: 'L’alphabet à l’envers : A devient Z, B devient Y. Aucune clé.'
		},
		{
			path: '/chiffrement/substitution',
			name: 'La substitution',
			kind: 'Substitution',
			summary:
				'Un alphabet mélangé, fabriqué à partir d’un mot-clé. Plus de 400 millions de milliards de milliards de clés.'
		},
		{
			path: '/chiffrement/scytale',
			name: 'La scytale',
			kind: 'Transposition',
			summary: 'Une bande enroulée sur un bâton : les lettres restent, leur ordre change.'
		},
		{
			path: '/chiffrement/polybe',
			name: 'Le carré de Polybe',
			kind: 'Grille',
			summary: 'Chaque lettre devient deux chiffres : sa ligne et sa colonne dans une grille.'
		}
	] as const;

	const LYCEE_CIPHERS = [
		{
			path: '/chiffrement/vigenere',
			name: 'Le chiffre de Vigenère',
			kind: 'Seconde · SNT',
			summary:
				'Un César dont le décalage change à chaque lettre. Réputé indéchiffrable pendant trois siècles.'
		},
		{
			path: '/chiffrement/affine',
			name: 'Le chiffre affine',
			kind: 'Terminale · maths expertes',
			summary:
				'Chaque lettre passe par une fonction affine modulo 26 ; l’inverse modulaire la ramène.'
		},
		{
			path: '/chiffrement/hill',
			name: 'Le chiffre de Hill',
			kind: 'Terminale · maths expertes',
			summary: 'Les lettres vont par paires et passent par une matrice 2 × 2, modulo 26.'
		}
	] as const;
</script>

<SeoHead
	title="Le Cabinet Noir de Turingrad : chiffrer et déchiffrer — Chiphre"
	description="Chiffrer, déchiffrer et décrypter des messages secrets : chiffre de César, Atbash, substitution, scytale, carré de Polybe, Vigenère, chiffre affine et chiffre de Hill, avec les calculs pas à pas et l’analyse de fréquences."
/>

<header class="flex flex-col gap-3">
	<h1 class="text-3xl font-bold">Le Cabinet Noir de Turingrad</h1>
	<p class="text-lg">
		Tu croyais que <strong>Chiphre</strong> voulait dire « chiffres » ? En français, un
		<em>chiffre</em> est aussi une manière d’écrire en secret : on parle du chiffre de César comme du
		chiffre de Vigenère. Bienvenue au bureau du Royaume où l’on cache les messages, et où l’on perce
		ceux des autres.
	</p>
</header>

<section aria-labelledby="vocabulaire" class="rounded-xl border bg-card p-5 text-card-foreground">
	<h2 id="vocabulaire" class="mb-3 text-xl font-semibold">Trois mots à ne pas confondre</h2>
	<dl class="grid gap-3 sm:grid-cols-3">
		<div>
			<dt class="font-semibold">Chiffrer</dt>
			<dd class="text-muted-foreground">
				Transformer un message avec une clé pour le rendre illisible.
			</dd>
		</div>
		<div>
			<dt class="font-semibold">Déchiffrer</dt>
			<dd class="text-muted-foreground">Retrouver le message en connaissant la clé.</dd>
		</div>
		<div>
			<dt class="font-semibold">Décrypter</dt>
			<dd class="text-muted-foreground">Retrouver le message <strong>sans</strong> la clé.</dd>
		</div>
	</dl>
	<p class="mt-3 text-sm text-muted-foreground">
		Et « crypter » ? Les spécialistes de la sécurité le déconseillent : chiffrer sans clé n’aurait
		aucun sens.
	</p>
</section>

{#snippet cards(list: typeof COLLEGE_CIPHERS | typeof LYCEE_CIPHERS)}
	<ul class="grid gap-4 sm:grid-cols-2">
		{#each list as cipher (cipher.path)}
			<li>
				<a
					href={resolve(cipher.path)}
					class="flex h-full flex-col gap-1 rounded-xl border bg-card p-5 text-card-foreground transition-colors hover:border-primary"
				>
					<span class="text-xs tracking-wide text-muted-foreground uppercase">{cipher.kind}</span>
					<span class="text-lg font-semibold">{cipher.name}</span>
					<span class="text-muted-foreground">{cipher.summary}</span>
				</a>
			</li>
		{/each}
	</ul>
{/snippet}

<section aria-labelledby="chiffres-college" class="flex flex-col gap-4">
	<h2 id="chiffres-college" class="text-xl font-semibold">Les chiffres du collège</h2>
	{@render cards(COLLEGE_CIPHERS)}
</section>

<section aria-labelledby="chiffres-lycee" class="flex flex-col gap-4">
	<h2 id="chiffres-lycee" class="text-xl font-semibold">Les chiffres du lycée</h2>
	{@render cards(LYCEE_CIPHERS)}
	<p class="text-sm text-muted-foreground">Bientôt : un RSA de poche.</p>
</section>
