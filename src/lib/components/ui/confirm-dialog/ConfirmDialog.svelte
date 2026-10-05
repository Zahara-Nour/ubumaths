<script lang="ts">
	import { Dialog } from 'bits-ui';
	import { Button } from '$lib/components/ui/button';
	import { lore } from '$lib/config/lore';
	import DialogContent from '$lib/components/ui/dialog/dialog-content.svelte';
	import DialogHeader from '$lib/components/ui/dialog/dialog-header.svelte';
	import DialogFooter from '$lib/components/ui/dialog/dialog-footer.svelte';
	import DialogTitle from '$lib/components/ui/dialog/dialog-title.svelte';
	import DialogDescription from '$lib/components/ui/dialog/dialog-description.svelte';

	let {
		open = $bindable(false),
		title,
		description,
		confirmLabel = lore.actions.confirm,
		cancelLabel = lore.actions.cancel,
		variant = 'destructive',
		onConfirm,
		onCancel,
		onCloseAutoFocus
	}: {
		open?: boolean;
		title: string;
		description: string;
		confirmLabel?: string;
		cancelLabel?: string;
		variant?: 'destructive' | 'default';
		onConfirm: () => void;
		onCancel?: () => void;
		/** Où rendre le focus à la fermeture : `preventDefault()` garde la main (le déclencheur a pu disparaître). */
		onCloseAutoFocus?: (event: Event) => void;
	} = $props();

	function handleConfirm() {
		onConfirm();
		open = false;
	}

	function handleCancel() {
		onCancel?.();
		open = false;
	}
</script>

<Dialog.Root bind:open>
	<DialogContent {onCloseAutoFocus}>
		<DialogHeader>
			<DialogTitle>{title}</DialogTitle>
			<DialogDescription>{description}</DialogDescription>
		</DialogHeader>
		<DialogFooter>
			<Button variant="outline" onclick={handleCancel}>
				{cancelLabel}
			</Button>
			<Button {variant} onclick={handleConfirm}>
				{confirmLabel}
			</Button>
		</DialogFooter>
	</DialogContent>
</Dialog.Root>
