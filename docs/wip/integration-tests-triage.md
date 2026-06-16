# Triage des tests d'intégration — stale vs régression (2026-06-16)

> Contexte : le baseline local ([[local-supabase-migration-baseline]]) a débloqué la suite
> `pnpm test:integration` (302 tests, avant 0). **77 passent, 209 échouent, 16 skip.**
> Question : chaque échec est-il un **test stale** (le test a tort vs le schéma/comportement RÉEL
> de prod) ou une **régression** (le code/schéma de prod fait réellement quelque chose de faux) ?
>
> **Principe** : le baseline EST un dump du schéma de prod EU (en service). Donc le schéma local
> = prod, par construction. Un échec dû à une contrainte/structure réelle = test stale. Une
> régression = le code de prod est cassé vs l'intention (ex. les 2 RPC `rank`/`rk` déjà corrigés).

## Verdict global

**Aucune régression cachée au-delà des 2 bugs RPC déjà trouvés+corrigés** (`game_leaderboard` +
`minesweeper_scoped_leaderboard`, `ORDER BY rank`→`rk`). Les 209 échecs se répartissent en
**3 familles, toutes NON-régression** : dette de test (stale), dépendance aux données de
référence (environnement), et cascades.

## Matrice fichier × cause (mesurée sur le run)

| Cause | Échecs | Verdict | Preuve |
|---|---|---|---|
| **Invariant mono-prof** | **65** | **STALE** | `enforce_single_teacher` (refactor 15/06) refuse un 2ᵉ prof. Les tests créent un prof chacun mais le nettoyage des profs ne tient pas en suite complète (game-leaderboards passe SEUL, échoue dans la suite). Le trigger = comportement prod voulu. |
| **Données réf. compétences** | **43** | **DONNÉES** | `getKnowledgeSkill / getMathCompetenceId / getObservableSkill: '...' not found`. Le référentiel (objectifs/compétences) n'est pas seedé (baseline schéma-seul). |
| **Données réf. cartes VIP** | **~19** | **DONNÉES** | RPC `draw_vip_card` lève `P0001 "No cards available…"` / `"No enabled VIP cards…"` — correct : **0 carte** en base (templates non seedés). |
| **Helper template stale** | **20** | **STALE** | `createFakeTemplate` passe `type: 'direct'`, **interdit** par `question_templates_type_check` (valeurs : numerical_*, algebraic_transform, fill_in_blanks, multiple_choice). |
| **Données réf. monstres** | **6** | **DONNÉES** | `game_combats_monster_id_fkey` : `game_monsters` vide (non seedé). |
| **Table inexistante** | **1** | **STALE** | requête sur `public.users` (`PGRST205`) — table qui n'existe pas (c'est `auth.users`/`profiles`). |
| **Cascades** | **~55** | **SECONDAIRE** | `Cannot read properties of null`, `expected [] to have length N`, `coerce to single object` — échecs en aval d'une des causes ci-dessus (setup qui retourne null → accès propriété). |
| **Divers asserts** | **~9** | à voir | quelques assertions isolées (NaN, undefined…) — à inspecter au cas par cas, probablement cascades. |

### Répartition par verdict
- **STALE (test à corriger vs schéma prod réel)** : ~86 (mono-prof 65 + template-type 20 + public.users 1)
- **DONNÉES (référence non seedée)** : ~68 (compétences 43 + cartes VIP 19 + monstres 6)
- **CASCADES (secondaires)** : ~55
- **RÉGRESSION (vrai bug code)** : **0 nouveau** (les 2 RPC `rank`/`rk` déjà corrigés)

## Pistes de remédiation (si on décide de verdir)

1. **DONNÉES (~68 + une partie des cascades)** : ajouter un **seed local de données de référence
   non-PII** (référentiel compétences, `vip_card_templates`, `game_monsters`). Source : dump
   `--data-only` de prod EU restreint à ces tables, OU les `INSERT` des migrations archivées.
   Probablement le **plus gros gain** (débloque compétences + cartes VIP + monstres + cascades).
2. **Mono-prof (65)** : fiabiliser le nettoyage des profs entre fichiers (le trigger global impose
   ≤1 prof). À investiguer : pourquoi `cleanupAllTestData` ne retire pas le prof en suite complète
   alors qu'il le fait en isolation (game-leaderboards). Probable : un fichier laisse fuiter un prof.
3. **STALE helpers (21)** : corriger `createFakeTemplate` (`type` valide) et la requête `public.users`.
4. **Cascades** : se résorbent en grande partie une fois (1)+(2) réglés ; réinspecter ensuite le reste.

## Important
- **Ne PAS réaligner un test sans confirmer le comportement code** (règle d'or stale-tests-sweep).
- Le seed de référence doit rester **non-PII** (pas de données d'élèves), comme le baseline.
- Les 2 RPC restent à pousser en prod (`pnpm db:migrate`) — voir le journal baseline.

---

## MAJ — Catégorie A (seed de référence) LIVRÉE (2026-06-16)

`supabase/seed.sql` créé = dump `--data-only` de prod EU restreint à **7 tables de référence
non-PII** (skill_themes, skill_objectives, math_competences, math_competence_subdimensions,
skills, vip_card_templates, game_monsters ; ~230 lignes). Extraction via `--exclude` des 196
autres tables + **vérification** que le seed ne contient QUE les 7 (filet anti-PII). Le dump
embarque `session_replication_role=replica` + `RESET ALL`. `config.toml` pointait déjà `./seed.sql`.

**Résultat (suite complète)** : **77 → 133 passants** (+56), **209 → 162 échecs** (−47), 16→7 skip.
**Aucune régression** (les passants n'ont fait qu'augmenter). Détail des gains :
vip-card-filters 18→2, competence-referentiel 41→17, vip-card-enabled 7→1, vip-card-rarity 5→1.
À noter : vip-card-teacher-overrides 1→8 (le seed **démasque** des échecs en aval, normal).

**Hypothèse contamination INFIRMÉE** : seeder la donnée n'a PAS réduit les échecs mono-prof
(65→73, en hausse car plus de tests démasqués). **B (mono-prof) est indépendant du seed.**

### Reste à traiter (162 échecs) — par priorité
1. **B — mono-prof (~73)** : `enforce_single_teacher` (prod voulu) + lifecycle de tests. Un prof
   fuite et empoisonne la suite. **#1 en volume**, indépendant. → fiabiliser le cleanup des profs.
2. **C — helper `createFakeTemplate` (~43)** : `type: 'direct'` viole `question_templates_type_check`.
   Fix trivial : utiliser un type valide (numerical_*/algebraic_transform/fill_in_blanks/multiple_choice).
3. **FK monstres (~6)** : seed game_monsters présent mais le test utilise sans doute un `monster_id`
   codé en dur ≠ ids seedés → à vérifier (stale test data).
4. **Cascades (~14 TypeError null)** + divers asserts (~10) : se résorbent en partie après B/C.
