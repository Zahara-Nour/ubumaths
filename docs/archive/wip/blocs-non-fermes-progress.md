# Blocs non fermés (Q25 du chantier outils statistiques)

Branche `fix/blocs-non-fermes`, worktree `../ubumaths-wt-blocs-non-fermes`. Décision Q47 (2026-10-02).

- Un `plus loin ne ferme un bloc`courbe / ```figure / statistique que si tout ce qui les sépare
a la forme d'une ligne du bloc (courbe, statistiques) ou ne contient pas de markdown (figure :
`##`titre, item de liste,`$$`, paragraphe de texte sans `=`/`(`/`:`; un seul`#` reste un
  commentaire du langage des figures).
- Dans un item de liste, un bloc non fermé devient un nœud en erreur « bloc non fermé »
  (`textWithUnclosedBlocks`, `markdown-parser.ts`), plus de texte brut ni de ``` dans le PDF.
- Empreinte : 51 blocs dans les 84 fichiers suivis du dépôt → 0 changement de fermeture ; témoin
  (le cas visé) bien détecté. Production NON mesurée : MCP Supabase non autorisé dans la session.
- Limite connue (préexistante sur `main`) : dans un item de liste, un bloc spécial suivi plus
  loin d'un ``` est encore lu par l'ancienne regex des blocs de code.

## Suite : la même règle dans les items de liste (Q52)

Branche `fix/blocs-non-fermes-listes`. `swallowsForeignBlock` (`markdown-parser.ts`) rejoue la
règle du premier niveau sur le bloc trouvé par la regex des blocs de code : un bloc non fermé
n'avale plus le ```python qui le suit, sa ligne d'ouverture reste au texte (`textWithUnclosedBlocks`).

- Empreinte : 632 .md suivis du dépôt, AST avant/après identiques ; témoin (le cas visé) changé.
- ⚠️ Trouvé en mesurant, PRÉEXISTANT sur main : `parseMarkdown` ne termine pas sur 7 .md du dépôt
  (docs d'architecture : arborescences + listes avec blocs de code). Écartés de l'empreinte,
  diagnostic à part.
- Revue : 0 bug ; témoins ajoutés (ligne fautive → fermé ; phrase après une ligne vide → non fermé).
