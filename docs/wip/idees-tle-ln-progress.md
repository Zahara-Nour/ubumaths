# Chantier `idees-tle-ln` — journal

Idées reprises d'ailleurs, rubrique « Fonction logarithme népérien » de Terminale spécialité (TSA5,
12 exercices, dont 6 versions ln d'exercices de la rubrique technologique TTE), selon le skill
`idees-rubrique`. Relevé : [idees-tle-ln-releve.md](idees-tle-ln-releve.md) · fiches :
[idees-tle-ln-fiches.md](idees-tle-ln-fiches.md) · page à cocher :
https://claude.ai/artifact/7dV8FPpr8qsv2uthq67dGT

## Reprendre ici

_Mis à jour le 2026-11-24, migrations commitées, PR pas encore ouverte._

- **État** : brouillons créés en prod par David (a6e58402 F6, 99326dee F9), migrations de rangement et
  de contenu commitées sur la branche · **Prochaine action** : revue `security-auditor` des deux
  migrations (relancer si son rapport est perdu), ouvrir la PR, CI verte → `pnpm pr:merger`, puis `db:migrate` (4 conditions,
  `migration list --linked` d'abord), puis série de relecture des 9 publiés et relecture des neufs
  dans `/dev/modeles` · **En attente de David** : rien avant le merge · **Pièges en cours** : aucun ·
  **Worktree / branche** : `../ubumaths-wt-idees-tle-ln` / `feat/idees-tle-ln`.

## Historique

### 2026-11-24 — rubrique prise, relevé, phase 0

- Rubrique choisie par David (TSA5, recommandation suivie : « ok pour TSA5 ») ; ligne « prise »
  poussée sur `main` (db2cf6cb4).
- Relevé : 12 exercices lus (TTE-6 et TTE-8 par moi, le reste par deux agents Sonnet, plages vérifiées
  dans le code). 14 modèles publiés sur le logarithme (TSPE-392, 413, 414, 416, 438 à 446, 596), aucun
  brouillon, aucun réservé ailleurs. ✅ 1, 🟡 7, ❌ 4.
- Idées en attente reprises : TSA2-35 (limite de ln(axⁿ + k)) → F9 ; TSA1-48 (vₙ₊₁ = ln(1 + vₙ)) → F13.
- Aucun outil manquant : la case « intervalles » juge réunions, ∅, ℝ, ℝ ∖ {r} et {x₀}.
- Phase 0, si tout est oui : **2 modèles neufs** (F6 ensemble de définition, 4 var. ; F9 limites sans
  forme indéterminée, 5 var.) et **15 variations** de 8 modèles publiés (ffd5c051 +2, d3301f2d +3,
  14036c68 +2, f1963ef2 +1, 50feeefd +2, 2cef3442 +2, 7c8b341b +2, 7f13ca89 +1), plus F13 (e814175b +1).
- Questions : Q1 point de F6 (TSPE-438 recommandé, ou 446) ; Q2 F9 en nouveau modèle (recommandé) ou
  dans a6b6db45 ; Q3 F13 variation (recommandé) ou rien. Question d'accès : personne.
- À noter pour la rubrique continuité (TSA4) : « f(x) = 0 a deux solutions » sur ax + b + k ln x
  (TSA5-41), à mettre dans « Idées en attente » à la clôture.

### 2026-11-24 — phase 0 validée, lot écrit

- David : « je suis tes recos » → toutes les fiches oui ; Q1 F6 sur TSPE-438 ; Q2 F9 en nouveau
  modèle ; Q3 F13 ajoutée. 9 modèles publiés réservés dans le tableau (567d97438).
- Scripts `docs/wip/questions/idees-tle-ln-neufs.py` (→ `scripts/questions/idees-tle-ln-neufs/`) et
  `idees-tle-ln-publies.py` (→ `scripts/questions/idees-tle-ln-publies/`, 9 modèles exportés de prod
  le 2026-11-24, variations ajoutées à la fin, relançable).
- Neufs (11 variations) : F6 ensemble de définition (5 var. : affine, trinôme, quotient, carré → ℝ ∖ {r},
  x² + c → ℝ) dans « Logarithmes > réciproque de l'exponentielle », TSPE-438 ; F9 limites sans forme
  indéterminée (6 var., dont ln(axⁿ + k) et ln(k + a/xⁿ) par composition) dans « Logarithmes > courbe »,
  TSPE-441.
- Publiés (+16) : ffd5c051 +2, d3301f2d +3, 14036c68 +2, f1963ef2 +1, 50feeefd +2, 2cef3442 +2,
  7c8b341b +2, 7f13ca89 +1, e814175b +1.
- Écarts à la fiche, sans changer l'idée : F6 a 5 variations (ℝ ∖ {r} et ℝ séparés) ; F9 en a 6
  (ln(k + a/xⁿ) → ln k ajoutée : limite finie par composition) ; F3 b accepte le décimal (1,5) ;
  F12 remet des cases ordinaires (`blankDefaults` vide : le modèle juge en intervalles).
- Vérifié : `question:specs` vert sur les 11 fichiers (256 specs, 3 150 tirages) ;
  `create-questions` en simulation vert ; 5 119 formules des aperçus passées à `validateLatex` +
  accolades (0 problème) ; copies créées en base locale, F12 (tableau avec limites) et F4 b
  (0,2ˣ affiché avec la virgule) vus dans l'aperçu (`pnpm voir`, iPhone) ; brouillons d'essai
  supprimés de la base locale.

### 2026-11-24 — brouillons en prod, migrations

- David a créé les 2 brouillons en prod ; ids commités (a6e58402, 99326dee), niveaux 2 et 3 vérifiés
  contre les voisins de leur nœud.
- Migrations `20261124123345_…_rangement_tags` (F6 → TSPE-438, F9 → TSPE-441) et
  `20261124123352_…_publies_contenu` (+16 variations sur 9 modèles, aucune corrigée) ; tests
  d'intégration des deux fixtures verts (15 tests du lot) ; garde des niveaux verte.
- Doc système inchangée : les migrations rangent et complètent du contenu, sans toucher au schéma.
