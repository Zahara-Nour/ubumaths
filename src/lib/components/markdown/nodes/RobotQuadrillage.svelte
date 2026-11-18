<!--
	RobotQuadrillage.svelte
	=======================

	Le dessin d'un bloc ```robot (chantier `suite-fleches`) : le quadrillage de cases, les
	cases grises, la case verte, le robot sur sa case de départ (tourné dans son sens en
	avance-pivote).

	- `chemin` : le trajet de l'élève, de centre de case en centre de case, vert s'il arrive
	  (`verdict`), rouge sinon ; `bute` : la case où il n'a pas pu entrer, une croix rouge sur
	  le bord franchi.
	- `attendu` : le trajet d'un code juste, en pointillés.
	- Repère du bloc : (1, 1) = case en bas à gauche.

	@module components/markdown/nodes/RobotQuadrillage
-->
<script lang="ts">
	import type { Case, RobotScene, Sens } from '#lib/ubumark/types/robot.ts';

	interface Props {
		scene: RobotScene;
		/** Trajet de l'élève, départ compris ; absent : le robot seul */
		chemin?: readonly Case[] | null;
		/** true : le trajet en vert ; false : en rouge ; null : couleur neutre */
		verdict?: boolean | null;
		/** Case où le robot n'a pas pu entrer (sortie, case grise) */
		bute?: Case | null;
		/** Trajet d'un code juste, en pointillés */
		attendu?: readonly Case[] | null;
		/** Nom accessible ; défaut : la scène décrite */
		label?: string;
	}

	let {
		scene,
		chemin = null,
		verdict = null,
		bute = null,
		attendu = null,
		label
	}: Props = $props();

	/** Côté d'une case à l'écran (px), au plus */
	const CASE_PX = 44;

	const ROTATION: Record<Sens, number> = { haut: 0, droite: 90, bas: 180, gauche: 270 };
	const SENS_DIT: Record<Sens, string> = {
		haut: 'vers le haut',
		droite: 'vers la droite',
		bas: 'vers le bas',
		gauche: 'vers la gauche'
	};

	let colonnes = $derived(Array.from({ length: scene.colonnes }, (_, i) => i + 1));
	let lignes = $derived(Array.from({ length: scene.lignes }, (_, i) => i + 1));

	/** Coin haut gauche d'une case */
	const x = (c: Case) => c.col - 1;
	const y = (c: Case) => scene.lignes - c.ligne;
	/** Centre d'une case */
	const cx = (c: Case) => c.col - 0.5;
	const cy = (c: Case) => scene.lignes - c.ligne + 0.5;

	const points = (cases: readonly Case[]) => cases.map((c) => `${cx(c)},${cy(c)}`).join(' ');

	const grise = (c: Case) => scene.interdites.some((g) => g.col === c.col && g.ligne === c.ligne);
	let fin = $derived(chemin && chemin.length > 0 ? chemin[chemin.length - 1] : null);
	/** La croix : sur le bord entre la dernière case atteinte et celle où le robot bute */
	let croix = $derived(
		fin && bute ? { x: (cx(fin) + cx(bute)) / 2, y: (cy(fin) + cy(bute)) / 2 } : null
	);
	let couleurChemin = $derived(
		verdict === true
			? 'var(--color-success)'
			: verdict === false
				? 'var(--color-destructive)'
				: 'var(--color-primary)'
	);

	const caseDite = (c: Case) => `colonne ${c.col}, ligne ${c.ligne}`;

	let description = $derived.by(() => {
		const morceaux = [
			`Quadrillage de ${scene.colonnes} colonnes et ${scene.lignes} lignes`,
			`le robot est sur la case ${caseDite(scene.depart)}${scene.sens ? `, tourné ${SENS_DIT[scene.sens]}` : ''}`
		];
		if (scene.arrivee) morceaux.push(`case verte : ${caseDite(scene.arrivee)}`);
		if (scene.interdites.length > 0) {
			morceaux.push(`cases grises : ${scene.interdites.map(caseDite).join(' ; ')}`);
		}
		return `${morceaux.join(' ; ')}.`;
	});
