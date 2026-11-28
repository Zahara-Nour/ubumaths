<!--
	LabyrintheGrille.svelte
	=======================

	Le dessin d'un bloc ```labyrinthe (chantier `labyrinthe`) : la grille de nombres, une flèche
	devant l'entrée (bord gauche), les sorties numérotées de haut en bas (bord droit).

	- `chemin` : les cases d'un chemin, teintées (neutre ; vert ou rouge selon `verdict`).
	- `faute` : la case où le chemin cesse d'être juste, en rouge.
	- `attendu` : le bon chemin, cases cerclées en pointillés.
	- `touchables` + `ontoucher` : les cases sont des boutons ; seules les cases touchables
	  répondent. Clavier : flèches d'une case à l'autre (un seul arrêt de tabulation), Entrée ou
	  Espace pour toucher.

	@module components/markdown/nodes/LabyrintheGrille
-->
<script lang="ts">
	import type { Case, LabyrintheSpec } from '#lib/ubumark/types/labyrinthe.ts';
	import { regleDite } from '#lib/ubumark/utils/labyrinthe-moteur.ts';

	interface Props {
		spec: LabyrintheSpec;
		chemin?: readonly Case[];
		/** true : le chemin en vert ; false : en rouge ; null : couleur neutre */
		verdict?: boolean | null;
		faute?: Case | null;
		attendu?: readonly Case[] | null;
		/** Cases qui répondent au toucher ; absent : la grille est un dessin */
		touchables?: readonly Case[] | null;
		ontoucher?: (c: Case) => void;
		/** Nom accessible ; défaut : la grille décrite */
		label?: string;
	}

	let {
		spec,
		chemin = [],
		verdict = null,
		faute = null,
		attendu = null,
		touchables = null,
		ontoucher,
		label
	}: Props = $props();

	const cle = (c: Case) => `${c.ligne},${c.col}`;

	let lignes = $derived(Array.from({ length: spec.lignes }, (_, i) => i + 1));
	let colonnes = $derived(Array.from({ length: spec.colonnes }, (_, i) => i + 1));
	let surLeChemin = $derived(new Set(chemin.map(cle)));
	let surAttendu = $derived(new Set((attendu ?? []).map(cle)));
	let touchable = $derived(new Set((touchables ?? []).map(cle)));
	let interactive = $derived(touchables !== null && ontoucher !== undefined);
	let derniere = $derived(chemin.length > 0 ? cle(chemin[chemin.length - 1]) : null);

	/** La case qui porte l'arrêt de tabulation (clavier) */
	let focus = $state<Case | null>(null);
	let arret = $derived(focus ?? touchables?.[0] ?? { ligne: spec.entree, col: 1 });

	let description = $derived(
		`Labyrinthe de ${spec.colonnes} colonnes et ${spec.lignes} lignes, règle : ${regleDite(spec.regle)} ; entrée à gauche de la ligne ${spec.entree} ; sorties à droite, numérotées de 1 à ${spec.lignes} de haut en bas.`
	);

	let grille = $state<HTMLDivElement>();

	/** Police des cases : plus petite pour les nombres longs (7 colonnes tiennent sur un téléphone) */
	let taille = $derived.by(() => {
		const plusLong = Math.max(...spec.nombres.flat().map((n) => n.length));
		if (plusLong <= 3) return '0.95rem';
		if (plusLong <= 5) return '0.85rem';
		return '0.7rem';
	});

	function caseDite(c: Case): string {
		const nombre = spec.nombres[c.ligne - 1][c.col - 1];
		const morceaux = [`ligne ${c.ligne}, colonne ${c.col} : ${nombre}`];
		if (c.col === 1 && c.ligne === spec.entree) morceaux.push('entrée');
		if (c.col === spec.colonnes) morceaux.push(`sortie ${c.ligne}`);
		return morceaux.join(', ');
	}

	function onKeydown(event: KeyboardEvent, c: Case) {
		const pas: Record<string, [number, number]> = {
			ArrowUp: [-1, 0],
			ArrowDown: [1, 0],
			ArrowLeft: [0, -1],
			ArrowRight: [0, 1]
		};
		const d = pas[event.key];
		if (d === undefined) return;
		event.preventDefault();
		const suivante = {
			ligne: Math.min(spec.lignes, Math.max(1, c.ligne + d[0])),
			col: Math.min(spec.colonnes, Math.max(1, c.col + d[1]))
		};
		focus = suivante;
		grille?.querySelector<HTMLButtonElement>(`[data-labyrinthe-case="${cle(suivante)}"]`)?.focus();
	}

	function onClick(c: Case) {
		focus = c;
		if (touchable.has(cle(c))) ontoucher?.(c);
	}
