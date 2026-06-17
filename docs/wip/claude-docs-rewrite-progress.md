# Réécriture des références `docs/claude/` — progress

> Branche `docs/rewrite-claude-references`. Crash-recovery.

## Contexte

Les 6 docs de référence Claude (`docs/claude/*.md`) avaient été retirés par `5de2c6116 "docs: clean docs"` (2025-12-23), mais `CLAUDE.md` (réécrit juin 2026) les référence toujours → **liens morts**. Décision David : **réécrire** ces docs comme **références synthétiques à jour** (pas restaurer le périmé). Les anciennes versions (`git show 5de2c6116^:docs/claude/<f>.md`) servent de **squelette de sujets uniquement** — tout vérifié sur le code actuel.

## Contraintes

- **Style** : prose FR, code/headings EN, dense, tableaux, exemples réels du code, pointeurs `docs/ref/`, ~85-250 lignes. Calibré sur `quality-standards.md`.
- **Ancres à préserver** (liens `CLAUDE.md`) : `quality-standards.md#input-validation-with-zod` ✅, `best-practices.md#svelte-5-runes` (heading exact `## Svelte 5 Runes`).
- Pas de build/lint/check (OOM).

## Statut

- [x] **quality-standards.md** — calibrage, validé (85 l, grounded : oxlint/check:incremental/eslint, lib Zod 69 fichiers + règle `custom/require-zod-validation` error, archi tests).
- [x] **architecture.md** (144 l) — structure, groupes de routes, SSR/TDZ Safari, perf, système de questions. Corrige des chemins inventés de l'ancienne version.
- [x] **best-practices.md** (385 l) — `## Svelte 5 Runes` (ancre OK), TS, ordre fichier, 3 patterns clients SSR, locals, anti-patterns. Exemples réels.
- [x] **ui-components.md** (266 l) — API réelles MySelect/MyCheckbox, 28 dossiers Shadcn, toaster, Tailwind 4. Corrige `FormRichTextEditor`→`RichTextEditor`.
- [x] **database.md** (123 l) — EU, migrations (additif/destructif), types-helpers, RLS Option B (helpers réels), tests intégration, `auth.uid()` NULL.
- [x] **realtime.md** (134 l) — postgres_changes/broadcast, manager central, 6 stores réels + constantes exactes, lifecycle.

**Vérif (toutes ✅)** : 2 ancres `CLAUDE.md` présentes · 0 lien cassé · 0 lien-ancre cassé · 0 fuite mémoire (2 liens `(mémoire)` injectés par l'agent supabase → corrigés).

## Reste après les agents

1. Relecture cohérence + **vérif ancres** (`#svelte-5-runes`, `#input-validation-with-zod`).
2. `pnpm check:incremental` (les .md ne sont pas typés, mais sanity) + liens internes.
3. Vérifier que les liens `CLAUDE.md` → `docs/claude/*.md` résolvent tous.
4. Commit + PR (6 fichiers → branche obligatoire) + CI + merge.

## Definition of Done

6 docs à jour + grounded · 2 ancres OK · liens `CLAUDE.md` valides · style cohérent · CI verte.