</script>

<svg
	class="robot-quadrillage mx-auto block h-auto w-full"
	style:max-width="{scene.colonnes * CASE_PX}px"
	viewBox="-0.08 -0.08 {scene.colonnes + 0.16} {scene.lignes + 0.16}"
	role="img"
	aria-label={label ?? description}
>
	{#each lignes as ligne (ligne)}
		{#each colonnes as col (col)}
			{@const c = { col, ligne }}
			<rect
				x={x(c)}
				y={y(c)}
				width="1"
				height="1"
				class={grise(c)
					? 'robot-grise'
					: scene.arrivee?.col === col && scene.arrivee.ligne === ligne
						? 'robot-arrivee'
						: 'robot-case'}
			/>
		{/each}
	{/each}

	{#if chemin && chemin.length > 1}
		<polyline points={points(chemin)} class="robot-chemin" style:stroke={couleurChemin} />
	{/if}
	<!-- Par-dessus le trajet de l'élève : visible là où les deux se recouvrent -->
	{#if attendu && attendu.length > 1}
		<polyline points={points(attendu)} class="robot-attendu" />
	{/if}
	{#if fin && chemin && chemin.length > 1}
		<circle cx={cx(fin)} cy={cy(fin)} r="0.12" style:fill={couleurChemin} />
	{/if}

	<!-- Le robot sur sa case de départ -->
	<g
		transform="translate({cx(scene.depart)} {cy(scene.depart)}) rotate({scene.sens
			? ROTATION[scene.sens]
			: 0})"
		class="robot-robot"
		class:robot-estompe={chemin !== null && chemin.length > 1}
	>
		<rect x="-0.3" y="-0.26" width="0.6" height="0.56" rx="0.12" class="robot-corps" />
		<circle cx="-0.13" cy="-0.04" r="0.07" class="robot-oeil" />
		<circle cx="0.13" cy="-0.04" r="0.07" class="robot-oeil" />
		{#if scene.sens}
			<!-- Son nez : le sens où il avance -->
			<path d="M -0.16 -0.28 L 0 -0.45 L 0.16 -0.28 Z" class="robot-nez" />
		{:else}
			<line x1="0" y1="-0.26" x2="0" y2="-0.38" class="robot-antenne" />
			<circle cx="0" cy="-0.4" r="0.05" class="robot-nez" />
		{/if}
	</g>

	{#if croix}
		<g transform="translate({croix.x} {croix.y})" class="robot-croix">
			<line x1="-0.18" y1="-0.18" x2="0.18" y2="0.18" />
			<line x1="-0.18" y1="0.18" x2="0.18" y2="-0.18" />
		</g>
	{/if}
</svg>

<style>
	.robot-case,
	.robot-grise,
	.robot-arrivee {
		stroke: var(--color-muted-foreground);
		stroke-width: 0.03;
	}

	.robot-case {
		fill: var(--color-background);
	}

	.robot-grise {
		fill: var(--color-muted-foreground);
		fill-opacity: 0.55;
	}

	.robot-arrivee {
		fill: var(--color-success);
		fill-opacity: 0.35;
	}

	.robot-chemin,
	.robot-attendu {
		fill: none;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.robot-chemin {
		stroke-width: 0.1;
	}

	.robot-attendu {
		stroke: var(--color-foreground);
		stroke-width: 0.06;
		stroke-dasharray: 0.15 0.12;
		opacity: 0.7;
	}

	.robot-corps {
		fill: var(--color-primary);
	}

	.robot-oeil {
		fill: var(--color-primary-foreground);
	}

	.robot-nez {
		fill: var(--color-primary);
	}

	.robot-antenne {
		stroke: var(--color-primary);
		stroke-width: 0.05;
	}

	.robot-estompe {
		opacity: 0.55;
	}

	.robot-croix line {
		stroke: var(--color-destructive);
		stroke-width: 0.1;
		stroke-linecap: round;
	}
</style>
