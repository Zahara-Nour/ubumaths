# Chantier « variable-e » — plus aucune variable `e` dans les modèles

## Reprendre ici

_Mis à jour le 2026-11-16, après #2725._

- **État** : #2725 mergée (CI verte, `code-reviewer` sans finding) : 4 fichiers renommés, garde dans `checkTemplate`.
- **Prochaine action** : David met la prod à jour ; puis relire au MCP qu'aucun modèle ne déclare plus `e`, et
  archiver ce journal.
- **En attente de David** : depuis le dépôt principal, `create-questions --publier --mettre-a-jour` sur `cp-b2`,
  `cm1-3c`, `2de-lecture-a`, `5-parallelogrammes`.
- **Pièges en cours** : la garde n'est pas dans la génération : les modèles publiés tournent jusqu'à leur mise à jour.
- **Worktree / branche** : aucun (retiré après le merge).

---

## Contexte (2026-11-16)

Règle de David : `e` est réservée à la constante d'Euler, jamais une variable. Relevé prod (MCP, toutes les
variations et variables partagées) : 5 modèles publiés déclarent `e` — `95bea43b` (5e, lot 14, déjà corrigé dans
son fichier, commit fa2a80af1), `d5a36be9` (CP « Où est-il ? »), `092b310c` (CM1 « Quelle fraction de la figure
est coloriée ? »), `406fd9a8` et `7efd2e76` (2de, résoudre graphiquement).

## Mesure : ce que `e` cassait (300 tirages par modèle, mêmes graines, avant / après)

- **CP `d5a36be9`** : `k = 1 + 2g + e` valait `1 + \exponentialE` (pas un nombre) → 69 tirages sur 300 changent :
  une partie des dispositions ne sortait jamais. Énoncé et corrigé restaient cohérents entre eux.
- **CM1 `092b310c`** (variation 4) : `{{if:e==…}}` toujours faux → toujours la dernière branche (grille 3×4,
  12 parts) ; 66 tirages sur 300 changent. Cohérent, mais sans variété.
- **2de `406fd9a8`, `7efd2e76`** : aucune valeur ne change (seul le nom) ; renommage pour la règle.
- Après renommage : `question:specs` vert sur les 5 fichiers (specs, 200 tirages par variation, « importable »).

## Garde

`checkTemplate` refuse une variable `e` (variation ou partagée) : « variable « e » : réservée à la constante
d’Euler, choisir une autre lettre ». Test `check-template-variable-e.test.ts` : 3 rouges sans la garde, 5 verts
avec. Le corpus de relecture (`data/relecture/david/3, 16, 17`, absents de la prod sous cette forme) et la démo
`generated-steps-demo` ont été renommés pour rester verts. Instantanés figés laissés tels quels :
`data/corrections/*/_modeles.json`, `data/import-tinymath/migration_edits.json` (état passé de la prod).
