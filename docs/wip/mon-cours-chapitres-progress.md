# « Mon cours » — chapitres, fiches, quiz

> État au **2026-09-14**. Tous les chiffres de ce document sont **mesurés en
> production** (MCP Supabase read-only, EU), pas déduits du code.
>
> Chantier voisin, **clos** : [cahier-texte-travaux-multiples-progress.md](cahier-texte-travaux-multiples-progress.md).
>
> Le prompt de reprise `prompts/prompt-mon-cours-quiz.md` a été **supprimé** : il
> demandait de trancher le contrat du quiz, ce qui est fait (option 1, le
> 2026-09-13). Le laisser aurait fait refaire l'étude.

## Le fait qui commandait tout le reste — levé le 2026-09-14

**Relevé en production le 2026-09-14** (MCP Supabase read-only, EU) :

```
class_chapters ............ 1     chapter_quiz_questions .... 0
chapter_templates ......... 1     chapter_checklist_items ... 0
chapter_documents ......... 1     chapter_worksheets ........ 0
chapter_exercises ......... 0     instanciations ............ 0
```

**La rubrique a commencé à servir.** Un chapitre, un modèle, un document — c'est
peu, mais ce n'est plus zéro, et le blocage décrit ci-dessous n'en est plus un :
l'usage réel a produit en une session six correctifs et ajouts (niveaux des
modèles, bouton « Faire un modèle », suppression, mise à jour depuis un
chapitre, classes inactives masquées, téléversement de documents). Voir
[§ Le cycle de vie d'un modèle](#le-cycle-de-vie-dun-modèle--complété-le-2026-09-14).

#### L'état précédent, pour mémoire

Jusqu'au 2026-09-14, **les huit compteurs valaient zéro** : la rubrique était
entièrement construite et n'avait jamais servi. La conclusion qu'on en tirait —
« toute amélioration technique y est prématurée » — était juste, et c'est
justement la première mise en service qui a montré ce qui manquait. Le
diagnostic « construit mais jamais utilisé » vaut toujours pour d'autres
chantiers, voir
[bascule-annee-scolaire-etat-des-lieux.md](bascule-annee-scolaire-etat-des-lieux.md).

Pour comparaison, ce qui EST utilisé : 12 fiches, 2 séances de cahier de texte
avec leurs 2 travaux, 453 points de programme sur 18 thèmes.

## Le modèle de données, en deux étages

**Un chapitre appartient à une CLASSE** — `class_chapters.class_id`. Il n'y a pas
de chapitre « de niveau ».

**Le niveau vit un étage au-dessus** : `chapter_templates` porte `grades
text[]`. On rédige un modèle une fois, on le publie, on l'**instancie** dans
chaque classe. `chapter_template_instantiations` garde le lien (version
d'origine, version courante, `is_detached`), ce qui permet de migrer un chapitre
vers une version plus récente du modèle ou de le détacher.

Écran : `/dashboard/teacher/contenu/templates`. Route d'instanciation :
`POST /api/teacher/chapter-templates/[id]/instantiate`. Action de formulaire
`instantiate` sur la page de détail du modèle.

Donc pour deux classes de même niveau : **un modèle, deux instanciations**.

### Ce qu'un modèle emporte

Le `content_snapshot` couvre **cinq** types de contenu : documents, questions
de quiz, tâches, corvées (exercices) et **fiches**.
`extractContentSnapshotFromChapter` les lit toutes les cinq,
`applyContentSnapshotToChapter` les réapplique, et `computeDiff` les compare
d'une version à l'autre.

L'instanciation rattache les fiches **sans rien distribuer** : la policy élève
exige `student_has_worksheet_access` en plus du chapitre visible.

La mise à jour vers une version plus récente **ne supprime plus rien**, si bien
qu'elle n'efface pas les rattachements faits à la main. Voir
[publication-progressive-progress.md](publication-progressive-progress.md),
phase 5.

⚠️ Le message de refus de publication est resté en arrière : il énumère quatre
types (« document, quiz question, checklist item, or exercise ») alors que
`hasContent` accepte aussi un modèle qui ne porte que des fiches. Texte
trompeur, garde correcte.

#### Historique — les fiches en étaient exclues jusqu'au 2026-09-13

Avant la PR #256, `chapter_worksheets` ne faisait pas partie du snapshot :
instancier un modèle n'apportait pas ses fiches, et migrer un chapitre n'y
touchait pas. Ce n'était pas un oubli — la table avait été créée après le
mécanisme de modèles, et la frontière attendait un arbitrage.

**Ne pas se fier à ce paragraphe pour décrire l'état courant** : il est daté, et
sa version au présent a déjà induit en erreur une fois. Le code fait foi —
`grep worksheet src/lib/server/chapter-templates.ts`.

## Les fiches dans un chapitre — ✅ livré

PR #244 (table + RLS + 10 tests) et #245 (câblage), en production.

**L'invariant, et il est négatif** : rattacher ne distribue **pas**. La policy de
l'élève sur `chapter_worksheets` exige `student_has_worksheet_access` en plus du
chapitre visible — la même fonction qui garde la fiche elle-même. Une fiche
préparée mais pas encore affectée reste invisible, **lien compris**.

Ce garde vit dans la **policy**, pas dans l'API, et c'est délibéré : sinon la
jonction deviendrait un canal de distribution parallèle le jour où quelqu'un
réécrit la route, et David perdrait la préparation à l'avance qu'il demandait
(« je mets mes ressources dans Mon cours en avance et je distribue au fur et à
mesure »).

Côté professeur, un onglet « Fiches » dans l'éditeur de chapitre. Le sélecteur ne
propose que des fiches **publiées** : un brouillon n'est pas distribuable, donc
l'élève ne le verrait jamais.

Côté élève, `/dashboard/student/cours/[chapterId]` demande
`?class_id=…&chapter_id=…`. Le filtre passe par la jonction lue **avec les droits
de l'élève** : l'intersection « rangée ici » ∩ « distribuée à moi » est donc
gratuite, la route n'a pas à la calculer.

## Le quiz de chapitre — ✅ rebranché (2026-09-13)

**Tranché par David : option 1** — le quiz réutilise le moteur de questions.
Les options « rester vrai/faux » et « énoncés propres » sont écartées, ne pas
les reproposer.

### Ce qui a été trouvé en plus des colonnes fantômes

Trois défauts indépendants coexistaient sur le même chemin, aucun visible au
typecheck :

1. `ChapterQuiz` postait vers `/api/chapters/quiz/submit` — **route
   inexistante** (il n'y a pas de `src/routes/api/chapters`, ni d'attrape-tout).
   La vraie est `/api/student/chapters/[id]/quiz/submit`, qui était complète
   depuis toujours (Zod, SRS, XP).
2. Le corps envoyé ne correspondait pas : `chapterQuizQuestionId` /
   `submittedAnswer` contre `quizQuestionId` / `timeSpentSeconds` attendus.
3. L'action de formulaire `submitQuiz` n'avait **aucun appelant** — aucun
   formulaire ne postait `?/submitQuiz`. Supprimée.

Et un quatrième, qui aurait rejoué le scénario : `addQuizQuestion` acceptait un
modèle **en brouillon**, que la RLS rend invisible à l'élève. Un quiz rempli de
brouillons serait redevenu vide en silence.

Signe que le composant n'avait jamais tourné : sa branche QCM tenait la bonne
réponse pour toujours première (`isCorrectChoice = index === 0`).

### Ce qui a été livré

- `src/lib/server/chapters-quiz.ts` — `buildQuizInstances()` : charge les
  modèles **aux droits de l'élève** (la policy fait le filtre « publié »),
  génère une instance par question, et **retourne ce qu'elle a écarté** avec son
  motif (`modele_indisponible` / `generation_impossible`). Une panne de lecture
  rend une erreur, pas un quiz vide.
- Graine **déterministe sur (question, élève)** via `generateStudentSeed` : deux
  élèves voient des valeurs différentes, le même élève revoit les siennes. Il ne
  peut donc pas recharger jusqu'à tomber sur une version plus facile.
- `ChapterQuiz.svelte` — rendu et correction délégués à `FlashCard interactive`
  (`maxAttempts=1`, correction au verso si faux) ; les questions écartées sont
  **annoncées** ; un échec d'enregistrement lève un toast au lieu d'un
  `// Continue anyway`.
- `QuizQuestion.svelte` **supprimé** (211 lignes, plus aucun appelant).
- Côté professeur : le sélecteur ne propose que des modèles **publiés**, la liste
  distingue publié / brouillon / supprimé, et le refus d'un brouillon remonte son
  motif (400, plus 500 muet).

**Aucune migration.** Le schéma suffisait : `chapter_quiz_questions` portait
déjà le lien, `chapter_quiz_results.submitted_answer` est du texte libre, et la
policy « Students can view published templates » existait déjà.

### Ce qui reste vrai — le carburant

`question_templates` compte **2 lignes, 0 publiée**. Tout ce qui descend de
cette table est donc à zéro, quiz compris — mais aussi **/automaths**, qui ne
lit que `status='published'`, et les évaluations. Ce n'est pas une panne.

⚠️ Et les 633 TinyMath ne changeront pas ça pour les classes actives : leurs
thèmes sont collège (Entiers 228, Décimaux 83, Fractions 58…) alors que les
classes actives sont **1SPE ×3 et 2DE ×1**. Pour voir le quiz tourner cette
année, la matière doit venir de modèles écrits au niveau lycée
(`/dashboard/admin/questions/create`).

### Deux bugs trouvés par la revue, et corrigés

- **Le score se comptait deux fois.** Le `{#key}` qui isole l'état de la carte
  entre deux questions la remonte aussi au **retour en arrière** : le bouton
  « Valider » revenait, l'élève revalidait, le score montait encore — et le
  serveur ré-attribuait de l'XP à chaque passage (XP farmable à l'infini). Un
  quiz de trois questions pouvait finir à 6/3. Corrigé en dérivant le score de
  `answers` (source unique) et en coupant `interactive` sur une question déjà
  traitée. Deux tests le prouvent, aucun test n'utilisait plus d'une question.
- **Le bandeau accusait toujours le professeur** de ne pas avoir publié, y
  compris quand le motif réel était `generation_impossible` (modèle publié mais
  défectueux). Le champ `reason` existait et n'était lu nulle part : le même
  mensonge sur la cause, déplacé d'un cran. Le message distingue maintenant les
  deux.

### Les deux faiblesses préexistantes de l'audit — traitées le 2026-09-13

**1. La question soumise doit appartenir au chapitre de l'URL.** L'en-tête de
`/api/student/chapters/[id]/quiz/submit` promettait une « validation de
contexte » qui n'existait pas : `params.id` était vérifié comme UUID, puis
jamais comparé. Rien d'exploitable (la policy d'insertion revérifie classe et
visibilité), mais un commentaire qui décrit un garde absent finit par être cru.
`submitQuizAnswer` compare désormais, et refuse en 400.

