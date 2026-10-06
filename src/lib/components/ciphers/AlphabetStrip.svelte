<!--
	Correspondance lettre claire → lettre chiffrée, sur deux lignes alignées.
	C'est toute la clé d'un chiffre de substitution, César et Atbash compris.
-->
<script lang="ts">
	import { ALPHABET } from '$lib/ciphers/alphabet';

	// Props
	let { key }: { key: string } = $props();
</script>

<div class="overflow-x-auto" data-testid="alphabet-strip">
	<table class="mx-auto border-collapse font-mono text-sm">
		<tbody>
			<tr>
				<th scope="row" class="pr-2 text-left text-xs font-normal text-muted-foreground">clair</th>
				{#each ALPHABET as letter (letter)}
					<td class="w-6 text-center">{letter}</td>
				{/each}
			</tr>
			<tr>
				<th scope="row" class="pr-2 text-left text-xs font-normal text-muted-foreground">chiffré</th
				>
				{#each key as letter, i (i)}
					<td class="w-6 text-center font-bold text-primary">{letter}</td>
				{/each}
			</tr>
		</tbody>
	</table>
</div>
