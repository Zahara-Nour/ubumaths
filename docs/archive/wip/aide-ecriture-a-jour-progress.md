# Chantier `aide-ecriture-a-jour` — n° 25 d'outils-manquants

## Reprendre ici

_Mis à jour le 2026-11-09, après #2506._

- **État** : chantier clos, #2506 mergée, ligne 25 d'outils-manquants passée en « Livré », journal archivé · **Prochaine action** : aucune · **En attente de David** : rien · **Pièges en cours** : prettier mange un ``ranger collé dans un paragraphe de doc : écrire ` ``ranger ` · **Worktree / branche** : supprimés

## Vérifié dans le code (2026-11-09)

- `?`, `?flèche`, `?rien` : écrits par le prof (`variation-table-parser.ts`, tests `variation-table-hidden*.test.ts`).
- `??n` : **pas** écrit par le prof — jeton posé par `masked-statement.ts` dans l'énoncé d'une évaluation notée ; écrit à la main, la case n'a pas de réponse. La fiche le présente comme « ne pas écrire » (pas d'exemple).
- Un `?` refusé (sur ±∞…) donne un `code-block` sans message dans `parseMarkdown` : l'erreur typique « Infini caché » n'annonce pas de message.
- `G_1` : `probtree-label.ts` (lettre indicée en maths, mot en texte droit).
- `questions.md` : les lignes 1365-1370 de la ligne 25 avaient glissé (passage aux l. 1387-1389). Prod (lecture seule) : 46 modèles publiés à ` ```ranger `, 1 publié à `axe: à choisir` (CE2-082). Restent en case : `cp-a2/04`, `ce1-2/04` (outils-manquants, vérifié le 2026-11-09).
- `ubumark.md` (`solved`) : aucun appel de prod ne passe `solved` ; le corrigé imprimé d'une série d'automatismes dessine points / droites / boîtes par réécriture du bloc (`serie-automatismes.ts`) ; horloge et barres n'ont pas d'option `solved`.

## Fait

- `block-catalog/variation.ts` : groupe « cases à compléter », 2 exemples, 1 erreur typique.
- `block-catalog/probtree.ts` : intro, réglage, exemple « Événements indicés ».
- `block-catalog/collection.ts`, `monnaie.ts` (nouvelles), inscrites dans `index.ts` après l'horloge ; `CatalogNodeType` élargi.
- Doc : `questions.md`, `ubumark.md` (2 passages), `utilitaires-et-demos.md` (liste des fiches).
