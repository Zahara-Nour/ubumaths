# Dictionnaire, glossaire et mots cliquables

> Vérifié contre le code le 2026-10-10. Chantier vivant : l'état des lots (données, page d'admin,
> suppression du fichier) est dans [lexique-progress.md](../wip/lexique-progress.md),
> [lexique/](../wip/lexique/) et [dictionnaire-en-base-progress.md](../wip/dictionnaire-en-base-progress.md)
> — cette doc ne les recopie pas.

## À quoi ça sert

Le **dictionnaire** des mots mathématiques, avec leurs définitions par niveau scolaire, sert à trois
endroits : la page publique du **glossaire**, le jeu Mathémo (mots à deviner) et les **mots
cliquables** des énoncés (un clic ouvre la fiche du mot, au niveau de l'élève).

Termes ([CONTEXT.md](../../CONTEXT.md), § « Le dictionnaire ») : Dictionnaire, Glossaire, Mot
cliquable. ⚠️ « lexique » désigne le **lore** (`src/lib/config/lore.ts`, voir
[univers-chiphre.md](univers-chiphre.md)), pas les mots mathématiques — même si le module des mots
cliquables s'appelle `src/lib/lexicon/` (nom historique du chantier « lexique »).

## Carte du code

| Fichier                                                               | Rôle                                                                                     |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `src/lib/dictionary/model.ts`                                         | Types (`MathTerm`, `GradedField`, `GradedContent`) et lecture par niveau                 |
| `src/lib/dictionary/entry-schema.ts`                                  | Zod d'une ligne de `dictionary_entries` → `MathTerm` (`rowToTerm`, `DICTIONARY_COLUMNS`) |
| `src/lib/server/dictionary/load.ts`                                   | `loadDictionary` : lecture en base, mémoire, repli ; `isDictionaryAdmin`                 |
| `src/routes/api/dictionnaire/+server.ts`                              | `GET /api/dictionnaire` : les entrées visibles, en JSON, avec cache public               |
| `src/lib/dictionary/fetch-dictionary.ts`                              | Côté navigateur : `fetchDictionary`, `dictionaryUrl`, `markDictionaryEdited`             |
| `src/routes/(public)/glossaire/`                                      | Page du glossaire (`+page.server.ts` lit la base, sélecteur de niveau, recherche)        |
| `src/routes/(public)/games/mathemo/dictionary-words.ts`               | `playableTerms` : mots jouables réduits à nom / niveau / filières                        |
| `src/lib/lexicon/linker.ts`                                           | `createLinker` : repérage des mots dans l'AST d'ubumark (`TextNode.terms`)               |
| `src/lib/lexicon/card.ts`                                             | `lexiconCard`, `findPrincipal` : contenu de la fiche d'un mot                            |
| `src/lib/lexicon/runtime.ts`, `runtime-store.svelte.ts`               | Chargement à la demande (dictionnaire + repérage) au premier énoncé qui en a besoin      |
| `src/lib/lexicon/grade.ts`, `reader-grade.ts`                         | Niveau de lecture (`lexiconGrade`, `provideReaderGrade`)                                 |
| `src/lib/components/markdown/lexicon-context.ts`                      | `provideLexicon`, `provideQuestionLexicon` : qui active les mots cliquables              |
| `src/lib/components/markdown/nodes/LexiconTerm.svelte`                | Le mot souligné et sa fiche (dialogue accessible)                                        |
| `src/lib/data/math-dictionary-fr.ts`                                  | **Ancienne source**, reprise en base ; ne sert plus qu'aux tests (voir Écarts)           |
| `supabase/migrations/20261012153000_dictionnaire_en_base.sql`         | Tables, trigger d'historique, droits, RLS                                                |
| `supabase/migrations/20261013090000_dictionnaire_image_meme_site.sql` | Contrainte : image du site seulement (`//hôte` refusé)                                   |

Page de démonstration : `src/routes/(public)/demo/mots-cliquables/+page.svelte`.

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
`updated_by`, dates.

`dictionary_entry_versions` garde, à chaque modification, l'entrée **telle qu'elle était avant**
(trigger `dictionary_entries_keep_version`, droits de l'appelant ; auteur et dates posés par le
trigger, jamais par l'appelant).

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
2. **Glossaire et Mathémo** : `+page.server.ts` appelle `loadDictionary` ; l'admin
   (`isDictionaryAdmin`) lit frais.
3. **Navigateur (mots cliquables)** : `GET /api/dictionnaire`, cache `DICTIONARY_PUBLIC_CACHE`
   (navigateur 60 s, CDN 90 s) → une modification est visible en moins de 5 minutes. `?frais`
   n'est honoré que pour l'admin (`DICTIONARY_ADMIN_CACHE`), sinon ignoré.

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
- Niveau de lecture (`lexiconGrade`) : celui de l'élève connecté (`readReaderGrade`, posé par le
  layout racine), sinon le plus petit niveau de la question (visiteur, professeur).
- Qui active : `QuestionCard`, `FlashCard`, `CorrectionCard` via `provideQuestionLexicon`.
  `null` coupe les mots : **évaluation notée** (`collectOnly`), fiche d'un mot déjà ouverte, choix
  de QCM (un choix est un bouton). Sans fournisseur (chat, fiches, aperçus) : aucun mot souligné.

## Invariants

- **La base est la seule source** pour le site (ADR 0022) ; tout passe par `loadDictionary`.
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

- **Corriger / ajouter une entrée** : aujourd'hui, une migration de données ou l'admin en base ;
  la page `/dashboard/admin/dictionnaire` est prévue (ADR 0022) mais pas encore livrée — voir
  [dictionnaire-en-base-progress.md](../wip/dictionnaire-en-base-progress.md). Après un
  enregistrement : `forgetDictionary()` (serveur), puis `markDictionaryEdited()` et
  `refreshLexiconRuntime()` (navigateur).
- **Activer les mots cliquables dans un nouveau cadre** : appeler `provideLexicon` (ou
  `provideQuestionLexicon`) pendant l'initialisation du composant ; ne pas passer le niveau de
  composant en composant.
- **Nouvelle colonne** : migration additive, puis `db:types` (génère depuis la prod : deux PR),
  `DICTIONARY_COLUMNS` et `dictionaryRowSchema` dans `entry-schema.ts`, `MathTerm` dans `model.ts`.

## Tests

| Test                                                                              | Prouve                                                                     |
| --------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `tests/integration/dictionnaire-en-base.test.ts`                                  | Droits et RLS : lecture anon, écriture admin seul, pas de DELETE, trigger  |
| `tests/integration/dictionnaire-lecture.test.ts`                                  | Lecture par le site : base = fichier, filtre `hidden`, mémoire 90 s, image |
| `src/lib/server/dictionary/__tests__/load.test.ts`                                | Mémoire, repli, lecture unique                                             |
| `src/routes/api/dictionnaire/__tests__/server.test.ts`                            | Cache public, `?frais` réservé à l'admin                                   |
| `src/lib/dictionary/__tests__/entry-schema.test.ts`                               | Toutes les entrées relues à l'identique par le schéma                      |
| `src/lib/data/__tests__/math-dictionary-fr.test.ts`                               | Règles de cohérence des données, lots 0b → 0h au mot près                  |
| `src/lib/lexicon/__tests__/`                                                      | Repérage (`linker`), fiche (`card`), chargement à la demande               |
| `src/lib/components/questions/__tests__/QuestionCard-champ-stable.svelte.test.ts` | Le champ de réponse n'est pas recréé à l'arrivée du repérage               |

Copies figées des lots validés par David : `tests/fixtures/lexique/` (aucun test ne lit `docs/`).

## Décisions

- [ADR 0022](../adr/0022-dictionnaire-en-base-admin.md) — le dictionnaire vit en base, l'admin le
  modifie ; pas de suppression ; historique.
- Décisions du chantier (repérage mixte, niveau de lecture, contextes, traces) : début de
  [lexique-progress.md](../wip/lexique-progress.md). Spécification des mots cliquables :
  [lot2-mots-cliquables-spec.md](../wip/lexique/lot2-mots-cliquables-spec.md).

## Écarts connus

- **Le fichier `src/lib/data/math-dictionary-fr.ts` existe encore** (9 300 lignes) : le site ne le
  lit plus, mais les tests de cohérence et plusieurs tests de composants l'importent comme jeu de
  données. Sa suppression attend un `deploy:prod` (PR 3 du chantier) ; les règles de cohérence
  doivent alors tourner sur un jeu de référence.
- **Pas encore de page d'admin** ni de règles de cohérence au moment de l'enregistrement
  (ADR 0022) : `forgetDictionary` et `markDictionaryEdited` n'ont pas encore d'appelant hors tests.
- **CONTEXT.md** dit encore « table à créer » pour le Dictionnaire : la table existe
  (`dictionary_entries`). À corriger dans CONTEXT.md (signalé, pas tranché ici).
- Un marquage `[mot]{.def}` au milieu de `**gras**` casse le gras (même limite que `{.rappel}`).
