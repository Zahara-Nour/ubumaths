# Chantier `ensembles-2de` — ensembles de nombres en Seconde : couverture et manques

## Reprendre ici

_Mis à jour le 2026-11-20, après le relevé du gros lot « nombres et calculs »._

- **État** : lot 1 publié. David veut désormais de **gros lots** (tout préparer, un seul envoi). Relevé de 122 exercices « calcul numérique » de Seconde fait ([relevé](ensembles-2de-releve-nombres.md)) ; phase 0 publiée en page à cocher : https://claude.ai/artifact/RXH98rLprzZFXk78ZKuntq (4 questions d'ensemble Q1-Q4 + 54 fiches, collection `verdicts`).
- **Prochaine action** : lire les verdicts (`ArtifactData list verdicts`, compter 58), puis écrire tout le lot en local ; si Q1 = oui, d'abord l'outil de migration de contenu d'un modèle publié (ligne 41 d'`outils-manquants.md`).
- **En attente de David** : ses réponses sur la page de phase 0.
- **Pièges en cours** : ne jamais nommer la plateforme d'origine (sources : voir mémoire `reference_source-plateforme-exercices`) ; `create-questions --mettre-a-jour` ne touche jamais un modèle publié → toute variation d'un publié passe par une migration ; valeur absolue : BO = distance et |x − a| ⩽ r seulement ; Chrome piloté = celui du laptop de David. CI : mesurer le job d'intégration à la prochaine PR de rangement et le dire à David.
- **Worktree / branche** : aucun (à créer pour écrire le lot).

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
