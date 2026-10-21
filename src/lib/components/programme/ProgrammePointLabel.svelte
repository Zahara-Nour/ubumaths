<script lang="ts">
	/**
	 * Libellé d'un point du programme dans un écran où on le coche (cahier de
	 * texte, avancement, tags d'un exercice) : son nom, la sous-notion où il est
	 * posé, et « archivé » s'il l'est (il n'apparaît alors que déjà coché).
	 */
	import { Badge } from '$lib/components/ui/badge';
	import InlineMarkdown from '$lib/components/markdown/InlineMarkdown.svelte';
	import type { ProgrammePointView } from '$lib/utils/programme-tree';

	let { point }: { point: ProgrammePointView } = $props();
</script>

<InlineMarkdown content={point.name} />
{#if point.subnotionName}
	<Badge variant="secondary" class="ml-1 align-middle text-[10px]">{point.subnotionName}</Badge>
{/if}
{#if point.archived_at}
	<Badge variant="outline" class="ml-1 align-middle text-[10px]">archivé</Badge>
{/if}
