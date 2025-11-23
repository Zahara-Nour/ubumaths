<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import MySelect from '$lib/components/MySelect.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { Eye, RefreshCw, Users, Copy } from 'lucide-svelte';
	import type { InstanceData } from '$lib/types/worksheets';

	interface Props {
		worksheetId: string;
		classId?: string;
		students?: Array<{ id: string; first_name: string | null; last_name: string | null }>;
	}

	let { worksheetId, classId, students = [] }: Props = $props();

	// State
	let selectedStudentId = $state<string>('');
	let customSeed = $state<number | undefined>(undefined);
	let isLoading = $state(false);
	let previewData = $state<{
		instanceData: InstanceData;
		worksheet: { id: string; title: string };
		student?: { id: string; name: string };
		metadata: {
			generatedAt: string;
			totalExercises: number;
			variantMode: string;
			seed: number;
		};
	} | null>(null);
	let showParameters = $state(false);
	let compareMode = $state(false);
	let compareData = $state<typeof previewData>(null);

	// Prepare student options for select
	const studentOptions = $derived(
		students.map((s) => ({
			value: s.id,
			label: `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Élève inconnu'
		}))
	);

	// Add a random preview option
	const previewOptions = $derived([{ value: '', label: 'Aperçu aléatoire' }, ...studentOptions]);

	// Generate preview
	async function generatePreview(useCompare = false) {
		isLoading = true;
		try {
			const response = await fetch(`/api/worksheets/${worksheetId}/preview`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					studentId: selectedStudentId || undefined,
					variantSeed: customSeed
				})
			});

			if (!response.ok) {
				throw new Error(await response.text());
			}

			const data = await response.json();

			if (useCompare) {
				compareData = data;
			} else {
				previewData = data;
				compareData = null;
				compareMode = false;
			}

			toaster.success('Aperçu généré avec succès');
		} catch (error) {
			toaster.error(
				`Erreur lors de la génération: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
			);
		} finally {
			isLoading = false;
		}
	}

	// Generate new random seed
	function generateRandomSeed() {
		customSeed = Math.floor(Math.random() * 2147483647);
		generatePreview();
	}

	// Copy parameters to clipboard
	function copyParameters() {
		if (!previewData?.instanceData.exercises[0]?.parameters) {
			toaster.warning('Aucun paramètre à copier');
			return;
		}

		const params = JSON.stringify(previewData.instanceData.exercises[0].parameters, null, 2);
		navigator.clipboard.writeText(params);
		toaster.success('Paramètres copiés dans le presse-papiers');
	}

	// Format variant mode label
	function formatVariantMode(mode: string): string {
		const modes: Record<string, string> = {
			none: 'Aucune variante',
			individual: 'Individuelle',
			n_versions: 'Versions limitées',
			group: 'Par groupe'
		};
		return modes[mode] || mode;
	}

	// Generate instances for the whole class
	async function generateClassInstances() {
		if (!classId) {
			toaster.error('Aucune classe sélectionnée');
			return;
		}

		isLoading = true;
		try {
			const response = await fetch(`/api/worksheets/${worksheetId}/instances`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ classId })
			});

			if (!response.ok) {
				throw new Error(await response.text());
			}

			const result = await response.json();
			toaster.success(`${result.created} instances créées pour la classe ${result.class.name}`);

			if (result.skipped > 0) {
				toaster.info(`${result.skipped} élèves avaient déjà une instance`);
			}
		} catch (error) {
			toaster.error(
				`Erreur lors de la génération: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
			);
		} finally {
			isLoading = false;
		}
	}

	// Initial load
	$effect(() => {
		if (worksheetId && !previewData) {
			generatePreview();
		}
	});
</script>

<Card>
	<CardHeader>
		<div class="flex items-center justify-between">
			<div>
				<CardTitle class="flex items-center gap-2">
					<Eye class="h-5 w-5" />
					Aperçu des Variantes
				</CardTitle>
				<CardDescription>
					Visualisez ce que les élèves verront avec les paramètres résolus
				</CardDescription>
			</div>
			{#if classId && students.length > 0}
				<Button onclick={generateClassInstances} disabled={isLoading} variant="default">
					<Users class="mr-2 h-4 w-4" />
					Générer pour la classe
				</Button>
			{/if}
		</div>
	</CardHeader>

	<CardContent class="space-y-4">
		<!-- Controls -->
		<div class="grid gap-4 md:grid-cols-3">
			<div>
				<label class="mb-2 block text-sm font-medium">Élève</label>
				<MySelect
					type="single"
					bind:value={selectedStudentId}
					items={previewOptions}
					placeholder="Sélectionner un élève"
				/>
			</div>

			<div>
				<label class="mb-2 block text-sm font-medium">Seed personnalisé</label>
				<div class="flex gap-2">
					<input
						type="number"
						bind:value={customSeed}
						placeholder="Auto"
						min="0"
						max="2147483647"
						class="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
					/>
					<Button
						onclick={generateRandomSeed}
						size="icon"
						variant="outline"
						title="Générer un seed aléatoire"
					>
						<RefreshCw class="h-4 w-4" />
					</Button>
				</div>
			</div>

			<div class="flex items-end gap-2">
				<Button
					onclick={() => generatePreview(false)}
					disabled={isLoading}
					variant="default"
					class="flex-1"
				>
					<Eye class="mr-2 h-4 w-4" />
					Générer l'aperçu
				</Button>
				{#if previewData}
					<Button
						onclick={() => {
							compareMode = true;
							generatePreview(true);
						}}
						disabled={isLoading}
						variant="outline"
						size="icon"
						title="Comparer avec une autre variante"
					>
						<Copy class="h-4 w-4" />
					</Button>
				{/if}
			</div>
		</div>

		<!-- Metadata -->
		{#if previewData}
			<div class="flex flex-wrap gap-2">
				<Badge variant="secondary">
					Mode: {formatVariantMode(previewData.metadata.variantMode)}
				</Badge>
				<Badge variant="secondary">
					Seed: {previewData.metadata.seed}
				</Badge>
				{#if previewData.instanceData.variant_info?.version}
					<Badge variant="secondary">
						Version: {previewData.instanceData.variant_info.version}
					</Badge>
				{/if}
				{#if previewData.instanceData.variant_info?.group_id}
					<Badge variant="secondary">
						Groupe: {previewData.instanceData.variant_info.group_id}
					</Badge>
				{/if}
				<Badge variant="outline">
					{previewData.metadata.totalExercises} exercices
				</Badge>
				{#if previewData.student}
					<Badge variant="outline">
						{previewData.student.name}
					</Badge>
				{/if}
			</div>
		{/if}

		<Separator />

		<!-- Preview Content -->
		{#if previewData}
			<div class="space-y-6">
				<!-- Toggle parameters view -->
				<div class="flex items-center justify-between">
					<Button onclick={() => (showParameters = !showParameters)} variant="outline" size="sm">
						{showParameters ? 'Masquer' : 'Afficher'} les paramètres
					</Button>
					{#if showParameters && previewData.instanceData.exercises.some((e) => Object.keys(e.parameters).length > 0)}
						<Button onclick={copyParameters} variant="ghost" size="sm">
							<Copy class="mr-2 h-4 w-4" />
							Copier les paramètres
						</Button>
					{/if}
				</div>

				<!-- Compare mode -->
				{#if compareMode && compareData}
					<div class="grid gap-4 md:grid-cols-2">
						<div>
							<h3 class="mb-2 font-semibold">Variante 1 (Seed: {previewData.metadata.seed})</h3>
							{#each previewData.instanceData.exercises as exercise, i (exercise.exercise_id + '-' + i)}
								<Card class="mb-4">
									<CardHeader class="pb-2">
										<CardTitle class="text-base">
											Exercice {i + 1}
										</CardTitle>
									</CardHeader>
									<CardContent>
										{#if showParameters && Object.keys(exercise.parameters).length > 0}
											<div class="mb-3 rounded bg-muted p-2 text-sm">
												<strong>Paramètres:</strong>
												{#each Object.entries(exercise.parameters) as [key, value] (key)}
													<div class="ml-2">
														<code>{key}</code> = <code>{value}</code>
													</div>
												{/each}
											</div>
										{/if}
										<div class="prose prose-sm max-w-none">
											{@html exercise.statement.replace(/\n/g, '<br>')}
										</div>
									</CardContent>
								</Card>
							{/each}
						</div>

						<div>
							<h3 class="mb-2 font-semibold">Variante 2 (Seed: {compareData.metadata.seed})</h3>
							{#each compareData.instanceData.exercises as exercise, i (exercise.exercise_id + '-' + i)}
								<Card class="mb-4">
									<CardHeader class="pb-2">
										<CardTitle class="text-base">
											Exercice {i + 1}
										</CardTitle>
									</CardHeader>
									<CardContent>
										{#if showParameters && Object.keys(exercise.parameters).length > 0}
											<div class="mb-3 rounded bg-muted p-2 text-sm">
												<strong>Paramètres:</strong>
												{#each Object.entries(exercise.parameters) as [key, value] (key)}
													<div class="ml-2">
														<code>{key}</code> = <code>{value}</code>
													</div>
												{/each}
											</div>
										{/if}
										<div class="prose prose-sm max-w-none">
											{@html exercise.statement.replace(/\n/g, '<br>')}
										</div>
									</CardContent>
								</Card>
							{/each}
						</div>
					</div>
				{:else}
					<!-- Single preview -->
					{#each previewData.instanceData.exercises as exercise, i (exercise.exercise_id + '-' + i)}
						<Card>
							<CardHeader class="pb-2">
								<CardTitle class="text-base">
									Exercice {i + 1}
									{#if exercise.position !== i}
										<Badge variant="outline" class="ml-2">
											Position originale: {exercise.position + 1}
										</Badge>
									{/if}
								</CardTitle>
							</CardHeader>
							<CardContent class="space-y-3">
								{#if showParameters && Object.keys(exercise.parameters).length > 0}
									<div class="rounded-md bg-muted p-3">
										<div class="mb-2 text-sm font-medium">Paramètres générés:</div>
										<div class="grid gap-1">
											{#each Object.entries(exercise.parameters) as [key, value] (key)}
												<div class="font-mono text-sm">
													<span class="text-muted-foreground">{key}:</span>
													<span class="ml-2 font-semibold">{value}</span>
												</div>
											{/each}
										</div>
									</div>
								{/if}

								<div>
									<div class="mb-1 text-sm font-medium">Énoncé:</div>
									<div class="prose prose-sm max-w-none rounded-md border bg-background p-3">
										{@html exercise.statement.replace(/\n/g, '<br>')}
									</div>
								</div>

								{#if exercise.solution}
									<div>
										<div class="mb-1 text-sm font-medium">Solution:</div>
										<div class="prose prose-sm max-w-none rounded-md bg-muted/50 p-3">
											{@html exercise.solution.replace(/\n/g, '<br>')}
										</div>
									</div>
								{/if}
							</CardContent>
						</Card>
					{/each}
				{/if}
			</div>
		{:else if !isLoading}
			<div class="py-8 text-center text-muted-foreground">
				Cliquez sur "Générer l'aperçu" pour visualiser une variante
			</div>
		{/if}

		{#if isLoading}
			<div class="flex justify-center py-8">
				<RefreshCw class="h-6 w-6 animate-spin text-muted-foreground" />
			</div>
		{/if}
	</CardContent>
</Card>
