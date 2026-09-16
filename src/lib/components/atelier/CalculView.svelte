<script lang="ts">
	/**
	 * La vue Calcul de l'atelier.
	 *
	 * Un seul champ : l'élève y écrit des définitions, des calculs ou des
	 * commandes, et chaque ligne d'historique peut être **gardée** sous un nom
	 * (décision D5). Les objets du panneau sont connus du moteur sans que rien
	 * ne soit redéclaré (Q1, option B).
	 *
	 * Spécification : `docs/wip/atelier-vue-calcul-phase0.md`.
	 */
	import { convertLatexToMarkup } from 'mathlive';
	import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
	import { useAtelier } from '$lib/atelier/context';
	import { runInput, promote, type CalcResult, type CalcSession } from '$lib/atelier/calcul';
	import { commandCatalog, type AtelierCommand } from '$lib/atelier/commands';
	import { Button } from '$lib/components/ui/button';

	/** Une ligne d'historique, avec de quoi la garder. */
	interface Entry {
		readonly id: number;
		readonly input: string;
		readonly result: CalcResult;
	}

	const atelier = useAtelier();
	const engine = new WebReplEngine();
	const session: CalcSession = { atelier, engine };

	let draft = $state('');
	let entries = $state<Entry[]>([]);
	let nextId = 0;
	let notice = $state<string | null>(null);
	let field = $state<HTMLInputElement | null>(null);

	/** Les commandes à proposer, filtrées par ce qui est déjà tapé (§5 N1, N2). */
	const suggestions = $derived.by(() => {
		if (!draft.startsWith('.')) return [] as AtelierCommand[];
		const typed = draft.slice(1).split(' ')[0].toLowerCase();
		// Un espace signifie que la commande est choisie : on ne propose plus rien.
		if (draft.slice(1).includes(' ')) return [] as AtelierCommand[];
		return commandCatalog(engine)
			.filter((c) => c.french.toLowerCase().startsWith(typed) || c.name.startsWith(typed))
			.slice(0, 8);
	});

	/**
	 * Le rendu mathématique d'une ligne, ou `null` s'il n'y en a pas de sûr.
	 *
	 * ⚠️ `convertLatexToMarkup` reçoit du LaTeX produit par nous (`render.ts`),
	 * jamais une saisie brute — et le repli est le TEXTE, échappé par Svelte.
	 * Si la conversion échoue, on n'affiche pas du markup à moitié construit.
	 */
	function markupOf(result: CalcResult): string | null {
		if (result.kind !== 'calcul' && result.kind !== 'commande') return null;
		if (result.latex === undefined) return null;
		try {
			return convertLatexToMarkup(result.latex, { defaultMode: 'inline-math' });
		} catch {
			return null;
		}
	}

	/** Ce que la ligne affiche en toutes lettres. */
	function textOf(result: CalcResult): string {
		switch (result.kind) {
			case 'calcul':
			case 'commande':
				return result.output;
			case 'refus':
				return result.message;
			case 'definition':
				return `« ${result.name} » est dans tes objets.`;
			default:
				return '';
		}
	}

	function submit(event: SubmitEvent) {
		event.preventDefault();
		const text = draft;
		const result = runInput(session, text, 'keyboard');
		if (result.kind === 'vide') return;

		entries = [...entries, { id: nextId++, input: text, result }];
		draft = '';
		notice = null;
	}

	function keep(entry: Entry) {
		const kept = promote(session, entry.result);
		notice = kept.ok ? `Gardé sous le nom « ${kept.object.name} ».` : kept.message;
	}

	/** Compléter la commande en cours, sans effacer ce qui suit. */
	function complete(command: AtelierCommand) {
		draft = `.${command.french} `;
		// Rendre la main au champ : l'élève vient de choisir dans une liste, il
		// veut taper la suite, pas recliquer.
		field?.focus();
	}

	/** Une ligne est gardable si elle a produit quelque chose à garder (§4 L2). */
	function canKeep(result: CalcResult): boolean {
		return (result.kind === 'calcul' || result.kind === 'commande') && result.output.trim() !== '';
	}
</script>

