<script lang="ts">
	/**
	 * Composer une classe depuis l'année précédente.
	 *
	 * Ce n'est pas une promotion automatique : les groupes ne se reconduisent
	 * jamais à l'identique. On choisit une destination, on coche, on inscrit.
	 */

	import type { PageData } from './$types';
	import { Button } from '$lib/components/ui/button';
	import MySelect from '$lib/components/MySelect.svelte';
	import MyCheckbox from '$lib/components/MyCheckbox.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import { Loader2, Users } from '@lucide/svelte';

	interface CandidateStudent {
		id: string;
		firstname: string | null;
		lastname: string | null;
		email: string | null;
		already_member: boolean;
	}

	interface SourceClass {
		class_id: string;
		class_name: string;
		school_year_name: string;
		students: CandidateStudent[];
	}

	let { data }: { data: PageData } = $props();

	let destinationId = $state('');
	let sources = $state<SourceClass[]>([]);
	// SvelteSet : la mutation est réactive, pas besoin de recréer l'ensemble.
	const selection = new SvelteSet<string>();
	let chargement = $state(false);
	let envoi = $state(false);
	let charge = $state(false);

	const destinationItems = $derived(
		data.destinations.map((d) => ({
			value: d.id,
			label: d.school_name
				? `${d.name} — ${d.school_name} (${d.school_year_name})`
				: `${d.name} (${d.school_year_name})`
		}))
	);

	const composables = $derived(sources.flatMap((c) => c.students.filter((e) => !e.already_member)));
	const nbSelectionnes = $derived(selection.size);

	function nomComplet(e: CandidateStudent): string {
		const nom = [e.lastname, e.firstname].filter(Boolean).join(' ');
		return nom || e.email || 'Élève sans nom';
	}

	async function chargerCandidats(classeId: string) {
		chargement = true;
		charge = false;
		sources = [];
		selection.clear();

		try {
			const reponse = await fetch(
				`/api/admin/class-composition-source?targetClassId=${encodeURIComponent(classeId)}`
			);

			if (!reponse.ok) {
				const corps = await reponse.json().catch(() => ({}));
				toaster.error(corps.message ?? 'Impossible de charger les élèves des années précédentes');
				return;
			}

			const corps = (await reponse.json()) as { classes: SourceClass[] };
			sources = corps.classes;
			charge = true;
		} catch (err) {
			console.error('Chargement des candidats impossible :', err);
			toaster.error('Impossible de charger les élèves des années précédentes');
		} finally {
			chargement = false;
		}
	}

	function handleDestinationChange(valeur: string) {
		destinationId = valeur;
		if (valeur) chargerCandidats(valeur);
	}

	function basculer(eleveId: string, coche: boolean) {
		if (coche) selection.add(eleveId);
		else selection.delete(eleveId);
	}

	function toutCocher(classe: SourceClass, coche: boolean) {
		for (const e of classe.students) {
			if (e.already_member) continue;
			if (coche) selection.add(e.id);
			else selection.delete(e.id);
		}
	}

	function classeEntierementCochee(classe: SourceClass): boolean {
		const proposables = classe.students.filter((e) => !e.already_member);
		return proposables.length > 0 && proposables.every((e) => selection.has(e.id));
	}

	async function composer() {
		if (selection.size === 0) return;
		envoi = true;

		try {
			const reponse = await fetch('/api/admin/compose-class', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					targetClassId: destinationId,
					studentIds: [...selection]
				})
			});

			const corps = await reponse.json().catch(() => ({}));

			if (!reponse.ok) {
				toaster.error(corps.message ?? 'La composition a échoué');
				return;
			}

			const { added, ignored, refused } = corps as {
				added: number;
				ignored: number;
				refused: string[];
			};

			toaster.success(
				added === 0
					? 'Aucune nouvelle inscription : tous étaient déjà membres.'
					: `${added} élève${added > 1 ? 's' : ''} inscrit${added > 1 ? 's' : ''}.`
			);

			// Les cas partiels méritent leur propre message : les taire ferait
			// croire à une composition complète.
			if (ignored > 0) {
				toaster.info(`${ignored} déjà membre${ignored > 1 ? 's' : ''}, non dupliqué.`);
			}
			if (refused.length > 0) {
				toaster.warning(`${refused.length} sélection(s) refusée(s) : ce ne sont pas des élèves.`);
			}

			await chargerCandidats(destinationId);
		} catch (err) {
			console.error('Composition impossible :', err);
			toaster.error('La composition a échoué');
		} finally {
			envoi = false;
		}
	}
