<!--
	Modal Stack Renderer
	====================

	Affiche la fenêtre du dessus de la pile `modalStack`.

	- Fond assombri : un clic dessus ferme (sauf canDismiss === false), Échap aussi.
	- Clavier (écart V73) : à l'ouverture, il entre dans la fenêtre ; Tab et Maj+Tab y
	  tournent ; à la fermeture, il revient sur l'élément qui l'avait ouverte.
	- Lecteur d'écran : le reste de la page est `inert` tant que la fenêtre est ouverte,
	  sauf les zones d'annonce (`aria-live`, les toasts), qu'une fenêtre émet souvent.
	- Rôle `dialog` sur le conteneur seulement si la fenêtre n'en porte pas déjà un.
	- Le fond est un frère de la fenêtre, pas son parent : plus de fenêtre dans un `<button>`.
	- Les touches tapées dans la fenêtre ne remontent pas à la page (raccourcis d'un jeu).

	Placé une fois dans le layout racine : `<ModalStackRenderer />`, sans props.
-->

<script lang="ts">
	import { tick } from 'svelte';
	import { fade } from 'svelte/transition';
	import { modalStack, type ModalEntry } from '#lib/stores/modalStack.svelte.ts';

	// Constantes
	const FOCUSABLE_SELECTOR = [
		'a[href]',
		'area[href]',
		'button:not([disabled])',
		'input:not([disabled]):not([type="hidden"])',
		'select:not([disabled])',
		'textarea:not([disabled])',
		'[tabindex]:not([tabindex="-1"])',
		'[contenteditable="true"]'
	].join(',');

	// Variables
	const isOpen = $derived(modalStack.depth > 0);
	const stackDepth = $derived(modalStack.depth);

	// Side effect: snapshot the current modal for fade-out transition stability.
	// $derived would re-evaluate to null during outro, crashing the render.
	// This $effect only updates on push (guard: if current), keeping the
	// reference alive during fade-out. Cleared by onoutroend.
	let modalSnapshot = $state<ModalEntry | null>(null);
	let layer = $state<HTMLDivElement | null>(null);
	let dialog = $state<HTMLDivElement | null>(null);
	// La plupart des fenêtres portent déjà leur `role="dialog"` et leur titre : le conteneur
	// ne prend le rôle que pour les autres, pour ne pas annoncer deux fenêtres imbriquées.
	let containerIsDialog = $state(true);

	$effect(() => {
		const current = modalStack.current;
		if (current) {
			modalSnapshot = current;
		}
	});

	// Élément qui avait le clavier à l'ouverture : retenu AVANT le rendu de la fenêtre, qu'une
	// fenêtre qui prend le clavier à son montage ne se fasse pas retenir à sa place.
	let opener: HTMLElement | null = null;

	$effect.pre(() => {
		if (isOpen) {
			opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
		}
	});

	// Side effect : à l'ouverture, rendre le reste de la page inerte ; à la fermeture, défaire
	// et rendre le clavier à l'élément d'ouverture.
	$effect(() => {
		if (!isOpen || !layer) return;
		const returnTo = opener;
		const madeInert = makeSiblingsInert(layer);
		return () => {
			for (const element of madeInert) element.removeAttribute('inert');
			if (returnTo?.isConnected) returnTo.focus();
		};
	});

	// Side effect : le clavier entre dans la fenêtre à l'ouverture et à chaque changement de
	// fenêtre (push / pop dans la pile).
	$effect(() => {
		const id = modalSnapshot?.id;
		if (!id || !isOpen || !dialog) return;
		const target = dialog;
		void tick().then(() => {
			containerIsDialog = target.querySelector('[role="dialog"]') === null;
			focusFirst(target);
		});
	});

	// Functions
	/** Met `inert` sur les frères de la couche, sauf les zones d'annonce ; rend ceux touchés. */
	function makeSiblingsInert(root: HTMLElement): HTMLElement[] {
		const parent = root.parentElement;
		if (!parent) return [];
		const touched: HTMLElement[] = [];
		for (const child of parent.children) {
			if (!(child instanceof HTMLElement) || child === root) continue;
			if (child.hasAttribute('inert') || isLiveRegion(child)) continue;
			child.setAttribute('inert', '');
			touched.push(child);
		}
		return touched;
	}

	function isLiveRegion(element: HTMLElement): boolean {
		return element.matches('[aria-live]') || element.querySelector('[aria-live]') !== null;
	}

	function focusableIn(container: HTMLElement): HTMLElement[] {
		return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
			(element) => element.getClientRects().length > 0
		);
	}

	function focusFirst(container: HTMLElement): void {
		if (container.contains(document.activeElement)) return;
		const [first] = focusableIn(container);
		(first ?? container).focus();
	}

	function dismiss(): void {
		if (modalSnapshot?.canDismiss !== false) {
			modalStack.pop();
		}
	}

	/** Échap quand le clavier n'est pas dans la fenêtre (clic ailleurs, par exemple). */
	function handleWindowKeydown(event: KeyboardEvent): void {
		if (event.key === 'Escape' && isOpen) {
			dismiss();
		}
	}

	/** Dans la fenêtre : Échap ferme, Tab et Maj+Tab tournent, rien ne remonte à la page. */
	function handleDialogKeydown(event: KeyboardEvent): void {
		event.stopPropagation();
		if (event.key === 'Escape') {
			dismiss();
			return;
		}
		if (event.key !== 'Tab' || !dialog) return;
		const focusable = focusableIn(dialog);
		if (focusable.length === 0) {
			event.preventDefault();
			dialog.focus();
			return;
		}
		const first = focusable[0];
		const last = focusable[focusable.length - 1];
		const active = document.activeElement;
		if (event.shiftKey && (active === first || active === dialog)) {
			event.preventDefault();
			last.focus();
		} else if (!event.shiftKey && active === last) {
			event.preventDefault();
			first.focus();
		}
	}

	function handleOutroEnd(): void {
		if (!isOpen) {
			modalSnapshot = null;
		}
	}
</script>

<svelte:window onkeydown={handleWindowKeydown} />

{#if isOpen && modalSnapshot}
	<div
		bind:this={layer}
		class="modal-layer"
		style="z-index: {1000 + stackDepth}"
		transition:fade={{ duration: 200 }}
		onoutroend={handleOutroEnd}
	>
		<!-- Le fond est une cible de souris seulement : au clavier, Échap ferme, et le lecteur
		     d'écran n'a pas à le voir. -->
		<div class="modal-backdrop-zone" data-modal-backdrop aria-hidden="true" onclick={dismiss}></div>
		<div
			bind:this={dialog}
			class="modal-container"
			role={containerIsDialog ? 'dialog' : undefined}
			aria-modal={containerIsDialog ? 'true' : undefined}
			tabindex="-1"
			onkeydown={handleDialogKeydown}
		>
			<modalSnapshot.component {...modalSnapshot.props} />
		</div>
	</div>
{/if}

<style>
	.modal-layer {
		position: fixed;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow-y: auto;
	}

	.modal-backdrop-zone {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
	}

	.modal-container {
		position: relative;
		max-width: 90vw;
	}
</style>
