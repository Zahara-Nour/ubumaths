/**
 * Rotation d'un solide à l'écran (`tourner: oui`) — état et gestes
 * =================================================================
 *
 * Ce que partagent `Solide.svelte` (affichage) et `SolideGeste.svelte` (vecteur
 * à tracer) : la vue du moment, le glissement du doigt ou de la souris, les
 * flèches du clavier, le passage en douceur de la cavalière à la vue droite, le
 * retour à la vue de départ, les noms tenus pendant que la figure tourne
 * (chantier `solides-3d`, ADR 0045 ; journal, § 2, 7 et 12).
 *
 * Un assemblage de cubes (`Cubes.svelte`, lot 6) tourne de la même façon, sans
 * nom à tenir : `createEspaceRotation` prend la scène à dessiner en réglage,
 * `createSolideRotation` est le même pour un solide.
 *
 * Une figure = une rotation : `SolideGeste` en crée deux (la figure de l'élève
 * et celle de la correction tournent chacune de son côté).
 *
 * Le pointeur n'est capturé qu'une fois le glissement parti : un simple toucher
 * garde sa cible (un point à toucher reçoit son clic), et le clic qui suit un
 * glissement est arrêté à la figure (ni point posé, ni choix coché).
 *
 * À créer pendant l'initialisation du composant (effets de nettoyage).
 *
 * @module components/markdown/nodes/solide-rotation
 */
import { on } from 'svelte/events';
import type { SolideSpec } from '#lib/ubumark/types/espace.ts';
import type { EspacePoint } from '#lib/ubumark/utils/espace-scene.ts';
import {
	buildSolideScene,
	solideTilt,
	type SolideScene
} from '#lib/ubumark/utils/espace-solides.ts';
import {
	VUE_DE_DEPART,
	turnVue,
	type EspaceVue,
	type VueTilt
} from '#lib/ubumark/utils/espace-vue.ts';

// Types

export interface SolideRotationOptions {
	/** Le texte du bloc : un autre bloc (nouvelle question) repart de la vue de départ */
	source: () => string;
	/** Le solide ; null : bloc en erreur */
	spec: () => SolideSpec | null;
	/** La figure tourne-t-elle ? (`tourner: oui`, bloc sans erreur) */
	rotatable: () => boolean;
}

export interface EspaceRotationOptions<S> {
	/** Le texte du bloc : un autre bloc (nouvelle question) repart de la vue de départ */
	source: () => string;
	/** La figure tourne-t-elle ? (`tourner: oui`, bloc sans erreur) */
	rotatable: () => boolean;
	/** Bascule que le dessin ajoute à la vue (`turnVue`) ; absente : celle des polyèdres */
	tilt?: () => VueTilt | undefined;
	/**
	 * La scène : vue de `vue`, noms tenus aux places `held` ; sans `vue` : le
	 * dessin fixe ; null : bloc en erreur
	 */
	build: (vue?: EspaceVue, held?: EspacePoint[]) => S | null;
	/** Les places des noms d'une scène, s'ils se tiennent pendant qu'elle tourne ; absent : aucun nom */
	offsets?: (scene: S) => EspacePoint[] | undefined;
}

export type SolideRotation = EspaceRotation<SolideScene>;

export interface EspaceRotation<S> {
	/** La vue du moment (`VUE_DE_DEPART`, le même objet, au repos) */
	readonly vue: EspaceVue;
	/** La figure a quitté la vue de départ */
	readonly moved: boolean;
	/** Un glissement est en cours */
	readonly dragging: boolean;
	/** La scène à dessiner : celle de la vue, noms tenus ; le dessin fixe si rien ne tourne */
	readonly scene: S | null;
	/** Retour à la vue de départ */
	reset(): void;
	/** Le même, depuis le bouton : le clavier reste sur la figure */
	resetFromButton(): void;
	/** À poser sur le `<svg>` de la figure (`{@attach}`) */
	attach(element: SVGSVGElement): () => void;
	handlePointerDown(event: PointerEvent): void;
	handlePointerMove(event: PointerEvent): void;
	handlePointerEnd(event: PointerEvent): void;
	handleKeyDown(event: KeyboardEvent): void;
	handleKeyUp(event: KeyboardEvent): void;
	/** La figure quittée au clavier : elle ne tourne plus */
	handleBlur(): void;
}

// Constantes

