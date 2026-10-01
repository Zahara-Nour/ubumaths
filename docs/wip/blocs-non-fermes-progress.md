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
