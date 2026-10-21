<!--
	Page conteneur — Analytics prof.

	Onglets :
	  📘 Connaissances : Widgets A + B + C + D + E
	  🎯 Compétences  : Widgets F + G

	Widgets B et D sont des drill-downs : sélectionnent un élève dans la grille
	courante. Pour l'instant on les rend visibles par défaut sur le 1er élève
	disponible — l'interaction "click sur cellule pour focus" sera V2.1.
-->
<script lang="ts">
	import { lore } from '$lib/config/lore';
	import type { PageData } from './$types';
	import { RefreshCw, EyeOff, Eye, Download } from '@lucide/svelte';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Button } from '$lib/components/ui/button';
	import BackLink from '$lib/components/navigation/BackLink.svelte';
	import MySelect from '$lib/components/MySelect.svelte';
	import * as Card from '$lib/components/ui/card';
	import ClassCapacityGrid from '$lib/components/teacher/analytics/ClassCapacityGrid.svelte';
	import TopCapacitiesToRemediate from '$lib/components/teacher/analytics/TopCapacitiesToRemediate.svelte';
	import ClassActivityHeatmap from '$lib/components/teacher/analytics/ClassActivityHeatmap.svelte';
	import StudentRetentionCurve from '$lib/components/teacher/analytics/StudentRetentionCurve.svelte';
	import StudentGradeHistogram from '$lib/components/teacher/analytics/StudentGradeHistogram.svelte';
	import ClassCompetenceGrid from '$lib/components/teacher/analytics/ClassCompetenceGrid.svelte';
	import TopObservablesToConsolidate from '$lib/components/teacher/analytics/TopObservablesToConsolidate.svelte';
	import AntiFraudFlagsList from '$lib/components/teacher/anti-fraud/AntiFraudFlagsList.svelte';
	import AntiFraudFilters from '$lib/components/teacher/anti-fraud/AntiFraudFilters.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { fetchUnresolvedCount } from '$lib/components/teacher/anti-fraud/unresolved-count';

	let { data }: { data: PageData } = $props();

	let anonymized = $state(false);
	let refreshNonce = $state(0);
	let activeTab = $state<'knowledge' | 'competence' | 'surveillance'>('knowledge');
	// svelte-ignore state_referenced_locally
	// null = compteur illisible (chargement ou rafraîchissement) : le badge affiche « ? ».
	let unresolvedCount = $state<number | null>(data.unresolvedFlagsCount);
	let showResolved = $state(false);
	// svelte-ignore state_referenced_locally
	let selectedStudentId = $state<string>(data.students[0]?.id ?? '');
	// svelte-ignore state_referenced_locally
	let selectedBranchId = $state<string>(data.branches[0]?.id ?? '');

	const studentItems = $derived(data.students.map((s) => ({ value: s.id, label: s.display_name })));
	const branchItems = $derived(data.branches.map((b) => ({ value: b.id, label: b.name })));
	const selectedBranchName = $derived(
		data.branches.find((b) => b.id === selectedBranchId)?.name ?? '?'
	);
	const selectedStudentName = $derived(
		data.students.find((s) => s.id === selectedStudentId)?.display_name ?? '?'
	);

	function refresh() {
		refreshNonce += 1;
		void refreshUnresolvedCount();
	}

	function toggleAnonymized() {
		anonymized = !anonymized;
	}

	// Échec → null : le badge affiche « ? » au lieu d'un nombre périmé (écart L30).
	async function refreshUnresolvedCount() {
		unresolvedCount = await fetchUnresolvedCount(data.classId);
	}
</script>

<svelte:head>
	<title>Analytics — {data.className} | Chiphre</title>
</svelte:head>

