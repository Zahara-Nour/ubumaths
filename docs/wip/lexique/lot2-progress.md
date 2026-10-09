# Lot 2 — mots cliquables : progression

Spécification validée par David le 2026-10-09 (« je valide ») : [lot2-mots-cliquables-spec.md](lot2-mots-cliquables-spec.md),
avec ses deux choix de contenu : retirer le synonyme « premier » de « nombre premier », mettre
« expression » dans la liste fermée. Branche `feat/lexique-mots-cliquables`, worktree
`../ubumaths-wt-mots-cliquables`.

## Choix technique

Une **passe pure sur l'AST** (`src/lib/lexicon/`) découpe les nœuds texte et marque les mots repérés
(`TextNode.term = { ids }`) ; l'AST en cache n'est jamais modifié (copie). Découper un nœud texte
ne change pas la gestion des espaces autour des formules (`adjustTextForMath` ne touche que le
premier et le dernier caractère, qui restent voisins des mêmes nœuds). Le rendu (`TextNode.svelte`)
affiche un bouton + popover quand `term` est présent ; les autres lecteurs de l'AST (Typst, tableaux)
ignorent le champ et rendent le texte.

## Étapes

1. ✅ Marquage à la main dans ubumark : `[mot]{.def}`, `{.def=…}`, `{.nodef}` → `TextNode.lexicon` ;
   la correction concise/détaillée ne les prend pas pour des détails (pas de message d'erreur).
2. ✅ Passe de repérage `src/lib/lexicon/` (comportements 2 à 8, 10, 12, 15 à 18) + données
   (« premier », « expression »).
3. ✅ Rendu : contexte « lexique », popover, `MarkdownRenderer` et `FillBlanksInput`.
4. ✅ Branchements : `QuestionCard` (pas en évaluation notée), `FlashCard`, `CorrectionCard` ; niveau de
   l'élève posé par le layout racine ; glossaire `?q=`.
5. ⏳ Vérifications, revue, PR.

## Notes d'implémentation

- **Pas de découpage des nœuds texte** : la première version découpait chaque nœud ; à l'arrivée du
  dictionnaire, les positions des nœuds changeaient et Svelte recréait les champs de réponse
  (3 tests FlashCard / aperçu en échec : saisie impossible juste après l'affichage). Les mots repérés
  sont désormais des positions (`TextNode.terms`) ; test « le champ de réponse reste le même ».
- **Dictionnaire chargé à la demande** (`runtime-store.svelte.ts`) : 228 Ko de source, à ne pas mettre
  dans `MarkdownRenderer`, chargé par presque toutes les pages. Le texte s'affiche d'abord sans
  soulignement.
- Mesure : index d'un niveau ≈ 19 ms (une fois), repérage d'un énoncé ≈ 0,03 ms.