<div class="calcul">
	<ol class="historique">
		{#each entries as entry (entry.id)}
			{@const markup = markupOf(entry.result)}
			<li class:refus={entry.result.kind === 'refus'}>
				<p class="saisie">{entry.input}</p>
				<div class="reponse">
					{#if markup !== null}
						<!-- eslint-disable-next-line svelte/no-at-html-tags -->
						<span class="math">{@html markup}</span>
					{:else}
						<span class="texte">{textOf(entry.result)}</span>
					{/if}
					{#if canKeep(entry.result)}
						<Button variant="ghost" size="sm" class="garder" onclick={() => keep(entry)}>
							Garder…
						</Button>
					{/if}
				</div>
			</li>
		{/each}
	</ol>

	<!--
		`aria-live` : ce que « Garder » a produit doit être ANNONCÉ, pas seulement
		affiché — sinon un lecteur d'écran ne voit jamais apparaître le message.
	-->
	<p class="retour" aria-live="polite" class:vide={notice === null}>{notice ?? ''}</p>

	{#if suggestions.length > 0}
		<ul class="commandes" aria-label="Commandes disponibles">
			{#each suggestions as command (command.name)}
				<li>
					<button
						type="button"
						onclick={() => complete(command)}
						disabled={command.unavailable !== undefined}
						title={command.unavailable ?? command.example ?? ''}
					>
						<span class="nom">.{command.french}</span>
						<span class="quoi">{command.unavailable ?? command.description}</span>
					</button>
				</li>
			{/each}
		</ul>
	{/if}

	<form onsubmit={submit}>
		<input
			bind:this={field}
			bind:value={draft}
			type="text"
			autocomplete="off"
			spellcheck="false"
			aria-label="Calcul, définition ou commande"
			placeholder="f(x) = x^2 − 3x + 1, ou 12 km + 300 m, ou un point pour les commandes"
		/>
		<Button type="submit" disabled={draft.trim() === ''}>Calculer</Button>
	</form>
</div>

<style>
	.calcul {
		display: flex;
		flex-direction: column;
		height: 100%;
		min-height: 0;
		gap: 0.5rem;
		padding: 0.75rem;
	}

	.historique {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.historique li {
		border-bottom: 1px solid var(--color-border);
		padding-bottom: 0.5rem;
	}
	.historique li.refus .texte {
		color: var(--color-destructive);
	}

	.saisie {
		margin: 0;
		font-size: 0.8125rem;
		color: var(--color-muted-foreground);
	}

	.reponse {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}
	/* Un résultat long défile dans son cadre plutôt que de pousser le panneau
	   d'objets hors de l'écran (§3 N5). */
	.math,
	.texte {
		font-size: 1.05rem;
		min-width: 0;
		overflow-x: auto;
	}
	.texte {
		white-space: pre-wrap;
	}

	/* ⚠️ Pas « .avis » : `AtelierContainer` a déjà une région de ce nom, et deux
	   régions aria-live homonymes dans le même écran se confondent — y compris
	   pour un test qui croit interroger l'une et lit l'autre. */
	.retour {
		margin: 0;
		min-height: 1.25rem;
		font-size: 0.8125rem;
		color: var(--color-muted-foreground);
	}
	.retour.vide {
		visibility: hidden;
	}

	.commandes {
		max-height: 12rem;
		overflow-y: auto;
		margin: 0;
		padding: 0.25rem;
		list-style: none;
		border: 1px solid var(--color-border);
		border-radius: 0.375rem;
		background: var(--color-card);
	}
	.commandes button {
		display: flex;
		gap: 0.5rem;
		width: 100%;
		padding: 0.25rem 0.375rem;
		text-align: left;
		border-radius: 0.25rem;
	}
	.commandes button:hover:not(:disabled) {
		background: var(--color-muted);
	}
	.commandes button:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}
	.nom {
		font-family: var(--font-mono, monospace);
		white-space: nowrap;
	}
	.quoi {
		color: var(--color-muted-foreground);
		font-size: 0.8125rem;
	}

	form {
		display: flex;
		gap: 0.5rem;
	}
	form input {
		flex: 1;
		min-width: 0;
		padding: 0.5rem 0.625rem;
		border: 1px solid var(--color-border);
		border-radius: 0.375rem;
		background: var(--color-background);
		color: var(--color-foreground);
	}
</style>
