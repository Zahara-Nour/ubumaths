# Taille du texte des PDF de fiche — journal de chantier

## Reprendre ici

_Mis à jour le 2026-10-19, après #1462 et le déploiement v0.38.0._

- **État** : livré et en prod (v0.38.0) — #1456 à #1462.
- **Prochaine action** : aucune. Reste à verser ce journal dans `docs/systeme/fiches-et-pdf.md`, puis à l'archiver.
- **En attente de David** : le prof règle la taille d'un élève seulement dans l'aperçu du devoir, est-ce le bon endroit ? Les paliers 14 / 18 pt ne sont pas confirmés.
- **Pièges en cours** : en local, les images des fiches répondent 400, car le seed réécrit leurs adresses.
- **Worktree / branche** : aucun (tout est supprimé).

Demande de David (2026-10-16) : pouvoir agrandir le texte des PDF de fiche, surtout pour les
élèves qui ont des problèmes de vue.

## Décisions (David, 2026-10-16)

- Réglage **par élève** (enregistré), + choix **ponctuel pour le prof** sur le PDF générique
  (aperçu / impression, rien d'enregistré).
- **L'élève peut changer lui-même** sa taille.
- Accès : l'élève (le sien) et le prof/admin (tout élève) lisent et modifient ; personne
  d'autre (ni ami, ni même école, ni anon).
- Paliers (pas de réponse explicite, à confirmer) : Normale 10 pt / Grande 14 pt / Très grande 18 pt.
- **Colonnes : celles du style, à toutes les tailles** (David, 2026-10-16 : il n'a jamais voulu de
  passage à une colonne).

## Choix technique

- Table dédiée `student_print_settings` (pas une colonne de `profiles` : un ami lit la ligne
  `profiles` entière).
- Deux PR (`db:types` génère depuis la prod) : 1. migration + tests d'intégration ; 2. code.

## Avancement

- [x] PR 1 #1456 : migration `20261016104200_taille_texte_fiches_eleve` + tests d'intégration (12)
- [x] security-auditor (rien de bloquant), preuve rouge, `db:migrate` (prod, 2026-10-16), `db:types`
- [x] PR 2 #1457 : `text-size.ts` (gabarit × 1,4 / × 1,8), PDF élève
      (menu enregistré), copies nominatives, aperçu `preview/` (enregistre pour l'élève
      prévisualisé), `PdfPreview` (ponctuel), API `print-settings`.
- Réglage prof par élève : **dans l'aperçu d'affectation** (« Prévisualiser comme »), pas sur
  une page élève (il n'en existe pas ; le journal ne montre que les récompenses). À confirmer
  avec David.
- ⚠️ #1457 passait la page sur une colonne au-delà de Normale : recommandation appliquée sans
  réponse de David, qui ne l'a **pas** voulu (2026-10-16). Retiré : les colonnes du style restent.
- Vérifié à l'œil : PDF compilés par le compilateur de prod, 3 tailles × portrait / paysage.
