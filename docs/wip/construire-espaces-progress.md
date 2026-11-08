# Chantier `construire-espaces` — case à construire et « Espaces dès 4 chiffres »

## Reprendre ici

_Mis à jour le 2026-11-09, PR ouverte._

- **État** : correctif écrit, tests verts, PR ouverte · **Prochaine action** : CI verte → merge ; puis
  `outils-manquants.md` n° 15 → « Livré » · **En attente de David** : rien · **Pièges en cours** : la
  reprise de la règle par CE2-002 (`04`, `05` du lot 11) revient à la session `questions-ce2` ·
  **Worktree / branche** : `../ubumaths-wt-construire-espaces`, `fix/construire-espaces`

## Journal

### 2026-11-09 — correctif

- Origine : `docs/wip/outils-manquants.md` § 1 n° 15, mesuré au lot 11 du CE2 (`questions-ce2` § 17) :
  `4635` posé par `construire:` jugé « forme à améliorer » dans un modèle « Espaces dès 4 chiffres ».
- Cause : `validateSingleBlank` (et `matchedAnswerForm` en ordre libre) passait les cases
  `collection`, `monnaie`, `line`, `barres`, `boite-a-moustaches` par le contrôle de forme ordinaire
  après la valeur ; les autres genres ont leur juge à part, sans forme.
- Correctif : `blank.construire` → `correct` dès la valeur juste, aux deux endroits. Toutes les cases
  à geste, pas seulement collection et monnaie : la valeur est toujours écrite par le composant.
- Tests (`answer-validator-espaces-4-chiffres.test.ts`) : collection `4635`, monnaie `1000`, droite
  `4500`, droite `30000` sans réglage (BIPM), ordre libre ; rouges sans le correctif (4, puis 1 pour
  le garde apparié), verts avec ; une collection fausse reste fausse.
- `src/lib/utils`, `src/lib/questions`, `src/lib/ubumark` : 14 204 tests verts ;
  `check:incremental` 0 erreur.
- Doc : `docs/systeme/questions.md` (§ espaces de groupement).
