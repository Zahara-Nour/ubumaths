# Taille du texte des PDF de fiche — journal de chantier

Demande de David (2026-10-16) : pouvoir agrandir le texte des PDF de fiche, surtout pour les
élèves qui ont des problèmes de vue.

## Décisions (David, 2026-10-16)

- Réglage **par élève** (enregistré), + choix **ponctuel pour le prof** sur le PDF générique
  (aperçu / impression, rien d'enregistré).
- **L'élève peut changer lui-même** sa taille.
- Accès : l'élève (le sien) et le prof/admin (tout élève) lisent et modifient ; personne
  d'autre (ni ami, ni même école, ni anon).
- Pas de réponse explicite sur les paliers ni les colonnes → recommandations retenues, à
  corriger si David le dit : 3 paliers Normale 10 pt / Grande 14 pt / Très grande 18 pt ; une
  seule colonne au-delà de Normale.

## Choix technique

- Table dédiée `student_print_settings` (pas une colonne de `profiles` : un ami lit la ligne
  `profiles` entière).
- Deux PR (`db:types` génère depuis la prod) : 1. migration + tests d'intégration ; 2. code.

## Avancement

- [ ] PR 1 : migration `20261016104200_taille_texte_fiches_eleve` + `tests/integration/taille-texte-fiches-eleve.test.ts`
- [ ] security-auditor, preuve rouge sans migration, `db:migrate`, `db:types`
- [ ] PR 2 : gabarits (taille + colonnes), PDF élève, ZIP, impression prof par élève, menu prof, réglage élève + prof
