<script lang="ts">
	/**
	 * La vue Données : les listes de l'atelier, saisies en colonnes.
	 *
	 * Une liste se tape sur une ligne, séparée par des **points-virgules**
	 * (décision §4 E2) : distinguer `1,2` de `1, 2` par une espace est intenable
	 * en classe. La virgule reste le séparateur décimal.
	 */
	import { useAtelier } from '$lib/atelier/context';
	import { isList } from '$lib/atelier/types';
	import { describeList } from '$lib/atelier/stats';

	const atelier = useAtelier();

	const lists = $derived(atelier.objects.filter(isList));

	/** Le nombre de valeurs écartées, quand il y en a (§4 E1). */
	function skippedNote(skipped: number): string {
		if (skipped === 0) return '';
		return skipped === 1 ? '1 valeur ignorée' : `${skipped} valeurs ignorées`;
	}

	/** Un aperçu chiffré, pour que la colonne dise quelque chose sans clic. */
	function summaryOf(values: readonly number[]): string {
		const stats = describeList(values);
		if (stats === null) return '';
		const fr = (n: number) => Number(n.toFixed(2)).toString().replace('.', ',');
		return `n = ${stats.count} · moyenne ${fr(stats.mean)}`;
	}

	function edit(name: string, definition: string) {
		atelier.update(name, definition);
	}
</script>

<div class="donnees">
	{#if lists.length === 0}
		<p class="vide">
			Aucune liste pour l’instant. Utilise « + Liste » dans « Mes objets », puis tape tes valeurs
			séparées par des points-virgules : <code>12 ; 15 ; 9</code>
		</p>
	{:else}
		<ul class="colonnes">
			{#each lists as list (list.name)}
				<li class="colonne" data-status={list.status}>
					<label for={`liste-${list.name}`}>{list.name}</label>
					<input
						id={`liste-${list.name}`}
						type="text"
						autocomplete="off"
						spellcheck="false"
						value={list.definition}
						oninput={(event) => edit(list.name, event.currentTarget.value)}
						placeholder="12 ; 15 ; 9"
					/>
					{#if list.message}
						<p class="probleme">{list.message}</p>
					{:else}
						<p class="apercu">
							{summaryOf(list.values)}
							{#if list.skipped > 0}
								<span class="ecarte">· {skippedNote(list.skipped)}</span>
							{/if}
						</p>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}

	<p class="aide">
		Sépare tes valeurs par des <strong>points-virgules</strong>. La virgule reste décimale :
		<code>3,14</code> est un seul nombre.
	</p>
</div>

<style>
	.donnees {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 0.75rem;
		height: 100%;
		min-height: 0;
	}

	.vide {
		margin: 0;
		color: var(--color-muted-foreground);
		font-size: 0.875rem;
		max-width: 44rem;
	}

	.colonnes {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		margin: 0;
		padding: 0;
		list-style: none;
		overflow-y: auto;
		min-height: 0;
	}

	.colonne {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		min-width: 14rem;
		flex: 1 1 16rem;
		padding: 0.5rem;
		border: 1px solid var(--color-border);
		border-radius: 0.375rem;
		background: var(--color-card);
	}
	/* Un objet qui ne peut rien produire se voit, sans crier : la raison est
	   écrite juste en dessous. */
	.colonne[data-status='error'] {
		border-color: var(--color-destructive);
	}

	label {
		font-weight: 600;
		font-size: 0.875rem;
	}

	input {
		padding: 0.375rem 0.5rem;
		border: 1px solid var(--color-border);
		border-radius: 0.25rem;
		background: var(--color-background);
		color: var(--color-foreground);
		min-width: 0;
	}

	.apercu,
	.probleme {
		margin: 0;
		font-size: 0.8125rem;
		min-height: 1.1rem;
	}
	.apercu {
		color: var(--color-muted-foreground);
	}
	.probleme {
		color: var(--color-destructive);
	}
	.ecarte {
		font-style: italic;
	}

	.aide {
		margin: 0;
		font-size: 0.8125rem;
		color: var(--color-muted-foreground);
	}

	code {
		font-family: var(--font-mono, monospace);
		background: var(--color-muted);
		padding: 0 0.25rem;
		border-radius: 0.1875rem;
	}
</style>
