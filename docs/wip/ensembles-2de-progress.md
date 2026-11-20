# Chantier `ensembles-2de` — ensembles de nombres en Seconde : couverture et manques

## Reprendre ici

_Mis à jour le 2026-11-20, après #2943._

- **État** : lot 1 publié ; phase 0 du gros lot « nombres et calculs » tranchée ; outil de migration de contenu des publiés mergé (#2943) : `pnpm tsx scripts/questions/migration-contenu.ts --dir <lot>` (`couvrir-un-niveau.md` § 7).
- **Prochaine action** : nouveau worktree, écrire TOUT le gros lot en local — nouveaux modèles (brouillons) + variations de publiés (fiches 4-9, 12, 13, 27, 30, 31, 39, 48, 53, 54) via l'outil, dans un dossier à part exporté de la prod ; hors programme gardés sans point ; puis envoi unique.
- **En attente de David** : rien.
- **Pièges en cours** : ne jamais nommer la plateforme d'origine (sources : mémoire `reference_source-plateforme-exercices`) ; variations d'un publié : partir de `export-question-templates.ts`, ajouter À LA FIN, une spec « correct » par variation (`variationIndex`), garder `testSpecs` et `description` dans le fichier ; valeur absolue : BO = distance et |x − a| ⩽ r seulement ; Chrome piloté = celui du laptop de David. CI : mesurer le job d'intégration à la prochaine PR de rangement et le dire à David.
- **Worktree / branche** : aucun (à créer : `git worktree add -b feat/ensembles-2de-lot ../ubumaths-wt-ensembles-2de origin/main`).

## Décisions de David (2026-11-20)

- **But** : pouvoir créer des séries qui travaillent les automatismes officiels du lycée ; compléter nos modèles avec les idées d'une autre plateforme.
- **Sens** : on parcourt la plateforme **rubrique par rubrique** et on rattache ensuite chaque idée à un point. Les idées hors automatismes sont **gardées** : elles complètent nos modèles existants.
- **Ordre** : la **Seconde** d'abord (ses points nourrissent les listes de 1re et de Terminale).
- **Les 4 manques d'« Ensembles de nombres »** : à créer tout de suite, en brouillon, publication par David.

## Relevé (2026-11-20)

| Exercice relevé                                                | Ce qu'on demande                                                      | Modèle(s) Chiphre                                                                                                          | Verdict                                                                     |
| -------------------------------------------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Plus petit ensemble d'un nombre (question flash et série de 5) | −123 · 146 · 59/4 · √47 · 6/3 → ℕ, ℤ, 𝔻, ℚ ou ℝ                       | « Le plus petit ensemble de nombres » (ab/b, −√a², p/q décimal, p/q non décimal, √k)                                       | ✅ ; pas de 5,78, de −123 écrit tel quel, ni de π                           |
| Plus petit ensemble du **résultat d'un calcul**                | 3−15 · 24/2−√16 · 4+√29 · 8/10+5/100 · √49−√121 · 3+4/7 · 1/3+1/3+1/3 | aucun                                                                                                                      | ❌ manque 1                                                                 |
| Cocher **tous** les ensembles d'un nombre                      | 5,78 · −√81 · (6−1)/5 · π · 3+1/3                                     | « À quels ensembles de nombres appartient ce nombre ? » (±p/q, ±√n, m/100) ; « Entiers naturels, entiers relatifs » var. 3 | 🟡 ; pas de π ni de sommes                                                  |
| Compléter par ∈ / ∉ / ⊂ / ⊄                                    | 17 … {16;22;44} · {b;p;t;x} … {b;h;p;t;x}                             | « Élément d'un ensemble, appartenance » · « Vrai ou faux : inclusion » · « Le bon symbole : ∈, ⊂, ∩, ∪ »                   | 🟡 ; jamais ⊄, jamais le choix parmi les quatre, pas d'ensembles de lettres |
| A∪B, A∩B, A∖B, B∖A                                             | ensembles de lettres ou de nombres                                    | « Réunion… », « Intersection… », « Complémentaire d'un ensemble fini », « L'ensemble vide »                                | 🟡 ; pas de différence A∖B entre deux ensembles quelconques                 |

### Manques, par priorité

1. Plus petit ensemble qui contient le résultat d'un calcul (nouveau modèle).
2. Différence A∖B / B∖A (variation ou nouveau modèle).
3. Choisir entre ∈, ∉, ⊂, ⊄ (variation de « Le bon symbole »).
4. Petits ajouts : π et 5,78 dans « À quels ensembles… » ; −123 écrit tel quel dans « Le plus petit ensemble… ».

## Comment un modèle devient « automatisme » (rappel, 2026-11-20)

Un modèle ne porte aucune marque « automatisme ». Il est relié à des **points** (`question_template_points`) ; un point figure dans la liste d'automatismes d'un ou plusieurs programmes (`curriculum_point_automatismes`). Exemple : « Réunion de deux ensembles finis » → point 2-404 (Seconde) → listes de 1re spé, 1re techno, Tle spé, Tle compl., Tle techno.

## Lot 1 : phase 0 validée (David, 2026-11-20)

1. **Le plus petit ensemble qui contient le résultat** — point 2-243, sous-notion ℕ, ℤ, 𝔻, ℚ, ℝ ; choix parmi ℕ, ℤ, 𝔻, ℚ, ℝ ; 6 variations : différence d'entiers (ℤ), racines parfaites (ℤ), fractions qui font un entier (ℕ), fractions décimales (𝔻), entier + fraction non décimale (ℚ), entier + racine non parfaite (ℝ).
2. **∈, ∉, ⊂ ou ⊄ ?** — point 2-203, sous-notion Opérations sur les ensembles ; 4 variations : nombre / ensemble fini, deux ensembles finis, nombre / ensemble de nombres, deux ensembles de nombres.
3. **A privé de B** — point proposé 2-206 (complémentaire), hors BO strict ; réponse entre accolades ; A∖B, B∖A, cas inclus (∅).
4. **Petits ajouts** (π, 5,78, −123) sur modèles publiés : proposés pour plus tard.

Décisions (David, 2026-11-20, « je suis tes recos ») : modèles 1 et 2 tels quels ; modèle 3 sur le point 2-206 ; petits ajouts reportés (à noter pour un lot de corrections de modèles publiés) ; question d'accès : personne (la migration range des brouillons, aucune règle d'accès ne change).

