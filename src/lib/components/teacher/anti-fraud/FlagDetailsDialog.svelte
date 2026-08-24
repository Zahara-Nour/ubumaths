<!--
	Modal "détails d'un flag anti-fraud".

	Affiche le breakdown JSONB des signaux qui ont déclenché le drapeau.
-->
<script lang="ts">
	import { lore } from '$lib/config/lore';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Badge } from '$lib/components/ui/badge';

	interface Flag {
		flag_type: string;
		severity: number;
		score: number;
		sample_size: number;
		created_at: string;
		details: Record<string, unknown> | null;
		capacity: { id: string; name: string } | null;
	}

	interface Props {
		open: boolean;
		flag: Flag;
		studentName: string;
		onclose?: () => void;
	}

	let { open = $bindable(), flag, studentName, onclose }: Props = $props();

	function handleOpenChange(v: boolean) {
		open = v;
		if (!v) onclose?.();
	}

	function flagTypeLabel(type: string): string {
		switch (type) {
			case 'high_easy_ratio':
				return 'Taux Easy anormal';
			case 'no_again':
				return 'Aucune Again sur séquence longue';
			case 'fast_timeSpent':
				return 'Reviews trop rapides';
			case 'burst':
				return 'Rafale de reviews';
			case 'srs_vs_quiz_gap':
				return 'Écart SRS vs Monde 1';
			case 'composite':
				return 'Synthèse multi-signaux';
			default:
				return type;
		}
	}

	function formatDate(iso: string): string {
		try {
			return new Date(iso).toLocaleString('fr-FR', {
				dateStyle: 'short',
				timeStyle: 'short'
			});
		} catch {
			return iso;
		}
	}

	const detailEntries = $derived(flag.details ? Object.entries(flag.details) : []);

	function formatValue(v: unknown): string {
		if (v === null || v === undefined) return '—';
		if (typeof v === 'number') {
			if (Number.isInteger(v)) return String(v);
			return v.toFixed(3);
		}
		if (typeof v === 'string') return v;
		return JSON.stringify(v);
	}
</script>

<Dialog.Root bind:open onOpenChange={handleOpenChange}>
	<Dialog.Portal>
		<Dialog.Overlay />
		<Dialog.Content class="max-w-lg">
			<Dialog.Header>
				<Dialog.Title>{flagTypeLabel(flag.flag_type)}</Dialog.Title>
				<Dialog.Description>
					{studentName} — {flag.capacity?.name ?? 'Toutes capacités'}
				</Dialog.Description>
			</Dialog.Header>

			<div class="space-y-3 text-sm">
				<div class="flex flex-wrap gap-2">
					<Badge variant={flag.severity >= 4 ? 'destructive' : 'default'}>
						Sévérité {flag.severity}/5
					</Badge>
					<Badge variant="secondary">
						Score {Math.round(flag.score * 100)}/100
					</Badge>
					<Badge variant="outline">
						{flag.sample_size} reviews
					</Badge>
				</div>

				<p class="text-xs text-muted-foreground">
					Détecté le {formatDate(flag.created_at)}.
				</p>

				{#if detailEntries.length > 0}
					<div class="rounded border border-border bg-muted/30 p-3">
						<p class="mb-2 text-xs font-medium text-muted-foreground">Détails du signal</p>
						<dl class="space-y-1 text-xs">
							{#each detailEntries as [key, value] (key)}
								<div class="flex justify-between gap-2">
									<dt class="font-mono text-muted-foreground">{key}</dt>
									<dd class="font-mono">{formatValue(value)}</dd>
								</div>
							{/each}
						</dl>
					</div>
				{/if}

				<p class="text-xs text-muted-foreground">
					Ce drapeau n'est PAS visible côté élève. Si vous estimez qu'il s'agit d'un faux positif ({lore
						.entities.student} très rapide, séance de révision pure, etc.), marquez-le comme OK.
				</p>
			</div>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
