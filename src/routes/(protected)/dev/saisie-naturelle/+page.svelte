<!--
	Prototype JETABLE : la saisie naturelle de Calcul (sans point)
	==============================================================

	Pour que David juge la FRAPPE, au clavier et au téléphone, avant la phase 0
	(`docs/archive/wip/atelier-saisie-naturelle.md`, décision 11). Le même champ sert
	l'atelier depuis le 2026-10-14 (réglage « Écriture mathématique ») ; cette
	page garde le panneau « sous le capot » : un `CalcDesk` sur un `Atelier`
	local reçoit le texte que produit le champ, par le chemin de Calcul.
-->
<script lang="ts">
	import '$lib/utils/mathlive-styles';
	import { convertLatexToMarkup } from 'mathlive';
	import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
	import { Atelier } from '$lib/atelier/atelier.svelte';
	import { CalcDesk, type Entry } from '$lib/atelier/desk.svelte';
	import { commandCatalog } from '$lib/atelier/commands';
	import NaturalField from '$lib/components/atelier/NaturalField.svelte';
	import {
		calcTextOf,
		commandWords,
		lineKindOf,
		REMOVED_SHORTCUTS,
		type LineKind
	} from '$lib/atelier/natural-input';

	// Types
	interface Row {
		readonly id: number;
		/** Le LaTeX du champ, tel que validé */
		readonly typed: string;
		/** Le texte envoyé à Calcul, ou `null` s'il n'est pas parti */
		readonly sent: string | null;
		readonly entry?: Entry;
		readonly refusal?: string;
	}

	// Constantes
	const EXAMPLES: readonly string[] = (
		'1/4 + 1/3 · résoudre x^2−4=0 · résous x^2=4 dans [0;+oo[ · dériver x^3 · ' +
		'intégrer x^2 de 0 à 1 · limite 1/x en +oo · f(x) = x^2 sur [0;+oo[ · variations f · ' +
		'5 km + 300 m · 2 h 30 min · 5 km/h * 2 h · ade + 2de'
	).split(' · ');
	const LINE_KINDS: Readonly<Record<LineKind, string>> = {
		command: 'une commande',
		'function-definition': 'une définition de fonction',
		'value-definition': 'une définition de valeur',
		calculation: 'un calcul'
	};

	// Variables
	const engine = new WebReplEngine();
	const desk = new CalcDesk(new Atelier(), engine);
	const words = commandWords(commandCatalog(engine));

	let latex = $state('');
	let rows = $state<Row[]>([]);
	let nextId = 0;

	/** Les saisies validées, de la plus ancienne à la plus récente (↑ / ↓) */
	const history = $derived(rows.map((row) => row.typed).reverse());
	const underTheHood = $derived.by((): [string, string][] => {
		const preview = calcTextOf(latex, words);
		const last = rows[0];
		return [
			['LaTeX du champ', latex || '(vide)'],
			['Ligne lue comme', LINE_KINDS[lineKindOf(latex, words)]],
			['Texte qui partirait vers Calcul', preview.ok ? preview.text || '(vide)' : preview.message],
			[
				'Dernier envoi → réponse',
				last
					? `${last.sent ?? '(rien)'} → ${last.entry?.latex ?? last.entry?.text ?? last.refusal}`
					: '—'
			],
			['Raccourcis de MathLive retirés', `${REMOVED_SHORTCUTS.join(' ')} (restreints : exp ch sec)`]
		];
	});

	// Fonctions
	function handleSubmit(typed: string) {
		const converted = calcTextOf(typed, words);
		if (!converted.ok) {
			rows = [{ id: nextId++, typed, sent: null, refusal: converted.message }, ...rows];
			return;
		}
		const count = desk.entries.length;
		desk.submit(converted.text);
		const entry = desk.entries.length > count ? desk.entries.at(-1) : undefined;
		const refusal = entry === undefined ? (desk.notice ?? 'Aucune ligne produite.') : undefined;
		rows = [{ id: nextId++, typed, sent: converted.text, entry, refusal }, ...rows];
	}

	function markup(source: string): string | null {
		try {
			return convertLatexToMarkup(source, { defaultMode: 'inline-math' });
		} catch {
			return null;
		}
	}
</script>

<svelte:head>
	<title>Saisie naturelle</title>
	<meta name="robots" content="noindex" />
</svelte:head>

{#snippet math(source: string, fallback: string)}
	{@const html = source === '' ? null : markup(source)}
	{#if html}
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		{@html html}
	{:else}
		{fallback}
	{/if}
{/snippet}

<div class="mx-auto max-w-3xl space-y-5 px-4 py-6">
	<header class="space-y-2">
		<h1 class="text-2xl font-bold">Saisie naturelle dans Calcul — prototype</h1>
		<div class="text-muted-foreground">
			Prototype jetable : tape comme tu écrirais, sans point. Le premier mot décide (« résoudre », «
			dérive »…) ; un mot devient du texte quand il est fini (espace, opérateur, ou choix dans la
			liste) ; une unité se lit après « nombre, espace ».
		</div>
	</header>

	<NaturalField {words} history={() => history} bind:latex onsubmit={handleSubmit} focusOnMount />
	<div class="text-sm text-muted-foreground">
		Entrée : valider · ↑ ↓ : saisies précédentes (ou la liste) · Tab : case suivante · Échap :
		fermer la liste · clavier virtuel : bouton du champ, onglets « Calcul » et « Commandes ».
	</div>

	<details class="rounded-lg border border-border p-3">
		<summary class="cursor-pointer font-medium">Sous le capot</summary>
		<dl class="mt-2 space-y-2 text-sm">
			{#each underTheHood as [term, value] (term)}
				<div>
					<dt class="font-semibold">{term}</dt>
					<dd><code class="break-all">{value}</code></dd>
				</div>
			{/each}
		</dl>
	</details>

	{#if rows.length > 0}
		<ol class="space-y-2" aria-label="Historique">
			{#each rows as row (row.id)}
				{@const failed = row.refusal !== undefined || row.entry?.failed === true}
				<li class="rounded-lg border border-border p-3">
					<div class="text-lg">{@render math(row.typed, row.typed)}</div>
					<div class="text-xs text-muted-foreground">
						envoyé : <code class="break-all">{row.sent ?? '—'}</code>
					</div>
					<div class="mt-1 text-lg {failed ? 'text-destructive' : 'text-foreground'}">
						{@render math(
							failed ? '' : (row.entry?.latex ?? ''),
							row.entry?.text ?? row.refusal ?? ''
						)}
					</div>
					{#if row.entry?.note}
						<div class="text-sm text-muted-foreground">{row.entry.note}</div>
					{/if}
				</li>
			{/each}
		</ol>
	{/if}

	<section class="space-y-2">
		<h2 class="text-lg font-semibold">À essayer (en tapant, pas en collant)</h2>
		<ul class="flex flex-wrap gap-2">
			{#each EXAMPLES as example (example)}
				<li class="rounded border border-border px-2 py-1 font-mono text-sm">{example}</li>
			{/each}
		</ul>
	</section>
</div>
