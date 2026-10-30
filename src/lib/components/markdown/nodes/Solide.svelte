<!--
	Solide — bloc ```solide
	=======================

	Solide en perspective cavalière (cube, pavé, prisme, pyramide, cylindre,
	cône, boule) : arêtes cachées en tirets, face marquée teintée, noms des
	sommets et cotes. Affichage seul. Dessiné depuis `buildSolideScene`, la
	même scène que le PDF.

	- Traits `var(--color-foreground)`, face marquée en gris translucide (les
	  tirets restent visibles à travers) ; aucune couleur d'accent.
	- Nom accessible : jamais le nom du solide (ce serait la réponse).
	- Plus grand côté du solide : 4 cm, à l'écran comme au PDF ; jamais plus
	  large que le conteneur ; `--espace-taille` (3 cm dans un choix) plafonne
	  la largeur.
	- Bloc en erreur : messages pour le prof, cadre neutre pour l'élève (Q48).

	@module components/markdown/nodes/Solide
-->
<script lang="ts">
	import { ESPACE_UNAVAILABLE, type EspaceNode } from '$lib/ubumark/types/espace';
	import { ESPACE_MARGIN, ESPACE_STROKE } from '$lib/ubumark/utils/espace-scene';
	import {
		SOLIDE_DASH,
		SOLIDE_DOT_RADIUS,
		SOLIDE_LABEL_SIZE,
		SOLIDE_THICK_STROKE,
		buildSolideScene,
		solideLabel
	} from '$lib/ubumark/utils/espace-solides';
	import { readAuthoringErrors } from '../authoring-errors';

	interface Props {
		node: EspaceNode;
		/** Forcer l'affichage des erreurs d'auteur ; sinon, contexte du renderer (élève par défaut) */
		showErrors?: boolean;
		class?: string;
	}

	let { node, showErrors, class: className = '' }: Props = $props();

	const authoring = readAuthoringErrors();
	let errorsVisible = $derived(showErrors ?? authoring());

	let spec = $derived(node.spec?.kind === 'solide' ? node.spec : null);
	let scene = $derived(spec === null ? null : buildSolideScene(spec));

	/** Points au format de l'attribut `points`, marge comprise */
	const pointsOf = (points: { x: number; y: number }[]) =>
		points.map((p) => `${p.x + ESPACE_MARGIN},${p.y + ESPACE_MARGIN}`).join(' ');
</script>

{#if spec === null || scene === null || node.errors.length > 0}
	{#if errorsVisible}
		<div
			class="solide-erreur rounded-md border border-destructive p-3 text-sm text-foreground {className}"
		>
			<p class="font-medium text-destructive">Bloc solide : figure non dessinée</p>
			<ul class="mt-1 list-disc pl-5">
				{#each node.errors as message, i (i)}
					<li>{message}</li>
				{/each}
			</ul>
		</div>
	{:else}
		<div
			class="solide-indisponible rounded-md border border-dashed border-border p-3 text-center text-sm text-muted-foreground {className}"
		>
			{ESPACE_UNAVAILABLE}
		</div>
	{/if}
{:else}
	{@const width = scene.width + 2 * ESPACE_MARGIN}
	{@const height = scene.height + 2 * ESPACE_MARGIN}
	<div class="solide-bloc my-2 flex justify-center {className}">
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 {width} {height}"
			role="img"
			aria-label={solideLabel(spec)}
			class="solide-figure"
			style:width="{width}cm"
			style:aspect-ratio="{width} / {height}"
			fill="none"
			stroke-linecap="round"
			stroke-linejoin="round"
		>
			{#each scene.fills as fill, i (i)}
				<polygon class="solide-face-marquee" points={pointsOf(fill)} />
			{/each}
			{#each scene.lines as line, i (i)}
				<polyline
					class="solide-trait"
					class:solide-cache={line.dashed}
					points={pointsOf(line.points)}
					stroke-width={line.thick ? SOLIDE_THICK_STROKE : ESPACE_STROKE}
					stroke-dasharray={line.dashed ? SOLIDE_DASH.join(' ') : undefined}
				/>
			{/each}
			{#each scene.dots as dot, i (i)}
				<circle
					class="solide-point"
					cx={dot.x + ESPACE_MARGIN}
					cy={dot.y + ESPACE_MARGIN}
					r={SOLIDE_DOT_RADIUS}
				/>
			{/each}
			{#each scene.labels as label, i (i)}
				<text
					class="solide-etiquette"
					x={label.at.x + ESPACE_MARGIN}
					y={label.at.y + ESPACE_MARGIN}
					font-size={SOLIDE_LABEL_SIZE}
					text-anchor="middle"
					dominant-baseline="central">{label.text}</text
				>
			{/each}
		</svg>
	</div>
{/if}

<style>
	.solide-figure {
		max-width: min(100%, var(--espace-taille, 100%));
		height: auto;
	}

	.solide-trait {
		stroke: var(--color-foreground);
	}

	/* Face marquée : translucide, les arêtes cachées restent visibles à travers */
	.solide-face-marquee {
		fill: color-mix(in srgb, var(--color-foreground) 18%, transparent);
		stroke: none;
	}

	.solide-point,
	.solide-etiquette {
		fill: var(--color-foreground);
		stroke: none;
	}
</style>