<main class="container mx-auto max-w-7xl px-4 py-6">
	<BackLink href="/dashboard/teacher/classes" label={`Retour aux ${lore.entities.class}s`} />

	<header class="mb-6 flex flex-wrap items-start justify-between gap-3">
		<div>
			<h1 class="text-2xl font-bold tracking-tight">Analytics — {data.className}</h1>
			{#if data.grade}
				<p class="text-sm text-muted-foreground">Niveau : {data.grade}</p>
			{/if}
		</div>
		<div class="flex flex-wrap items-center gap-2">
			<!-- Export vers l'ENT : action de fin de trimestre, sa place est ici (là où
				 vivent les données) plutôt que dans le menu principal. -->
			<Button variant="outline" size="sm" href="/dashboard/teacher/competences/export">
				<Download class="mr-2 h-4 w-4" />
				Exporter les compétences
			</Button>
			<Button
				variant="outline"
				size="sm"
				onclick={toggleAnonymized}
				aria-pressed={anonymized}
				title="Anonymise les noms de {lore.entities.student}s pour la projection"
			>
				{#if anonymized}
					<Eye class="mr-1 h-4 w-4" />
					Afficher les noms
				{:else}
					<EyeOff class="mr-1 h-4 w-4" />
					Mode projection
				{/if}
			</Button>
			<Button variant="outline" size="sm" onclick={refresh}>
				<RefreshCw class="mr-1 h-4 w-4" />
				Actualiser
			</Button>
		</div>
	</header>

	<Tabs.Root bind:value={activeTab} class="space-y-6">
		<Tabs.List>
			<Tabs.Trigger value="knowledge">📘 Connaissances</Tabs.Trigger>
			<Tabs.Trigger value="competence">🎯 Compétences</Tabs.Trigger>
			<Tabs.Trigger value="surveillance">
				🚨 Surveillance
				{#if unresolvedCount === null}
					<Badge
						variant="outline"
						class="ml-2 text-[0.65rem]"
						title="Nombre de signalements indisponible">?</Badge
					>
				{:else if unresolvedCount > 0}
					<Badge variant="destructive" class="ml-2 text-[0.65rem]">{unresolvedCount}</Badge>
				{/if}
			</Tabs.Trigger>
		</Tabs.List>

		<Tabs.Content value="knowledge" class="space-y-6">
			<ClassCapacityGrid classId={data.classId} {anonymized} {refreshNonce} />

			<div class="grid gap-6 lg:grid-cols-2">
				<TopCapacitiesToRemediate classId={data.classId} {refreshNonce} />
				<ClassActivityHeatmap classId={data.classId} {anonymized} {refreshNonce} />
			</div>

			{#if data.students.length > 0}
				<Card.Root>
					<Card.Header>
						<Card.Title>Détail par {lore.entities.student}</Card.Title>
						<Card.Description>
							Rétention sur une branche du programme + distribution des grades sur les 7 derniers
							jours.
						</Card.Description>
						<div class="mt-3 flex flex-wrap gap-3">
							<div class="min-w-[12rem]">
								<MySelect
									type="single"
									items={studentItems}
									bind:value={selectedStudentId}
									placeholder="Choisir un {lore.entities.student}"
								/>
							</div>
							{#if branchItems.length > 0}
								<div class="min-w-[12rem]">
									<MySelect
										type="single"
										items={branchItems}
										bind:value={selectedBranchId}
										placeholder="Choisir une branche"
									/>
								</div>
							{/if}
						</div>
					</Card.Header>
					<Card.Content>
						{#if selectedStudentId}
							<div class="grid gap-6 lg:grid-cols-2">
								{#if !data.grade}
									<p class="py-4 text-center text-sm text-muted-foreground">
										Le niveau de votre {lore.entities.class} n'est pas renseigné.
									</p>
								{:else if selectedBranchId}
									<StudentRetentionCurve
										classId={data.classId}
										studentId={selectedStudentId}
										studentName={anonymized
											? `${lore.entities.student} sélectionné`
											: selectedStudentName}
										branchId={selectedBranchId}
										branchName={selectedBranchName}
										{refreshNonce}
									/>
								{:else}
									<p class="py-4 text-center text-sm text-muted-foreground">
										Aucune branche du programme pour ce niveau.
									</p>
								{/if}
								<StudentGradeHistogram
									classId={data.classId}
									studentId={selectedStudentId}
									studentName={anonymized
										? `${lore.entities.student} sélectionné`
										: selectedStudentName}
									{refreshNonce}
								/>
							</div>
						{:else}
							<p class="py-4 text-center text-sm text-muted-foreground">
								Sélectionnez un {lore.entities.student} pour afficher le détail.
							</p>
						{/if}
					</Card.Content>
				</Card.Root>
			{/if}
		</Tabs.Content>

		<Tabs.Content value="competence" class="space-y-6">
			<ClassCompetenceGrid classId={data.classId} {anonymized} {refreshNonce} />
			<TopObservablesToConsolidate classId={data.classId} {refreshNonce} />
		</Tabs.Content>

		<Tabs.Content value="surveillance" class="space-y-6">
			<AntiFraudFilters bind:showResolved />
			<AntiFraudFlagsList
				classId={data.classId}
				{anonymized}
				{refreshNonce}
				{showResolved}
				onResolved={refreshUnresolvedCount}
			/>
		</Tabs.Content>
	</Tabs.Root>
</main>
