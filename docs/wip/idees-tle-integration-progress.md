# Chantier `idees-tle-integration` — journal

Idées reprises d'ailleurs, rubriques « Primitives et équations différentielles » (TSA7, 7 exercices)
et « Intégration » (TSA8, 5 exercices) de Terminale spécialité, selon le skill `idees-rubrique`.
Relevé : [idees-tle-integration-releve.md](idees-tle-integration-releve.md) · fiches :
[idees-tle-integration-fiches.md](idees-tle-integration-fiches.md) · page à cocher :
https://claude.ai/artifact/Tw3TtUfAWtsn6CPudQcxot

## Reprendre ici

_Mis à jour le 2026-11-25, modèles validés par David._

- **État** : migrations de #3134 en prod ; David a validé les 9 modèles (de vive voix, aucun verdict
  en base) ; `publier-lot.ts` en simulation vert pour F1 e6f2aed3 et F7 1093da29 · **Prochaine
  action** : relire le statut `published` des 2 brouillons, puis clore (tableau « publiée », journal
  versé selon `couvrir-un-niveau.md`) · **En attente de David** :
  `pnpm tsx scripts/questions/publier-lot.ts --dir scripts/questions/idees-tle-integration-neufs --publier`
  (dans `../ubumaths-wt-idees-tle-integration`) ; abandon de la branche
  `chore/idees-tle-integration-serie` (série de relecture devenue inutile, commit non poussé) ·
  **Pièges en cours** : aucun · **Worktree / branche** : `../ubumaths-wt-idees-tle-integration`,
  `chore/idees-tle-integration-serie` (à retirer).

## Historique

### 2026-11-25 — rubriques prises, relevé, phase 0

- Rubriques TSA7 et TSA8 choisies par David (« je te suis », recommandation suivie) ; lignes
  « prise » poussées sur `main` (ae031a888).
- Relevé : 12 exercices lus en entier dans le code (par moi, sans agent). 65 modèles publiés touchent la
  rubrique, aucun brouillon, aucun réservé ailleurs. ✅ 4, 🟡 8, ❌ 0.
- Idée en attente reprise : TSA1-48 (suite Iₙ = ∫₁ᵉ (ln x)ⁿ dx) → F10.
- Aucun outil manquant.
- Phase 0, si tout est oui : **2 modèles neufs** (F1 lien entre f et F, lecture de courbe, 2 var. ;
  F7 intégrale de cos et de sin, 3 var.) et **11 variations** de 7 modèles publiés (3dbc5a7b +1,
  2d480f3d +1, fe25be0a +2, b52c53d8 +2, 74da1cd6 +1, fc2ea212 +3, 6035aa61 +1).
- Questions : Q1 forme de F1 (lecture de courbe recommandée, ou QCM) ; Q2 F7 en modèle neuf
  (recommandé, b52c53d8 sert aussi en maths complémentaires) ou en variation de b52c53d8. Question
  d'accès : personne.

### 2026-11-25 — phase 0 validée, lot écrit

- David : « je suis tes recos » → toutes les fiches oui, Q1 lecture de courbe, Q2 F7 en modèle neuf.
  7 modèles publiés réservés dans le tableau (48d8d729f).
- Scripts `docs/wip/questions/idees-tle-integration-neufs.py` (→ `scripts/questions/idees-tle-integration-neufs/`)
  et `idees-tle-integration-publies.py` (→ `scripts/questions/idees-tle-integration-publies/`, 7 modèles
  exportés de prod le 2026-11-25, variations ajoutées à la fin, relançable).
- Neufs : F1 « Lien entre une fonction et ses primitives » (2 var., courbe de f, case intervalles),
  rangé « Équations différentielles > y′ = f > primitives : notion », TSPE-462 ; F7 « Intégrale de cos
  et de sin » (3 var.), rangé « Intégration > Calcul d'intégrales > par une primitive », TSPE-487,
  T_SPE seul.
- Publiés (+11) : 3dbc5a7b +1, 2d480f3d +1, fe25be0a +2, b52c53d8 +2, 74da1cd6 +1, fc2ea212 +3,
  6035aa61 +1.
- Écarts à la fiche, sans changer l'idée : pas d'erreurs prévues sur les cases à choix (F8, F10) ni
  sur la case « primitive » (F4a) : le moteur les refuse, les explications sont dans le corrigé ;
  F2 corrigé par « deux primitives diffèrent d'une constante » (le point du modèle).
- Vérifié : `question:specs` vert sur les 9 fichiers (200 specs, 300 tirages par variation) ;
  `create-questions` en simulation vert ; `sonde-courbes` 0 problème ; 1 262 formules distinctes des
  aperçus passées à `validateLatex` + accolades (0 problème, après correction d'un `$f$` imbriqué
  dans `\text` en F8) ; « 2e-1 » tapé par l'élève jugé juste. Copies créées en base locale, F1
  (courbe), F7, F8 vus dans l'aperçu (`pnpm voir`, iPhone, 0 erreur de console) ; brouillons d'essai
  supprimés de la base locale.

### 2026-11-25 — brouillons en prod, migrations

- David a lancé `create-questions --publier` : F1 e6f2aed3, F7 1093da29 (brouillons, T_SPE, sans
  nœud) ; ids commités.
- `migration-rangement.ts` : 20261125065055 (F1 → primitives : notion, TSPE-462 ; F7 → par une
  primitive, TSPE-487). `migration-contenu.ts` : 20261125065101 (7 publiés, +11 variations, 0
  corrigée). Tests d'intégration verts (256), rouges sans les migrations (12 en échec, fichier
  introuvable).
- `garde-niveaux-tags` verte. Question d'accès : personne (on range des modèles).

### 2026-11-25 — PR #3134 mergée

- `security-auditor` : aucun finding bloquant (aucune policy, aucun GRANT ; écritures limitées aux
  ids, gardes sur le contenu en prod ; additif, rollback en commentaire). Non bloquants : modèle
  absent ignoré sans erreur (voulu pour la base locale) ; rangement sans garde « encore brouillon ».
- CI verte, mergée par `pnpm pr:merger 3134` (2026-11-25 07:12 UTC).

### 2026-11-25 — modèles validés

- Migrations appliquées en prod (`db:migrate` depuis `main`, seules nos 2 en attente) ; relu en prod :
  F1 et F7 rangés et tagués, 7 publiés complétés. Réservations levées, rubriques « en prod »
  (d18e5d519).
- David : « je valide les modèles ». Aucun verdict dans `question_template_reviews` après le lot :
  validation de vive voix. La série de relecture des publiés (préparée sur
  `chore/idees-tle-integration-serie`, non poussée) n'est plus utile.
- `publier-lot.ts` en simulation : les 2 brouillons passent le contrôle.