</script>

<div class="labyrinthe-defile overflow-x-auto">
	<div
		bind:this={grille}
		class="labyrinthe-grille mx-auto"
		class:labyrinthe-juste={verdict === true}
		class:labyrinthe-faux={verdict === false}
		style:grid-template-columns="0.9rem repeat({spec.colonnes}, minmax(2.125rem, max-content)) 1rem"
		style:--labyrinthe-taille={taille}
		role={interactive ? 'group' : 'img'}
		aria-label={label ?? description}
	>
		{#each lignes as ligne (ligne)}
			<span class="labyrinthe-bord" aria-hidden="true">{ligne === spec.entree ? '→' : ''}</span>
			{#each colonnes as col (col)}
				{@const c = { ligne, col }}
				{@const k = cle(c)}
				{@const classes = [
					'labyrinthe-case',
					surLeChemin.has(k) && 'labyrinthe-pris',
					faute !== null && cle(faute) === k && 'labyrinthe-fautive',
					surAttendu.has(k) && 'labyrinthe-attendu',
					touchable.has(k) && 'labyrinthe-touchable'
				]
					.filter(Boolean)
					.join(' ')}
				{#if interactive}
					<button
						type="button"
						class={classes}
						data-labyrinthe-case={k}
						data-labyrinthe-focus={arret.ligne === ligne && arret.col === col ? '' : undefined}
						tabindex={arret.ligne === ligne && arret.col === col ? 0 : -1}
						aria-label={caseDite(c)}
						aria-pressed={surLeChemin.has(k)}
						aria-disabled={!touchable.has(k)}
						aria-current={derniere === k ? 'step' : undefined}
						onclick={() => onClick(c)}
						onkeydown={(event) => onKeydown(event, c)}
					>
						{spec.nombres[ligne - 1][col - 1]}
					</button>
				{:else}
					<span class={classes} data-labyrinthe-case={k}>{spec.nombres[ligne - 1][col - 1]}</span>
				{/if}
			{/each}
			<span class="labyrinthe-bord labyrinthe-sortie" aria-hidden="true">{ligne}</span>
		{/each}
	</div>
</div>

<style>
	.labyrinthe-grille {
		display: grid;
		width: max-content;
		gap: 0;
	}

	.labyrinthe-bord {
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 600;
		color: var(--color-muted-foreground);
	}

	.labyrinthe-sortie {
		font-size: 0.75rem;
	}

	.labyrinthe-case {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 2.75rem;
		padding: 0 0.15rem;
		margin: -0.5px;
		border: 1px solid var(--color-muted-foreground);
		background: var(--color-background);
		color: var(--color-foreground);
		font-size: var(--labyrinthe-taille);
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
		touch-action: manipulation;
	}

	button.labyrinthe-case {
		cursor: pointer;
	}

	button.labyrinthe-case[aria-disabled='true'] {
		cursor: default;
	}

	button.labyrinthe-case:focus-visible {
		position: relative;
		z-index: 1;
		outline: 2px solid var(--color-ring);
		outline-offset: -3px;
	}

	.labyrinthe-touchable {
		box-shadow: inset 0 0 0 2px var(--color-primary);
	}

	.labyrinthe-pris {
		background: color-mix(in oklab, var(--color-primary) 22%, var(--color-background));
		font-weight: 600;
	}

	.labyrinthe-juste .labyrinthe-pris {
		background: color-mix(in oklab, var(--color-success) 30%, var(--color-background));
	}

	.labyrinthe-faux .labyrinthe-pris {
		background: color-mix(in oklab, var(--color-destructive) 18%, var(--color-background));
	}

	.labyrinthe-case.labyrinthe-fautive {
		background: color-mix(in oklab, var(--color-destructive) 40%, var(--color-background));
	}

	.labyrinthe-attendu {
		position: relative;
	}

	.labyrinthe-attendu::after {
		content: '';
		position: absolute;
		inset: 3px;
		border: 2px dashed var(--color-success);
		border-radius: 4px;
		pointer-events: none;
	}
</style>
