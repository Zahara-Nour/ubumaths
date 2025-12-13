<script lang="ts">
	import * as Popover from '$lib/components/ui/popover';
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';
	import { Info } from 'lucide-svelte';
	import ReportStatusBadge from './ReportStatusBadge.svelte';
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

	let formattedCreatedAt = $derived(formatDate(report.created_at));
	let formattedUpdatedAt = $derived(
		report.status !== 'pending' ? formatDate(report.updated_at) : null
	);
</script>

<Popover.Root bind:open>
	<Popover.Trigger asChild let:builder>
		<Button
			builders={[builder]}
			variant="ghost"
			size="sm"
			class="h-auto p-0 hover:bg-transparent"
			aria-label="Voir les détails du signalement"
		>
			<Info class="h-4 w-4 text-muted-foreground hover:text-foreground" />
		</Button>
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
				<p class="text-sm text-muted-foreground">{report.description}</p>
			</div>

			{#if report.response}
				<div>
					<p class="mb-1 text-sm font-medium">Réponse de l'enseignant</p>
					<p class="text-sm text-muted-foreground">{report.response}</p>
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
