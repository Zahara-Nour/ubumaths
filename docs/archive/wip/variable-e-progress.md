# Chantier « variable-e » — plus aucune variable `e` dans les modèles

## Reprendre ici

_Mis à jour le 2026-11-16, chantier clos._

- **État** : clos. #2725 (fichiers + garde `checkTemplate`) et #2728 (lot `variable-e`) mergées ; David a lancé
  `update-published-questions.ts --lot variable-e --publier` ; vérifié au MCP : 0 modèle avec une variable `e`, les 5
  toujours `published` (mis à jour à 20:16 UTC).
- **Prochaine action** : aucune. Durable versé : `docs/systeme/questions.md` (garde), `couvrir-un-niveau.md` (règle).
- **Pièges en cours** : modèle PUBLIÉ → `update-published-questions.ts` (lot déclaré), jamais `create-questions`.
- **Worktree / branche** : aucun (retirés).

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

## Mise à jour de la prod (2026-11-16)

- Ma première consigne (`create-questions --publier --mettre-a-jour`) était fausse : ce script s'arrête sur un
  modèle publié (« jamais modifié par ce script »). Vérifié au MCP : rien écrit.
- Instantanés prod (`export-question-templates.ts`) commités bruts, puis `e` renommé : égaux, champ par champ, aux
  fichiers de #2725. Lot `variable-e` dans `update-published-questions.ts` ; simulation verte (5/5).
