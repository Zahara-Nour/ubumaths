# Réorganisation de docs/ — progression

> Démarré le 2026-10-10. Validé par David (« je valide », recos 1 à 5).
> But : une doc **à jour**, **pas morcelée**, qui **décrit le système**.

## Décisions (David, 2026-10-10)

1. `docs/systeme/` = une doc par système en service ; `docs/pratiques/` = comment travailler (ex-`docs/claude/` + ref transverses). `docs/ref/`, `docs/claude/`, `docs/architecture/`, `docs/guides/` disparaissent.
2. README de `src/` : centralisés dans `docs/systeme/`, un pointeur d'une ligne reste dans `src/` (sauf `src/lib/geometry-core/CLAUDE.md`, réduit à des renvois).
3. `data/corrections/` et `data/relecture/` → `data/`, en PR isolée, fin de P1.
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
- [x] Gardes `docs:check-links` (bloquante, CI + pre-push) et `docs:check-refs` (avertissement) — PR #1021
- [x] `data/` : corrections + relecture hors de docs/, garde « aucun test ne lit docs/ » élargie (10 lecteurs invisibles) — PR #1022
- ⏭️ Glossaires auth/mathast : **reportés en P2**. Ils sont techniques (PKCE, nœud AST…), pas du vocabulaire du domaine : les verser dans CONTEXT.md le gonflerait hors de son rôle. Leurs termes du domaine iront dans CONTEXT.md, le reste dans la doc système refaite (auth.md, mathast/).

Points relevés en route (pour P2) :

- `tests/integration/global-setup.ts` : commentaire faux (« la CI n'exécute pas les tests d'intégration »).
- `tests/integration/database/*.sql`, `tests/seed-test-data.ts`, `tests/cleanup-test-data.ts` : appelés par rien.
- `pnpm test:lint-rules` ne tourne nulle part en CI.
- `docs:check-refs` : 95 renvois morts, tous dans des docs ⚠️ (jeux-et-economie, conformite, srs, auth, python…).
- `scripts/README.md` date de 2025-12 : à vérifier.

## P2 — rafraîchir

- [x] Base de données : liste **générée** (`pnpm db:doc`, aussi lancé par `db:types` ; test : chaque table a un domaine) + `base-de-donnees.md` réécrit en français (PR #1026)
- [x] SRS : 7 fichiers → `systeme/srs.md` (écarts connus en fin de doc) ; auth : 11 fichiers → `systeme/auth.md` ; anciens dossiers → `docs/archive/systeme-2026-06/` (706680a04) ; renvois du code : PR #1027
- [x] mathAST : vue d'ensemble unique + pattern-matching + README de src/ réduits à des pointeurs (9bffc65cf)
- [x] Géométrie : vue d'ensemble unique + 92 builtins + `geometry-core/CLAUDE.md` réduit (a151563d5)
- [x] Conformité : renvois corrigés sans toucher au fond (8a1d82481) ; écarts → `rgpd-securite-constats.md`
- [x] jeux-et-economie réécrit, python renvois (a4b3fec65, b7b37ab47) — [ ] analytique-prof (famille A), export-competences, realtime, architecture-generale : non revus
- [x] Glossaires auth/mathast : repris en fin des docs refaites, anciens archivés
- [x] Garde `docs:check-refs` bloquante (PR #1032) — 0 renvoi mort

Constats remontés à David (non corrigés, décisions à prendre) :

- Sécurité auth : élévation admin qui survit au logout (vérifié), élévation peut-être cassée (policy profils), comptes pending sur les API, handle_new_user approuve tout e-mail hors domaine.
- RLS : `minesweeper_games` terminées lisibles par anon (student_id) ; `exercises`/`constructions` is_public ouvertes à anon.
- SRS : anti-triche cassé (colonnes famille A), rétention sans effet, DELETE sans `.select()`.

## P3 — trous (fait le 2026-10-10)

- [x] questions, ubumark, atelier (13104d857)
- [x] grapheur, statistiques, fiches et PDF (f39529abd)
- [x] dictionnaire, univers-chiphre, outils-prof, serveur (b1eef1cff) — **plus aucun ❌ dans docs/README.md**

## Reste

- Vocabulaire à trancher avec David (skill domain-modeling) : « carte » (atelier) vs « carte de cours » ; module `lexicon/` alors que « lexique » = lore ; CONTEXT.md dit encore « table à créer » (dictionnaire) et liste des types TinyMath disparus.
- `docs/wip/atelier-progress.md` (chapeau) périmé : garanties /grapheur livrées ; en-tête « Proposition » de `systeme/atelier-syntaxe.md` à requalifier.
- `docs/wip/chiffrement-progress.md` : chantier clos ? → archiver.
- [x] Relues contre le code (1762d1114) : analytique-prof, export-competences, realtime, architecture-generale et les 20 `pratiques/*` (~30 affirmations corrigées). Toute la doc porte désormais « Vérifié contre le code le 2026-10-10 » (sauf mesures-mac-mini, historique).
- Écarts « code » relevés dans chaque doc (section « écarts connus ») : à trier en chantiers (ex. tirage des variations dans les fiches, deux règles d'arrondi en stats, tableur 403 pour le prof).