Au passage, sa signature passe à un **objet nommé** : elle prenait six
paramètres positionnels dont un booléen et un nombre voisins, et une inversion
y aurait été silencieuse.

**2. Le plafond de tentatives — et ce qu'il ne fait PAS.** Cap à 100 essais par
question et par élève, refusé en 429.

⚠️ **Ce plafond ne protège pas d'un élève qui scripterait son jeton.** Mesuré :
`relacl` de `chapter_quiz_results` donne `authenticated=arwdxtm`, donc le droit
`INSERT` — une écriture directe via PostgREST ne passe pas par l'API. Fermer ce
chemin demanderait un garde **en base** (trigger, comme les soumissions Python)
ou le retrait du droit `INSERT` au profit d'une fonction `SECURITY DEFINER`.

⛔ **Tranché par David le 2026-09-13 : on laisse comme ça. Ne plus le
proposer.** Le dégât plafonne à un élève qui gonfle SES statistiques et pollue
SON calendrier SRS ; aucune donnée d'un autre élève n'est atteignable, et
l'exposition est celle, déjà acceptée, de `worksheet_error_reports`.

Ce que le plafond protège réellement : un client qui re-soumet en boucle. Ce
n'est pas théorique — la première version de `ChapterQuiz` re-postait à chaque
retour en arrière.

