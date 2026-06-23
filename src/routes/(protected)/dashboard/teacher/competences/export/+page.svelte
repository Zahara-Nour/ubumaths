<!--
	Vue prof : niveaux de compétences (famille B) d'une classe + export CSV.

	Le tableau « large » (élèves × 6 compétences) est la vue consultable ; le CSV
	exporte exactement ce contenu (cf. docs/wip/export-competences-study.md §8).
	Visuels de niveau cohérents avec ClassCompetenceGrid (◯/🟠/🟢/✨).
-->
<script lang="ts">
	import { goto } from '$app/navigation';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Download, Info } from '@lucide/svelte';
	import MySelect from '$lib/components/MySelect.svelte';
	import MyCheckbox from '$lib/components/MyCheckbox.svelte';
	import { formatNiveau, type NiveauFormat } from '$lib/competences/niveau-format';
	import {
		formatMathCompetenceLevel,
		getMathCompetenceLevelVisual,
		type MathCompetenceLevel
	} from '$lib/types/skills';
	import type { PageData } from './$types';
	import type { CompetencesExportPageData } from './+page.server';

	interface Props {
		data: PageData & CompetencesExportPageData;
	}

	let { data }: Props = $props();

	type Disposition = 'large' | 'longue';

	// The selected class is owned by the server (the `?class=` URL param drives
	// the load), so it is derived from `data` rather than held as local state.
	const selectedClassId = $derived(data.selectedClassId);

	// Period is a client-only export label; default to the current period unless
	// the teacher overrides it.
	let periodOverride = $state<string | null>(null);
	const selectedPeriodId = $derived(periodOverride ?? data.currentPeriodId ?? '');

	let disposition = $state<Disposition>('large');
	let niveauFormat = $state<NiveauFormat>('numeric');
	let includeSocle = $state(true);
	let includeTaskCount = $state(false);
	let includeLastObservation = $state(false);

	const classItems = $derived(data.classes.map((c) => ({ value: c.id, label: c.name })));
	const periodItems = $derived([
		{ value: '', label: '(aucune période)' },
		...data.periods.map((p) => ({ value: p.id, label: p.name }))
	]);
	const dispositionItems = [
		{ value: 'large', label: 'Large — élèves × compétences (Pronote)' },
		{ value: 'longue', label: 'Longue — 1 ligne par compétence (archivage)' }
	];
	const niveauFormatItems = [
		{ value: 'numeric', label: 'Chiffre LSU (1-4)' },
		{ value: 'label', label: 'Libellé (« Maîtrise satisfaisante »)' },
		{ value: 'short', label: 'Sigle (MI / MF / MS / TBM)' }
	];

	function handleClassChange(value: string) {
		// Navigation reloads the server `load`, which updates `selectedClassId`.
		goto(`?class=${value}`, { keepFocus: true, noScroll: true });
	}

	function levelOf(row: (typeof data.rows)[number], code: string): MathCompetenceLevel | null {
		return (row.levels[code] as MathCompetenceLevel | null | undefined) ?? null;
	}

	const downloadUrl = $derived.by(() => {
		if (!selectedClassId) return '#';
		const params: [string, string][] = [
			['class_id', selectedClassId],
			['disposition', disposition],
			['niveau_format', niveauFormat]
		];
		if (disposition === 'longue') {
			if (includeSocle) params.push(['socle', 'true']);
			if (includeTaskCount) params.push(['task_count', 'true']);
			if (includeLastObservation) params.push(['last_obs', 'true']);
		}
		const periodName = data.periods.find((pp) => pp.id === selectedPeriodId)?.name;
		if (periodName) params.push(['period_label', periodName]);
		const query = params.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
		return `/api/teacher/competences/export?${query}`;
	});

	const hasStudents = $derived(data.rows.length > 0);
</script>

<svelte:head>
	<title>Export compétences | Chiphre</title>
</svelte:head>

