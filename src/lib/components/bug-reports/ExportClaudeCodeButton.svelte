<script lang="ts">
	/**
	 * Export Claude Code Button
	 *
	 * Button for admins to export a bug report in Markdown format
	 * optimized for Claude Code debugging.
	 */
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { Download, Copy, Loader2, FileText, Check } from 'lucide-svelte';

	interface Props {
		reportId: string;
		_reportTitle?: string;
	}

	let { reportId, _reportTitle = 'Bug Report' }: Props = $props();

	let isLoading = $state(false);
	let previewOpen = $state(false);
	let markdownContent = $state('');
	let copied = $state(false);

	async function fetchExport() {
		isLoading = true;
		try {
			const response = await fetch(`/api/bug-reports/${reportId}/export`);

			if (!response.ok) {
				throw new Error("Erreur lors de la génération de l'export");
			}

			markdownContent = await response.text();
			previewOpen = true;
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Une erreur est survenue';
			toaster.error(message);
		} finally {
			isLoading = false;
		}
	}

	async function copyToClipboard() {
		try {
			await navigator.clipboard.writeText(markdownContent);
			copied = true;
			toaster.success('Copié dans le presse-papier');
			setTimeout(() => {
				copied = false;
			}, 2000);
		} catch {
			toaster.error('Impossible de copier');
		}
	}

	function downloadFile() {
		const blob = new Blob([markdownContent], { type: 'text/markdown' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `bug-report-${reportId.substring(0, 8)}.md`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
		toaster.success('Fichier téléchargé');
	}
</script>

<Button variant="outline" size="sm" onclick={fetchExport} disabled={isLoading}>
	{#if isLoading}
		<Loader2 class="mr-2 h-4 w-4 animate-spin" />
		Génération...
	{:else}
		<FileText class="mr-2 h-4 w-4" />
		Export Claude Code
	{/if}
</Button>

<Dialog.Root bind:open={previewOpen}>
	<Dialog.Content class="flex max-h-[80vh] max-w-3xl flex-col overflow-hidden">
		<Dialog.Header>
			<Dialog.Title class="flex items-center gap-2">
				<FileText class="h-5 w-5" />
				Export pour Claude Code
			</Dialog.Title>
			<Dialog.Description>
				Ce fichier Markdown contient toutes les informations nécessaires pour débugger avec Claude
				Code.
			</Dialog.Description>
		</Dialog.Header>

		<!-- Preview area -->
		<div class="flex-1 overflow-auto rounded-lg border bg-muted/30 p-4">
			<pre class="font-mono text-sm whitespace-pre-wrap">{markdownContent}</pre>
		</div>

		<Dialog.Footer class="flex-shrink-0 gap-2 sm:gap-0">
			<Button variant="outline" onclick={() => (previewOpen = false)}>Fermer</Button>
			<Button variant="outline" onclick={copyToClipboard}>
				{#if copied}
					<Check class="mr-2 h-4 w-4" />
					Copié !
				{:else}
					<Copy class="mr-2 h-4 w-4" />
					Copier
				{/if}
			</Button>
			<Button onclick={downloadFile}>
				<Download class="mr-2 h-4 w-4" />
				Télécharger
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
