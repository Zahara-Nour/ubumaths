# Chantier `idees-1re-variations` — idées reprises d'ailleurs, Variations de 1re spé (1AN2)

## Reprendre ici

_Mis à jour le 2026-11-26, lot écrit (aucune PR)._

- **État** : phase 0 validée (« je valide », 2026-11-26) ; lot écrit et vert : 3 neufs (`scripts/questions/idees-1re-variations-neufs/`, sans id) et V1 ajoutée à 2b382069 (`…-publies/`) ; joué en base locale, rendu vu dans l'aperçu admin.
- **Prochaine action** : quand David a lancé `create-questions --publier` en prod, commiter les ids, puis générer les migrations (`migration-rangement.ts` et `migration-contenu.ts --dir …`), `security-auditor`, ouvrir la PR.
- **En attente de David** : `pnpm tsx scripts/create-questions.ts --dir scripts/questions/idees-1re-variations-neufs --publier` depuis ce worktree (brouillons en prod).
- **Pièges en cours** : choix + tableau à compléter dans une même variation = réponse du choix perdue ; flèche cachée près de `||` refusée (outils-manquants 59 et 63) ; pas d'erreur prévue dans une case de tableau ; ids locaux à retirer après un `--publier` local.
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