<main class="container mx-auto max-w-6xl px-4 py-6">
	<header class="mb-6">
		<h1 class="text-2xl font-bold">Export des compétences</h1>
		<p class="text-muted-foreground">
			Consultez les niveaux de compétences de la classe et exportez-les en CSV pour votre ENT.
		</p>
	</header>

	{#if data.classes.length === 0}
		<Card.Root>
			<Card.Content class="py-12 text-center text-muted-foreground">
				Vous n'avez aucune classe pour le moment.
			</Card.Content>
		</Card.Root>
	{:else}
		<div class="grid gap-6 lg:grid-cols-[20rem_1fr]">
			<!-- Panneau de configuration -->
			<Card.Root class="h-fit">
				<Card.Header>
					<Card.Title>Options d'export</Card.Title>
				</Card.Header>
				<Card.Content class="space-y-4">
					<div class="space-y-1.5">
						<span class="text-sm font-medium">Classe</span>
						<MySelect
							type="single"
							value={selectedClassId ?? ''}
							items={classItems}
							onValueChange={handleClassChange}
							placeholder="Choisir une classe"
						/>
					</div>

					<div class="space-y-1.5">
						<span class="text-sm font-medium">Période (étiquette)</span>
						<MySelect
							type="single"
							value={selectedPeriodId}
							items={periodItems}
							onValueChange={(v) => (periodOverride = v)}
						/>
					</div>

					<div class="space-y-1.5">
						<span class="text-sm font-medium">Disposition</span>
						<MySelect
							type="single"
							value={disposition}
							items={dispositionItems}
							onValueChange={(v) => (disposition = v as Disposition)}
						/>
					</div>

					<div class="space-y-1.5">
						<span class="text-sm font-medium">Format des niveaux</span>
						<MySelect
							type="single"
							value={niveauFormat}
							items={niveauFormatItems}
							onValueChange={(v) => (niveauFormat = v as NiveauFormat)}
						/>
					</div>

					{#if disposition === 'longue'}
						<div class="space-y-2 rounded-md border border-border p-3">
							<span class="text-sm font-medium">Colonnes optionnelles</span>
							<MyCheckbox bind:checked={includeSocle} label="Code socle" />
							<MyCheckbox bind:checked={includeTaskCount} label="Nombre de tâches" />
							<MyCheckbox bind:checked={includeLastObservation} label="Dernière observation" />
						</div>
					{/if}

					<Button
						href={downloadUrl}
						data-sveltekit-reload
						disabled={!hasStudents}
						class="w-full gap-2"
					>
						<Download class="h-4 w-4" />
						Télécharger CSV
					</Button>
				</Card.Content>
			</Card.Root>

			<!-- Vue / aperçu -->
			<Card.Root>
				<Card.Header>
					<Card.Title>Aperçu</Card.Title>
					<Card.Description>
						Tableau large (élèves × compétences). Le CSV reprend ce contenu.
					</Card.Description>
				</Card.Header>
				<Card.Content>
					<div
						class="mb-4 flex items-start gap-2 rounded-md bg-muted/50 p-3 text-sm text-muted-foreground"
					>
						<Info class="mt-0.5 h-4 w-4 shrink-0" />
						<span>
							Ces niveaux suivent l'échelle officielle du socle commun (1 insuffisante → 4 très
							bonne maîtrise). Cet export reflète l'état actuel des compétences : la période sert
							d'étiquette pour votre classement, elle ne filtre pas les niveaux affichés.
						</span>
					</div>

					{#if !hasStudents}
						<p class="py-8 text-center text-sm text-muted-foreground">
							Aucun élève dans cette classe.
						</p>
					{:else}
						<div class="overflow-x-auto">
							<table class="w-full border-collapse text-sm">
								<caption class="sr-only">Niveaux de compétences par élève</caption>
								<thead>
									<tr class="border-b border-border">
										<th
											scope="col"
											class="sticky left-0 z-10 bg-background px-2 py-2 text-left font-medium"
										>
											Élève
										</th>
										{#each data.competences as comp (comp.code)}
											<th
												scope="col"
												class="min-w-[4.5rem] px-1 py-2 text-center text-xs font-normal"
											>
												<div class="flex flex-col items-center gap-0.5">
													<span class="line-clamp-2 max-w-[5rem]">{comp.name}</span>
													<Badge variant="outline" class="text-[0.6rem]">{comp.code}</Badge>
												</div>
											</th>
										{/each}
									</tr>
								</thead>
								<tbody>
									{#each data.rows as row, idx (row.lastName + row.firstName + idx)}
										<tr class="border-b border-border/50">
											<th
												scope="row"
												class="sticky left-0 z-10 max-w-[12rem] truncate bg-background px-2 py-2 text-left font-medium"
											>
												{row.lastName}
												{row.firstName}
											</th>
											{#each data.competences as comp (comp.code)}
												{@const lvl = levelOf(row, comp.code)}
												<td class="px-1 py-2 text-center">
													<div class="flex flex-col items-center gap-0.5">
														<span class="text-lg" aria-hidden="true">
															{lvl ? getMathCompetenceLevelVisual(lvl) : '◯'}
														</span>
														<span class="text-xs text-muted-foreground">
															{formatNiveau(lvl, niveauFormat) || '—'}
														</span>
														<span class="sr-only">
															{lvl ? formatMathCompetenceLevel(lvl) : 'Non évalué'}
														</span>
													</div>
												</td>
											{/each}
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					{/if}
				</Card.Content>
			</Card.Root>
		</div>
	{/if}
</main>
