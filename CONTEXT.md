# CONTEXT.md — le vocabulaire de Chiphre

Glossaire du domaine : **un terme, un sens**. À lire avant de nommer une variable, un fichier, une
table ou d'écrire à David. Les décisions figées (le _pourquoi_) vivent dans [docs/adr/](docs/adr/).

- Terme ambigu en cours de discussion → **demander**, ne pas inventer un synonyme.
- Nouveau terme tranché → l'ajouter ici dans le même commit.
- Le code dit autre chose que ce glossaire → le signaler, ne pas choisir seul.

Colonne « Code » : identifiant anglais utilisé dans le dépôt (règle du CLAUDE.md).

---

## La plateforme

| Terme        | Sens                                                                 | Code / note                                                  |
| ------------ | -------------------------------------------------------------------- | ------------------------------------------------------------ |
| **Chiphre**  | La plateforme (marque, **singulier**, domaine chiph.re).             | « ubumaths » = nom historique (dépôt, 3 résidus volontaires) |
| chiphres     | « chiffres » à l'ubuesque — lexique du lore, **pas** la marque.      | `src/lib/config/lore.ts`                                     |
| Mathres      | Les mathématiques, en wording interne (lore pataphysique Jarry/Ubu). | `docs/Chiphres/`                                             |
| Shtam        | La gazette parodique du Royaume : fausses nouvelles mathresques.     | `/shtam`, `src/lib/server/shtam/` ; jamais « rubrique »      |
| Vrai du faux | Encadré obligatoire en fin d'article du Shtam : le fait réel.        |                                                              |

⛔ « Chiphres » (pluriel) comme nom de marque : faux.

## Les personnes et les frontières

| Terme             | Sens                                                                                         | Code / note                                          |
| ----------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| **Professeur**    | Le **seul** enseignant de la plateforme (David). Voit tous les élèves.                       | `role = 'teacher'`, trigger `enforce_single_teacher` |
| **Admin**         | Compte distinct ; le prof y accède par **élévation** (mot de passe admin, cookie court).     | `requireAdmin(locals)`                               |
| **Élève**         | Utilisateur mineur. Données sous RGPD.                                                       | `role = 'student'`                                   |
| **École**         | **Frontière sociale / safeguarding** : un élève n'interagit qu'avec des élèves de son école. | `my_school()`, `same_school()`                       |
| **Classe**        | Sous-groupe d'**organisation** (un dossier), **pas** une frontière d'accès pour le prof.     | `classes`, `class_members`                           |
| Élève hors-classe | Élève sans classe active ; le prof le voit (rubrique « Non assignés »).                      |                                                      |
| Élève archivé     | Retiré d'une classe : relit ce qu'il a reçu, ne reçoit plus rien.                            | `class_members.left_at` (posé par trigger)           |

→ [ADR 0002](docs/adr/0002-mono-professeur-ecole-frontiere-sociale.md)

## Le Cabinet Noir (chiffrement)

| Terme                        | Sens                                                                              | Code / note                                |
| ---------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------ |
| Cabinet Noir de Turingrad    | La section du chiffrement (nom affiché).                                          | `/chiffrement`, `src/lib/ciphers/`         |
| **Chiffrer**                 | Transformer un message **avec** une clé pour le rendre illisible.                 | `*Encrypt`                                 |
| **Déchiffrer**               | Retrouver le message **avec** la clé.                                             | `*Decrypt`                                 |
| **Décrypter**                | Retrouver le message **sans** la clé (fréquences, force brute…).                  | onglet « Décrypter », `caesarBruteForce`   |
| Chiffre (un)                 | Une méthode d'écriture secrète : le chiffre de César, la scytale…                 | `cipher`                                   |
| Substitution / transposition | Remplacer les lettres / changer leur ordre (la scytale transpose).                |                                            |
| Inverse modulaire            | a′ tel que a × a′ ≡ 1 (mod 26) ; n'existe que si a est premier avec 26.           | `modInverse`, `src/lib/ciphers/modular.ts` |
| Indice de coïncidence        | Probabilité que deux lettres tirées du texte soient égales (≈ 0,078 en français). | `indexOfCoincidence`                       |
| Kasiski (méthode de)         | Longueur d'une clé de Vigenère déduite des écarts entre séquences répétées.       | `kasiski`                                  |
| Matrice inversible mod 26    | Matrice 2 × 2 dont le déterminant est premier avec 26 : clé de Hill déchiffrable. | `hillInverse`, `src/lib/ciphers/hill.ts`   |

⛔ « Crypter » : déconseillé par les spécialistes de la sécurité (chiffrer sans clé n’a pas de sens). Écrire chiffrer, ou décrypter.

## Le cours

