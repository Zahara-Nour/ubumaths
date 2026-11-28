<!-- Page d'essai de ModalStackRenderer : un bouton qui ouvre une fenêtre, un lien derrière. -->
<script lang="ts">
	import ModalStackRenderer from '../ModalStackRenderer.svelte';
	import { modalStack } from '#lib/stores/modalStack.svelte.ts';
	import OwnDialogModal from './OwnDialogModal.svelte';
	import TwoButtonsModal from './TwoButtonsModal.svelte';

	let { canDismiss = true, ownDialog = false }: { canDismiss?: boolean; ownDialog?: boolean } =
		$props();

	function open(): void {
		const component = ownDialog ? OwnDialogModal : TwoButtonsModal;
		modalStack.push({ component, props: {}, canDismiss });
	}
</script>

<button type="button" onclick={open}>Ouvrir</button>
<a href="#derriere">Lien derrière</a>
<ModalStackRenderer />