/** Angle tourné par pixel glissé (radians) : un demi-tour pour ~260 px */
const DRAG_TURN = 0.012;
/** Glissement à partir duquel la figure tourne (px) : un simple toucher ne la bouge pas */
const DRAG_START = 4;
/** Angle tourné par appui sur une flèche du clavier (radians) */
const KEY_TURN = Math.PI / 12;
/** Durées du passage à la vue droite et du retour à la vue de départ (ms) */
const PASSAGE_MS = 250;
const RETURN_MS = 350;
/** Durée du glissement des noms vers leur place, à l'arrêt (ms) */
const SETTLE_MS = 150;

const KEY_TURNS: Record<string, [number, number]> = {
	ArrowLeft: [KEY_TURN, 0],
	ArrowRight: [-KEY_TURN, 0],
	ArrowUp: [0, -KEY_TURN],
	ArrowDown: [0, KEY_TURN]
};

// Fonctions

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function createSolideRotation(options: SolideRotationOptions): SolideRotation {
	return createEspaceRotation({
		source: options.source,
		rotatable: options.rotatable,
		tilt: () => {
			const spec = options.spec();
			return spec === null ? undefined : solideTilt(spec.form);
		},
		build: (vue, held) => {
			const spec = options.spec();
			return spec === null ? null : buildSolideScene(spec, vue, held);
		},
		offsets: (scene) => scene.labelOffsets
	});
}

