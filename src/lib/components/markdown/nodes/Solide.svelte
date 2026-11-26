<!--
	Solide — bloc ```solide
	=======================

	Solide en perspective cavalière (cube, pavé, prisme, pyramide, cylindre,
	cône, boule) : arêtes cachées en tirets, face marquée teintée, noms des
	sommets et cotes, section (`section:`, lot 6), points déclarés (`points:`)
	et vecteurs donnés en flèches (`vecteurs:`, chantier `solide-vecteur`).
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
	- `tourner: oui` (polyèdres, chantier `solides-3d`, ADR 0045) : l'élève fait
	  glisser la figure pour la tourner (flèches au clavier) ; elle passe en
	  douceur de la cavalière à une vue droite, tirets recalculés à chaque angle.
	  « Vue de départ » (ou Échap) la ramène. Cadre fixe, réservé dès le repos :
	  la page ne bouge pas. Glisser sur la figure ne fait pas défiler la page.
	  Rien n'est enregistré ; un autre bloc repart de la vue de départ.

	@module components/markdown/nodes/Solide
-->
<script lang="ts">
	import { on } from 'svelte/events';
	import { Rotate3d, RotateCcw } from '@lucide/svelte';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { ESPACE_UNAVAILABLE, type EspaceNode } from '#lib/ubumark/types/espace.ts';
	import { ESPACE_MARGIN, ESPACE_STROKE } from '#lib/ubumark/utils/espace-scene.ts';
	import {
		SOLIDE_DASH,
		SOLIDE_DOT_RADIUS,
		SOLIDE_LABEL_SIZE,
		SOLIDE_SUB_SCALE,
		buildSolideScene,
		solideLineStroke,
		solideLabel
	} from '#lib/ubumark/utils/espace-solides.ts';
	import { VUE_DE_DEPART, turnVue, type EspaceVue } from '#lib/ubumark/utils/espace-vue.ts';
	import { readAuthoringErrors } from '../authoring-errors';
	import SolideRotationNote from './SolideRotationNote.svelte';

	interface Props {
		node: EspaceNode;
		/** Forcer l'affichage des erreurs d'auteur ; sinon, contexte du renderer (élève par défaut) */
		showErrors?: boolean;
		class?: string;
	}

	let { node, showErrors, class: className = '' }: Props = $props();

	const authoring = readAuthoringErrors();
	let errorsVisible = $derived(showErrors ?? authoring());

	/** Angle tourné par pixel glissé (radians) : un demi-tour pour ~260 px */
	const DRAG_TURN = 0.012;
	/** Glissement à partir duquel la figure tourne (px) : un simple toucher ne la bouge pas */
	const DRAG_START = 4;
	/** Angle tourné par appui sur une flèche du clavier (radians) */
	const KEY_TURN = Math.PI / 12;
	/** Durées du passage à la vue droite et du retour à la vue de départ (ms) */
	const PASSAGE_MS = 250;
	const RETURN_MS = 350;

	const KEY_TURNS: Record<string, [number, number]> = {
		ArrowLeft: [KEY_TURN, 0],
		ArrowRight: [-KEY_TURN, 0],
		ArrowUp: [0, -KEY_TURN],
		ArrowDown: [0, KEY_TURN]
	};

	let spec = $derived(node.spec?.kind === 'solide' ? node.spec : null);
	let rotatable = $derived(spec?.rotate === true && node.errors.length === 0);
	/**
	 * La vue tournée et le bloc auquel elle appartient : un autre bloc (nouvelle
	 * question, nouvelle variation) repart de la vue de départ ; null : au repos
	 */
	let turned = $state.raw<{ source: string; vue: EspaceVue } | null>(null);
	let vue = $derived(turned !== null && turned.source === node.source ? turned.vue : VUE_DE_DEPART);
	let moved = $derived(vue !== VUE_DE_DEPART);
	let scene = $derived(spec === null ? null : buildSolideScene(spec, rotatable ? vue : undefined));
	let dragging = $state(false);
	let figure = $state<SVGSVGElement | null>(null);

	/** Glissement en cours : le pointeur et sa dernière position */
	let drag: { id: number; x: number; y: number; started: boolean } | null = null;
	/** Animation en cours (passage ou retour) ; 0 : aucune */
	let animation = 0;
	let returning = false;
	/** Le glissement vient de finir : le clic qui le suit ne doit rien cocher (figure dans un choix) */
	let justDragged = false;

	const setVue = (next: EspaceVue) => {
		turned = { source: node.source, vue: next };
	};
	const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	function stopAnimation() {
		cancelAnimationFrame(animation);
		animation = 0;
		returning = false;
	}

	/** De la cavalière à la vue droite, en douceur ; l'élève peut tourner pendant ce temps */
	function leaveCavaliere() {
		if (returning) stopAnimation();
		if (vue.oblique === 0 || animation !== 0) return;
		if (reducedMotion()) {
			setVue({ ...vue, oblique: 0 });
			return;
		}
		let last = performance.now();
		const step = (now: number) => {
			const oblique = Math.max(0, vue.oblique - (now - last) / PASSAGE_MS);
			last = now;
			setVue({ ...vue, oblique });
			animation = oblique > 0 ? requestAnimationFrame(step) : 0;
		};
		animation = requestAnimationFrame(step);
	}

	/** Retour à la vue de départ (la cavalière) */
	function reset() {
		stopAnimation();
		if (!moved) return;
		if (reducedMotion()) {
			turned = null;
			return;
		}
		const from = vue;
		const start = performance.now();
		returning = true;
		const step = (now: number) => {
			const t = Math.min(1, (now - start) / RETURN_MS);
			if (t >= 1) {
				turned = null;
				stopAnimation();
				return;
			}
			// Départ et arrivée en douceur
			const k = 1 - t * t * (3 - 2 * t);
			setVue({
				yaw: from.yaw * k,
				pitch: from.pitch * k,
				oblique: 1 - (1 - from.oblique) * k
			});
			animation = requestAnimationFrame(step);
		};
		animation = requestAnimationFrame(step);
	}

	function resetFromButton() {
		// Le bouton disparaît à l'arrivée : le clavier reste sur la figure
		figure?.focus({ preventScroll: true });
		reset();
	}

	function handlePointerDown(event: PointerEvent) {
		if (!event.isPrimary || event.button !== 0) return;
		justDragged = false;
		drag = { id: event.pointerId, x: event.clientX, y: event.clientY, started: false };
		// Le glissement continue hors de la figure ; pointeur déjà relâché : sans capture
		try {
			figure?.setPointerCapture(event.pointerId);
		} catch {
			// rien : le glissement s'arrêtera au bord de la figure
		}
	}

	function handlePointerMove(event: PointerEvent) {
		if (drag === null || event.pointerId !== drag.id) return;
		// Souris relâchée hors de la figure sans capture : le glissement est fini
		if (event.pointerType === 'mouse' && event.buttons === 0) {
			handlePointerEnd(event);
			return;
		}
		const dx = event.clientX - drag.x;
		const dy = event.clientY - drag.y;
		if (!drag.started) {
			if (Math.hypot(dx, dy) < DRAG_START) return;
			drag.started = true;
			dragging = true;
			leaveCavaliere();
		}
		drag.x = event.clientX;
		drag.y = event.clientY;
		// Glisser vers la droite amène la face de gauche devant ; vers le bas, montre le dessus
		setVue(turnVue(vue, -dx * DRAG_TURN, dy * DRAG_TURN));
	}

	function handlePointerEnd(event: PointerEvent) {
		if (drag === null || event.pointerId !== drag.id) return;
		justDragged = drag.started;
		drag = null;
		dragging = false;
	}

	/**
	 * Tourner une figure posée dans un choix ne coche pas ce choix : le clic qui
	 * suit un glissement s'arrête à la figure. Écouteur posé sur la figure même
	 * (un `onclick` de Svelte est délégué à la racine : trop tard pour un parent)
	 */
	function stopClickAfterDrag(element: SVGSVGElement) {
		return on(element, 'click', (event) => {
			if (!justDragged) return;
			justDragged = false;
			event.preventDefault();
			event.stopPropagation();
		});
	}

	function handleKeyDown(event: KeyboardEvent) {
		// Alt + flèche, Cmd + flèche : raccourcis du navigateur, laissés tranquilles
		if (event.altKey || event.ctrlKey || event.metaKey) return;
		const turn = KEY_TURNS[event.key];
		if (turn !== undefined) {
			// Les flèches tournent la figure au lieu de faire défiler la page
			event.preventDefault();
			leaveCavaliere();
			setVue(turnVue(vue, turn[0], turn[1]));
		} else if (event.key === 'Escape' && moved) {
			event.preventDefault();
			event.stopPropagation();
			reset();
		}
	}

	// Le composant retiré en pleine animation : plus rien à dessiner
	$effect(() => stopAnimation);
	// Un autre bloc en pleine animation : elle ne doit pas se poursuivre sur la nouvelle figure
	$effect(() => {
		void node.source;
		stopAnimation();
	});

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
	<SolideRotationNote {node} {showErrors} />
	<div
		class="solide-bloc my-2 flex {rotatable
			? 'flex-col items-center gap-1'
			: 'justify-center'} {className}"
	>
		<!-- Figure que l'on peut tourner : une image que le clavier atteint (flèches, Échap) ;
		     son nom le dit (« figure que l'on peut tourner »), le bouton en dessous fait le retour -->
		<!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
		<svg
			bind:this={figure}
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 {width} {height}"
			role="img"
			aria-label={solideLabel(spec)}
			class="solide-figure"
			class:solide-tournante={rotatable}
			class:solide-saisie={dragging}
			tabindex={rotatable ? 0 : undefined}
			onpointerdown={rotatable ? handlePointerDown : undefined}
			onpointermove={rotatable ? handlePointerMove : undefined}
			onpointerup={rotatable ? handlePointerEnd : undefined}
			onpointercancel={rotatable ? handlePointerEnd : undefined}
			onkeydown={rotatable ? handleKeyDown : undefined}
			{@attach rotatable ? stopClickAfterDrag : undefined}
			style:width="{width}cm"
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
			{#each scene.lines as line, i (i)}
				<polyline
					class="solide-trait"
					class:solide-cache={line.dashed}
					points={pointsOf(line.points)}
					stroke-width={solideLineStroke(line)}
					stroke-dasharray={line.dashed ? SOLIDE_DASH.join(' ') : undefined}
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
		{#if rotatable}
			<!-- Hauteur réservée : le bouton qui apparaît ne déplace pas la suite de la page -->
			<div class="solide-commandes flex min-h-9 items-center justify-center">
				{#if moved}
					<Button variant="outline" size="sm" onclick={resetFromButton}>
						<RotateCcw class="size-4" aria-hidden="true" />
						Vue de départ
					</Button>
				{:else}
					<span class="solide-consigne flex items-center gap-1 text-xs text-muted-foreground">
						<Rotate3d class="size-4 shrink-0" aria-hidden="true" />
						Figure à tourner
					</span>
				{/if}
			</div>
		{/if}
	</div>
{/if}

<style>
	.solide-figure {
		max-width: min(100%, var(--espace-taille, 100%));
		height: auto;
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

	.solide-point,
	.solide-pointe,
	.solide-etiquette {
		fill: var(--color-foreground);
		stroke: none;
	}
</style>
