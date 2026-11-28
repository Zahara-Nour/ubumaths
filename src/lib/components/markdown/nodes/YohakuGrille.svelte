<!--
	YohakuGrille.svelte
	===================

	Le dessin d'un bloc ```yohaku (chantier `outil-yohaku`) : la grille 2 × 2 de cases bordées,
	le total de chaque ligne à sa droite et de chaque colonne sous elle (séparés de la grille
	par un trait plus épais, comme un tableau de sommes), le signe de l'opération en petit dans
	le coin haut-gauche.

	- Une case est une formule (rendu statique), un champ MathLive (`champ`), ou vide.
	- `verdict` : bordure verte (juste) ou rouge (faux) des cases ; `lignesFausses` et
	  `colonnesFausses` : leurs totaux en rouge.

	@module components/markdown/nodes/YohakuGrille
-->
<script lang="ts" module>
	/** Une case à dessiner */
	export interface CelluleYohaku {
		/** Formule en LaTeX ('' : case vide) */
		latex: string;
		/** Un champ MathLive à remplir */
		champ: boolean;
		/** Rang du champ parmi les cases à remplir (ordre de lecture) */
		rang: number;
	}
</script>

<script lang="ts">
	import '#lib/utils/mathlive-styles.ts';
	import 'mathlive';
	import MathField from '#lib/components/MathField.svelte';
	import type { MathfieldElement } from 'mathlive';
	import type { YohakuOperation } from '#lib/ubumark/types/yohaku.ts';

	interface Props {
		operation: YohakuOperation;
		/** Cases, par ligne puis par colonne */
		cellules: CelluleYohaku[][];
		/** Totaux des lignes et des colonnes, en LaTeX */
		lignes: string[];
		colonnes: string[];
		/** true : cases en vert ; false : en rouge ; null : neutres */
		verdict?: boolean | null;
		lignesFausses?: readonly number[];
		colonnesFausses?: readonly number[];
		/** Champs en lecture seule (après la validation) */
		verrouille?: boolean;
		/** Saisie dans un champ (rang, valeur) */
		onchange?: (rang: number, valeur: string) => void;
		label: string;
	}

	let {
		operation,
		cellules,
		lignes,
		colonnes,
		verdict = null,
		lignesFausses = [],
		colonnesFausses = [],
		verrouille = false,
		onchange,
		label
	}: Props = $props();

	const SIGNES = { somme: '+', produit: '×' } as const;
	const NOMS = ['première', 'deuxième'];

	const etat = $derived(verdict === true ? 'juste' : verdict === false ? 'faux' : 'neutre');
</script>

<div class="yohaku" role="group" aria-label={label} data-yohaku data-etat={etat}>
	{#each cellules as ligne, l (l)}
		{#each ligne as cellule, c (c)}
			<div class="yohaku-case" data-yohaku-case="{l},{c}">
				{#if l === 0 && c === 0}
					<span class="yohaku-signe" aria-hidden="true">{SIGNES[operation]}</span>
				{/if}
				{#if cellule.champ}
					<MathField
						value={cellule.latex}
						oninput={(event: Event) =>
							onchange?.(cellule.rang, (event.currentTarget as MathfieldElement).value)}
						{...verrouille ? { 'read-only': true } : {}}
						{...cellule.rang === 0 ? { 'data-yohaku-focus': '' } : {}}
						aria-label="Case de la {NOMS[l]} ligne, {NOMS[c]} colonne"
					/>
				{:else if cellule.latex !== ''}
					<math-span>{cellule.latex}</math-span>
				{/if}
			</div>
		{/each}
		<div
			class="yohaku-total yohaku-total-ligne"
			class:yohaku-faux={lignesFausses.includes(l)}
			data-yohaku-total="ligne-{l}"
			aria-label="Total de la {NOMS[l]} ligne"
		>
			<math-span>{lignes[l]}</math-span>
		</div>
	{/each}
	{#each colonnes as total, c (c)}
		<div
			class="yohaku-total yohaku-total-colonne"
			class:yohaku-faux={colonnesFausses.includes(c)}
			data-yohaku-total="colonne-{c}"
			aria-label="Total de la {NOMS[c]} colonne"
		>
			<math-span>{total}</math-span>
		</div>
	{/each}
</div>

<style>
	.yohaku {
		display: grid;
		grid-template-columns: repeat(2, minmax(4.5rem, auto)) auto;
		width: max-content;
		max-width: 100%;
		margin-inline: auto;
	}

	.yohaku-case {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 3.25rem;
		padding: 0.25rem 0.4rem;
		margin: -0.5px;
		border: 1px solid var(--color-muted-foreground);
		background: var(--color-background);
	}

	.yohaku[data-etat='juste'] .yohaku-case {
		border-color: var(--color-success);
		border-width: 2px;
	}

	.yohaku[data-etat='faux'] .yohaku-case {
		border-color: var(--color-destructive);
		border-width: 2px;
	}

	.yohaku-signe {
		position: absolute;
		top: 1px;
		left: 4px;
		font-size: 0.7rem;
		line-height: 1;
		color: var(--color-muted-foreground);
	}

	.yohaku-case :global(math-field) {
		width: 100%;
		min-width: 3.5rem;
		border: none;
		background: transparent;
		font-size: 1rem;
		text-align: center;
	}

	.yohaku-total {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.25rem 0.5rem;
		color: var(--color-foreground);
	}

	/* Le trait épais qui sépare la grille de ses totaux */
	.yohaku-total-ligne {
		border-left: 3px solid var(--color-foreground);
	}

	.yohaku-total-colonne {
		border-top: 3px solid var(--color-foreground);
	}

	.yohaku-faux {
		color: var(--color-destructive);
		font-weight: 700;
	}
</style>
