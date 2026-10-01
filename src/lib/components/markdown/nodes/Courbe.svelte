<!--
	Courbe — bloc ```courbe
	=======================

	Figure d'analyse STATIQUE : SVG sans store ni interaction, dessiné depuis la
	scène pure `buildCourbeScene` (la même que le PDF Typst).

	- Repère anisotrope : la fenêtre x et y de l'auteur remplit un cadre 4:3.
	- Couleurs par tokens `var(--color-*)` (clair / sombre).
	- `role="img"` + `aria-label` (description de l'auteur, sinon automatique).
	- Erreur (Q48) : message situé pour le prof (`showErrors`, ou contexte posé
	  par `MarkdownRenderer`), cadre neutre « Figure indisponible » pour l'élève.

	@module components/markdown/nodes/Courbe
-->
<script lang="ts">
	import type { CourbeColor, CourbeLabel, CourbeNode } from '$lib/ubumark/types/courbe';
	import { buildCourbeScene, type ScenePoint } from '$lib/ubumark/utils/courbe-scene';
	import { readContentLocale } from '../content-locale';
	import { readAuthoringErrors } from '../authoring-errors';

	interface Props {
		node: CourbeNode;
		/** Forcer l'affichage des erreurs d'auteur ; sinon, contexte du renderer (élève par défaut) */
		showErrors?: boolean;
		class?: string;
	}

	let { node, showErrors, class: className = '' }: Props = $props();

	/** Marge autour du cadre, en px, pour les étiquettes */
	const PAD = 26;

	/** Couleurs : tokens du thème ; vert et violet n'en ont pas, voir le style */
	const COLOR_VAR: Record<CourbeColor, string> = {
		bleu: 'var(--color-info)',
		rouge: 'var(--color-destructive)',
		vert: 'var(--courbe-vert)',
		orange: 'var(--color-warning)',
		violet: 'var(--courbe-violet)',
		noir: 'var(--color-foreground)',
		gris: 'var(--color-muted-foreground)'
	};

	/** Lettres calligraphiques Unicode (`\mathcal{C}` → 𝒞), trous du bloc compris */
	const SCRIPT_HOLES: Record<string, string> = {
		B: 'ℬ',
		E: 'ℰ',
		F: 'ℱ',
		H: 'ℋ',
		I: 'ℐ',
		L: 'ℒ',
		M: 'ℳ',
		R: 'ℛ'
	};

	const authoring = readAuthoringErrors();
	const locale = readContentLocale();

	let errorsVisible = $derived(showErrors ?? authoring());
	let scene = $derived(node.spec ? buildCourbeScene(node.spec, { locale: locale() }) : null);
	let warnings = $derived([...node.warnings, ...(scene?.warnings ?? [])]);

	let width = $derived(scene?.pixelSize.width ?? 0);
	let height = $derived(scene?.pixelSize.height ?? 0);

	function sx(x: number): number {
		if (!scene) return 0;
		const w = scene.window;
		return PAD + ((x - w.xMin) / (w.xMax - w.xMin)) * width;
	}

	function sy(y: number): number {
		if (!scene) return 0;
		const w = scene.window;
		return PAD + ((w.yMax - y) / (w.yMax - w.yMin)) * height;
	}

	function pointsAttr(points: ScenePoint[]): string {
		return points.map((p) => `${sx(p.x).toFixed(2)},${sy(p.y).toFixed(2)}`).join(' ');
	}

	function baseLetter(label: CourbeLabel): string {
		if (!label.calligraphic) return label.base;
		const upper = label.base.toUpperCase();
		return SCRIPT_HOLES[upper] ?? String.fromCodePoint(0x1d49c + upper.charCodeAt(0) - 65);
	}

	function areaFill(color: CourbeColor): string {
		return `color-mix(in srgb, ${COLOR_VAR[color]} 22%, transparent)`;
	}
</script>

{#if scene}
	<figure class="courbe-figure {className}">
		<svg
			role="img"
			aria-label={scene.ariaLabel}
			viewBox="0 0 {width + 2 * PAD} {height + 2 * PAD}"
			style:max-width="{width + 2 * PAD}px"
			class="courbe-svg"
		>
			<!-- Grille -->
			<g class="courbe-grille" aria-hidden="true">
				{#each scene.grid.xs as x, i (i)}
					<line x1={sx(x)} y1={PAD} x2={sx(x)} y2={PAD + height} />
				{/each}
				{#each scene.grid.ys as y, i (i)}
					<line x1={PAD} y1={sy(y)} x2={PAD + width} y2={sy(y)} />
				{/each}
			</g>

			<!-- Aires sous la courbe -->
			{#each scene.areas as area, i (i)}
				<polygon
					class="courbe-aire"
					points={pointsAttr(area.polygon)}
					style:fill={areaFill(area.color)}
				/>
			{/each}

			<!-- Axes, avec une pointe de flèche à chaque extrémité positive -->
			<g class="courbe-axes" aria-hidden="true">
				<line x1={PAD} y1={sy(scene.axes.xAxisY)} x2={PAD + width + 8} y2={sy(scene.axes.xAxisY)} />
				<line
					x1={sx(scene.axes.yAxisX)}
					y1={PAD + height}
					x2={sx(scene.axes.yAxisX)}
					y2={PAD - 8}
				/>
				<polygon
					points="{PAD + width + 12},{sy(scene.axes.xAxisY)} {PAD + width + 5},{sy(
						scene.axes.xAxisY
					) - 3.5} {PAD + width + 5},{sy(scene.axes.xAxisY) + 3.5}"
				/>
				<polygon
					points="{sx(scene.axes.yAxisX)},{PAD - 12} {sx(scene.axes.yAxisX) - 3.5},{PAD - 5} {sx(
						scene.axes.yAxisX
					) + 3.5},{PAD - 5}"
				/>
			</g>

			<!-- Graduations -->
			<g class="courbe-graduations" aria-hidden="true">
				{#each scene.ticks.x as tick, i (i)}
					<line
						x1={sx(tick.value)}
						y1={sy(scene.axes.xAxisY) - 3}
						x2={sx(tick.value)}
						y2={sy(scene.axes.xAxisY) + 3}
					/>
					<text x={sx(tick.value)} y={sy(scene.axes.xAxisY) + 13} text-anchor="middle">
						{tick.label}
					</text>
				{/each}
				{#each scene.ticks.y as tick, i (i)}
					<line
						x1={sx(scene.axes.yAxisX) - 3}
						y1={sy(tick.value)}
						x2={sx(scene.axes.yAxisX) + 3}
						y2={sy(tick.value)}
					/>
					<text x={sx(scene.axes.yAxisX) - 5} y={sy(tick.value) + 3.5} text-anchor="end">
						{tick.label}
					</text>
				{/each}
				{#if scene.originVisible}
					<text x={sx(0) - 5} y={sy(0) + 13} text-anchor="end">O</text>
				{/if}
			</g>

			<!-- Asymptotes données -->
			{#each scene.asymptotes as a, i (i)}
				<line
					class="courbe-asymptote"
					x1={sx(a.from.x)}
					y1={sy(a.from.y)}
					x2={sx(a.to.x)}
					y2={sy(a.to.y)}
				/>
			{/each}

			<!-- Courbes -->
			{#each scene.curves as curve, c (c)}
				{#each curve.polylines as poly, i (i)}
					<polyline
						class="courbe-trace"
						class:pointille={curve.dashed}
						points={pointsAttr(poly)}
						style:stroke={COLOR_VAR[curve.color]}
					/>
				{/each}
			{/each}

			<!-- Bornes du domaine : disque plein (incluse) ou vide (exclue) -->
			{#each scene.endpoints as e, i (i)}
				<circle
					class="courbe-borne"
					class:ouverte={e.open}
					cx={sx(e.x)}
					cy={sy(e.y)}
					r="3.5"
					style:stroke={COLOR_VAR[e.color]}
					style:fill={e.open ? 'var(--color-background)' : COLOR_VAR[e.color]}
				/>
			{/each}

			<!-- Points nommés -->
			{#each scene.points as p, i (i)}
				<circle class="courbe-point" cx={sx(p.x)} cy={sy(p.y)} r="2.75" />
				<text class="courbe-point-nom" x={sx(p.x) + 5} y={sy(p.y) - 5}>{p.name}</text>
			{/each}

			<!-- Noms des courbes -->
			{#each scene.curveLabels as l, i (i)}
				<text class="courbe-nom" x={sx(l.x) + 6} y={sy(l.y) - 6} style:fill={COLOR_VAR[l.color]}
					>{baseLetter(l.label)}{#if l.label.sub}<tspan class="courbe-indice" dy="4"
							>{l.label.sub}</tspan
						>{/if}</text
				>
			{/each}
		</svg>

		{#if errorsVisible && warnings.length > 0}
			<ul class="mt-1 text-xs text-warning">
				{#each warnings as w, i (i)}
					<li>{w.message}</li>
				{/each}
			</ul>
		{/if}
	</figure>
{:else if errorsVisible}
	<div
		class="courbe-erreur rounded-md border border-destructive p-3 text-sm text-foreground {className}"
	>
		<p class="font-medium text-destructive">Bloc courbe : figure non dessinée</p>
		<ul class="mt-1 list-disc pl-5">
			{#each node.errors as e, i (i)}
				<li>{e.message}</li>
			{/each}
		</ul>
	</div>
{:else}
	<div
		class="courbe-indisponible rounded-md border border-dashed border-border p-3 text-center text-sm text-muted-foreground {className}"
	>
		Figure indisponible
	</div>
{/if}

<style>
	.courbe-figure {
		/* Pas de token de thème pour ces deux teintes : définies ici, claires / sombres */
		--courbe-vert: light-dark(#15803d, #4ade80);
		--courbe-violet: light-dark(#7c3aed, #a78bfa);
		margin: 0.5rem 0;
	}

	.courbe-svg {
		display: block;
		width: 100%;
		height: auto;
		margin: 0 auto;
		font-family: inherit;
	}

	.courbe-grille line {
		stroke: var(--color-border);
		stroke-width: 0.75;
	}

	.courbe-axes line {
		stroke: var(--color-foreground);
		stroke-width: 1.1;
	}

	.courbe-axes polygon {
		fill: var(--color-foreground);
	}

	.courbe-graduations line {
		stroke: var(--color-foreground);
		stroke-width: 1;
	}

	.courbe-graduations text {
		fill: var(--color-foreground);
		font-size: 10px;
	}

	.courbe-asymptote {
		stroke: var(--color-muted-foreground);
		stroke-width: 1.2;
		stroke-dasharray: 5 4;
	}

	.courbe-trace {
		fill: none;
		stroke-width: 2;
		stroke-linejoin: round;
		stroke-linecap: round;
	}

	.courbe-trace.pointille {
		stroke-dasharray: 6 4;
	}

	.courbe-borne {
		stroke-width: 1.5;
	}

	.courbe-point {
		fill: var(--color-foreground);
	}

	.courbe-point-nom {
		fill: var(--color-foreground);
		font-size: 12px;
		font-style: italic;
	}

	.courbe-nom {
		font-size: 13px;
		font-style: italic;
	}

	.courbe-indice {
		font-size: 9px;
	}
</style>
