# Chantier `idees-tle-geometrie-espace`

## Reprendre ici

_Mis à jour le 2026-11-26, lot écrit et joué en base locale (pas encore de PR)._

- **État** : gros lot vert (specs, tirages, sonde des solides) et joué en base locale (aperçu admin, `pnpm voir`, iPhone) : N1-N3 dans `scripts/questions/idees-tle-geometrie-espace-neufs/`, 11 variations (V1-V9) à la fin des 9 publiés ; migration de contenu `20261126092502_…_publies_contenu.sql` + fixture ; Q1 noté (lignes 64, 65 d'`outils-manquants.md`).
- **Prochaine action** : après le `--publier` de David, commiter les ids des 3 neufs, `migration-rangement.ts --dir …-neufs`, tests d'intégration `migrations-rangement-tags` et `migrations-contenu-publie`, `garde-niveaux-tags`, `security-auditor`, PR.
- **En attente de David** : `pnpm tsx scripts/create-questions.ts --dir scripts/questions/idees-tle-geometrie-espace-neufs --publier` depuis le worktree (3 brouillons en prod).
- **Pièges en cours** : `shared.blankDefaults` de 2b240d8c (`vecteur` + `colineaire`) : le schéma refuse de surcharger `answerKind`, la case choix de V5 n'en est pas gênée. aaa16821 sans `cleanCoefficients` : équation par `equation_propre()`. Message d'erreur prévue sous sa forme réécrite (`$x = x_A + a t$`, `$\left( AB \right)$`). Fichier publié modifié → relancer `migration-contenu.ts` (retirer l'ancienne). Base locale : 3 neufs et 9 copies « [essai local] » laissés en brouillon.
- **Worktree / branche** : `../ubumaths-wt-idees-tle-geometrie-espace`, `chore/idees-tle-geometrie-espace`.

---

## Contexte

Skill `idees-rubrique`. Rubrique « Géométrie dans l'espace » de Terminale spécialité, reprise d'une
autre plateforme (`TSG2-10` à `TSG2-50`, 26 exercices sans les anciennes versions).

## Existant en prod (relevé du 2026-11-26)

- 61 modèles publiés de Terminale spécialité sur l'espace (149 variations).
- Points des trois rubriques du BO (« Manipulation des vecteurs, des droites et des plans de
  l'espace », « Orthogonalité et distances dans l'espace », « Représentations paramétriques et
  équations cartésiennes ») : presque tous les savoir-faire ont un modèle. Les points sans modèle
  sont des « connaissances » : TSPE-326 (vecteurs de l'espace), 327 (combinaisons linéaires),
  328 (droites, vecteurs directeurs), 330 (plans, direction), 342 (produit scalaire), 348
  (orthogonalité de deux droites), 349 (vecteur normal), 560 (plan passant par A normal à n),
  350 (projeté sur une droite), 561 (projeté sur un plan), 363 (représentation paramétrique).

## Phase 0 (2026-11-26)

- Page à cocher publiée, 14 fiches : N1 (écrire une représentation paramétrique, TSPE-365), N2 (position
  de deux droites en repère, TSPE-567), N3 (coordonnées d'un point dans un repère du cube, TSPE-332),
  V1-V9 (11 variations de d192da3e, d6938108, ac94a453, 33be404b, 2b240d8c, eae25eba, 4f056eb3,
  aaa16821, 31b49cdf), R (ce qui n'est pas repris), Q1 (deux outils à noter).
- David : « je valide » (2026-11-26) → toutes les fiches oui, Q1 oui.

## Lot écrit (2026-11-26)

- Scripts : `docs/wip/questions/idees-tle-geometrie-espace-neufs.py` (N1-N3) et
  `idees-tle-geometrie-espace-publies.py` (V1-V9, ajoutées à la fin de l'export de prod du
  2026-11-26, commité à part). `create-questions` en simulation : 3 à créer, 9 « contenu
  différent » ; `question:specs` vert sur les 12 fichiers ; `sonde-cubes` : 300 blocs, 0 problème.
- Niveaux : N1 3, N2 3, N3 2 (relevé des sous-notions en prod le 2026-11-26).
- **Écarts de détail aux fiches** (mécaniques, sans changer le fond validé) :
  - N3 rangé sur « Géométrie > Espace > coordonnées » et non sur le nœud de 63669e60 : 63669e60
    est sur « coplanarité et décomposition » (TSPE-338), et le point validé TSPE-332 est sur
    « coordonnées » (règle du tag : point sur le nœud ou sa notion).
  - N1 v1 : l'erreur « B − A pris pour A − B » donnerait $\overrightarrow{BA}$, qui dirige aussi
    la droite : remplacée par « coordonnées de B prises pour le vecteur ».
  - N3 : dans les repères (B ; BC, BA, BF), (H ; HE, HG, HD), (E ; EA, EF, EH), les coordonnées
    des sommets valent toutes 0 ou 1 : pas d'erreur « 1 au lieu de −1 » (remplacée par « lu dans
    le repère de A » et « ordre des coordonnées »).
  - Cases choix (N2 v0 et v2, V3, V4, V5 v3) : le générateur refuse une erreur prévue dans une
    case choix ; les erreurs typiques sont dans les specs.
  - V3, V4, V5 v3 : les noms des points (ou vecteurs) proposés tournent (variable `pm`), sinon le
    même nom serait toujours juste.
  - V5 v2 : erreurs prévues « u donné », « v donné », « orthogonal à u seulement ».
- Migration de contenu générée : `supabase/migrations/20261126092502_questions_idees_tle_geometrie_espace_publies_contenu.sql`
  (9 modèles, +11 variations, 0 corrigée, options inchangées ; remplace celle de 09:03, jamais jouée).
- Essai en base locale (2026-11-26) : 3 neufs créés, et les 11 variations dans 9 copies
  « [essai local] » ; aperçu admin vu par `pnpm voir` (N1, N2, N3 avec le cube, V3, V8) : rendu
  correct. Un tirage de V3 avait un leurre égal au bon point décalé de 1 (mêmes coefficients) :
  coefficients (V3) et paramètres (V4) désormais distincts d'un point à l'autre.