Bornes du dégât résiduel, vérifiées en prod : l'élève ne peut insérer que
**ses** lignes, sur un chapitre visible de **sa** classe ; et il n'existe
**aucune policy `UPDATE` ni `DELETE`** sur la table — malgré les droits `w`/`d`
du rôle, la RLS les refuse. Il ne peut donc ni modifier ni effacer un résultat,
seulement en ajouter. L'exposition est identique à celle de
`worksheet_error_reports`, déjà acceptée, qui n'a elle aussi qu'un plafond
applicatif.

### Le tirage des versions — tranché le 2026-09-13

Un modèle de question peut porter **plusieurs variations** : deux énoncés
différents sous le même titre (« un rectangle de 7 sur 4 » / « un jardin de 7 m
sur 4 m »). Il y a donc DEUX tirages, et je n'avais posé la question que sur le
premier :

| Tirage               | Décision                          |
| -------------------- | --------------------------------- |
| Quelles valeurs ?    | par élève, stable s'il revient    |
| Quelle **version** ? | **par élève** — David, 2026-09-13 |

Donc deux élèves d'une même classe peuvent recevoir des **énoncés différents**,
pas seulement des nombres différents. Assumé : ça limite la copie entre voisins.

⚠️ **Corollaire pour l'écriture des questions** : les variations d'un même
modèle doivent être **équivalentes en difficulté**. Une variation plus dure que
les autres rend le quiz inégal sans que personne ne le voie.

