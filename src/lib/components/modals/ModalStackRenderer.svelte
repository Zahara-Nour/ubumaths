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
	import { modalStack } from '$lib/stores/modalStack.svelte';
	import { fade } from 'svelte/transition';

	// Reactive current modal from stack
	const currentModal = $derived(modalStack.current);
	const stackDepth = $derived(modalStack.depth);

	// Handle backdrop click
	function handleBackdropClick() {
		if (currentModal && currentModal.canDismiss !== false) {
			modalStack.pop();
		}
	}

	// Handle Escape key
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && currentModal && currentModal.canDismiss !== false) {
			modalStack.pop();
		}
	}

	// Stop propagation on modal content clicks
	function handleModalClick(event: MouseEvent) {
		event.stopPropagation();
	}
</script>

<!-- Keyboard listener -->
<svelte:window onkeydown={handleKeydown} />

<!-- Render modal if exists -->
{#if currentModal}
	<!-- Backdrop -->
	<button
		type="button"
		class="modal-backdrop"
		style="z-index: {1000 + stackDepth}"
		onclick={handleBackdropClick}
		aria-label="Fermer la modale en cliquant sur l'arrière-plan"
		transition:fade={{ duration: 200 }}
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
			{#if currentModal.component}
				{@const ModalComponent = currentModal.component}
				<ModalComponent {...currentModal.props} />
			{/if}
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
	}

	.modal-container {
		max-width: 90vw;
		max-height: 90vh;
		overflow: auto;
		cursor: default;
	}
</style>
