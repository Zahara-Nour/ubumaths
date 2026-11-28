# Chantier `ensembles-2de` — ensembles de nombres en Seconde : couverture et manques

## Reprendre ici

_Mis à jour le 2026-11-28, chantier clos._

- **État** : clos. Lot « nombres et calculs » de Seconde publié (2026-11-20), puis revu par
  `idees-format` (#3319, en prod, relecture validée par David le 2026-11-28). Les 16 réservations
  de modèles publiés sont levées. Fiches « plus tard » : 34 et 52 faites (#3319), 16 refusée, 17
  dans « Idées en attente » d'`idees-ailleurs-repartition.md` (outil n° 49).
- **Prochaine action** : aucune. Le relevé reste ici, cité par la skill `idees-rubrique`.
- **Worktree / branche** : aucun.

## Parallélisation, gardes du nom, idées de format (2026-11-21)

- Déploiement 0.99.0 (#2948 verdict de `/dev/modeles`, #2949 formulaires SvelteKit 3).
- Skill `idees-rubrique` + tableau [idees-ailleurs-repartition.md](../../../wip/idees-ailleurs-repartition.md) (rubriques et modèles publiés réservés ; les 16 publiés du lot réservés ici).
- Copie locale nettoyée des exercices : `extern/banque-exercices/` (sans `.git`, nom remplacé partout).
- Gardes du nom : #2951 (empreintes), puis #2952 (noms lus hors du dépôt, messages + fichiers + chemins, secret CI). Une racine trop courte attrapait une phrase ordinaire : racines allongées.
- Skills harmonisés : relecture et verdicts dans `/dev/modeles` ; la page à cocher ne sert qu'en phase 0 ; `idees-rubrique` exige la meilleure forme de notre format, des `testSpecs`, le bon point et les bornes.
- Catalogue des cases complété (`couvrir-un-niveau.md` § 3 bis, table de `questions.md` § 4 : 4 gestes ajoutés).
- #2953 : noms accessibles des cases (« Réponse N », champ MathLive « Expression à compléter, N cases »).

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

## Gros lot : écrit (2026-11-20)

Cinq agents (`pedagogy-expert`), un par dossier ; specs à 300 tirages par variation, `validateLatex` + accolades sur les aperçus (0 problème hors `\unit`), grep plateforme vide.

- `a` 7 modèles · `b` 13 · `c1` 9 · `c2` 7 : 36/36 « à créer » en simulation ; créés en base locale (ids locaux retirés des fichiers).
- Publiés : 21 variations sur 16 modèles, aucune variation existante touchée (diff contrôlé) ; `migration-contenu.ts` : 16 « migré » ; test d'intégration 12/12. 5,78 non ajouté à 5b20321f : la variation 2 (m/100) le couvre déjà.
- **À trancher par David** :
  1. Rationaliser : 3√2/2 juste ; 3/2 × √2 et 1,5√2 = demi-point (un motif n'accepte qu'une forme) — outil « sans racine au dénominateur » si ces formes doivent être justes.
  2. Décomposition en facteurs premiers : cases dans l'ordre croissant (`orderIndependent` refusé à côté d'une case choix) — séparer en deux modèles pour l'ordre libre ?
  3. Entier + fraction < 1 : deux cases (entier, fraction) ; une case unique demanderait un outil (un motif ne sait pas exiger a < b).
  4. Préfixe T (téra) absent du moteur d'unités : affichage seulement, à voir à l'écran.
  5. Arrondi : `zeros: off` (3,00 et 3 justes) ; 7,27 au dixième = `bad_form` (contrainte d'arrondi), pas faux.
  6. Puissances : (−3)² répondu 3², (−10)³ répondu −10³ → `bad_form`.
- Pas joué dans l'aperçu admin un par un (36 modèles) : relecture par la page à cocher, puis aperçu ciblé des blocs à risque (ranger, droite, intervalles).

## Gros lot : brouillons en prod, rangement (2026-11-20)

- #2944 mergé (fichiers). David a lancé `create-questions --publier` : 36 brouillons en prod (vérifié : 36 `draft`, sans nœud) ; ids commités.
- Migration `20261120150926_questions_2de_nombres_rangement_tags.sql` (36 nœuds, 31 tags, 5 hors programme sans point) + test d'intégration : rouge sans (6), vert avec (11/11). PR #2945.
- Page à cocher : 52 fiches (36 neufs + 16 publiés, intro : ne relire que les nouvelles variations), générée APRÈS le `db:migrate` (sinon 36 alertes « sans nœud »).
- Hors lot, à signaler à David : « Placer un réel sur une droite graduée » (3b0a04c0), variations 1 à 3 **déjà en prod** : graduations de 11 à 15 px sur téléphone (alerte de la page à cocher). La nouvelle variation 4 (10 graduations) n'est pas concernée.
- #2945 mergé (CI verte, intégration 109 s, `security-auditor` sans bloquant) ; `db:migrate` le 2026-11-20 (seule migration en attente) ; prod : 36 rangés, 31 tags, 36 brouillons. Page à cocher publiée : https://claude.ai/artifact/WSKrRGYdQ9yaNuFcYPgb4S (alertes restantes attendues : 5 sans point, 2 blocs ranger à jouer dans l'aperçu, graduations des anciennes variations de 3b0a04c0).
- #2946 mergé (CI verte, intégration 90 s, `security-auditor` sans bloquant) ; `db:migrate` le 2026-11-20 ; `migration-contenu.ts` relancé ensuite : 16 « inchangé » (prod = fichiers).
- Relecture : David « je valide toute la relecture » (aucun verdict saisi sur la page) ; les 6 choix restent tels que réglés (rationaliser à demi-point pour 3/2 × √2, décomposition en cases ordonnées, entier + fraction en 2 cases, T affiché seulement, arrondi et puissances en `bad_form`).
- Publication : David a lancé `publier-lot.ts --publier` sur les 4 dossiers ; prod : 36/36 `published`.

## Relecture dans `/dev/modeles` (2026-11-20)

- David : « je veux refaire une lecture des 52 fiches mais dans /dev/modeles […] je veux vérifier les 6 choix que j'ai validés sans regarder et plusieurs choses me paraissent bizarres. Pour les prochaines fois, les vérifications doivent se faire dans /dev/modeles. » → règle ajoutée à `couvrir-un-niveau.md` § 8, à la skill `couvrir-niveau` et en mémoire.
- Deux séries (50 modèles au plus par série) enregistrées par David : `54d77552-9438-40f3-8773-e3d848a5e219` (36 nouveaux), `d580e46d-d9c7-4505-a158-b42335883050` (16 complétés) ; vérifiées en base.
- Bug signalé par David : « Enregistrer le verdict » faisait quitter la série (SvelteKit 3 : `update()` navigue vers `?/saveReview`, perd `?serie=`). Verdict pourtant enregistré. Correctif `navigate: false`, reproduit puis vérifié en Playwright sur la base locale (série d'essai « Essai verdict » en local) ; #2948 mergé ; en prod au prochain `deploy:prod`. Autres formulaires `?/` + `use:enhance` sur page à recherche (6 composants de cours) : question posée à David.
- Vérification demandée par David : relevé des 91 formulaires `use:enhance` (agent, lecture seule). Cassés : cahier de texte (lien de partage), modèles de fiches (dupliquer / supprimer), mot de passe (`?depuis=profil` sur erreur), mot de passe parent (jeton sur erreur) ; à risque : connexion (`?error=`). Correctif `stayOnPage` (`#lib/utils/enhance-stay-on-page.ts`) ; Playwright local avant → après sur mot de passe et cahier de texte ; doc `svelte-typescript.md` § SvelteKit 3. #2949 mergé (code-reviewer et security-auditor sans bloquant ; connexion : l'erreur du formulaire passe avant `?error=`). En prod au prochain `deploy:prod`.

- 2026-11-28 : chantier clos (revue faite par `idees-format`, #3319), réservations levées, journal archivé.
