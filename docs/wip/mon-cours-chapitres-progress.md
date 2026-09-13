# « Mon cours » — chapitres, fiches, quiz

> État au **2026-09-13**. Tous les chiffres de ce document sont **mesurés en
> production** (MCP Supabase read-only, EU), pas déduits du code.
>
> Chantier voisin, **clos** : [cahier-texte-travaux-multiples-progress.md](cahier-texte-travaux-multiples-progress.md).
> Prompt de reprise : [prompts/prompt-mon-cours-quiz.md](prompts/prompt-mon-cours-quiz.md).

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
la frontière n'a pas été franchie faute d'arbitrage. **Question ouverte pour
David.** Argument pour l'inclure : une fiche appartient au professeur et n'est
liée à aucune classe (c'est l'affectation qui l'est), elle se prête donc bien à
un modèle de niveau — contrairement à un document uploadé, que le code copie
d'ailleurs « as refs, not uploaded files ».

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

## Le quiz de chapitre — bloqué, et pas par un bug

### Ce qui a été réparé

Le code interrogeait `question_templates.question`, `.answer` et `.explanation`.
**Aucune de ces colonnes n'existe.** La requête échouait à chaque affichage sans
erreur visible, et `ChapterQuiz` filtre les questions sans modèle : **le quiz
n'a donc jamais affiché quoi que ce soit**, depuis toujours.

La requête morte a été retirée ; l'action `submitQuiz` renvoie un 404 explicite
au lieu de calculer un `isCorrect` sur une colonne fantôme.

### Le vrai blocage : deux modèles qui ne se rencontrent pas

`ChapterQuiz.svelte` est **câblé en vrai/faux** :

```ts
answer: boolean;
const userAnswerCorrect = userAnswer === currentTemplate.answer;
```

Or `question_templates.type` est contraint à **six valeurs, dont aucune n'est un
vrai/faux** :

```
numerical_exact · numerical_decimal · numerical_rounded
algebraic_transform · fill_in_blanks · multiple_choice
```

Et une question ne porte pas une réponse : elle porte des **`variations`**
(`jsonb`), chacune avec un `statement`, des `variables` à résoudre par élève, et
une charge utile propre au type. Exemple réel en base :

```jsonc
// type = multiple_choice
{
	"statement": "Quelle est la parité de ce nombre ?\n$${{expression}}$$",
	"variables": [
		{ "name": "k", "expression": "1..9" },
		{ "name": "expression", "expression": "eval:2k" }
	],
	"choices": [
		{ "content": "pair", "isCorrect": true },
		{ "content": "impair", "isCorrect": false }
	],
	"correctChoiceIndex": "0"
}
```

Le schéma de liaison, lui, **est prêt** : `chapter_quiz_questions` porte
`question_template_id`, `display_order`, `points_override`. Le lien vers le
système de questions existe. Ce qui manque est le **contrat** entre les deux.

### La question à trancher, en français

Comment une `variation` devient-elle une question de quiz de chapitre ? Trois
réponses possibles, non exclusives :

1. **Le quiz cesse d'être vrai/faux** et réutilise le moteur de rendu et de
   validation des questions (celui de `/automaths`, des fiches et des
   exercices). Le plus juste, le plus cher : il faut résoudre les variables par
   élève, rendre le type, valider la réponse.
2. **Le quiz reste vrai/faux** et n'accepte que des `multiple_choice` à deux
   choix, qu'il projette sur un booléen. Le moins cher, mais il faudra créer des
   modèles exprès, et « pair / impair » n'est pas « vrai / faux ».
3. **Le quiz n'utilise plus `question_templates`** et porte ses propres énoncés,
   comme les objectifs de checklist. On perd la réutilisation et les variations.

⚠️ **Rien n'est décidé.** Ne pas coder avant que David ait tranché.

### Un préalable indépendant du choix

`question_templates` compte **2 lignes en production, aucune publiée** — deux
essais (`Essai 2`, `Essai3`). Les 633 questions TinyMath sont en cours de
relecture (41/633) et **rien n'est publié, c'est voulu**. Quel que soit le
contrat retenu, le quiz n'aura pas de matière avant.

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
