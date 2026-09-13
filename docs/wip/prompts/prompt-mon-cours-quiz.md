# Prompt — « Mon cours » : trancher le contrat du quiz de chapitre

> À coller dans une nouvelle session Claude Code.
> État complet et mesuré : `docs/wip/mon-cours-chapitres-progress.md`.

---

## Contexte

Chiphre (dépôt `ubumaths`), application de maths, **production live** avec des
données d'élèves mineurs. `main` est déployé. Lire `CLAUDE.md` avant de toucher
quoi que ce soit — en particulier le workflow git et la règle sur les migrations
(question d'accès en français **avant** d'écrire du SQL, tests d'intégration
prouvés rouges, `security-auditor`, rollback en commentaire).

La rubrique « Mon cours » offre, par classe, des chapitres contenant des
documents, des exercices, une checklist d'objectifs, un quiz, et — depuis
septembre 2026 — des fiches.

## L'état, mesuré en production le 2026-09-13

```
class_chapters ............ 0     chapter_quiz_questions .... 0
chapter_templates ......... 0     chapter_checklist_items ... 0
chapter_documents ......... 0     chapter_worksheets ........ 0
chapter_exercises ......... 0     question_templates ........ 2 (0 publiée)
```

**Tout est construit, rien n'est utilisé.** Ne pas prendre ça pour une panne :
c'est l'état normal d'une rubrique que David n'a pas encore alimentée.

Refaire ces mesures au démarrage (MCP Supabase read-only) plutôt que de croire
ce document : il vieillit.

## Le sujet : le quiz de chapitre n'a jamais rien affiché

Le code interrogeait `question_templates.question`, `.answer`, `.explanation`.
**Aucune de ces colonnes n'existe.** La requête échouait en silence et
`ChapterQuiz` filtre les questions sans modèle. La requête morte a déjà été
retirée ; l'action `submitQuiz` renvoie un 404 explicite.

Le blocage restant n'est pas un bug, c'est **deux modèles qui ne se
rencontrent pas** :

- `src/lib/components/cours/ChapterQuiz.svelte` est câblé en **vrai/faux** :
  `answer: boolean`, puis `userAnswer === currentTemplate.answer`.
- `question_templates.type` est contraint à six valeurs, **aucune n'étant un
  vrai/faux** : `numerical_exact`, `numerical_decimal`, `numerical_rounded`,
  `algebraic_transform`, `fill_in_blanks`, `multiple_choice`.
- Une question ne porte pas « une réponse » mais des **`variations`** (`jsonb`) :
  un `statement`, des `variables` à résoudre par élève (`"1..9"`, `"eval:2k"`),
  et une charge utile propre au type (`choices` + `correctChoiceIndex`, ou
  `blanks` avec `expectedAnswer`).

Le schéma de liaison est prêt : `chapter_quiz_questions` porte
`question_template_id`, `display_order`, `points_override`.

## Ce qu'on attend de cette session

**D'abord une étude, pas du code.** La question est produit avant d'être
technique, et elle appartient à David.

1. **Rassembler les faits** : relire `ChapterQuiz.svelte`, la page
   `dashboard/student/cours/[chapterId]` (serveur et vue), le moteur de rendu et
   de validation des questions déjà utilisé ailleurs (`/automaths`, les fiches,
   les exercices — chercher le résolveur de variables et le validateur de
   réponse), et `chapter_quiz_results`.
2. **Chiffrer les trois options** ci-dessous : ce que chacune coûte, ce qu'elle
   permet, ce qu'elle ferme.
3. **Poser la question à David en français**, avec une recommandation motivée.
   **Ne rien coder avant sa réponse.**

### Les trois options connues

| #   | Option                                                                                      | Ce que ça donne                                                           | Ce que ça coûte                                                                        |
| --- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| 1   | Le quiz **réutilise le moteur de questions**                                                | Toute la richesse : six types, variations par élève, validation existante | Résolution des variables par élève, rendu par type, validation, stockage de la réponse |
| 2   | Le quiz **reste vrai/faux**, sur des `multiple_choice` à deux choix projetés sur un booléen | Le moins cher, marche demain                                              | Il faut créer des modèles exprès, et « pair / impair » n'est pas « vrai / faux »       |
| 3   | Le quiz **abandonne `question_templates`** et porte ses propres énoncés                     | Simple, autonome, comme la checklist                                      | On perd la réutilisation et les variations                                             |

Chercher s'il en existe une quatrième avant de présenter celles-là.

### Un préalable, quelle que soit l'option

`question_templates` compte **2 lignes, aucune publiée**. Les 633 questions
TinyMath sont en relecture (41/633) et **rien n'est publié, c'est voulu** — ⛔ ne
pas proposer d'accélérer ce processus, David l'a refusé le 2026-09-07. Le quiz
n'aura donc pas de matière avant, et ça doit figurer dans la recommandation.

## Deux autres questions ouvertes sur le même chantier

À poser en même temps, elles sont bon marché :

1. **Les fiches dans les modèles de chapitre.** Un modèle emporte documents,
   quiz, objectifs et exercices — pas les fiches (`chapter_worksheets` a été
   créée après). Instancier n'apporte donc pas les fiches ; migrer ne les touche
   pas non plus (pas de perte, pas de propagation). Faut-il les ajouter au
   `content_snapshot` et aux deux chemins d'application ? Argument pour : une
   fiche appartient au professeur et n'est liée à aucune classe.
2. **Le programme n'est pas alimenté** : 453 points semés, mais 0 exercice
   rattaché à un point et 0 séance citant un point. La couverture par classe
   calcule sur du vide. Est-ce un chantier ou un abandon ?

## Invariant à ne jamais casser

`chapter_worksheets` : **rattacher une fiche à un chapitre ne la distribue
pas**. La policy de l'élève exige `student_has_worksheet_access` en plus du
chapitre visible, donc une fiche préparée reste invisible, lien compris. Ce
garde est dans la **policy** et non dans l'API, exprès. Un test d'intégration
le prouve (`tests/integration/chapter-worksheets-rls.test.ts`, rouge si on
retire cette seule condition). Ne pas « simplifier ».

## Pièges de ce chantier

- **`ChapterQuiz` filtre en silence** les questions sans modèle : un quiz vide ne
  dit pas pourquoi il est vide. C'est ce qui a caché le bug des colonnes
  fantômes pendant toute la vie de la fonctionnalité.
- **Une requête PostgREST sur une colonne inexistante échoue sans bruit** si son
  erreur n'est pas lue, et le typecheck ne la voit pas : les noms de colonnes
  sont des chaînes.
- **Vérifier avant d'affirmer qu'un symbole est mort.** `instantiateTemplate` a
  été déclaré sans appelant à tort, à cause d'un `head -5` qui tronquait un
  grep.
- **Ne pas parroter ce document.** Refaire les mesures, relire le code.

## Contraintes d'environnement

- Machine 8 Go : **jamais** `pnpm check`, `pnpm lint`, `pnpm build`,
  `npx tsc --noEmit`. Utiliser `pnpm check:incremental` (qui refuse de tourner si
  Supabase local est démarré → `pnpm db:stop` d'abord) et `pnpm lint:fast`.
- Les tests d'intégration ne tournent **pas** en CI : les lancer localement
  (`pnpm db:start` puis `pnpm test:integration <fichier>`).
- `pnpm db:migrate` est **refusé par le classifieur** en mode auto : préparer la
  migration, la faire relire, et laisser David lancer `db:migrate` puis
  `db:types`.
