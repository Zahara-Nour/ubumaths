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
	import type { PageData } from './$types';
	import { ChevronLeft, RefreshCw, EyeOff, Eye } from 'lucide-svelte';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Button } from '$lib/components/ui/button';
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

	let { data }: { data: PageData } = $props();

	let anonymized = $state(false);
	let refreshNonce = $state(0);
	let activeTab = $state<'knowledge' | 'competence' | 'surveillance'>('knowledge');
	// svelte-ignore state_referenced_locally
	let unresolvedCount = $state<number>(data.unresolvedFlagsCount ?? 0);
	let showResolved = $state(false);
	// svelte-ignore state_referenced_locally
	let selectedStudentId = $state<string>(data.students[0]?.id ?? '');
	// svelte-ignore state_referenced_locally
	let selectedTheme = $state<string>(data.themes[0]?.bo_reference ?? '');

	const studentItems = $derived(data.students.map((s) => ({ value: s.id, label: s.display_name })));
	const themeItems = $derived(data.themes.map((t) => ({ value: t.bo_reference, label: t.name })));
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

	async function refreshUnresolvedCount() {
		try {
			const res = await fetch(`/api/teacher/classes/${data.classId}/anti-fraud/count`);
			if (!res.ok) return;
			const body = (await res.json()) as { count?: number };
			unresolvedCount = body.count ?? 0;
		} catch {
			// silent ; gardé à la dernière valeur connue
		}
	}
</script>

<svelte:head>
	<title>Analytics — {data.className} | UbuMaths</title>
</svelte:head>

<main class="container mx-auto max-w-7xl px-4 py-6">
	<div class="mb-4">
		<Button variant="ghost" size="sm" href="/dashboard/teacher/classes">
			<ChevronLeft class="mr-1 h-4 w-4" />
			Retour aux classes
		</Button>
	</div>

	<header class="mb-6 flex flex-wrap items-start justify-between gap-3">
		<div>
			<h1 class="text-2xl font-bold tracking-tight">Analytics — {data.className}</h1>
			{#if data.grade}
				<p class="text-sm text-muted-foreground">Niveau : {data.grade}</p>
			{/if}
		</div>
		<div class="flex flex-wrap items-center gap-2">
			<Button
				variant="outline"
				size="sm"
				onclick={toggleAnonymized}
				aria-pressed={anonymized}
				title="Anonymise les noms d'élèves pour la projection"
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
				{#if unresolvedCount > 0}
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
						<Card.Title>Détail par élève</Card.Title>
						<Card.Description>
							Rétention sur un thème + distribution des grades sur les 7 derniers jours.
						</Card.Description>
						<div class="mt-3 flex flex-wrap gap-3">
							<div class="min-w-[12rem]">
								<MySelect
									type="single"
									items={studentItems}
									bind:value={selectedStudentId}
									placeholder="Choisir un élève"
								/>
							</div>
							<div class="min-w-[12rem]">
								<MySelect
									type="single"
									items={themeItems}
									bind:value={selectedTheme}
									placeholder="Choisir un thème BO"
								/>
							</div>
						</div>
					</Card.Header>
					<Card.Content>
						{#if selectedStudentId && selectedTheme}
							<div class="grid gap-6 lg:grid-cols-2">
								<StudentRetentionCurve
									classId={data.classId}
									studentId={selectedStudentId}
									studentName={anonymized ? 'Élève sélectionné' : selectedStudentName}
									theme={selectedTheme}
									{refreshNonce}
								/>
								<StudentGradeHistogram
									classId={data.classId}
									studentId={selectedStudentId}
									studentName={anonymized ? 'Élève sélectionné' : selectedStudentName}
									{refreshNonce}
								/>
							</div>
						{:else}
							<p class="py-4 text-center text-sm text-muted-foreground">
								Sélectionnez un élève et un thème pour afficher le détail.
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
