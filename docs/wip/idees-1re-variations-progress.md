# Chantier `idees-1re-variations` — idées reprises d'ailleurs, Variations de 1re spé (1AN2)

## Reprendre ici

_Mis à jour le 2026-11-26, phase 0 (aucune PR)._

- **État** : rubrique réservée (main, 924e46b7a) ; relevé fait ([relevé](idees-1re-variations-releve.md)) ; fiches de phase 0 sur la page à cocher https://claude.ai/artifact/Sz4fcFzPik8zJjPLHsrT7i (6 fiches : N1, N2, N3, V1, R, Q1). Rien de codé.
- **Prochaine action** : lire les verdicts de la page (collection `verdicts`, ArtifactData), puis écrire le gros lot : `docs/wip/questions/idees-1re-variations-neufs.py` (N1, N2, N3) et `-publies.py` (V1 sur 2b382069, à réserver d'abord dans le tableau).
- **En attente de David** : les verdicts des 6 fiches.
- **Pièges en cours** : pas de limites en 1re (bornes 1spe.md l. 104) : double barre `||` sans limite ; vérifier en local qu'une ligne `variation:` accepte `||` seul.
- **Worktree / branche** : `../ubumaths-wt-idees-1re-variations`, `feat/idees-1re-variations`.

## Historique

### 2026-11-26 — prise, relevé, phase 0

- Rubrique 1AN2 « Variations », 5 exercices (1AN20-1 à 3, 1AN21-1 et 2), lus dans la copie locale.
- Nos modèles relevés en prod (MCP lecture seule) : points 1SPE-281, 282, 283, 401, 285, 287, 402 ; tableau
  dans le relevé.
- Manques : variations d'une fonction rationnelle (aucun modèle en 1re ; Tle 74d73d4e a des limites) ;
  max / min sur un intervalle fermé pour un degré 3 et pour ax + b/x ; f′ sans racine (Δ < 0).
- Fiches proposées (recommandations) :
  - **N1** nouveau « Variations d'une fonction rationnelle », 1SPE-283, 5 variations ;
  - **N2** nouveau « Variations et extremums d'un polynôme de degré 3 sur un intervalle », 1SPE-401, 3 variations ;
  - **N3** nouveau « Maximum et minimum de ax + b/x sur un intervalle », 1SPE-401, 3 variations ;
  - **V1** variation de 2b382069 (f′ trinôme sans racine, réponse ℝ ou ∅), 1SPE-281 ;
  - **R** non repris : racines en √Δ, « montrer que », tangente (d1cf9d7c), degré 2 (f900ea05) ;
  - **Q1** N2 en 1 SPE seul (recommandé) ou aussi en 1 TECHNO.
- Question d'accès : personne ne gagne d'accès (migrations de rangement et de contenu).
- Outils : rien ne manque (bloc ```variation à cases `?`, `?flèche`, `||` ; case intervalles avec ℝ et ∅).
