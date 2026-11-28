# Chantier « gras-cellule-tableau » — markdown en ligne dans une cellule de tableau sans trou

## Reprendre ici

_Mis à jour le 2026-11-19, après #2914 : chantier clos._

- **État** : #2914 mergée (gras / italique / code dans une cellule sans trou). Revues : code-reviewer
  (`a*b*c` corrigé), security-auditor (rien de bloquant).
- **Prochaine action** : aucune. Vérification manuelle notée (`verifications-manuelles.md`), à faire
  après `deploy:prod`.
- **En attente de David** : rien.
- **Worktree / branche** : supprimés.

## 1. Phase 0 (validée par David le 2026-11-19, « oui »)

Origine : chantier `questions-cm2` § 23.2. `TableNode.svelte` (`cellContent`) ne rend dans une cellule que texte et
formules : `**Brumeval**` s'affiche avec ses astérisques (CM2 lot 14b « Problèmes avec un tableau ou des barres » V2,
en prod). Une cellule AVEC trou passe par `tableCellInlineNodes` (`fill-blanks-utils.ts`), qui lit le gras.

Comportements :

- **Nominal** : une cellule sans trou rend le même markdown en ligne qu'un paragraphe (gras, italique, formules) :
  `| **Brumeval** | 12 |` → « Brumeval » en gras, sans astérisques.
- **Limite** : une cellule de texte ou de nombres seuls reste identique ; les formules `$…$` restent rendues comme
  aujourd'hui.
- **Chat élève (rendu restreint)** : une cellule n'affiche rien de plus qu'un paragraphe du chat (ni lien, ni image hors
  stockage, formules sans commande de style) ; un test le prouve.
- **Hors périmètre** : PDF (Typst) et tableaux à trous inchangés.
- **Livraison** : une PR ; revue `code-reviewer` + `security-auditor` (chat des mineurs).

## 2. Implémentation (2026-11-19)

- Choix étroit : rendu « paragraphe » seulement pour une cellule = UN paragraphe de texte et de
  formules, avec au moins une marque ; sinon rendu d'avant. Donc ni lien, ni trou, ni mention, ni
  `MathPrompt` dans une cellule, chat compris ; formules filtrées par `MathInline` (contexte restreint).
- Sondé : le parseur de paragraphe lit `3 * 4 * 5` → « 4 » italique, `x_1 et y_2` → italique,
  `snake_case_name` → italique. Gardes ajoutées (cf. doc `ubumark.md` § cellule de tableau).
- Cellules ordinaires d'un tableau à trous : même `cellContent`, donc gras aussi.