export function createEspaceRotation<S>(options: EspaceRotationOptions<S>): EspaceRotation<S> {
	const source = $derived(options.source());
	const rotatable = $derived(options.rotatable());
	/**
	 * La vue tournée et le bloc auquel elle appartient : un autre bloc (nouvelle
	 * question, nouvelle variation) repart de la vue de départ ; null : au repos
	 */
	let turned = $state.raw<{ source: string; vue: EspaceVue } | null>(null);
	const vue = $derived(turned !== null && turned.source === source ? turned.vue : VUE_DE_DEPART);
	const moved = $derived(vue !== VUE_DE_DEPART);
	/** Bascule que le dessin ajoute à la vue : là où s'arrêtent le dessus et le dessous */
	const tilt = $derived(options.tilt?.());
	/**
	 * Places des noms tenues pendant que la figure tourne (et le bloc auquel elles
	 * appartiennent) ; null : chaque nom est placé pour la vue
	 */
	let held = $state.raw<{ source: string; offsets: EspacePoint[] } | null>(null);
	const heldOffsets = $derived(
		rotatable && held !== null && held.source === source ? held.offsets : undefined
	);
	const scene = $derived(options.build(rotatable ? vue : undefined, heldOffsets));
	let dragging = $state(false);

	/**
	 * Les `<svg>` qui montrent cette vue : la figure de la page et, quand elle est
	 * agrandie, celle de la fenêtre (chantier `solide-agrandir`). La dernière posée
	 * est celle que l'élève a sous la main
	 */
	const figures: SVGSVGElement[] = [];
	let figure: SVGSVGElement | null = null;
	/** Glissement en cours : le pointeur et sa dernière position */
	let drag: { id: number; x: number; y: number; started: boolean } | null = null;
	/** Animation en cours (passage ou retour) ; 0 : aucune */
	let animation = 0;
	let returning = false;
	/** Glissement des noms vers leur place en cours ; 0 : aucun */
	let settling = 0;
	/** Flèches du clavier enfoncées : tant qu'il en reste une, la figure tourne encore */
	const keysDown = new Set<string>();
	/** Le glissement vient de finir : le clic qui le suit ne doit rien poser ni cocher */
	let justDragged = false;

	const setVue = (next: EspaceVue) => {
		turned = { source, vue: next };
	};

	function stopAnimation() {
		cancelAnimationFrame(animation);
		animation = 0;
		returning = false;
	}

	function stopSettling() {
		cancelAnimationFrame(settling);
		settling = 0;
	}

	/** La figure se met à tourner : les noms gardent la place qu'ils ont */
	function holdNames() {
		stopSettling();
		if (heldOffsets !== undefined || scene === null) return;
		const offsets = options.offsets?.(scene);
		if (offsets === undefined) return;
		held = { source, offsets };
	}

	/** La figure s'arrête : les noms glissent à la place qui convient à la vue */
	function settleNames() {
		if (dragging || keysDown.size > 0 || animation !== 0) return;
		stopSettling();
		const from = heldOffsets;
		if (from === undefined) return;
		const settledScene = options.build(vue);
		const to = settledScene === null ? undefined : options.offsets?.(settledScene);
		if (to === undefined || to.length !== from.length || reducedMotion()) {
			held = null;
			return;
		}
		const block = source;
		const start = performance.now();
		const step = (now: number) => {
			const t = Math.min(1, (now - start) / SETTLE_MS);
			if (t >= 1) {
				held = null;
				settling = 0;
				return;
			}
			const k = t * t * (3 - 2 * t);
			held = {
				source: block,
				offsets: from.map((p, i) => ({
					x: p.x + (to[i].x - p.x) * k,
					y: p.y + (to[i].y - p.y) * k
				}))
			};
			settling = requestAnimationFrame(step);
		};
		settling = requestAnimationFrame(step);
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
			if (animation === 0) settleNames();
		};
		animation = requestAnimationFrame(step);
	}

	function reset() {
		stopAnimation();
		if (!moved) return;
		if (reducedMotion()) {
			stopSettling();
			turned = null;
			held = null;
			return;
		}
		holdNames();
		const from = vue;
		const start = performance.now();
		returning = true;
		const step = (now: number) => {
			const t = Math.min(1, (now - start) / RETURN_MS);
			if (t >= 1) {
				turned = null;
				stopAnimation();
				settleNames();
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
	}

	function handlePointerEnd(event: PointerEvent) {
		if (drag === null || event.pointerId !== drag.id) return;
		justDragged = drag.started;
		drag = null;
		dragging = false;
		settleNames();
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
			// Le glissement continue hors de la figure ; pointeur déjà relâché : sans capture
			try {
				figure?.setPointerCapture(event.pointerId);
			} catch {
				// rien : le glissement s'arrêtera au bord de la figure
			}
			holdNames();
			leaveCavaliere();
		}
		drag.x = event.clientX;
		drag.y = event.clientY;
		// Glisser vers la droite amène la face de gauche devant ; vers le bas, montre le dessus
		setVue(turnVue(vue, -dx * DRAG_TURN, dy * DRAG_TURN, tilt));
	}

	/**
	 * Le clic qui suit un glissement s'arrête à la figure : il ne coche pas le
	 * choix qui la contient, ne pose pas le point d'où le doigt est parti. Écouteur
	 * posé sur la figure même, à la descente (`capture`) : un `onclick` de Svelte
	 * est délégué à la racine (trop tard pour arrêter un parent), et celui d'un
	 * point de la figure serait servi avant un écouteur posé à la remontée
	 */
	function attach(element: SVGSVGElement) {
		figures.push(element);
		figure = element;
		const off = on(
			element,
			'click',
			(event) => {
				if (!justDragged) return;
				justDragged = false;
				event.preventDefault();
				event.stopPropagation();
			},
			{ capture: true }
		);
		return () => {
			off();
			figures.splice(figures.indexOf(element), 1);
			// La fenêtre refermée : la figure de la page redevient celle que l'on tourne
			figure = figures.at(-1) ?? null;
		};
	}

	function handleKeyDown(event: KeyboardEvent) {
		// Alt + flèche, Cmd + flèche : raccourcis du navigateur, laissés tranquilles
		if (event.altKey || event.ctrlKey || event.metaKey) return;
		const turn = KEY_TURNS[event.key];
		if (turn !== undefined) {
			// Les flèches tournent la figure au lieu de faire défiler la page
			event.preventDefault();
			keysDown.add(event.key);
			holdNames();
			leaveCavaliere();
			setVue(turnVue(vue, turn[0], turn[1], tilt));
		} else if (event.key === 'Escape' && moved) {
			event.preventDefault();
			event.stopPropagation();
			reset();
		}
	}

	/** Touche relâchée : la figure ne tourne plus */
	function handleKeyUp(event: KeyboardEvent) {
		if (keysDown.delete(event.key)) settleNames();
	}

	function handleBlur() {
		if (keysDown.size === 0) return;
		keysDown.clear();
		settleNames();
	}

	// Le composant retiré en pleine animation : plus rien à dessiner
	$effect(() => stopAnimation);
	$effect(() => stopSettling);
	// Un autre bloc en pleine animation : elle ne doit pas se poursuivre sur la nouvelle figure
	$effect(() => {
		void source;
		stopAnimation();
		stopSettling();
		keysDown.clear();
	});

	return {
		get vue() {
			return vue;
		},
		get moved() {
			return moved;
		},
		get dragging() {
			return dragging;
		},
		get scene() {
			return scene;
		},
		reset,
		resetFromButton,
		attach,
		handlePointerDown,
		handlePointerMove,
		handlePointerEnd,
		handleKeyDown,
		handleKeyUp,
		handleBlur
	};
}
