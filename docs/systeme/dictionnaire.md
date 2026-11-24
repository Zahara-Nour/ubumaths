---
couvre:
  - 'src/lib/dictionary/**'
  - 'src/lib/dictionary/**'
  - 'src/lib/server/dictionary/**'
  - src/lib/components/markdown/lexicon-context.ts
  - src/lib/components/markdown/nodes/LexiconTerm.svelte
  - src/lib/components/questions/LexiconToggle.svelte
  - tests/fixtures/lexique/dictionnaire-reference.ts
  - 'src/routes/api/dictionnaire/**'
  - 'src/routes/api/admin/dictionnaire/**'
  - 'src/routes/(protected)/dashboard/admin/dictionnaire/**'
  - 'src/routes/(public)/glossaire/**'
  - 'src/routes/(public)/games/mathemo/dictionary-words.ts'
  - 'src/routes/(protected)/dev/mots-cliquables/**'
  - 'supabase/migrations/*_dictionnaire_*.sql'
---

# Dictionnaire, glossaire et mots cliquables

> Vérifié contre le code le 2026-10-10. L'état des lots de données et l'histoire de la reprise en
> base sont dans [lexique-progress.md](../wip/lexique-progress.md),
> [lexique/](../wip/lexique/) et [dictionnaire-en-base-progress.md](../wip/dictionnaire-en-base-progress.md)
> — cette doc ne les recopie pas.

## À quoi ça sert

