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
	<div
		class="modal-backdrop"
		style="z-index: {1000 + stackDepth}"
		onclick={handleBackdropClick}
		role="dialog"
		aria-modal="true"
		transition:fade={{ duration: 200 }}
	>
		<!-- Modal container -->
		<div class="modal-container" onclick={handleModalClick}>
			<svelte:component this={currentModal.component} {...currentModal.props} />
		</div>
	</div>
{/if}

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.modal-container {
		max-width: 90vw;
		max-height: 90vh;
		overflow: auto;
	}
</style>