</script>

<svelte:head>
	<title>Composer une classe</title>
</svelte:head>

<div class="container mx-auto max-w-4xl p-6">
	<header class="mb-6">
		<h1 class="text-2xl font-bold text-foreground">Composer une classe</h1>
		<p class="mt-1 text-sm text-muted-foreground">
			Reprendre des élèves des années précédentes dans une classe de cette année. Leur ancienne
			adhésion reste archivée.
		</p>
	</header>

	<div class="mb-6 rounded-lg border border-border bg-card p-4 shadow">
		<span class="mb-2 block text-sm font-medium text-foreground">Classe de destination</span>
		<MySelect
			type="single"
			value={destinationId}
			onValueChange={handleDestinationChange}
			items={destinationItems}
			placeholder="Choisir une classe"
			triggerClass="h-9 w-full max-w-xl rounded-md border border-input bg-background px-3 text-sm inline-flex items-center justify-between"
		/>
		{#if data.destinations.length === 0}
			<p class="mt-2 text-sm text-muted-foreground">
				Aucune classe ouverte. Une destination doit être active et rattachée à une année non
				terminée.
			</p>
		{/if}
	</div>

	{#if chargement}
		<div class="flex items-center gap-2 text-sm text-muted-foreground">
			<Loader2 class="h-4 w-4 animate-spin" />
			Chargement des élèves des années précédentes…
		</div>
	{:else if charge && sources.length === 0}
		<div class="rounded-lg border border-border bg-card p-6 text-center">
			<Users class="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
			<p class="text-sm text-muted-foreground">
				Aucun élève à reprendre : cette école n’a pas d’autre année scolaire avec des classes
				peuplées.
			</p>
		</div>
	{:else if sources.length > 0}
		<div class="space-y-4">
			{#each sources as classe (classe.class_id)}
				<section class="rounded-lg border border-border bg-card shadow">
					<header class="flex items-center justify-between border-b border-border px-4 py-3">
						<div>
							<h2 class="font-semibold text-foreground">{classe.class_name}</h2>
							<p class="text-xs text-muted-foreground">{classe.school_year_name}</p>
						</div>
						<MyCheckbox
							checked={classeEntierementCochee(classe)}
							onCheckedChange={(v) => toutCocher(classe, v === true)}
							label="Tout cocher"
						/>
					</header>

					<ul class="divide-y divide-border">
						{#each classe.students as eleve (eleve.id)}
							<li class="flex items-center justify-between px-4 py-2">
								{#if eleve.already_member}
									<span class="text-sm text-muted-foreground">{nomComplet(eleve)}</span>
									<span class="text-xs text-muted-foreground">déjà dans la classe</span>
								{:else}
									<MyCheckbox
										checked={selection.has(eleve.id)}
										onCheckedChange={(v) => basculer(eleve.id, v === true)}
										label={nomComplet(eleve)}
									/>
								{/if}
							</li>
						{/each}
					</ul>
				</section>
			{/each}
		</div>

		<div
			class="sticky bottom-4 mt-6 flex items-center justify-between rounded-lg border border-border bg-card p-4 shadow-lg"
		>
			<span class="text-sm text-foreground">
				{nbSelectionnes} élève{nbSelectionnes > 1 ? 's' : ''} sélectionné{nbSelectionnes > 1
					? 's'
					: ''}
				sur {composables.length} disponible{composables.length > 1 ? 's' : ''}
			</span>
			<Button onclick={composer} disabled={nbSelectionnes === 0 || envoi}>
				{#if envoi}
					<Loader2 class="mr-2 h-4 w-4 animate-spin" />
				{/if}
				Inscrire dans la classe
			</Button>
		</div>
	{/if}
</div>
