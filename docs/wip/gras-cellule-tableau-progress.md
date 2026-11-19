# Chantier « gras-cellule-tableau » — markdown en ligne dans une cellule de tableau sans trou

## Reprendre ici

_Mis à jour le 2026-11-19, phase 0 validée par David, rien de codé._

- **État** : phase 0 validée (§ 1). Aucun code. Ligne 46 de `docs/wip/outils-manquants.md`.
- **Prochaine action** : tests d'abord (rouges) — `TableNode` sans trou : `**Brumeval**` rendu en gras ; chat restreint :
  une cellule n'affiche rien de plus qu'un paragraphe du chat ; puis implémentation, PR, revue `code-reviewer` +
  `security-auditor`.
- **En attente de David** : rien.
- **Pièges en cours** : le rendu RESTREINT du chat (`MarkdownRenderer.svelte`, prop `restricted`, décision S1 du
  2026-10-03) doit s'appliquer aux cellules ; ne jamais élargir le rendu du chat.
- **Worktree / branche** : `../ubumaths-wt-gras-cellule-tableau`, branche `fix/gras-cellule-tableau`.

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