| Terme                        | Sens                                                                          | Code                              |
| ---------------------------- | ----------------------------------------------------------------------------- | --------------------------------- |
| **Mon cours**                | L'espace où le prof organise ses chapitres par classe.                        |                                   |
| **Chapitre**                 | Unité de cours d'une classe : documents, fiches, quiz, decks.                 | `class_chapters`                  |
| **Modèle de chapitre**       | Chapitre réutilisable d'une année / classe à l'autre ; emporte ses fiches.    | `chapter_templates`               |
| **Instanciation**            | Chapitre créé depuis un modèle (le chapitre d'origine en est une, ordinaire). | `chapter_template_instantiations` |
| **Fiche**                    | Feuille d'exercices (PDF via Typst).                                          | `worksheets`                      |
| **Distribuer / affectation** | Donner une fiche à une classe ; l'affectation survit à la dépublication.      | `worksheet_assignments`           |
| **Cahier de texte**          | Vue chronologique des séances et du travail donné.                            |                                   |

### ⚠️ « Publier » a TROIS sens — toujours préciser lequel

| Colonne                    | Sens                                             |
| -------------------------- | ------------------------------------------------ |
| `worksheets.status`        | la fiche est **terminée** (rédaction)            |
| `chapter_templates.status` | le modèle est **diffusable**                     |
| `<contenu>.published_at`   | **mis à disposition des élèves** de cette classe |

Les policies testent `published_at <= now()`, jamais `is not null` (une date programmée ne publie pas
en avance). → [ADR 0005](docs/adr/0005-publication-par-element-acces-herite-de-la-classe.md) ·
`docs/architecture/database-schema.md` §`published_at`

## Les questions

| Terme                    | Sens                                                                                                                                                                                                                                                                                                                                                                                      | Code                                                                            |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| **Modèle de question**   | Ce que le prof rédige : énoncé paramétré, cases, correction.                                                                                                                                                                                                                                                                                                                              | `question_templates`                                                            |
| **Variation**            | Paramétrage alternatif d'un **même cas pédagogique** ; tirée **par élève** → difficulté équivalente exigée.                                                                                                                                                                                                                                                                               | `question_templates.variations[]`                                               |
| **Instance**             | La question générée qu'un élève voit (seed déterministe).                                                                                                                                                                                                                                                                                                                                 |                                                                                 |
| **Case**                 | Zone de réponse d'une question (MathLive).                                                                                                                                                                                                                                                                                                                                                | `blanks[]`                                                                      |
| **QCM**                  | Question à choix.                                                                                                                                                                                                                                                                                                                                                                         | type `multiple_choice`                                                          |
| **Question de cours**    | Intention d'un modèle : vérifier une **connaissance** ou la **compréhension** (définition, fait mathématique, propriété, méthode) sans demander de procédure. Marqueur posé sur une carte, un QCM ou un vrai/faux ; regroupe ces questions dans le chapitre et son paquet SRS.                                                                                                            | `options.courseQuestion` (`isCourseQuestion`)                                   |
| **Carte de cours**       | Forme d'une question de cours **sans case ni choix** : recto (énoncé) / verso (réponse de cours, puis détail), l'élève répond dans sa tête et **s'auto-évalue**. Exclue des évaluations notées.                                                                                                                                                                                           | type `course_card` → [ADR 0009](docs/adr/0009-carte-de-cours-type-explicite.md) |
| **Résultat attendu**     | Premier niveau de correction : l'énoncé complété par la bonne réponse, construit automatiquement depuis le modèle. En entraînement, il met face à face la réponse de l'élève (`3 + 5 ≠ 9` en rouge) et la bonne (`= 8` encadré vert).                                                                                                                                                     | (à créer)                                                                       |
| **Correction**           | Le texte / les étapes montrés après réponse.                                                                                                                                                                                                                                                                                                                                              | `correction.steps`                                                              |
| **Correction concise**   | Ce que l'élève voit d'abord : la correction sans ses **détails**. Toute correction (carte, question, en classe, révision) s'ouvre concise ; un seul interrupteur bascule en correction détaillée.                                                                                                                                                                                         | (à créer)                                                                       |
| **Correction détaillée** | La correction avec tous ses **détails** affichés, chacun à sa place. Sur une fiche PDF, la fiche choisit concise ou détaillée.                                                                                                                                                                                                                                                            | (à créer)                                                                       |
| **Détail**               | Partie d'une correction masquée en vue concise, marquée dans son texte → [ADR 0017](docs/adr/0017-correction-concise-et-detaillee.md). Quatre types : **calcul intermédiaire** (lignes en plus, dans le calcul), **rappel** (règle, propriété, définition ; en marge, ou sous la ligne sur téléphone), **méthode** (démarche, encadré avant le calcul), **attention** (erreur fréquente). | (à créer)                                                                       |
| **Motif de forme**       | Contrainte sur l'**écriture** attendue (ex. « forme réduite »), au-delà de l'équivalence.                                                                                                                                                                                                                                                                                                 | `mathAST/pattern/`, `requiredForm`                                              |
| **Série**                | Composition de questions : des catégories de modèles, chacune avec un nombre de répétitions et une durée ; tirée à neuf à chaque usage (en classe, flash-cards, interactif, course aux nombres, évaluation).                                                                                                                                                                              | `series` (verrouillée dès qu'un élève a commencé), panier `questionCart`        |
| **Série statistique**    | Données d'une enquête (valeurs, éventuellement avec effectifs ou en classes) dont on calcule des indicateurs et trace des diagrammes. **Toujours avec l'adjectif** : sans lui, « série » = composition de questions.                                                                                                                                                                      | `Dataset` (brut), `FrequencyTable` (valeurs + effectifs) ; jamais `series`      |
| **Série figée**          | Série dont les instances sont fixées par une graine : même copie pour toute la classe (exercice d'une fiche d'automatismes).                                                                                                                                                                                                                                                              | → [ADR 0011](docs/adr/0011-fiche-d-automatismes-figee-par-graine.md)            |
| **Relecture**            | Revue des 633 questions TinyMath importées, lot par lot.                                                                                                                                                                                                                                                                                                                                  | `docs/relecture/`                                                               |

Les types de question : `numerical_exact`, `numerical_decimal`, `numerical_rounded`,
`algebraic_transform`, `fill_in_blanks`, `multiple_choice`, plus `course_card`.

## Les usages des questions

| Terme                  | Sens                                                                                                                                                                                                                | Code                                                                                                                              |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Automaths**          | Catalogue des modèles de questions publiés, où l'on compose une série (panier) avant de la lancer sous une forme.                                                                                                   | `/automaths`                                                                                                                      |
| **En classe**          | Forme d'une série projetée par le prof : questions une à une avec minuteur, retour en arrière possible, puis grilles des questions et des corrections.                                                              | `TestMode` `display`                                                                                                              |
| **Flash-cards**        | Forme d'une série en autonomie : carte retournable, l'élève dit s'il avait trouvé (auto-évaluation), sans chrono ; jamais une évaluation.                                                                           | `TestMode` `flash`                                                                                                                |
| **Entraînement**       | Forme d'une série en autonomie : l'élève répond question par question, correction et score à la fin.                                                                                                                | `TestMode` `interactive`                                                                                                          |
| **Course aux nombres** | Forme d'une série : toutes les questions à la fois, temps global, score.                                                                                                                                            | `TestMode` `course`                                                                                                               |
| **SRS / révision**     | Répétition espacée (FSRS) : decks, cartes, notes Again/Hard/Good/Easy.                                                                                                                                              | `srs_*`, `docs/ref/srs/`                                                                                                          |
| **Deck**               | Paquet de cartes de révision (un chapitre peut en porter). ≠ `Deck` d'UbuSlides (diaporama).                                                                                                                        | `srs_decks`, `chapter_decks`                                                                                                      |
| **Quiz de chapitre**   | Quiz d'un chapitre, sur le moteur de questions. Supprimé le 2026-09-15 (jamais servi).                                                                                                                              | migration `20260915340000_drop_ancien_quiz_de_chapitre`                                                                           |
| **Tentative**          | Une réponse d'élève enregistrée.                                                                                                                                                                                    | `skill_attempts`                                                                                                                  |
| **Auto-évaluation**    | Réponse jugée par l'élève lui-même (flash-cards, carte de cours) ; en FSRS, un seul résultat par jour et par question, le meilleur.                                                                                 | tentative `source: 'student_self'` → [ADR 0016](docs/adr/0016-auto-evaluation-meilleur-resultat-du-jour.md)                       |
| **Évaluation**         | Série assignée par le prof à des élèves, sous forme d'Entraînement ou de Course aux nombres ; tirage propre à chaque élève (graine enregistrée) ; les réponses sont enregistrées, vérifiées, puis donnent une note. | `evaluations` (`form`, `time_limit`), `evaluation_assignments` → [ADR 0015](docs/adr/0015-evaluation-notee-correction-serveur.md) |

La **correction des réponses est côté client** : les statistiques sont un outil pour l'élève, jamais
une note. → [ADR 0001](docs/adr/0001-correction-cote-client.md)

## Le moteur mathématique (`src/lib/mathAST/`)

| Terme                      | Sens                                                                                                                                           | Code                                                                                                                                        |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **AST**                    | Arbre d'une expression, produit par le parseur (LaTeX / ubumark).                                                                              | `types.ts`, `parser/`                                                                                                                       |
| **`normalize`**            | Forme canonique **qui développe** ; calcul interne, ses étapes ne sont **pas** pédagogiques.                                                   | `normal/normalize.ts`                                                                                                                       |
| **`tidy`**                 | Mise au propre **sans développer** (ordre canonique, grandeurs dans l'unité scolaire) ; raconte ses étapes.                                    | `tidy/`                                                                                                                                     |
| **`simplify`**             | « L'écriture la plus propre » : `tidy`, puis développer **seulement si moins cher**.                                                           | `simplify/`                                                                                                                                 |
| **`pedagogical-simplify`** | Pipeline de règles de motifs, choisies par **intention**, qui produit des étapes pour l'élève.                                                 | `pedagogical-simplify/`, `pattern/rule-sets/`                                                                                               |
| **Intention**              | `réduire` · `développer` · `factoriser` · `auto` — une politique sur « faut-il développer ? ».                                                 | `SimplifyIntent` → [ADR 0007](docs/adr/0007-un-moteur-quatre-intentions.md)                                                                 |
| **Décideur**               | `areEquivalent` : juge si la réponse d'un élève vaut la réponse attendue. Chemin **propre**, indépendant de `simplify`.                        | `equivalence.ts`, `equivalenceForm`                                                                                                         |
| **Empreinte**              | Forme comparée par le décideur (réduite **pour comparer**, jamais affichée).                                                                   | → [ADR 0006](docs/adr/0006-reduire-pour-comparer-pas-pour-ecrire.md)                                                                        |
| **Hypothèse de l'énoncé**  | Condition sur une variable libre de la réponse (« x > 0 », « n entier »), déclarée par le modèle ; le décideur ne compare que là où elle vaut. | `answerAssumptions` (à créer) → `TypeContext.assumptions` → [ADR 0012](docs/adr/0012-hypotheses-de-l-enonce-restreignent-la-comparaison.md) |
| **Palier**                 | Famille de problèmes du moteur d'inéquations (1 linéaire, 2a, 2b second degré, 3 rationnel). **Pas** un niveau de détail.                      | `pedagogical-*`                                                                                                                             |
| **Grandeur**               | Nombre muni d'une unité (`~3[m.s^-1]~`) ; `12000 m ≡ 12 km`.                                                                                   | `units/`, `docs/ref/notation-unites.md`                                                                                                     |
| **ubumark**                | Notation texte des énoncés (maths entre `~…~`).                                                                                                | `src/lib/ubumark/`                                                                                                                          |
| **Panel**                  | Tableau de référence de ce que rendent `simplify` et les 4 intentions.                                                                         | `docs/ref/panel-simplifications.md`                                                                                                         |

Sens précis de l'équivalence par domaine : `docs/ref/convention-equivalence.md`.

⚠️ Dans une expression évaluée, les variables `e` et `i` sont lues comme la constante d'Euler et
l'unité imaginaire.

## Le référentiel pédagogique

Seule la **famille B** (compétences mathématiques) est d'actualité ; la famille A est abandonnée
→ [ADR 0008](docs/adr/0008-referentiel-famille-a-abandonne.md).

| Terme                       | Sens                                                                                                      | Code                            |
| --------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------- |
| **Compétence mathématique** | L'une des six, stables tous niveaux : Chercher, Modéliser, Représenter, Raisonner, Calculer, Communiquer. | `math_competences`              |
| **Composante**              | Unité évaluée d'une compétence mathématique, calibrée par niveau scolaire.                                | `math_competence_subdimensions` |
| **Indicateur**              | Ce qui permet de dire qu'un niveau est validé.                                                            | (pas de colonne en base)        |
| **Thème**                   | Regroupement de contenus du programme officiel.                                                           | `curriculum_themes`             |
| **Objectif**                | Attendu du programme dans un thème (mot visible de l'élève : « Mes objectifs »).                          | `curriculum_objectives`         |
| **Point du programme**      | Élément précis d'un objectif, suivi par le prof (« suivi programme »).                                    | `curriculum_points`             |

Échelle 1-4 jamais montrée comme une note (états ◯ / 🟠 / 🟢 / ✨).

### Termes bannis

| ❌ Ne pas dire                              | ✅ Dire                                           |
| ------------------------------------------- | ------------------------------------------------- |
| compétence (seule)                          | **compétence mathématique**, ou **composante**    |
| compétence atomique                         | **composante**                                    |
| rubrique                                    | **indicateur**                                    |
| domaine (au sens Sacoche)                   | **thème**                                         |
| Mode Révision (forme de série)              | **En classe** (≠ révision SRS)                    |
| Quiz (forme de série)                       | **Entraînement**                                  |
| niveau de détail, palier (d'une correction) | **correction concise** / **correction détaillée** |
