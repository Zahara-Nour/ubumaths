# Chantier `idees-1re-variations` — idées reprises d'ailleurs, Variations de 1re spé (1AN2)

## Reprendre ici

_Mis à jour le 2026-11-26, après #3162._

- **État** : #3162 mergée ; `db:migrate` fait (rangement 20261126072904 et contenu 20261126072928, vérifiés par le MCP) : 3 brouillons rangés (80c43412 1SPE-283, 8f08fca1 et 61c4a8ed 1SPE-401), 2b382069 publié à 4 variations.
- **Prochaine action** : lire les verdicts de David en base (`question_template_reviews`, `reviewed_at` postérieur au 2026-11-26 07:40), corriger, puis `publier-lot.ts --dir scripts/questions/idees-1re-variations-neufs` en simulation ; David le lance avec `--publier`.
- **En attente de David** : relecture dans `/dev/modeles?noeud=2e77d4d9-646d-495e-b379-b662f7947a4f` (les 3 brouillons et 2b382069, variation 4).
- **Pièges en cours** : choix + tableau à compléter dans une même variation = réponse du choix perdue ; flèche cachée près de `||` refusée (outils-manquants 59 et 63) ; pas d'erreur prévue dans une case de tableau.
- **Worktree / branche** : aucun (retiré par `pr:merger`) ; un nouveau worktree sur `origin/main` pour les corrections.

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

### 2026-11-26 — phase 0 validée, lot écrit

- David : « je valide » (page sans coche) → les 6 fiches comme recommandé ; Q1 : N2 en 1 SPE seul.
  2b382069 réservé dans le tableau (main, a49a804eb).
- Scripts `docs/wip/questions/idees-1re-variations-{neufs,publies}.py`. Rangement des neufs :
  « Fonctions > Dérivation > variations et extremums » ; N1 1SPE-283 niveau 5, N2 et N3 1SPE-401
  niveau 4 (niveaux du nœud relevés en prod).
- Écarts à la phase 0, imposés par l'outil :
  - N1 V0 et V1 (homographiques) : case du numérateur de f′ (erreurs prévues : ad + bc, uv′ − u′v ;
    k seul, signe moins oublié) + choix parmi quatre phrases de variations ; le tableau est au
    corrigé. Une flèche ne se cache pas près d'une double barre, et un choix à côté d'un tableau à
    compléter perd sa bonne réponse (outils-manquants 59, 63).
  - N1 V2 (k/(x² + c)) : un seul choix « nature + valeur » (quatre options), pas de Oui / Non.
  - N1 V3 : tableau à 6 cases (signes et flèches extérieurs, f(x₁), f(x₂)) ; signes et flèches
    intérieurs visibles. Erreurs prévues refusées dans les cases de tableau : elles sont en V4.
- Vérifs : `question:specs` vert sur les 4 fichiers (22 + 13 + 16 + 18 specs, 150 à 300 tirages
  par variation) ; `create-questions` en simulation vert ; neufs créés en base locale (ids retirés
  ensuite) ; aperçu admin (Chrome, lien du tailnet) : tableau avec double barre sans limites,
  bornes sans valeur, cases à compléter, rendu correct.

### 2026-11-26 — brouillons en prod, migrations

- David a créé les 3 brouillons en prod ; ids commités. Fusion de `main` : conflit dans
  `outils-manquants.md` (une autre session a pris le n° 62) → mon entrée devient la 63.
- `migration-rangement.ts` : 3 modèles rangés (nœud « Fonctions > Dérivation > variations et
  extremums », 1SPE-283 / 1SPE-401). `migration-contenu.ts` : 2b382069 +1 variation et ses specs.
- Tests d'intégration `migrations-rangement-tags` et `migrations-contenu-publie` verts ;
  `garde-niveaux-tags` vert ; `types:cliquet` tenu.
- `security-auditor` : aucun finding bloquant ; notes : `disable/enable trigger` du générateur
  (verrou bref, sans effet sur les droits), en-tête « variation(s) ajoutée(s) : 4 » = numéro de la
  variation, pas un nombre.

### 2026-11-26 — #3162 mergée, migrations en prod

- CI verte, merge par `pr:merger`. `migration list --linked` : seules les deux du lot en attente ;
  `db:migrate` ; état vérifié par le MCP (nœud, points, 4 variations pour 2b382069).
