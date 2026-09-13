# « Mon cours » — chapitres, fiches, quiz

> État au **2026-09-13**. Tous les chiffres de ce document sont **mesurés en
> production** (MCP Supabase read-only, EU), pas déduits du code.
>
> Chantier voisin, **clos** : [cahier-texte-travaux-multiples-progress.md](cahier-texte-travaux-multiples-progress.md).
>
> Le prompt de reprise `prompts/prompt-mon-cours-quiz.md` a été **supprimé** : il
> demandait de trancher le contrat du quiz, ce qui est fait (option 1, le
> 2026-09-13). Le laisser aurait fait refaire l'étude.

## Le fait qui commande tout le reste

```
class_chapters ............ 0     chapter_quiz_questions .... 0
chapter_templates ......... 0     chapter_quiz_results ...... 0
chapter_documents ......... 0     chapter_checklist_items ... 0
chapter_exercises ......... 0     chapter_worksheets ........ 0
```

**La rubrique est entièrement construite et n'a jamais servi.** Pas un chapitre,
pas un modèle. Toute amélioration technique y est prématurée tant que David n'y
met rien — et la question produit qui bloque le quiz (voir plus bas) se posera
beaucoup mieux avec du contenu sous les yeux.

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

### Ce qu'un modèle emporte — et ce qu'il n'emporte pas

Le `content_snapshot` couvre **quatre** types de contenu, et le refus de
publication le dit noir sur blanc :

> `Cannot publish empty template. Add at least one document, quiz question, checklist item, or exercise.`

`applyContentSnapshotToChapter` réapplique ces quatre-là ; la migration vers une
nouvelle version **efface puis réapplique** `chapter_documents`,
`chapter_quiz_questions`, `chapter_checklist_items`, `chapter_exercises`.

⚠️ **`chapter_worksheets` n'en fait PAS partie.** Conséquences vérifiées :

- instancier un modèle **n'apporte pas** ses fiches ;
- migrer un chapitre vers une version plus récente **ne touche pas** aux fiches
  — donc aucune perte, mais aucune propagation non plus.

Ce n'est pas un oubli : la table a été créée après le mécanisme de modèles, et
la frontière n'a pas été franchie faute d'arbitrage.

**Tranché le 2026-09-13 : on en reparle quand un modèle existera.**
`chapter_templates` est à 0, la question est théorique tant que David n'a pas
écrit un modèle et senti ce qui manque. Ne pas relancer d'ici là.

Pour mémoire, l'étude d'accès : inclure les fiches serait **sûr**, la policy
élève exige `student_has_worksheet_access` en plus du chapitre visible, donc
instancier ne distribuerait rien. Le vrai prix est ailleurs : la migration de
version **efface puis réapplique**, elle effacerait donc les rattachements de
fiches faits à la main dans la classe.

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

### Deux choix à connaître

- **La correction reste côté client.** `isCorrect` est calculé dans le
  navigateur et posté tel quel, comme partout ailleurs (automaths, SRS). Admis
  pour un entraînement ; **à revoir si le quiz doit un jour compter comme une
  note** — ça suppose une revalidation serveur, qui ne se rajoute pas après coup.
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

## Ce qui rapporterait le plus, dans l'ordre

1. **Créer un chapitre.** Un seul suffit à faire apparaître ce qui manque
   vraiment, et à donner un support concret à la question du quiz.
2. **Trancher la question du quiz** (les trois options ci-dessus).
3. **Trancher les fiches dans les modèles** (les inclure au `content_snapshot`
   ou pas).
4. Rattacher des exercices aux points de programme, pour que le suivi cesse de
   compter zéro.

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
