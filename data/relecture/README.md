# Relecture des questions TinyMath

## Ce que ce dossier est devenu

L'import est **terminé** (632 questions relues, importées en brouillon). Son outillage (circuit
`question:specs --index/--lot` → `relecture:verdicts` → `relecture:import`, tables
`migration_tracking` / `migration_edits`) a été retiré le 2026-10-28 (chantier `figure-et-choix`,
lot 5) : voir [`docs/archive/migration-tinymath.md`](../../docs/archive/migration-tinymath.md).

Les fichiers restent **versionnés comme corpus** des gardes de non-régression (lus par
`parseReviewFile` / `draftTemplate`, `src/lib/questions/review/review-file.ts`).

## Un template n'a été importé que si

- `validateTemplate` et le schéma strict passent ;
- il a **au moins une spec de test**, toutes vertes ;
- chaque variation génère sur **50 tirages** sans échec ;
- son niveau est ≥ 1 (contrainte de la base ; les niveaux TinyMath commencent à 0).

**Ce contrôle est rejoué à chaque PR** sur tous les fichiers de ce dossier
(`src/lib/questions/review/__tests__/corpus-relecture.test.ts`, ~7 s) : une modification du
générateur, du validateur ou de mathAST qui casse une question relue rougit la CI. Seul
l'instantané de la relecture est couvert, pas un modèle modifié ensuite dans l'éditeur.

## Format d'un fichier de verdict

```json
{
	"globalIndex": 120,
	"verdict": "approved | corrected | rejected | arbitrate",
	"reviewer": "claude | david",
	"reviewedAt": "2026-09-26T12:00:00Z",
	"reason": "obligatoire si rejected",
	"question": "obligatoire si arbitrate : la question précise à poser à David",
	"editNotes": "obligatoire si corrected : quoi et pourquoi",
	"template": { "…": "obligatoire si approved ou corrected, avec ses testSpecs" }
}
```

- `reviewer: "david"` : verdict déjà rendu par David (date d'origine conservée dans `reviewedAt`).