Le **dictionnaire** des mots mathématiques, avec leurs définitions par niveau scolaire, sert à trois
endroits : la page publique du **glossaire**, le jeu Mathémo (mots à deviner) et les **mots
cliquables** des énoncés (un clic ouvre la fiche du mot, au niveau de l'élève).

Termes ([CONTEXT.md](../../CONTEXT.md), § « Le dictionnaire ») : Dictionnaire, Glossaire, Mot
cliquable. ⚠️ « lexique » désigne le **lore** (`src/lib/config/lore.ts`, voir
[univers-chiphre.md](univers-chiphre.md)), pas les mots mathématiques — même si le module des mots
cliquables s'appelle `src/lib/dictionary/` (nom historique du chantier « lexique »).

## Carte du code

| Fichier                                                               | Rôle                                                                                     |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `src/lib/dictionary/model.ts`                                         | Types (`MathTerm`, `GradedField`, `GradedContent`) et lecture par niveau                 |
| `src/lib/dictionary/entry-schema.ts`                                  | Zod d'une ligne de `dictionary_entries` → `MathTerm` (`rowToTerm`, `DICTIONARY_COLUMNS`) |
| `src/lib/server/dictionary/load.ts`                                   | `loadDictionary` : lecture en base, mémoire, repli ; `isDictionaryAdmin`                 |
| `src/routes/api/dictionnaire/+server.ts`                              | `GET /api/dictionnaire` : les entrées visibles, en JSON, avec cache public               |
| `src/lib/dictionary/fetch-dictionary.ts`                              | Côté navigateur : `fetchDictionary`, `dictionaryUrl`, `markDictionaryEdited`             |
| `src/routes/(public)/glossaire/`                                      | Page du glossaire (`+page.server.ts` lit la base, sélecteur de niveau, recherche)        |
| `src/routes/(public)/glossaire/[slug]/`                               | Page d'un terme : toutes ses définitions avec leur niveau ; renvoi nu → redirection 308  |
| `src/lib/dictionary/glossary-page.ts`                                 | `termKey`, `pageSlugFor`, `isBareRedirect`, `glossaryDescription` (pages du glossaire)   |
| `src/lib/server/sitemap-glossary.ts`                                  | `fetchGlossaryPages` : les pages du glossaire du plan du site, lues en anonyme           |
| `src/routes/(public)/games/mathemo/dictionary-words.ts`               | `playableTerms` : mots jouables réduits à nom / niveau / filières                        |
| `src/lib/dictionary/linker.ts`                                        | `createLinker` : repérage des mots dans l'AST d'ubumark (`TextNode.terms`)               |
| `src/lib/dictionary/card.ts`                                          | `lexiconCard`, `findPrincipal` : contenu de la fiche d'un mot                            |
| `src/lib/dictionary/runtime.ts`, `runtime-store.svelte.ts`            | Chargement à la demande (dictionnaire + repérage) au premier énoncé qui en a besoin      |
| `src/lib/dictionary/grade.ts`, `reader-grade.ts`                      | Niveau de lecture (`lexiconGrade`, `questionReadingGrades`, `provideReaderGrade`)        |
| `src/lib/components/markdown/lexicon-context.ts`                      | `provideLexicon`, `provideQuestionLexicon` : qui active les mots cliquables              |
| `src/lib/components/markdown/LexiconOff.svelte`                       | Coupe les mots dans ce qu'il contient (correction, résultat attendu)                     |
| `src/lib/components/markdown/nodes/LexiconTerm.svelte`                | Le mot souligné et sa fiche (dialogue accessible)                                        |
| `src/lib/dictionary/visibility.svelte.ts`, `card-terms.svelte.ts`     | Mots affichés ou masqués sur les cartes (appareil), mots repérés d'une carte             |
| `src/lib/components/questions/LexiconToggle.svelte`                   | Bouton « Mots du dictionnaire » d'une carte de question                                  |
| `src/lib/dictionary/consistency.ts`                                   | `checkDictionary`, `newProblems` : règles de cohérence (enregistrement admin et tests)   |
| `src/lib/dictionary/admin-draft.ts`                                   | Brouillon d'une entrée sur la page d'admin ↔ saisie envoyée au serveur                   |
| `src/lib/server/dictionary/admin.ts`                                  | `loadAdminDictionary`, `createEntry`, `updateEntry`, `loadVersions`                      |
| `src/routes/api/admin/dictionnaire/`                                  | `GET`/`POST` (liste, création), `PATCH [id]` (modifier, masquer), `GET [id]/versions`    |
| `src/routes/(protected)/dashboard/admin/dictionnaire/`                | Page d'admin : recherche, fiche (`EntryEditor.svelte`), masquer, historique              |
| `tests/fixtures/lexique/dictionnaire-reference.ts`                    | `REFERENCE_DICTIONARY` : jeu de référence figé, **tests seulement** (voir Invariants)    |
| `supabase/migrations/20261012153000_dictionnaire_en_base.sql`         | Tables, trigger d'historique, droits, RLS                                                |
| `supabase/migrations/20261013090000_dictionnaire_image_meme_site.sql` | Contrainte : image du site seulement (`//hôte` refusé)                                   |
| `supabase/migrations/20261015090000_dictionnaire_historique_*.sql`    | Historique écrit par le trigger seul (SECURITY DEFINER gardé par `is_admin()`)           |
| `supabase/migrations/20261016090300_dictionnaire_mots_lecture.sql`    | Données : les 4 mots de la lecture (copie figée `mots-lecture-2026-10-11.ts`)            |
| `supabase/migrations/20261030001000_dictionnaire_slug.sql`            | Adresse fixe `slug` de chaque entrée (`/glossaire/<slug>`), posée et figée par trigger   |

Page de test (admin seul) : `/dev/mots-cliquables` (`src/routes/(protected)/dev/mots-cliquables/+page.svelte`, ex-`/demo/mots-cliquables`).

## Modèle

### Une entrée (`MathTerm`, table `dictionary_entries`)

Une entrée par **mot et par sens** (index unique `term` + `sense`). Champs : `term`, `sense`
(étiquette d'homonyme : « carré (géométrie) » / « carré (puissance) »), `grade` (niveau
d'apparition), `tags` (thèmes), `definitions` et `exemples` (`GradedField`, ubumark), `history`,
`image` (chemin du site seulement), `synonyms`, `forms` (formes conjuguées reconnues dans les
énoncés : « résous » pour « résoudre »), `autoLink` (`false` = jamais souligné automatiquement,
liste fermée de mots trop courants), `derivedFrom` (renvoi d'un verbe ou adjectif vers son terme
principal), `seeAlso` (lien vers une page du Cabinet Noir, liste blanche `SEE_ALSO_PATHS`),
`sharedWith` (filières parallèles qui lisent aussi le terme). Colonnes propres à la base :
`position` (ordre d'origine : un renvoi vise le premier terme principal de son nom), `hidden`,
`updated_by`, dates, et `slug`.

`slug` est l'adresse de la page du terme (`/glossaire/<slug>`, chantier seo) : terme (+ sens), en
minuscules, sans accents, tirets (`base-puissance`, `ecart-interquartile`). Le trigger
`dictionary_entries_slug` (droits de l'appelant) la pose à la création, avec un suffixe `-2`, `-3`…
en cas de collision, puis la **fige** : renommer le terme ne la change pas (lien indexé par Google
jamais cassé, choix de David du 2026-10-29). Personne ne l'écrit, pas même l'admin.

`dictionary_entry_versions` garde, à chaque modification, l'entrée **telle qu'elle était avant**
(trigger `dictionary_entries_keep_version`, droits de l'appelant ; auteur et dates posés par le
trigger, jamais par l'appelant). Le trigger est `SECURITY DEFINER`, gardé par `is_admin()` :
personne n'écrit directement dans l'historique.

### Lecture par niveau (`model.ts`)

- `canRead(readerGrade, grade, sharedWith)` : un lecteur voit ce qui est rangé à son niveau ou
  avant (`hasAccessToGrade`), plus ce qui est partagé avec sa filière.
- `resolveGradedField` : mode `cumulative` (défaut, toutes les définitions accessibles) ou
  `discriminant` (la plus avancée seulement).
- `isTermVisibleTo`, `gradeMetBy` (niveau où ce lecteur rencontre le terme), `getTermsForGrade`.

### Chemin d'une lecture

1. **Serveur** : `loadDictionary(supabase, { fresh })` lit les entrées `hidden = false`, triées par
   `position`, par pages de 1 000 (`max_rows` de PostgREST), et valide chaque ligne par
   `rowToTerm` (une ligne invalide est ignorée et journalisée, pas fatale). Résultat gardé
   `DICTIONARY_MEMO_MS` (90 s) pour toute l'instance ; lectures simultanées fusionnées ; base
   injoignable → dernière lecture servie au plus `DICTIONARY_FALLBACK_MS` (15 min).
2. **Glossaire et Mathémo** : `+page.server.ts` appelle `loadDictionary` (ou `loadGlossary`,
   qui rend aussi l'adresse et la date de chaque entrée, lues dans la même requête et gardées
   dans la même mémoire, hors de `MathTerm`) ; l'admin (`isDictionaryAdmin`) lit frais.
3. **Navigateur (mots cliquables)** : `GET /api/dictionnaire`, cache `DICTIONARY_PUBLIC_CACHE`
   (navigateur 60 s, CDN 90 s) → une modification est visible en moins de 5 minutes. `?frais`
   n'est honoré que pour l'admin (`DICTIONARY_ADMIN_CACHE`), sinon ignoré.

### Pages du glossaire (chantier seo, 2026-10-29)

- `/glossaire` liste les termes ; chaque terme est un **lien** vers sa page (plus de fenêtre,
  choix B1 de David). Un renvoi nu (sans définition, exemple ni histoire : « multiplier ») mène
  droit à la page du terme cité (`pageSlugFor`).
- `/glossaire/<slug>` : titre d'onglet « terme (sens) : définition (maths) », description = première définition
  en texte brut (≤ 155 caractères), toutes les définitions et tous les exemples **chacun avec son
  niveau** (la page ne suit pas le filtre de niveau de la liste), histoire, synonymes, « Voir
  aussi », `BackLink` vers `/glossaire`. Un renvoi qui a sa propre définition (« Thalès », 6 en
  prod) garde sa page, avec « Voir : » le terme cité.
- Adresse inconnue ou hors format, entrée masquée → 404. Renvoi nu → **308** vers le terme
  cité, en un seul saut (`redirectTargetOf`) : jamais vers un autre renvoi nu ni vers lui-même
  (sinon le renvoi a sa page, avec « Voir : ») ; 404 si le terme cité manque.
- `sitemap.xml` liste chaque page (sauf renvois nus), `lastmod` = `updated_at` de l'entrée.

### Mots cliquables

- `MarkdownRenderer` lit le niveau posé par `provideLexicon` ; au premier énoncé qui en demande,
  `loadLexiconRuntime` charge ensemble le dictionnaire (`fetchDictionary`) et le module `runtime`
  (`createLexicon` → `createLinker`). Le texte s'affiche d'abord sans soulignement.
- `createLinker` repère, **première occurrence seulement**, les mots visibles au niveau de lecture
  (mot entier, formes, homonymes) et pose leurs positions dans `TextNode.terms` (`TermRange` :
  `start`, `end`, `ids`). Le nœud texte **n'est pas découpé** et l'AST reçu n'est jamais modifié
  (il peut venir du cache de rendu) : les champs de réponse voisins ne sont pas recréés à
  l'arrivée du dictionnaire (piège de forme d'AST, mémoire « ast-forme-stable-champs »).
- Marquage d'auteur dans ubumark (`TextNode.lexicon`, `LexiconMark`) : `[mot]{.def}` force,
  `{.def=carré (géométrie)}` tranche un homonyme, `{.nodef}` bloque. Homonyme non tranché → la
  fiche montre les deux sens.
- Lecture posée par `provideLexicon` (`LexiconReading`) : `grade` (définitions de la fiche),
  `linkGrade` (choix des mots soulignés), `link` (options de `linkDocument`). Un niveau seul vaut
  pour les deux, sans option (démo, structure, programmes).
- Sur une carte (`provideQuestionLexicon`, chantier `mots-cliquables`, 2026-11-17) :
  - **Élève** : son niveau (`readReaderGrade`, posé par le layout racine) pour les deux.
    **Professeur ou visiteur** (`questionReadingGrades`) : soulignement au **plus haut** niveau de
    la question (R3), fiche au **plus petit** (définitions les plus simples) ; un mot souligné que
    le plus petit niveau ne voit pas se lit au plus haut (`lexiconCard`, `fallbackGrade`).
    Un homonyme ouvre tous ses sens visibles, chacun lu ainsi : sur une question de translation
    4e + 3e, « image » montre « image (transformation) » et « image (fonction) », comme pour un
    élève de 3e ; pas de choix du sens selon le contexte (décidé par David le 2026-11-17).
    Niveau inconnu : aucun mot.
  - **Mots récents** (R1, `recentOnly`) : un mot n'est souligné d'office que s'il est rencontré
    (`gradeMetBy`, filières comprises) à l'année scolaire du lecteur ou à celle d'avant
    (`schoolYear`). Un nom trop ancien reste dans le motif : il occupe son texte, et l'occurrence
    suivante ne prend pas le relais. `{.def}` force toujours un mot ancien.
  - **Question de cours** (R4, `isCourseQuestion` : carte de cours ou `options.courseQuestion`) :
    aucun mot repéré d'office (`auto: false`, il donnerait la réponse) ; `{.def}` reste possible.
  - **Correction** (R2) : aucun mot. `LexiconOff` entoure le verso de `FlashCard` (résultat
    attendu, énoncé rempli, correction), le résultat attendu et le verso de `CorrectionCard` ;
    `CourseCardBack` coupe lui-même.
- Qui active : `QuestionCard`, `FlashCard`, `CorrectionCard` via `provideQuestionLexicon`.
  `null` coupe les mots : **évaluation notée** (`collectOnly`), fiche d'un mot déjà ouverte, choix
  de QCM (un choix est un bouton), correction. Sans fournisseur (chat, fiches, aperçus) : aucun mot
  souligné.
- **Soulignement masqué par défaut sur une carte** (R6, chantier `mots-cliquables`, 2026-11-17) :
  `provideQuestionLexicon` pose aussi le compteur des mots de la carte (`card-terms.svelte.ts`) ;
  chaque `LexiconTerm` repéré s'y annonce. `LexiconToggle` (bouton « Mots du dictionnaire »,
  `aria-pressed`) n'apparaît que si le compteur est non nul, et bascule `setLexiconShown`
  (`visibility.svelte.ts`) : choix valable pour toutes les cartes, mémorisé sur l'appareil
  (`chiphre:mots-du-dictionnaire`), masqué si le stockage est illisible. Masqué : à la souris, le
  mot reste cliquable et se souligne au survol ; au doigt (`canHover`, `(hover: hover)`), il reste
  du texte ; au clavier, `tabindex=-1`. Hors d'une carte (démo, structure, programmes), les mots
  restent soulignés.

## Invariants

- **La base est la seule source** pour le site (ADR 0022) ; tout passe par `loadDictionary`.
- **Le jeu de référence ne sert qu'aux tests** : `tests/fixtures/lexique/dictionnaire-reference.ts`
  est la copie figée du dictionnaire à sa reprise en base (2026-10-10). Aucun fichier de
  l'application (hors `__tests__`) ne l'importe. Il ne suit pas les modifications de l'admin : les
  règles de cohérence et les copies des lots y sont vérifiées, la base est vérifiée par
  `checkDictionary` à chaque enregistrement.
- **Le résultat de `loadDictionary` ne dépend pas de l'appelant** : la mémoire est partagée, seul
  le filtre `hidden` (explicite dans la requête, même pour l'admin à qui la RLS montre les entrées
  masquées) décide. Une policy de lecture par niveau ou par école casserait cette mémoire.
- **Pas de suppression** : aucun `DELETE` accordé (42501) ; une entrée se **masque** (`hidden`),
  car un renvoi ou un marquage `{.def=…}` peut la viser.
- Lecture publique des entrées non masquées (anon compris) ; écriture et lecture des masquées et de
  l'historique : `is_admin()` seul.
- `image` : chemin du site, jamais d'URL externe (pistage) — contrainte SQL + Zod. `seeAlso` :
  liste blanche (`SEE_ALSO_PATHS`, contrainte `^/chiffrement`).
- Aucune trace côté serveur des mots consultés (décision du 2026-10-08).

## Comment étendre

- **Corriger / ajouter une entrée** : la page `/dashboard/admin/dictionnaire` (admin, après
  élévation : `requireAdmin`). Chercher un mot, modifier ses définitions par niveau (avec aperçu),
  synonymes, formes, sens, « jamais souligné », filières partagées, renvoi ; ajouter une entrée ;
  masquer ou réafficher ; lire l'historique. Chaque enregistrement relit tout le dictionnaire,
  applique la modification en mémoire et passe `checkDictionary` : un **nouveau** problème
  (`newProblems`) refuse l'enregistrement, avec un message en français, et rien n'est écrit.
  Après l'écriture : `forgetDictionary()` (serveur), puis `markDictionaryEdited()` et
  `refreshLexiconRuntime()` (navigateur).
- **Ne pas corriger le jeu de référence** pour suivre la base : il est figé. Un test qui a besoin
  d'une donnée absente fabrique son entrée ou en ajoute une copie figée sous `tests/fixtures/`.
- **Activer les mots cliquables dans un nouveau cadre** : appeler `provideLexicon` (ou
  `provideQuestionLexicon`) pendant l'initialisation du composant ; ne pas passer le niveau de
  composant en composant.
- **Nouvelle colonne** : migration additive, puis `pnpm db:types` (même PR),
  `DICTIONARY_COLUMNS` et `dictionaryRowSchema` dans `entry-schema.ts`, `MathTerm` dans `model.ts`.

## Tests

| Test                                                                              | Prouve                                                                    |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `tests/integration/dictionnaire-en-base.test.ts`                                  | Droits et RLS : lecture anon, écriture admin seul, pas de DELETE, trigger |
| `tests/integration/dictionnaire-lecture.test.ts`                                  | Lecture : base locale = référence + ajouts, filtre `hidden`, mémoire 90 s |
| `tests/integration/dictionnaire-mots-lecture.test.ts`                             | Les 4 mots de la lecture : lus par un visiteur, cohérents                 |
| `tests/integration/dictionnaire-verbes-consigne.test.ts`                          | Les 10 verbes de consigne jamais soulignés : migration, garde, rollback   |
| `tests/integration/dictionnaire-exemples-seo.test.ts`                             | Les 14 exemples du chantier seo : migration, garde, rollback              |
| `tests/integration/dictionnaire-exemples-seo-lot2.test.ts`                        | Les 42 exemples du lot 2 (seo) : migration, garde, rollback               |
| `tests/integration/dictionnaire-admin.test.ts`                                    | Enregistrement admin : refus de cohérence, historique, masquage           |
| `tests/integration/dictionnaire-slug.test.ts`                                     | Adresse fixe : calcul, figée au renommage, suffixe `-2`, masquée cachée   |
| `src/lib/server/dictionary/__tests__/load.test.ts`                                | Mémoire, repli, lecture unique                                            |
| `src/routes/api/dictionnaire/__tests__/server.test.ts`                            | Cache public, `?frais` réservé à l'admin                                  |
| `src/lib/components/questions/__tests__/mots-du-dictionnaire.svelte.test.ts`      | R6 : masqué par défaut, bouton, survol, doigt, clavier, stockage bloqué   |
| `src/lib/dictionary/__tests__/entry-schema.test.ts`                               | Toutes les entrées relues à l'identique par le schéma                     |
| `src/lib/dictionary/__tests__/reference*.test.ts`                                 | Jeu de référence : cohérence, lots 0b → 0h au mot près, chiffrement       |
| `src/lib/dictionary/__tests__/consistency.test.ts`                                | Règles de cohérence : référence sans problème, chaque refus 10 → 16       |
| `src/lib/dictionary/__tests__/`                                                   | Repérage (`linker`), fiche (`card`), chargement à la demande              |
| `src/lib/components/questions/__tests__/QuestionCard-champ-stable.svelte.test.ts` | Le champ de réponse n'est pas recréé à l'arrivée du repérage              |

Copies figées des lots validés par David : `tests/fixtures/lexique/` (aucun test ne lit `docs/`).

## Décisions

- [ADR 0022](../adr/0022-dictionnaire-en-base-admin.md) — le dictionnaire vit en base, l'admin le
  modifie ; pas de suppression ; historique.
- Décisions du chantier (repérage mixte, niveau de lecture, contextes, traces) : début de
  [lexique-progress.md](../wip/lexique-progress.md). Spécification des mots cliquables :
  [lot2-mots-cliquables-spec.md](../wip/lexique/lot2-mots-cliquables-spec.md).

## Écarts connus

- **Le jeu de référence s'éloigne de la base** à mesure que l'admin modifie le dictionnaire :
  c'est voulu (les tests ne dépendent pas des données vivantes). Une base locale fraîche
  (`db:reset`) contient la reprise (la référence), puis les entrées ajoutées par migration, chacune
  avec sa copie figée sous `tests/fixtures/lexique/` (2026-10-11 : `mots-lecture-2026-10-11.ts`) ;
  `dictionnaire-lecture.test.ts` et `dictionnaire-en-base.test.ts` comparent la base à cette suite.
