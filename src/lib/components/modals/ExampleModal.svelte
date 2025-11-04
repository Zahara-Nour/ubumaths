<!--
	Example Modal Component
	=======================

	Demonstrates how to create a modal component for use with ModalStack.

	USAGE:
	```typescript
	import { modalStack } from '$lib/stores/modalStack.svelte';
	import ExampleModal from '$lib/components/modals/ExampleModal.svelte';

	modalStack.push({
		component: ExampleModal,
		props: {
			title: 'Example Title',
			message: 'This is an example message',
			onConfirm: () => {
				console.log('Confirmed!');
				modalStack.pop();
			},
			onCancel: () => {
				modalStack.pop();
			}
		}
	});
	```
-->

<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { X } from 'lucide-svelte';

	interface Props {
		title: string;
		message: string;
		onConfirm?: () => void;
		onCancel?: () => void;
	}

	let { title, message, onConfirm, onCancel }: Props = $props();
</script>

<Card.Root class="w-full max-w-md">
	<Card.Header>
		<div class="flex items-start justify-between">
			<Card.Title>{title}</Card.Title>
			{#if onCancel}
				<Button variant="ghost" size="icon" onclick={onCancel}>
					<X class="h-4 w-4" />
				</Button>
			{/if}
		</div>
	</Card.Header>

	<Card.Content>
		<p class="text-muted-foreground">{message}</p>
	</Card.Content>

	<Card.Footer class="flex justify-end gap-2">
		{#if onCancel}
			<Button variant="outline" onclick={onCancel}>Annuler</Button>
		{/if}
		{#if onConfirm}
			<Button onclick={onConfirm}>Confirmer</Button>
		{/if}
	</Card.Footer>
</Card.Root>
