# Relecture des questions TinyMath

Suivi : [`docs/wip/relecture-questions-progress.md`](../wip/relecture-questions-progress.md).

## Le circuit

1. **Relire** une question (Claude) : `pnpm question:specs --index <n> --apercu 5` montre la
   transformation, des instances générées et le verdict technique.
2. **Écrire le verdict** dans `docs/relecture/<lot>/<n>.json` (format ci-dessous).
   `pnpm question:specs --lot docs/relecture/<lot>` vérifie tout le lot.
3. **Feu vert de David** sur le rapport du lot.
4. **Reporter les verdicts** : `pnpm relecture:verdicts --lot docs/relecture/<lot>` (simulation),
   puis avec `--publier`.
5. **Importer en brouillon** : `pnpm relecture:import --lot docs/relecture/<lot>` (simulation),
   puis avec `--publier`. David publie lui-même.

Toutes les commandes d'écriture sont **en simulation sans `--publier`**, n'écrivent que sur la prod
(projet EU) ou une base locale, sauvegardent les lignes visées dans
`data/migration-output/backups/` (non versionné) et relisent chaque ligne écrite.

## Un template n'est importable que si

- `validateTemplate` et le schéma strict passent ;
- il a **au moins une spec de test**, toutes vertes ;
- chaque variation génère sur **50 tirages** sans échec ;
- son niveau est ≥ 1 (contrainte de la base ; les niveaux TinyMath commencent à 0).

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

- `reviewer: "david"` reporte un verdict déjà rendu par David (pas de marqueur Claude, date
  d'origine conservée dans `reviewedAt`).
- En base : `review_status` (`approved` / `rejected` ; `pending` si à arbitrer),
  `reviewed_by` = David, `conversion_notes` = « Relu par Claude le … — … » ; la version corrigée va
  dans `migration_edits` (jamais écrasée sans `--remplacer`).
