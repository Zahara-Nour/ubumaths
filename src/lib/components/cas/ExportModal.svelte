<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Copy, Download, Check } from 'lucide-svelte';
	import { toaster } from '$lib/stores/toaster.svelte';

	interface Props {
		open: boolean;
		content: string;
		filename: string;
		onClose: () => void;
	}

	let { open = $bindable(), content, filename, onClose }: Props = $props();

	let copied = $state(false);

	async function handleCopy(): Promise<void> {
		try {
			await navigator.clipboard.writeText(content);
			copied = true;
			toaster.success('Copie dans le presse-papiers');
			setTimeout(() => {
				copied = false;
			}, 2000);
		} catch {
			toaster.error('Erreur lors de la copie');
		}
	}

	function handleDownload(): void {
		const blob = new Blob([content], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = filename;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
		toaster.success('Fichier telecharge');
	}

	function handleOpenChange(isOpen: boolean): void {
		if (!isOpen) {
			onClose();
		}
	}
</script>

<Dialog.Root bind:open onOpenChange={handleOpenChange}>
	<Dialog.Content class="max-w-2xl">
		<Dialog.Header>
			<Dialog.Title>Export de l'historique</Dialog.Title>
			<Dialog.Description>
				Copiez le contenu ou enregistrez-le dans un fichier JSON.
			</Dialog.Description>
		</Dialog.Header>

		<div class="my-4">
			<pre
				class="max-h-[400px] overflow-auto rounded-lg bg-muted p-4 font-mono text-sm">{content}</pre>
		</div>

		<Dialog.Footer class="flex gap-2">
			<Button variant="outline" onclick={handleCopy}>
				{#if copied}
					<Check class="mr-2 size-4" />
					Copie
				{:else}
					<Copy class="mr-2 size-4" />
					Copier
				{/if}
			</Button>
			<Button onclick={handleDownload}>
				<Download class="mr-2 size-4" />
				Enregistrer
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