Sans effet aujourd'hui — mesuré le 2026-09-13 : les 2 modèles en production et
les 41 questions TinyMath suivies ont **une seule variation** chacun. Le
comportement ne se manifestera qu'à la première question à plusieurs versions.

À noter : la route d'aperçu accepte un paramètre `variationIndex`, le valide, et
ne s'en sert pas — il n'existe aujourd'hui aucun moyen d'imposer une variation.

### Deux choix à connaître

- **La correction reste côté client — ⛔ tranché le 2026-09-13, ne plus le
  proposer.** `validateAnswer` n'est appelé que depuis `FlashCard`,
  `QuestionCard` et `QuestionSlide` ; il n'est importé nulle part sous
  `src/routes/api/` ni `src/lib/server/`. Le serveur reçoit un verdict déjà
  rendu (`isCorrect: z.boolean()`), et l'instance envoyée au navigateur porte la
  réponse attendue. Vrai pour **tout** le système de questions : /automaths, le
  SRS, les tests, le quiz.

  Conséquence à garder en tête : **les statistiques de quiz sont un outil pour
  l'élève, pas une mesure sur laquelle noter.** Le jour où David voudrait noter,
  le chantier n'est pas le plafond d'insertions mais la correction serveur — le
  dépôt sait déjà le faire (combats navadra, exercices Python), ça n'a
  simplement jamais été appliqué aux `question_templates`.

- **`FlashCard` interactive poste aussi vers `/api/skill-attempts`** (table vide
  à ce jour). Le quiz alimente donc le suivi par compétence en plus de
  `chapter_quiz_results`. Effet de bord assumé, validé par David.

## Le cahier de texte — ✅ clos

Les quatre phases de « plusieurs travaux par séance » sont livrées, phase 2
comprise : les anciennes colonnes `homework_content` / `homework_due_date`
n'existent plus, et rien ne les référence. Détail et pièges dans
[cahier-texte-travaux-multiples-progress.md](cahier-texte-travaux-multiples-progress.md).

## Le programme — construit, non alimenté

```
curriculum_themes ......... 18     journal_entry_points ...... 0
curriculum_points ......... 453    exercise_curriculum_points  0
```

Le référentiel est semé, mais **aucun exercice n'est rattaché à un point** et
**aucune séance ne cite de point**. La couverture par classe et la heatmap
d'avancement calculent donc sur du vide. Voir
[suivi-programme-progress.md](suivi-programme-progress.md).

**Ce n'est ni un chantier ni un abandon : c'est de la saisie.** Tranché le
2026-09-13 — David taguera lui-même, rien à coder.

Les trois faits qui le disent :

- l'interface existe **des deux côtés** : taguer un exercice
  (`/dashboard/teacher/contenu/exercices/[id]`, onglet points du programme) et
  cocher les points d'une séance (cahier de texte) ;
- le référentiel couvre **exactement les niveaux actifs** — 1_SPE 173 points,
  2de 185, 6ᵉ 95 (aucune classe active) ;
- le cahier de texte **a deux jours** (première entrée le 2026-09-11) : le zéro
  mesure la nouveauté de l'usage, pas un défaut.

Et `reconcileAutoCoverage` remplit la couverture toute seule à partir des tags
d'exercices, de modèles et d'évaluations : taguer les 128 exercices existants
suffit à faire vivre la heatmap.

## Le cycle de vie d'un modèle — complété le 2026-09-14

Première mise en service réelle. Le modèle de données était complet ; **les
chemins d'interface ne l'étaient pas**, et chaque manque ne s'est vu qu'à
l'usage.

| Ce qui manquait                                 | Ajouté                                                                      |
| ----------------------------------------------- | --------------------------------------------------------------------------- |
| Les niveaux du formulaire ignoraient Chiphre    | Le sélecteur de `grades` suit le référentiel de l'application               |
| Aucun moyen de créer un modèle depuis un cours  | Bouton « Faire un modèle » → action `createTemplate` sur le chapitre        |
| Aucun moyen de supprimer un modèle              | Action `delete` (brouillon **et** publié ; archivé exclu)                   |
| Un brouillon était instanciable                 | Refusé : un modèle non publié ne se diffuse pas                             |
| Rien ne reliait le modèle à son chapitre source | Le chapitre d'origine est enregistré comme **instanciation** (option B)     |
| Le modèle ne pouvait pas être remis à jour      | Action `updateFromChapter` — « mettre à jour le modèle depuis un chapitre » |

Actions de la page modèle, au 2026-09-14 :
`update` · `publish` · `updateFromChapter` · `delete` · `archive` ·
`instantiate` (`contenu/templates/[templateId]/+page.server.ts`).

