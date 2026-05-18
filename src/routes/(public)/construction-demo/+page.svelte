<script lang="ts">
	import { onMount } from 'svelte';
	import type { Component } from 'svelte';
	import type { PageData } from './$types';
	import MySelect from '$lib/components/MySelect.svelte';
	import { Button } from '$lib/components/ui/button';
	import { toaster } from '$lib/stores/toaster.svelte';

	let { data }: { data: PageData } = $props();

	let EditorComponent = $state<Component | null>(null);

	interface SavedScript {
		id: string;
		name: string;
		dsl_script: string;
	}

	const defaultScript = `# Triangle equilateral avec mediatrice
@instruction("Placer les points A et B")
A = point(0, 0)
B = point(4, 0)

@instruction("Tracer le segment [AB]")
segment(A, B)

@pause(300)
@instruction("Construire le triangle equilateral")
T = triangle_equilateral(A, B)

@pause(300)
@instruction("Tracer la mediatrice de [AB]")
d = mediatrice(A, B)
M = milieu(A, B)
montre(M)

@pause(500)
@instruction("Construction terminee !")
`;

	let script = $state(defaultScript);
	let savedScripts = $state<SavedScript[]>([]);
	let scriptName = $state('');
	let selectedSource = $state('');
	let saving = $state(false);

	// ─── Select items ───────────────────────────────────────────

	let sourceItems = $derived([
		{ value: '', label: 'Script par defaut' },
		...(savedScripts.length > 0
			? [{ value: '---saved---', label: '── Scripts sauvegardes ──', disabled: true }]
			: []),
		...savedScripts.map((s) => ({
			value: `saved:${s.id}`,
			label: s.name
		})),
		...(data.fixtures.length > 0
			? [{ value: '---fixtures---', label: '── Fixtures XML ──', disabled: true }]
			: []),
		...data.fixtures.map((f) => ({
			value: `fixture:${f.filename}`,
			label: `${f.filename}`
		}))
	]);

	// ─── Load / Select ──────────────────────────────────────────

	async function loadSavedScripts() {
		try {
			const res = await fetch('/api/construction-demo-scripts');
			if (res.ok) {
				savedScripts = await res.json();
			}
		} catch {
			// not logged in or error — ignore
		}
	}

	function handleSourceChange(value: string) {
		selectedSource = value;
		if (!value) {
			script = defaultScript;
			scriptName = '';
			return;
		}
		if (value.startsWith('saved:')) {
			const id = value.slice(6);
			const found = savedScripts.find((s) => s.id === id);
			if (found) {
				script = found.dsl_script;
				scriptName = found.name;
			}
		} else if (value.startsWith('fixture:')) {
			const filename = value.slice(8);
			const fixture = data.fixtures.find((f) => f.filename === filename);
			if (fixture) {
				script = fixture.dsl;
				scriptName = '';
			}
		}
	}

	// ─── Save / Delete ──────────────────────────────────────────

	async function handleSave() {
		const name = scriptName.trim();
		if (!name) return;
		saving = true;
		try {
			const res = await fetch('/api/construction-demo-scripts', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name, dsl_script: script })
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({ message: 'Erreur serveur' }));
				toaster.error(err.message ?? 'Erreur lors de la sauvegarde');
				return;
			}
			const saved: SavedScript = await res.json();
			toaster.success(`Script "${name}" sauvegarde`);
			await loadSavedScripts();
			selectedSource = `saved:${saved.id}`;
		} finally {
			saving = false;
		}
	}

	async function handleDelete() {
		if (!selectedSource.startsWith('saved:')) return;
		const id = selectedSource.slice(6);
		const found = savedScripts.find((s) => s.id === id);
		if (!found) return;

		const res = await fetch(`/api/construction-demo-scripts?id=${id}`, { method: 'DELETE' });
		if (!res.ok) {
			toaster.error('Erreur lors de la suppression');
			return;
		}
		toaster.success(`Script "${found.name}" supprime`);
		await loadSavedScripts();
		selectedSource = '';
		script = defaultScript;
		scriptName = '';
	}

	// ─── Init ───────────────────────────────────────────────────

	onMount(async () => {
		const mod = await import('$lib/constructions-v2/components/ScriptEditor.svelte');
		EditorComponent = mod.default;
		await loadSavedScripts();
	});
</script>

<svelte:head>
	<title>Demo Construction v2</title>
</svelte:head>

<div class="container mx-auto max-w-6xl p-4">
	<h1 class="mb-4 text-2xl font-bold">Demo Construction v2</h1>
	<p class="mb-3 text-sm text-muted-foreground">
		Editez le script a gauche, l'apercu se met a jour en temps reel. Cliquez "Jouer" pour lancer
		l'animation a droite.
	</p>

	<!-- Source selector + save controls -->
	<div class="mb-4 flex flex-wrap items-center gap-3">
		<MySelect
			type="single"
			value={selectedSource}
			items={sourceItems}
			onValueChange={handleSourceChange}
			placeholder="Choisir un script..."
		/>

		<input
			type="text"
			bind:value={scriptName}
			placeholder="Nom du script"
			class="h-9 rounded-md border bg-background px-3 text-sm"
		/>

		<Button size="sm" onclick={handleSave} disabled={!scriptName.trim() || saving}>
			{saving ? 'Sauvegarde...' : 'Sauvegarder'}
		</Button>

		{#if selectedSource.startsWith('saved:')}
			<Button size="sm" variant="destructive" onclick={handleDelete}>Supprimer</Button>
		{/if}
	</div>

	{#if EditorComponent}
		<EditorComponent bind:value={script} width={500} height={450} interactive />
	{:else}
		<div class="flex h-[450px] items-center justify-center rounded-md border">
			<p class="text-muted-foreground">Chargement de l'editeur...</p>
		</div>
	{/if}
</div>
