<script lang="ts">
	import * as Popover from '$lib/components/ui/popover';
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';
	import { Info } from 'lucide-svelte';
	import ReportStatusBadge from './ReportStatusBadge.svelte';
	import RichTextDisplay from '$lib/components/rich-text/RichTextDisplay.svelte';
	import type { StudentErrorReportView } from '$lib/types/worksheets';

	interface Props {
		report: StudentErrorReportView;
	}

	let { report }: Props = $props();

	let open = $state(false);

	// Format date for display
	function formatDate(isoDate: string): string {
		const date = new Date(isoDate);
		return date.toLocaleDateString('fr-FR', {
			day: 'numeric',
			month: 'long',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	// Parse JSON description (TipTap format)
	let descriptionContent = $derived.by(() => {
		try {
			// Handle both string JSON and already-parsed objects
			const desc = report.description;
			if (typeof desc === 'string') {
				return JSON.parse(desc);
			}
			return desc;
		} catch {
			// Fallback for plain text or invalid JSON
			const text =
				typeof report.description === 'string' ? report.description : String(report.description);
			return {
				type: 'doc',
				content: [{ type: 'paragraph', content: [{ type: 'text', text }] }]
			};
		}
	});

	// Parse JSON response (TipTap format) - only if present
	let responseContent = $derived.by(() => {
		if (!report.response) return null;
		try {
			const resp = report.response;
			if (typeof resp === 'string') {
				return JSON.parse(resp);
			}
			return resp;
		} catch {
			const text = typeof report.response === 'string' ? report.response : String(report.response);
			return {
				type: 'doc',
				content: [{ type: 'paragraph', content: [{ type: 'text', text }] }]
			};
		}
	});

	let formattedCreatedAt = $derived(formatDate(report.created_at));
	let formattedUpdatedAt = $derived(
		report.status !== 'pending' ? formatDate(report.updated_at) : null
	);
</script>

<Popover.Root bind:open>
	<Popover.Trigger>
		{#snippet child({ props })}
			<Button
				{...props}
				variant="ghost"
				size="sm"
				class="h-auto p-0 hover:bg-transparent"
				aria-label="Voir les détails du signalement"
			>
				<Info class="h-4 w-4 text-muted-foreground hover:text-foreground" />
			</Button>
		{/snippet}
	</Popover.Trigger>
	<Popover.Content class="w-80">
		<div class="space-y-3">
			<div>
				<h4 class="mb-2 font-semibold">Détails du signalement</h4>
				<div class="flex items-center gap-2">
					<span class="text-sm text-muted-foreground">Statut :</span>
					<ReportStatusBadge status={report.status} />
				</div>
			</div>

			<Separator />

			<div>
				<p class="mb-1 text-sm font-medium">Votre description</p>
				<RichTextDisplay content={descriptionContent} class="text-sm text-muted-foreground" />
			</div>

			{#if responseContent}
				<div>
					<p class="mb-1 text-sm font-medium">Réponse de l'enseignant</p>
					<RichTextDisplay content={responseContent} class="text-sm text-muted-foreground" />
				</div>
			{/if}

			<Separator />

			<div class="space-y-1 text-xs text-muted-foreground">
				<p>Signalé le : {formattedCreatedAt}</p>
				{#if formattedUpdatedAt}
					<p>Mis à jour le : {formattedUpdatedAt}</p>
				{/if}
			</div>
		</div>
	</Popover.Content>
</Popover.Root>