### Pourquoi le chapitre source devient une instanciation

Deux options étaient sur la table : une colonne `source_chapter_id` sur le
modèle, ou réutiliser `chapter_template_instantiations`. **Option B retenue par
David.** Le chapitre qui a servi à créer le modèle est un chapitre rattaché à ce
modèle comme les autres — il se met à jour, se détache, et « mettre à jour le
modèle depuis un chapitre » n'a pas à traiter le cas d'origine à part.

⚠️ **Pas de `UNIQUE (chapter_id)`** sur `chapter_template_instantiations` :
rien n'interdit en base qu'un chapitre soit rattaché à deux modèles. Connu, non
corrigé, pas rencontré.

### Supprimer un modèle ne touche à rien d'autre

La question avait été posée explicitement : faut-il supprimer le chapitre dont
le modèle est tiré, et les instanciations ? **Non.** Un chapitre est une
ressource de classe qui vit sa vie ; le modèle n'est qu'un patron. Supprimer le
modèle retire le patron, les chapitres restent — simplement détachés.

## Autres correctifs de la même mise en service

- **Les classes inactives apparaissaient dans « Mon cours »** — celles des
  années clôturées comprises. Corrigé (PR #265).
- **Un chapitre exigeait une couleur** sans que rien ne s'en serve : le champ a
  été retiré du formulaire, pas seulement rendu facultatif (PR #263).
- **Documents de chapitre** : plafond à 25 Mo et téléversement direct
  navigateur → storage (PR #266, #267, #268). Le détail, et le piège des deux
  gardes de taille, sont dans
  [database-schema.md](../architecture/database-schema.md).

## Ce qui rapporterait le plus, dans l'ordre

> Mis à jour le **2026-09-14**. Les points 1 et 3 de la liste d'origine sont
> faits ; le 2 l'était déjà (option 1, le 2026-09-13).

1. ✅ ~~**Créer un chapitre**~~ — fait le 2026-09-14, et la prédiction s'est
   vérifiée : un seul chapitre a fait apparaître six manques d'interface que
   l'analyse n'avait pas vus.
2. ✅ ~~**Trancher la question du quiz**~~ — option 1, le 2026-09-13.
3. ✅ ~~**Trancher les fiches dans les modèles**~~ — incluses au
   `content_snapshot`, PR #256.
4. **Rattacher des exercices aux points de programme**, pour que le suivi cesse
   de compter zéro. ⚠️ De la saisie, pas du code (tranché le 2026-09-13).
5. **Mettre du contenu dans le chapitre existant** — il n'a pour l'instant
   qu'un document : ni exercice, ni objectif, ni question de quiz, ni fiche.
   Les cinq types de contenu et leur publication au fur et à mesure sont
   livrés, mais aucun n'a encore été exercé sur des élèves réels.

## Pièges relevés sur ce chantier

- **`ChapterQuiz` filtre en silence** les questions sans modèle : un quiz qui
  n'affiche rien ne dit pas pourquoi. C'est ce qui a caché le bug des colonnes
  fantômes pendant toute la vie de la fonctionnalité.
- **Une requête PostgREST sur une colonne inexistante échoue sans bruit** si son
  erreur n'est pas lue. Le typecheck ne la voit pas : les noms de colonnes sont
  des chaînes.
- **`instantiateTemplate` a bien un appelant** — je l'ai cru absent une fois, à
  cause d'un `head -5` qui tronquait la sortie du grep. Vérifier avant
  d'affirmer qu'un symbole est mort.
- **Le rattachement d'une fiche n'est pas une distribution**, et ça ne tient qu'à
  une condition dans une policy. Ne jamais la retirer « pour simplifier ».
- **Un `<input type="file">` placé dans un `{#if !selectedFile}` disparaît au
  moment précis où le formulaire en a besoin** : le fichier était choisi, et le
  POST partait vide (« Fichier requis »). Une condition d'affichage sur un champ
  de formulaire est une condition d'**existence**.
- **Un plafond de taille a deux gardes** — le bucket et la contrainte CHECK. En
  relever une seule fait monter le fichier puis échouer l'enregistrement, en
  laissant un orphelin dans le bucket.
- **Vercel plafonne le corps d'une requête bien en dessous de 25 Mo** : aucune
  garde applicative ne rattrape un 413. Un gros fichier ne transite pas par le
  serveur, il va au storage en direct.
- **L'accès élève aux fiches est hérité de la classe, pas distribué** : un élève
  inscrit après la publication voit tout, sans redéploiement. Figé par
  `tests/integration/eleve-inscrit-apres-publication.test.ts`.
