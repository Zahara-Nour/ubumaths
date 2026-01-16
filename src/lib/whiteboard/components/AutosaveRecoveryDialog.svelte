<script lang="ts">
	/**
	 * AutosaveRecoveryDialog - Dialog for recovering unsaved changes
	 *
	 * Shows when opening a file that has a more recent autosave available.
	 * Lets user choose between loading the original file or the autosave.
	 */

	import { Dialog } from 'bits-ui';
	import { Button } from '$lib/components/ui/button';
	import DialogContent from '$lib/components/ui/dialog/dialog-content.svelte';
	import DialogHeader from '$lib/components/ui/dialog/dialog-header.svelte';
	import DialogFooter from '$lib/components/ui/dialog/dialog-footer.svelte';
	import DialogTitle from '$lib/components/ui/dialog/dialog-title.svelte';
	import DialogDescription from '$lib/components/ui/dialog/dialog-description.svelte';
	import { History, FileText, Loader2 } from 'lucide-svelte';

	// ==========================================================================
	// Props
	// ==========================================================================

	interface Props {
		open: boolean;
		originalFileName: string;
		originalModifiedTime: string;
		autosaveModifiedTime: string;
		loading?: boolean;
		onLoadOriginal: () => void;
		onLoadAutosave: () => void;
		onCancel: () => void;
	}

	let {
		open = $bindable(),
		originalFileName,
		originalModifiedTime,
		autosaveModifiedTime,
		loading = false,
		onLoadOriginal,
		onLoadAutosave,
		onCancel
	}: Props = $props();

	// ==========================================================================
	// Helpers
	// ==========================================================================

	function formatDateTime(isoDate: string): string {
		if (!isoDate) return '';
		const date = new Date(isoDate);
		return date.toLocaleString('fr-FR', {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function getTimeDifference(originalTime: string, autosaveTime: string): string {
		const original = new Date(originalTime).getTime();
		const autosave = new Date(autosaveTime).getTime();
		const diffMs = autosave - original;

		if (diffMs < 60000) {
			return 'quelques secondes';
		} else if (diffMs < 3600000) {
			const minutes = Math.floor(diffMs / 60000);
			return `${minutes} minute${minutes > 1 ? 's' : ''}`;
		} else if (diffMs < 86400000) {
			const hours = Math.floor(diffMs / 3600000);
			return `${hours} heure${hours > 1 ? 's' : ''}`;
		} else {
			const days = Math.floor(diffMs / 86400000);
			return `${days} jour${days > 1 ? 's' : ''}`;
		}
	}

	function handleOpenChange(isOpen: boolean) {
		if (!isOpen && !loading) {
			onCancel();
		}
	}
</script>

<Dialog.Root bind:open onOpenChange={handleOpenChange}>
	<DialogContent class="max-w-md">
		<DialogHeader>
			<DialogTitle class="flex items-center gap-2">
				<History class="h-5 w-5 text-amber-500" />
				Modifications non sauvegardees detectees
			</DialogTitle>
			<DialogDescription class="space-y-3 pt-2">
				<p>
					Une version automatiquement sauvegardee de <strong>{originalFileName}</strong> a ete
					trouvee. Elle est plus recente de
					<strong class="text-amber-600">
						{getTimeDifference(originalModifiedTime, autosaveModifiedTime)}
					</strong>
					par rapport a la version sauvegardee manuellement.
				</p>

				<div class="space-y-2 rounded-lg border bg-muted/30 p-3 text-sm">
					<div class="flex items-center justify-between">
						<span class="text-muted-foreground">Version sauvegardee:</span>
						<span class="font-medium">{formatDateTime(originalModifiedTime)}</span>
					</div>
					<div class="flex items-center justify-between">
						<span class="text-muted-foreground">Autosave:</span>
						<span class="font-medium text-amber-600">{formatDateTime(autosaveModifiedTime)}</span>
					</div>
				</div>

				<p class="text-muted-foreground">Quelle version souhaitez-vous charger ?</p>
			</DialogDescription>
		</DialogHeader>

		<DialogFooter class="flex-col gap-2 sm:flex-row">
			<Button variant="outline" onclick={onLoadOriginal} disabled={loading} class="flex-1 gap-2">
				{#if loading}
					<Loader2 class="h-4 w-4 animate-spin" />
				{:else}
					<FileText class="h-4 w-4" />
				{/if}
				Version sauvegardee
			</Button>
			<Button
				variant="default"
				onclick={onLoadAutosave}
				disabled={loading}
				class="flex-1 gap-2 bg-amber-500 hover:bg-amber-600"
			>
				{#if loading}
					<Loader2 class="h-4 w-4 animate-spin" />
				{:else}
					<History class="h-4 w-4" />
				{/if}
				Recuperer l'autosave
			</Button>
		</DialogFooter>
	</DialogContent>
</Dialog.Root>
