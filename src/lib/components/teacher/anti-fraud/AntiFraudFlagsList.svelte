<!--
	Liste des flags anti-fraud actifs pour la classe.

	Spec : docs/wip/srs-anti-fraud-spec-tdd.md §B9
-->
<script lang="ts">
	import { lore } from '$lib/config/lore';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { CircleAlert, AlertTriangle, ShieldCheck, Eye } from '@lucide/svelte';
	import FlagDetailsDialog from './FlagDetailsDialog.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { SvelteSet } from 'svelte/reactivity';

	interface FlagListItem {
		id: string;
		student: { id: string; first_name: string | null; last_name: string | null };
		capacity: { id: string; name: string } | null;
		flag_type: string;
		severity: number;
		score: number;
		sample_size: number;
		details: Record<string, unknown> | null;
		resolved: boolean;
		created_at: string;
	}

	interface FlagsResponse {
		flags: FlagListItem[];
		total: number;
		resolved_count: number;
	}

	interface Props {
		classId: string;
		anonymized?: boolean;
		refreshNonce?: number;
		showResolved?: boolean;
		onResolved?: () => void;
	}

	let {
		classId,
		anonymized = false,
		refreshNonce = 0,
		showResolved = false,
		onResolved
	}: Props = $props();

	let data = $state<FlagsResponse | null>(null);
	let loading = $state(false);
	let error = $state<string | null>(null);
	let dialogOpen = $state(false);
	let selectedFlag = $state<FlagListItem | null>(null);
	let resolvingIds = new SvelteSet<string>();

	async function load() {
		loading = true;
		error = null;
		try {
			const url = `/api/teacher/classes/${classId}/anti-fraud/flags?resolved=${showResolved}`;
			const res = await fetch(url);
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				error = body.error ?? `Erreur ${res.status}`;
				return;
			}
			data = (await res.json()) as FlagsResponse;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Erreur réseau';
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		void classId;
		void refreshNonce;
		void showResolved;
		void load();
	});

	function displayName(flag: FlagListItem, idx: number): string {
		if (anonymized) return `Élève ${idx + 1}`;
		const fn = flag.student.first_name?.trim() ?? '';
		const ln = flag.student.last_name?.trim() ?? '';
		const full = `${fn} ${ln}`.trim();
		return full.length > 0 ? full : 'Élève sans nom';
	}

	function flagTypeLabel(type: string): string {
		switch (type) {
			case 'high_easy_ratio':
				return 'Trop de Easy';
			case 'no_again':
				return 'Aucune Again';
			case 'fast_timeSpent':
				return 'Reviews trop rapides';
			case 'burst':
				return 'Rafale de reviews';
			case 'srs_vs_quiz_gap':
				return 'Écart SRS / Quiz';
			case 'composite':
				return 'Synthèse multi-signaux';
			default:
				return type;
		}
	}

	function severityVariant(sev: number): 'secondary' | 'default' | 'destructive' {
		if (sev >= 4) return 'destructive';
		if (sev >= 2) return 'default';
		return 'secondary';
	}

	function severityIcon(sev: number) {
		if (sev >= 4) return CircleAlert;
		if (sev >= 2) return AlertTriangle;
		return ShieldCheck;
	}

	async function resolveFlag(flag: FlagListItem) {
		const confirmed = window.confirm(
			`Marquer le flag « ${flagTypeLabel(flag.flag_type)} » sur ${displayName(flag, 0)} comme OK ?`
		);
		if (!confirmed) return;

		resolvingIds.add(flag.id);
		try {
			const res = await fetch(`/api/teacher/classes/${classId}/anti-fraud/flags/${flag.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ resolved: true })
			});
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				toaster.error(body.error ?? `Erreur ${res.status}`);
				return;
			}
			toaster.success('Flag marqué comme OK');
			await load();
			onResolved?.();
		} catch (e) {
			toaster.error(e instanceof Error ? e.message : 'Erreur réseau');
		} finally {
			resolvingIds.delete(flag.id);
		}
	}

	function openDetails(flag: FlagListItem) {
		selectedFlag = flag;
		dialogOpen = true;
	}
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>{lore.entities.student}s à surveiller</Card.Title>
		<Card.Description>
			Drapeaux générés par le système de détection anti-fraud SRS. Cliquez sur « Voir détails » pour
			le breakdown du signal.
		</Card.Description>
	</Card.Header>

	<Card.Content>
		{#if loading}
			<div class="space-y-2">
				<Skeleton class="h-16 w-full" />
				<Skeleton class="h-16 w-full" />
				<Skeleton class="h-16 w-full" />
			</div>
		{:else if error}
			<p class="text-sm text-destructive">⚠ {error}</p>
		{:else if !data || data.flags.length === 0}
			<p class="py-8 text-center text-sm text-muted-foreground">
				Aucun {lore.entities.student} à surveiller en ce moment 🎉
			</p>
		{:else}
			<ul class="divide-y divide-border">
				{#each data.flags as flag, idx (flag.id)}
					{@const SevIcon = severityIcon(flag.severity)}
					<li class="flex flex-wrap items-center justify-between gap-2 py-3">
						<div class="min-w-0 flex-1">
							<div class="flex items-center gap-2">
								<SevIcon class="h-4 w-4 shrink-0" />
								<span class="font-medium">{displayName(flag, idx)}</span>
								<Badge variant={severityVariant(flag.severity)} class="text-xs">
									{flagTypeLabel(flag.flag_type)}
								</Badge>
							</div>
							<p class="mt-1 text-xs text-muted-foreground">
								{flag.capacity?.name ?? 'Toutes capacités'}
								· score {Math.round(flag.score * 100)}/100 · {flag.sample_size} reviews
							</p>
						</div>
						<div class="flex gap-2">
							<Button variant="ghost" size="sm" onclick={() => openDetails(flag)}>
								<Eye class="mr-1 h-4 w-4" />
								Détails
							</Button>
							{#if !flag.resolved}
								<Button
									variant="outline"
									size="sm"
									disabled={resolvingIds.has(flag.id)}
									onclick={() => resolveFlag(flag)}
								>
									Marquer comme OK
								</Button>
							{:else}
								<Badge variant="secondary" class="text-xs">Résolu</Badge>
							{/if}
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</Card.Content>
</Card.Root>

{#if selectedFlag}
	<FlagDetailsDialog
		bind:open={dialogOpen}
		flag={selectedFlag}
		studentName={displayName(selectedFlag, 0)}
		onclose={() => (selectedFlag = null)}
	/>
{/if}