## Lot 1 : écrit (2026-11-20)

- Niveaux relevés en prod : ℕ, ℤ, 𝔻, ℚ, ℝ → **4** ; Opérations sur les ensembles → **5** ; complémentaire → **2**.
- `01-plus-petit-ensemble-calcul` (2-243, niv. 4) : 6 variations, choix ℕ/ℤ/𝔻/ℚ/ℝ dans l'ordre ; 12 specs (erreurs : signe oublié, ℝ « à cause des racines », ℚ « à cause des fractions », 𝔻 pour une fraction non décimale).
- `02-appartenance-inclusion` (2-203, niv. 5) : 4 variations, choix ∈/∉/⊂/⊄ (`\not\subset`, rendu vérifié) ; 19 specs.
- `03-a-prive-de-b` (2-206, niv. 2) : A∖B, B∖A, A ⊂ B → ∅ ; réponse `answerKind: intervalles` ; 9 specs.
- `question:specs` : 300 tirages par variation, 0 `\textcolor` hors `$`, aucun `{{if}}` non résolu. Base locale : créés, joués dans l'aperçu (faux jugé faux, juste jugé juste, ensemble tapé accepté).
- Base locale : un admin orphelin d'un test d'intégration (`…@test.com`) bloquait `create-questions` (« exactement 1 profil admin ») → supprimé.

## Lot 1 : relu et publié (2026-11-20)

