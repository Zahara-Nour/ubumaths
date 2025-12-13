<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Loader2, AlertTriangle } from 'lucide-svelte';
	import type { StudentErrorReportWithDisplay } from '$lib/types/worksheets';

	// Props
	let {
		report,
		open,
		onOpenChange,
		onConfirm,
		loading = false
	}: {
		report: StudentErrorReportWithDisplay | null;
		open: boolean;
		onOpenChange: (open: boolean) => void;
		onConfirm: () => void;
		loading?: boolean;
	} = $props();

	function handleClose() {
		if (!loading) {
			onOpenChange(false);
		}
	}
</script>

<Dialog.Root {open} onOpenChange={(isOpen) => !loading && onOpenChange(isOpen)}>
	<Dialog.Content class="max-w-md">
		<Dialog.Header>
			<div class="flex items-center gap-3">
				<div
					class="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive"
				>
					<AlertTriangle class="h-5 w-5" />
				</div>
				<Dialog.Title>Annuler le signalement ?</Dialog.Title>
			</div>
			<Dialog.Description class="pt-2">
				Etes-vous sur de vouloir annuler ce signalement ? Cette action est irreversible.
			</Dialog.Description>
		</Dialog.Header>

		{#if report}
			<div class="rounded-md border bg-muted/30 p-3 text-sm">
				<p class="font-medium">{report.assignment_title || report.worksheet_title}</p>
				<p class="mt-1 text-muted-foreground">Exercice {report.exercise_position}</p>
			</div>
		{/if}

		<Dialog.Footer class="flex flex-col-reverse gap-2 sm:flex-row">
			<Button
				variant="outline"
				onclick={handleClose}
				disabled={loading}
				class="flex-1 sm:flex-none"
			>
				Non, conserver
			</Button>
			<Button
				variant="destructive"
				onclick={onConfirm}
				disabled={loading}
				class="flex-1 sm:flex-none"
			>
				{#if loading}
					<Loader2 class="mr-2 h-4 w-4 animate-spin" />
				{/if}
				Oui, annuler
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
