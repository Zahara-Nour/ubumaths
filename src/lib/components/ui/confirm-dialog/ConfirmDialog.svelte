<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';

	let {
		open = $bindable(false),
		title,
		description,
		confirmLabel = 'Confirmer',
		cancelLabel = 'Annuler',
		variant = 'destructive',
		onConfirm,
		onCancel
	}: {
		open?: boolean;
		title: string;
		description: string;
		confirmLabel?: string;
		cancelLabel?: string;
		variant?: 'destructive' | 'default';
		onConfirm: () => void;
		onCancel?: () => void;
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
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>{title}</Dialog.Title>
			<Dialog.Description>{description}</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer>
			<Button variant="outline" onclick={handleCancel}>
				{cancelLabel}
			</Button>
			<Button {variant} onclick={handleConfirm}>
				{confirmLabel}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
