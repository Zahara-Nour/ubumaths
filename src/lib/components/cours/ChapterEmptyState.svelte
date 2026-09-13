<!--
	ChapterEmptyState
	=================

	Ce qu'un élève lit quand un onglet de chapitre ne lui montre rien.

	Depuis la publication au fur et à mesure, un onglet vide est le cas NORMAL :
	le professeur prépare le chapitre entier, puis en libère les parties au
	rythme du cours. Les anciens messages — « Aucun document pour ce chapitre » —
	se lisaient comme un défaut : le chapitre paraissait cassé, ou abandonné.

	Deux règles tiennent ces textes :

	1. **dire une attente, pas un manque.** « Pas encore » plutôt que « aucun » ;
	2. **ne jamais compter ce qui n'est pas publié.** La RLS le cache à l'élève,
	   et le texte ne doit pas le trahir : un « 12 questions à venir » apprendrait
	   qu'un contrôle se prépare.

	@module components/cours/ChapterEmptyState
-->
<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import {
		FileText,
		HelpCircle,
		BookOpen,
		ClipboardList,
		ListChecks,
		BookMarked
	} from '@lucide/svelte';

	type EmptyKind = 'documents' | 'quiz' | 'exercises' | 'worksheets' | 'checklist' | 'chapter';

	interface Props {
		kind: EmptyKind;
	}

	let { kind }: Props = $props();

	const icons = {
		documents: FileText,
		quiz: HelpCircle,
		exercises: BookOpen,
		worksheets: ClipboardList,
		checklist: ListChecks,
		chapter: BookMarked
	};

	const messages: Record<EmptyKind, string> = {
		documents: "Ton professeur n'a pas encore mis de document à disposition ici.",
		quiz: "Le quiz de ce chapitre n'est pas encore ouvert.",
		// Pas d'accord de genre : `lore.learning.exercise` est configurable (il
		// vaut « Corvée » aujourd'hui), et une tournure qui l'accorde casserait au
		// premier changement de vocabulaire.
		exercises: "Rien n'est encore proposé ici — ça viendra au fil du chapitre.",
		worksheets: "Aucune fiche ne t'a encore été donnée pour ce chapitre.",
		checklist: 'Les objectifs de ce chapitre ne sont pas encore publiés.',
		chapter: 'Ton professeur prépare ce chapitre. Reviens après le prochain cours.'
	};

	const Icone = $derived(icons[kind]);
</script>

<Card.Root class="border-dashed">
	<Card.Content class="py-12 text-center">
		<Icone class="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
		<p class="text-muted-foreground">{messages[kind]}</p>
	</Card.Content>
</Card.Root>
