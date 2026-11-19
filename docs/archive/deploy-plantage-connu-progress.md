# Chantier « deploy-plantage-connu » — `deploy:prod` ne reconnaissait pas le plantage connu

> Suite du chantier `ci-navigateur-plante` (#2480), demandé par David le 2026-11-08.

## Reprendre ici

_Mis à jour le 2026-11-08, après #2486 — chantier clos._

- **État** : #2486 mergée : correctif de `plantage_connu()` dans `scripts/deploy-prod.sh`, tests verts (33/33).
- **Prochaine action** : aucune ; à vérifier au prochain plantage en `deploy:prod` (relance automatique).
- **En attente de David** : rien.
- **Pièges en cours** : aucun.
- **Worktree / branche** : aucun (retirés après le merge).

---

## Constat

1. **Tuyau cassé** (deploy:prod du 2026-11-08, relancé par `--relancer-ci`) : dans
   `printf | awk | grep -qF`, `grep -q` sort au premier résultat ; awk écrit encore dans le tuyau fermé
   (`awk: write error`, `Broken pipe`) et, sous `set -o pipefail`, la commande échoue alors que la
   signature est là. Invisible aux tests : le faux log n'avait qu'une ligne par job.
2. **Mauvaise signature** : `reading 'wrapDynamicImport'` est dans TOUS les logs du job client, verts
   compris (journal `ci-navigateur-plante`, § 1 bis) : un vrai test client rouge aurait été relancé.

## Correctif

- awk cherche lui-même (`index($0, s)`) et lit tout le log : plus de sortie anticipée.
- Signature = « Browser connection was closed ».
- Tests : faux log de plantage long (5 000 lignes après la signature) ; nouveau cas « client-rouge »
  (`wrapDynamicImport` au log, navigateur ouvert) → aucune relance. Preuve rouge avant correctif :
  5 tests en échec (4 tuyau cassé, 1 signature).
