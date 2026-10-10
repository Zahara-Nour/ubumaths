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

- [ ] Déplacements ref/claude/architecture/guides → systeme/ + pratiques/ (script `relink.py` : git mv + liens + texte + mémoire)
- [ ] Renvois dans src/, scripts/, .claude/ (PR)
- [ ] `docs/README.md` (carte module → doc)
- [ ] Réparer les liens cassés
- [ ] `pratiques/commandes.md` à jour (verrous, check:fast retiré, deploy:prod) ; README racine
- [ ] Fusion des docs de tests ; glossaires auth/mathast → CONTEXT.md
- [ ] Archiver les rapports 2025 (`.claude/*.md`, `scripts/*.md`)
- [ ] Garde `docs:check-refs` en avertissement (PR)
- [ ] `data/` (PR isolée)

## P2 — rafraîchir : base-de-donnees (générée), srs, mathast, auth, conformité

## P3 — trous : questions, ubumark, atelier, grapheur, statistiques, fiches/PDF, …
