# Réorganisation de docs/ — progression

> Démarré le 2026-10-10. Validé par David (« je valide », recos 1 à 5).
> But : une doc **à jour**, **pas morcelée**, qui **décrit le système**.

## Décisions (David, 2026-10-10)

1. `docs/systeme/` = une doc par système en service ; `docs/pratiques/` = comment travailler (ex-`docs/claude/` + ref transverses). `docs/ref/`, `docs/claude/`, `docs/architecture/`, `docs/guides/` disparaissent.
2. README de `src/` : centralisés dans `docs/systeme/`, un pointeur d'une ligne reste dans `src/` (sauf `src/lib/geometry-core/CLAUDE.md`, réduit à des renvois).
3. `docs/corrections/` et `docs/relecture/` → `data/`, en PR isolée, fin de P1.
4. Garde `docs:check-refs` (chemins et symboles cités dans systeme/ et pratiques/ existent) : avertissement en P1-P2, bloquante ensuite ; idem `docs:check-links` une fois les liens réparés.
5. Schéma de base : liste des tables générée depuis `database.ts` + texte écrit à la main.

Gabarit d'une doc système : à quoi ça sert · carte du code · invariants · comment étendre · tests · décisions (ADR) · « vérifié contre le code le ».

Fin de chantier = versement dans `systeme/` (Definition of Done), puis archivage du journal wip.

## Fait avant P1 (même journée)

- Ménage de docs/wip : 198 docs déplacées (a512d2c5a → 59cf202ef, PR #1019). Liens cassés : 99 → 97.

## P1 — mécanique

- [x] Déplacements ref/claude/architecture/guides → systeme/ + pratiques/ (88b4e07a5, 9309f6ebb) — script `relink.py` (git mv + liens + texte + mémoire)
- [x] Renvois dans src/, scripts/, .github/ (PR #1020)
- [x] `docs/README.md` (carte module → doc, ⚠️ à rafraîchir, ❌ trous)
- [x] Liens cassés : 99 → 0 (1d8bbf447, e116d5557) ; restaient des faux positifs (code inline, gabarits) → vérificateur réécrit (PR #1021)
- [x] `pratiques/commandes.md` réécrit d'après package.json ; README racine (a592da7e9)
- [x] Docs de tests fusionnées dans `pratiques/tests.md`, vérifiée contre le code (79c0ef2a9)
- [x] Rapports 2025 de `.claude/` et `scripts/` archivés (62dab9eab) ; `.claude/README.md` et `scripts/README.md` gardés (index)
- [ ] Gardes `docs:check-links` (bloquante, CI + pre-push) et `docs:check-refs` (avertissement) — PR #1021
- [ ] `data/` : corrections + relecture hors de docs/, garde « aucun test ne lit docs/ » élargie (10 lecteurs invisibles) — PR #1022
- ⏭️ Glossaires auth/mathast : **reportés en P2**. Ils sont techniques (PKCE, nœud AST…), pas du vocabulaire du domaine : les verser dans CONTEXT.md le gonflerait hors de son rôle. Leurs termes du domaine iront dans CONTEXT.md, le reste dans la doc système refaite (auth.md, mathast/).

Points relevés en route (pour P2) :

- `tests/integration/global-setup.ts` : commentaire faux (« la CI n'exécute pas les tests d'intégration »).
- `tests/integration/database/*.sql`, `tests/seed-test-data.ts`, `tests/cleanup-test-data.ts` : appelés par rien.
- `pnpm test:lint-rules` ne tourne nulle part en CI.
- `docs:check-refs` : 95 renvois morts, tous dans des docs ⚠️ (jeux-et-economie, conformite, srs, auth, python…).
- `scripts/README.md` date de 2025-12 : à vérifier.

## P2 — rafraîchir : base-de-donnees (générée), srs, mathast, auth, conformité

## P3 — trous : questions, ubumark, atelier, grapheur, statistiques, fiches/PDF, …
