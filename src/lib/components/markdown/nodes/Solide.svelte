<!--
	Solide — bloc ```solide
	=======================

	Solide en perspective cavalière (cube, pavé, prisme, pyramide, cylindre,
	cône, boule) : arêtes cachées en tirets, face marquée teintée, noms des
	sommets et cotes, section (`section:`, lot 6), points déclarés (`points:`)
	et vecteurs donnés en flèches (`vecteurs:`, chantier `solide-vecteur`),
	droites données en bleu (`droites:`, chantier `solides-3d`, lot 7a : en
	tirets là où une face du solide passe devant), plans donnés teintés
	(`plans:`, lot 7b : la partie du plan dans le solide, bord en tirets là où
	une face passe devant).
	Affichage seul. Dessiné
	depuis `buildSolideScene`, la même scène que le PDF.

	- Traits `var(--color-foreground)`, face marquée en gris translucide (les
	  tirets restent visibles à travers) ; la section seule en couleur d'accent
	  (orange des figures, translucide).
	- Nom accessible : jamais le nom du solide (ce serait la réponse).
	- Plus grand côté du solide : 4 cm, à l'écran comme au PDF ; jamais plus
	  large que le conteneur ; `--espace-taille` (3 cm dans un choix) plafonne
	  la largeur.
	- Bloc en erreur : messages pour le prof, cadre neutre pour l'élève (Q48).
	- `tourner: oui` (chantier `solides-3d`, ADR 0045) : l'élève fait
	  glisser la figure pour la tourner (flèches au clavier) ; elle passe en
	  douceur de la cavalière à une vue droite, tirets recalculés à chaque angle
	  (cylindre, cône, boule : les ovales s'ouvrent avec la bascule, lot 3).
	  « Vue de départ » (ou Échap) la ramène. Cadre fixe, réservé dès le repos :
	  la page ne bouge pas. Glisser sur la figure ne fait pas défiler la page.
	  Rien n'est enregistré ; un autre bloc repart de la vue de départ.
	  Pendant que la figure tourne, chaque nom garde sa place par rapport à son
	  point ; à l'arrêt (doigt levé, touche relâchée, fin du retour), les noms
	  glissent à la place qui convient à la vue.
	  Solide coupé ou coté (lot 4) : la section et ses noms tournent avec lui ;
	  les longueurs écrites (`cotes:`) ne se voient qu'à la vue de départ, les
	  traits qui les accompagnent (hauteur, rayon) restent — c'est la scène qui
	  en décide (`buildSolideScene`).
	- « Agrandir » (chantier `solide-agrandir`) : un bouton sous la figure ouvre
	  le même dessin en grand dans une fenêtre (toute la largeur d'un téléphone).
	  Même vue que la figure de la page : la grande tourne si la petite tourne, et
	  la petite garde l'angle laissé dans la grande. Rien n'est replacé : noms et
	  traits grossissent avec le dessin. Un autre bloc referme la fenêtre. Pas de
	  bouton dans un choix à cocher (`figure-in-choice.ts`) ni dans une carte que
	  l'on touche (le bouton y cocherait le choix) ; rien n'est enregistré.

	@module components/markdown/nodes/Solide
-->
<script lang="ts">
	import { Maximize2 } from '@lucide/svelte';
	import { Button } from '#lib/components/ui/button/index.ts';
	import * as Dialog from '#lib/components/ui/dialog/index.ts';
	import {
		ESPACE_UNAVAILABLE,
		type EspaceNode,
		type SolideSpec
	} from '#lib/ubumark/types/espace.ts';
	import { ESPACE_MARGIN, ESPACE_STROKE } from '#lib/ubumark/utils/espace-scene.ts';
	import {
		SOLIDE_DASH,
		SOLIDE_DOT_RADIUS,
		SOLIDE_LABEL_SIZE,
		SOLIDE_SUB_SCALE,
		solideLineStroke,
		solideLabel,
		type SolideScene
	} from '#lib/ubumark/utils/espace-solides.ts';
	import { readAuthoringErrors } from '../authoring-errors';
	import { readFigureInChoice } from '../figure-in-choice.ts';
	import { createSolideRotation } from './solide-rotation.svelte.ts';
	import SolideRotationNote from './SolideRotationNote.svelte';
	import SolideVueDeDepart from './SolideVueDeDepart.svelte';

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
	let rotatable = $derived(spec?.rotate === true && node.errors.length === 0);
	/** La vue, le glissement, le clavier, les noms tenus : partagés avec la figure à geste */
	const rotation = createSolideRotation({
		source: () => node.source,
		spec: () => spec,
		rotatable: () => rotatable
	});
	let scene = $derived(rotation.scene);

	/**
	 * La figure est-elle agrandie ? Un autre bloc (nouvelle question, nouvelle
	 * variation) referme la fenêtre, et elle ne se rouvre pas seule s'il revient
	 */
	let enlarged = $derived.by(() => {
		void node.source;
		return false;
	});
	/**
	 * Figure dans un choix à cocher (contexte, connu dès le rendu serveur) ou dans
	 * un autre élément que l'on touche (carte : lu au montage) : pas de bouton
	 */
	let nested = $state(readFigureInChoice());
	/** Le bouton « Agrandir » : le clavier y revient quand la fenêtre se referme */
	let enlargeButton = $state<HTMLElement | null>(null);

	const CLICKABLE_PARENT = 'button, a, label, [role="button"], [role="option"], [role="radio"]';

	function watchParent(element: HTMLElement) {
		if (element.parentElement?.closest(CLICKABLE_PARENT) != null) nested = true;
	}

	/** Points au format de l'attribut `points`, marge comprise */
	const pointsOf = (points: { x: number; y: number }[]) =>
		points.map((p) => `${p.x + ESPACE_MARGIN},${p.y + ESPACE_MARGIN}`).join(' ');
</script>

{#snippet figure(spec: SolideSpec, scene: SolideScene, big: boolean)}
	{@const width = scene.width + 2 * ESPACE_MARGIN}
	{@const height = scene.height + 2 * ESPACE_MARGIN}
	<!-- Figure que l'on peut tourner : une image que le clavier atteint (flèches, Échap) ;
	     son nom le dit (« figure que l'on peut tourner »), le bouton en dessous fait le retour -->
	<!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
	<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 {width} {height}"
		role="img"
		aria-label={solideLabel(spec)}
		class="solide-figure"
		class:solide-tournante={rotatable}
		class:solide-saisie={rotation.dragging}
		tabindex={rotatable ? 0 : undefined}
		onpointerdown={rotatable ? rotation.handlePointerDown : undefined}
		onpointermove={rotatable ? rotation.handlePointerMove : undefined}
		onpointerup={rotatable ? rotation.handlePointerEnd : undefined}
		onpointercancel={rotatable ? rotation.handlePointerEnd : undefined}
		onkeydown={rotatable ? rotation.handleKeyDown : undefined}
		onkeyup={rotatable ? rotation.handleKeyUp : undefined}
		onblur={rotatable ? rotation.handleBlur : undefined}
		{@attach rotatable ? rotation.attach : undefined}
		class:solide-grande={big}
		style:width={big ? `min(100%, calc((100dvh - 9rem) * ${width / height}))` : `${width}cm`}
		style:aspect-ratio="{width} / {height}"
		fill="none"
		stroke-linecap="round"
		stroke-linejoin="round"
	>
		{#each scene.fills as fill, i (i)}
			<polygon class="solide-face-marquee" points={pointsOf(fill)} />
		{/each}
		{#if scene.section}
			<polygon class="solide-section" points={pointsOf(scene.section)} />
		{/if}
		{#each scene.plans ?? [] as plan, i (i)}
			<polygon
				class="solide-plan"
				class:solide-plan-second={i === 1}
				points={pointsOf(plan.fill)}
			/>
		{/each}
		{#each scene.lines as line, i (i)}
			<polyline
				class="solide-trait"
				class:solide-cache={line.dashed}
				points={pointsOf(line.points)}
				stroke-width={solideLineStroke(line)}
				stroke-dasharray={line.dashed ? SOLIDE_DASH.join(' ') : undefined}
			/>
		{/each}
		{#each scene.plans ?? [] as plan, i (i)}
			{#each plan.border as piece, j (j)}
				<polyline
					class="solide-plan-bord"
					class:solide-plan-second={i === 1}
					points={pointsOf(piece.points)}
					stroke-width={solideLineStroke(piece)}
					stroke-dasharray={piece.dashed ? SOLIDE_DASH.join(' ') : undefined}
				/>
			{/each}
		{/each}
		{#each scene.droites ?? [] as pieces, i (i)}
			{#each pieces as piece, j (j)}
				<polyline
					class="solide-droite"
					points={pointsOf(piece.points)}
					stroke-width={solideLineStroke(piece)}
					stroke-dasharray={piece.dashed ? SOLIDE_DASH.join(' ') : undefined}
				/>
			{/each}
		{/each}
		{#each scene.segments ?? [] as piece, i (i)}
			<polyline
				class="solide-droite"
				points={pointsOf(piece.points)}
				stroke-width={solideLineStroke(piece)}
				stroke-dasharray={piece.dashed ? SOLIDE_DASH.join(' ') : undefined}
			/>
		{/each}
		{#each scene.ticks ?? [] as [from, to], i (i)}
			<line
				class="solide-trait"
				x1={from.x + ESPACE_MARGIN}
				y1={from.y + ESPACE_MARGIN}
				x2={to.x + ESPACE_MARGIN}
				y2={to.y + ESPACE_MARGIN}
				stroke-width={ESPACE_STROKE}
				stroke-linecap="butt"
			/>
		{/each}
		{#each scene.arrows as arrow, i (i)}
			<line
				class="solide-trait"
				x1={arrow.shaft[0].x + ESPACE_MARGIN}
				y1={arrow.shaft[0].y + ESPACE_MARGIN}
				x2={arrow.shaft[1].x + ESPACE_MARGIN}
				y2={arrow.shaft[1].y + ESPACE_MARGIN}
				stroke-width={arrow.small ? ESPACE_STROKE * 0.8 : ESPACE_STROKE}
			/>
			<polygon class="solide-pointe" points={pointsOf(arrow.head)} />
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
				dominant-baseline="central"
				>{label.text}{#if label.sub}<tspan
						font-size={SOLIDE_LABEL_SIZE * SOLIDE_SUB_SCALE}
						dy={SOLIDE_LABEL_SIZE * 0.3}>{label.sub}</tspan
					>{/if}</text
			>
		{/each}
	</svg>
{/snippet}

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
	<SolideRotationNote {node} {showErrors} />
	<div class="solide-bloc my-2 flex flex-col items-center gap-1 {className}" {@attach watchParent}>
		{@render figure(spec, scene, false)}
		{#if rotatable || !nested}
			<div class="solide-boutons flex flex-wrap items-center justify-center gap-x-2">
				{#if rotatable}
					<SolideVueDeDepart moved={rotation.moved} onreset={rotation.resetFromButton} />
				{/if}
				{#if !nested}
					<Button
						variant="ghost"
						size="sm"
						class="text-muted-foreground"
						aria-label="Agrandir la figure"
						bind:ref={enlargeButton}
						onclick={() => (enlarged = true)}
					>
						<Maximize2 class="size-4" aria-hidden="true" />
						Agrandir
					</Button>
				{/if}
			</div>
		{/if}
	</div>
	{#if !nested}
		<Dialog.Root bind:open={enlarged}>
			<Dialog.Content
				class="solide-fenetre max-h-[100dvh] max-w-[calc(100%-1rem)] gap-1 p-3 pt-10 sm:max-w-4xl"
				aria-describedby={undefined}
				onCloseAutoFocus={(event) => {
					event.preventDefault();
					enlargeButton?.focus({ preventScroll: true });
				}}
			>
				<Dialog.Title class="sr-only">Figure agrandie</Dialog.Title>
				<div class="flex flex-col items-center gap-1">
					{@render figure(spec, scene, true)}
					{#if rotatable}
						<SolideVueDeDepart moved={rotation.moved} onreset={rotation.resetFromButton} />
					{/if}
				</div>
			</Dialog.Content>
		</Dialog.Root>
	{/if}
{/if}

<style>
	.solide-figure {
		max-width: min(100%, var(--espace-taille, 100%));
		height: auto;
	}

	/* Figure agrandie : toute la largeur de la fenêtre, sans dépasser sa hauteur */
	.solide-figure.solide-grande {
		max-width: 100%;
	}

	/* Figure que l'on peut tourner : le doigt la tourne au lieu de faire défiler la page ;
	   rien n'est rogné pendant le passage d'une vue à l'autre */
	.solide-tournante {
		touch-action: none;
		cursor: grab;
		overflow: visible;
		user-select: none;
		-webkit-user-select: none;
		border-radius: 0.5rem;
	}

	.solide-tournante.solide-saisie {
		cursor: grabbing;
	}

	.solide-tournante:focus-visible {
		outline: 2px solid var(--color-ring);
		outline-offset: 2px;
	}

	.solide-trait {
		stroke: var(--color-foreground);
	}

	/* Face marquée : translucide, les arêtes cachées restent visibles à travers */
	.solide-face-marquee {
		fill: color-mix(in srgb, var(--color-foreground) 18%, transparent);
		stroke: none;
	}

	/* Section : la seule couleur, translucide comme la face marquée */
	.solide-section {
		fill: color-mix(in srgb, var(--color-fig-orange) 40%, transparent);
		stroke: none;
	}

	/* Droite, segment, angle droit donnés : une couleur à eux, pour ne pas les prendre
	   pour une arête */
	.solide-droite {
		stroke: var(--color-fig-bleu);
	}

	/* Plan donné : sa partie dans le solide, translucide, et son bord de la même
	   couleur ; le second plan a la sienne, pour les distinguer */
	.solide-plan {
		--solide-plan: var(--color-fig-vert);
		fill: color-mix(in srgb, var(--solide-plan) 28%, transparent);
		stroke: none;
	}

	.solide-plan-bord {
		--solide-plan: var(--color-fig-vert);
		stroke: var(--solide-plan);
	}

	.solide-plan.solide-plan-second,
	.solide-plan-bord.solide-plan-second {
		--solide-plan: var(--color-fig-violet);
	}

	.solide-point,
	.solide-pointe,
	.solide-etiquette {
		fill: var(--color-foreground);
		stroke: none;
	}
</style>
