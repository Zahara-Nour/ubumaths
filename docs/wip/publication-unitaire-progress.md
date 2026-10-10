# K6 — publication unitaire aussi stricte que par lot (progression)

Branche `fix/publication-unitaire-checktemplate`, worktree `../ubumaths-wt-publication-unitaire`.

- [x] Écart confirmé : `PUT /api/questions/templates/[id]` → `publicationErrors` = `validateTemplate` + circularité + catégorie ; `publishTemplates` (bulk) → `checkTemplate` complet.
- [x] Test rouge : `put-publication-check.test.ts` (4 rouges : tirages cassés, spec rouge, sans spec,
      modèle publié modifié). Fixture du PUT : `test_specs` = specs réelles de #139.
- [x] Point de contrôle partagé : `templatePublicationErrors` (`src/lib/server/template-publication.ts`).
- [x] Doc `questions.md` + retrait L3 / K6 de `ecarts-a-trier.md`.
- [ ] check:incremental, types:cliquet, code-reviewer, PR.
