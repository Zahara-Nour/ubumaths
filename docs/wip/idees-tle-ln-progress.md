# Chantier `idees-tle-ln` — journal

Idées reprises d'ailleurs, rubrique « Fonction logarithme népérien » de Terminale spécialité (TSA5,
12 exercices, dont 6 versions ln d'exercices de la rubrique technologique TTE), selon le skill
`idees-rubrique`. Relevé : [idees-tle-ln-releve.md](idees-tle-ln-releve.md) · fiches :
[idees-tle-ln-fiches.md](idees-tle-ln-fiches.md) · page à cocher :
https://claude.ai/artifact/7dV8FPpr8qsv2uthq67dGT

## Reprendre ici

_Mis à jour le 2026-11-24, phase 0 envoyée._

- **État** : relevé fait, phase 0 publiée (page à cocher) · **Prochaine action** : lire les verdicts
  (`ArtifactData list verdicts`), puis écrire le gros lot (`docs/wip/questions/idees-tle-ln-*.py`) ·
  **En attente de David** : verdicts des fiches F1 à F14 et Q1 à Q3 · **Pièges en cours** : aucun ·
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
