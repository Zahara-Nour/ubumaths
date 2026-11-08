# Chantier `construire-espaces` — case à construire et « Espaces dès 4 chiffres »

## Reprendre ici

_Mis à jour le 2026-11-09, après #2495._

- **État** : chantier clos, #2495 mergée (CI verte ; revue `code-reviewer` Opus : aucun finding) ·
  **Prochaine action** : aucune ici ; `04` et `05` du lot 11 du CE2 reprennent la règle (session
  `questions-ce2`) · **En attente de David** : rien · **Worktree / branche** : supprimés

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