- Page à cocher : 3/3 « OK », sans commentaire (verdicts comptés dans la base de l'artefact).
- `publier-lot.ts --publier` lancé par David ; nouvelle simulation : les 3 modèles au statut publié.

## Gros lot « nombres et calculs » : relevé et phase 0 (2026-11-20)

- David (2026-11-20) : fini les cycles complets pour 1-2 modèles ; préparer le plus de modèles possible et tout envoyer d'un coup. Périmètre choisi : toutes les rubriques « nombres et calcul » de Seconde de la plateforme, plus les petits ajouts reportés (π, 5,78, −123). Proposer de nouveaux outils si une question en demande.
- Relevé : [ensembles-2de-releve-nombres.md](ensembles-2de-releve-nombres.md) — groupe A (droite graduée, intervalles, valeur absolue, comparer, arrondir) 37 ex. : 7 ✅ 16 🟡 14 ❌ ; groupe B (arithmétique, fractions) 41 : 2 / 23 / 16 ; groupe C (puissances, écriture scientifique, racines) 44 : 6 / 14 / 24.
- BO de Seconde vérifié (`src/lib/server/programmes/transcriptions/2.md`) : valeur absolue limitée à la distance et à |x − a| ⩽ r (« toute autre utilisation est hors programme ») ; arithmétique = multiples, diviseurs, parité, plus grand multiple de a ⩽ b (ni premiers, ni PGCD) ; pas de rationalisation.
- Douze propositions sont des variations de modèles **publiés** : `create-questions --mettre-a-jour` les refuse (garde voulue) → Q1 de la phase 0 (outil de la ligne 41 d'`outils-manquants.md`, ou nouveaux modèles à côté).
- Outils à essayer avant d'en créer : forme exigée « écriture scientifique » (motif `mathAST/pattern`), « entier + fraction < 1 » accepté sous toute écriture juste, décomposition en facteurs premiers (cases + `isPrime`). Aucun nouveau bloc ni geste demandé par le relevé.
- Phase 0 : page à cocher https://claude.ai/artifact/RXH98rLprzZFXk78ZKuntq (Q1-Q4, fiches 1-54, recommandation sur chacune).

### Phase 0 tranchée (David, 2026-11-20)

- « Je valide toutes tes recommandations sauf pour les questions hors programme, que je veux garder (elles ne seront pas taguées sur un point du programme, comme convenu) » — ADR 0020 : rangé sans point = hors programme.
- **Q1** oui : d'abord l'outil qui fabrique la migration de contenu d'un modèle publié (ligne 41 d'`outils-manquants.md`), puis les variations de publiés (fiches 4-9, 12, 13, 27, 30, 31, 39, 48, 53, 54).
- **Q2, Q4 et hors programme gardés, sans point** : 14 (|x − a| > r), 15 (calculs avec plusieurs valeurs absolues), rationaliser un dénominateur (nouveau modèle, sans fiche), 32 (premier, décomposition), 33 (PGCD, PPCM).
- **Q3** : 28-31 sur 2-236 / 2-419 (au BO).
- **Plus tard** (rares mais au programme) : 16, 17, 34, 52.
- Tout le reste « oui » selon les recommandations de la page.

### Outil « migration de contenu d'un modèle publié » : phase 0 validée (David, 2026-11-20)

- Commande : `pnpm tsx scripts/questions/migration-contenu.ts --dir scripts/questions/<lot>` → **une** migration pour tous les modèles **publiés** du lot dont le fichier diffère de la prod.
- Par modèle : garde (contenu exact relevé en prod, md5), rollback en commentaire gardé de même, test d'intégration (copie du modèle de prod, rejoue la migration, vérifie, rejoue le rollback) — sur le modèle de `supabase/migrations/20261119060346_questions_cm1_lot8e_04_contenu.sql` (généré par `docs/wip/questions/cm1-8e-04-contenu.py`).
- Limites : variation ajoutée à la fin → accepté ; variation existante corrigée → accepté, signalé en en-tête ; variation retirée ou déplacée → refusé (indices des réponses d'élèves) ; brouillon → ignoré (`create-questions --mettre-a-jour`).
- Erreurs : sans id / id absent / titre différent → refus avec la différence ; contenu prod changé avant `db:migrate` → la migration ÉCHOUE (jamais un passage muet) ; base locale sans le modèle → rien.
- Champs touchés : variations, specs, description ; jamais titre, nœud, points, tags, statut.
- Question d'accès : personne (aucune policy touchée).

### Outil : écrit (2026-11-20)

- `scripts/lib/migration-contenu.ts` (règles, SQL), `scripts/questions/migration-contenu.ts` (lit la prod, écrit migration + fixture `tests/integration/fixtures/contenu-publie/<nom>.json`), test générique `tests/integration/migrations-contenu-publie.test.ts` (cas synthétique + chaque fixture : migration, gardes, tout ou rien, rollback).
- Écart avec la phase 0 : pas de md5 dans la garde — elle compare le contenu EXACT (jsonb), ce qui couvre le md5. Autre champ du fichier ≠ prod (niveaux, délai, options…) → refus ; `checkTemplate` rouge → refus.
- Essai de bout en bout (fichiers retirés) : 776c4918 « A privé de B » relevé en prod, variation 4 ajoutée + variation 2 retouchée → migration générée (38 ko), 10/10 au test d'intégration. Lot 1 tel quel → « inchangé » ×3.
- Mutations : garde `v_conforme` retirée → 3 rouges ; garde de description retirée → 1 rouge.
- CI ciblée étendue : `*_contenu.sql` ajoutée + fixture `contenu-publie/` ajoutée → seul le test générique tourne ; filtre `paths` de `nightly-integration.yml` complété (`check:integration-paths` vert).
- Revue `code-reviewer` (#2943) : 0 bloquant. Corrigé : clé `testSpecs` / `description` absente du fichier mais présente en prod → refus (jamais d'effacement muet) ; CI ciblée seulement pour `<14 chiffres>_questions_<lot>_contenu.sql` AVEC sa fixture du même nom ; titre et fichier pris en compte pour les balises de dollar ; `''` ≠ `null` pour la description ; message « copie » exact ; décor du test à la forme de la prod (`$$`, `$q$`, décimaux, autres colonnes intactes, modèle absent parmi d'autres) ; fixture écrite avant la migration ; n° des variations corrigées affichés. Laissé : `jsonb 'null'` dans `test_specs` (0 ligne en prod, échouerait bruyamment).

## Gros lot : écriture (2026-11-20)

Worktree `../ubumaths-wt-ensembles-2de`, branche `feat/ensembles-2de-lot`. Points et niveaux relevés en prod (MCP, lecture seule) ; niveau = suite du plus haut niveau du nœud du point.

- **Nouveaux modèles** (brouillons), scripts `docs/wip/questions/lot-2de-nombres-<x>.py` → `scripts/questions/2de-nombres-<x>/` :
  - `a` (7) : arrondir (2-254, niv. 11) · ordre de grandeur (2-254, 12) · comparer à 1 / ranger (2-264, 8) · entiers dans un intervalle (2-244, 5) · distance (2-420, 9) · |x − a| > r (sans point, nœud « équations et inéquations », 3) · plusieurs valeurs absolues (sans point, « définition et distance », 10).
  - `b` (13) : somme (2-272, 2) · produit (3) · quotient (4) · entier + fraction (5) · priorités (6) · fraction restante (7) · fraction du reste (8) — tous 2-272 · comparer deux fractions (2-264, 9) · valeur décimale (2-248, 9) · division euclidienne (2-236, 14) · critères (2-236, 15) · premier / décomposition (sans point, « multiples et diviseurs », 16) · PGCD / PPCM (sans point, 17).
  - `c1` (9) : valeur (2-260, 4) · signe (5) · notation (6) · écrire comme puissance (7) · bases cachées (8) · priorités (9) — 2-260 · écriture scientifique (2-270, 10) · puissances de 10 (11) · préfixes (12) — 2-270.
  - `c2` (7) : racine existe ? (2-261, 4) · carré parfait (5) · calculs directs (6) · développer (7) — 2-261 · entre deux puissances de 10 (2-254, 13) · ranger carrés et cubes (2-264, 10) · rationaliser (sans point, « techniques de calcul », 3).
- **Publiés** : 16 modèles exportés de la prod dans `scripts/questions/2de-nombres-publies/` (commit d'export d'abord : le diff = les ajouts) ; migration générée par `migration-contenu.ts`.
