# K6 — publication unitaire aussi stricte que par lot (progression)

Branche `fix/publication-unitaire-checktemplate`, worktree `../ubumaths-wt-publication-unitaire`.

- [x] Écart confirmé : `PUT /api/questions/templates/[id]` → `publicationErrors` = `validateTemplate` + circularité + catégorie ; `publishTemplates` (bulk) → `checkTemplate` complet.
- [x] Test rouge : `put-publication-check.test.ts` (4 rouges : tirages cassés, spec rouge, sans spec,
      modèle publié modifié). Fixture du PUT : `test_specs` = specs réelles de #139.
- [x] Point de contrôle partagé : `templatePublicationErrors` (`src/lib/server/template-publication.ts`).
- [x] Doc `questions.md` + retrait L3 / K6 de `ecarts-a-trier.md`.
- [x] Mesure prod : 640 modèles publiés, 0 refusé par le contrôle (aucun bloqué à la modification).
- [x] Revue : POST de création (publié par défaut) branché aussi ; éditeur : raisons du refus
      affichées, statut remis si la publication échoue ; test du corps complet publié.
- [x] 2ᵉ revue : page de création rend son verdict ; test client du retour du statut (rouge prouvé).
- [x] PR #1056 mergée (2026-10-10).
