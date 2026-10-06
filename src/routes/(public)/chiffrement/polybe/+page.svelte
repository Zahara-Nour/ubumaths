<script lang="ts">
	import CipherOutput from '$lib/components/ciphers/CipherOutput.svelte';
	import CipherWorkbench from '$lib/components/ciphers/CipherWorkbench.svelte';
	import { attempt } from '$lib/ciphers/outcome';
	import { POLYBIUS_GRID, polybiusDecrypt, polybiusEncrypt } from '$lib/ciphers/polybius';
	import SeoHead from '$lib/seo/SeoHead.svelte';

	// Constantes
	const PLAIN = 'Bougrelas est vivant';
</script>

<SeoHead
	title="Le carré de Polybe : chiffrer avec une grille — Chiphre"
	description="Le carré de Polybe pas à pas : chaque lettre devient deux chiffres, sa ligne et sa colonne dans une grille de 25 cases où I et J partagent la même case."
/>

<header class="flex flex-col gap-3">
	<h1 class="text-3xl font-bold">Le carré de Polybe</h1>
	<p>
		L’historien grec Polybe décrit un système pour transmettre des messages à distance avec des
		torches : chaque lettre est repérée par sa ligne et sa colonne dans une grille de 5 × 5. B, à la
		ligne 1 et à la colonne 2, devient <strong>12</strong>.
	</p>
	<p>
		Une grille de 5 × 5 n’a que 25 cases pour 26 lettres : J partage la case de I. Au déchiffrement,
		un J revient donc sous la forme d’un I. Le lecteur rétablit sans peine « IOUR » en « JOUR ».
	</p>
</header>

<CipherWorkbench
	encrypt={(text) => attempt(() => polybiusEncrypt(text))}
	decrypt={(text) => attempt(() => polybiusDecrypt(text))}
	initialPlain={PLAIN}
	initialCipher={polybiusEncrypt(PLAIN).text}
	initialCrack={polybiusEncrypt(PLAIN).text}
	blocksOption={false}
	cipherPlaceholder="Paires de chiffres, par exemple 45 12 45"
>
	{#snippet keyControls()}
		<table class="mx-auto border-collapse font-mono" data-testid="polybius-grid">
			<caption class="mb-2 text-sm text-muted-foreground">La grille (ligne, puis colonne)</caption>
			<thead>
				<tr>
					<th></th>
					{#each [1, 2, 3, 4, 5] as column (column)}
						<th scope="col" class="w-8 text-sm text-muted-foreground">{column}</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#each POLYBIUS_GRID as line, row (row)}
					<tr>
						<th scope="row" class="pr-2 text-sm text-muted-foreground">{row + 1}</th>
						{#each line as letter (letter)}
							<td class="size-8 border text-center">{letter === 'I' ? 'I/J' : letter}</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	{/snippet}
	{#snippet crack(text)}
		<p class="text-sm">
			La grille de Polybe, dans l’ordre de l’alphabet, n’a pas de clé : c’est un <em>codage</em> plus
			qu’un chiffre, comme le morse. Pour la rendre secrète, il faut mélanger la grille, et l’on retombe
			alors sur une substitution.
		</p>
		<CipherOutput
			outcome={attempt(() => polybiusDecrypt(text))}
			label="Message clair"
			testid="cipher-cracked"
			blocksOption={false}
		/>
	{/snippet}
</CipherWorkbench>
