<!--
	Modal Stack Renderer
	====================

	Renders the top modal from the modalStack store.

	FEATURES:
	- Automatic rendering of the current (top) modal
	- Backdrop with click-to-dismiss (if canDismiss !== false)
	- Escape key to dismiss (if canDismiss !== false)
	- Dynamic z-index based on stack depth
	- Fade transition for backdrop
	- Click propagation stopping on modal content

	USAGE:
	Place once in root layout:
	```svelte
	<ModalStackRenderer />
	```

	No props needed - reads from modalStack store automatically.
-->

<script lang="ts">
	import { modalStack, type ModalEntry } from '$lib/stores/modalStack.svelte';
	import { fade } from 'svelte/transition';

	const isOpen = $derived(modalStack.depth > 0);
	const stackDepth = $derived(modalStack.depth);

	// Side effect: snapshot the current modal for fade-out transition stability.
	// $derived would re-evaluate to null during outro, crashing the render.
	// This $effect only updates on push (guard: if current), keeping the
	// reference alive during fade-out. Cleared by onoutroend.
	let modalSnapshot = $state<ModalEntry | null>(null);

	$effect(() => {
		const current = modalStack.current;
		if (current) {
			modalSnapshot = current;
		}
	});

	function handleBackdropClick() {
		if (modalSnapshot?.canDismiss !== false) {
			modalStack.pop();
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && isOpen && modalSnapshot?.canDismiss !== false) {
			modalStack.pop();
		}
	}

	function handleModalClick(event: MouseEvent) {
		event.stopPropagation();
	}

	function handleOutroEnd() {
		if (!isOpen) {
			modalSnapshot = null;
		}
	}
</script>

<!-- Keyboard listener -->
<svelte:window onkeydown={handleKeydown} />

<!-- Render modal if exists -->
{#if isOpen && modalSnapshot}
	<!-- Backdrop -->
	<button
		type="button"
		class="modal-backdrop"
		style="z-index: {1000 + stackDepth}"
		onclick={handleBackdropClick}
		aria-label="Fermer la modale en cliquant sur l'arrière-plan"
		transition:fade={{ duration: 200 }}
		onoutroend={handleOutroEnd}
	>
		<!-- Modal container -->
		<div
			class="modal-container"
			onclick={handleModalClick}
			onkeydown={(e) => e.stopPropagation()}
			role="dialog"
			aria-modal="true"
			tabindex="-1"
		>
			<modalSnapshot.component {...modalSnapshot.props} />
		</div>
	</button>
{/if}

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		border: none;
		padding: 0;
		cursor: default;
		text-align: left;
		overflow-y: auto;
	}

	.modal-container {
		max-width: 90vw;
		cursor: default;
	}
</style>
