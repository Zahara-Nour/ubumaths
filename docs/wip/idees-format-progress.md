# Chantier `idees-format` — journal

Mettre en œuvre les idées retenues dans [idees-format-exercices.md](idees-format-exercices.md)
(« Les 5 meilleures idées », « Décisions de David »). Ordre : idée 1, puis 2 à 5, puis revue du lot
« nombres et calculs » de Seconde.

## Reprendre ici

_Mis à jour le 2026-11-28, après #3319._

- **État** : #3319 mergée (passes 1 et 2, 66 fiches). Ses 5 migrations de contenu
  (`20261128151748` à `…151803`) sont les SEULES en attente en prod ; `db:migrate` refusé à la
  session (écriture en prod = David).
- **Prochaine action** : après le `db:migrate` de David → `migration-contenu.ts --dir` sur les 5
  dossiers = 52 « inchangé » ; puis deux séries de relecture (≤ 50) dans `/dev/modeles`
  (`scripts/series/creer-serie.ts`), David les publie ; lire les verdicts « À revoir ».
- **En attente de David** : `! pnpm db:migrate` depuis le dépôt principal. Ensuite : 7 fiches à
  outil (n° 75, 76, 77, 79) ; **n° 78 déjà livré** (4075445c98) → lot `arrondi-court` à retirer.
- **Pièges** : diff trop gros pour `pr:merger` (> 20 000 lignes) → merge à la main ; rejeu
  `checkTemplate` ne sait pas rejouer une erreur prévue « impossible ».
- **Worktree / branche** : aucun (retirés après #3319).

## Idée 1 — phase 0 validée (David, 2026-11-21)

**Q1. Retrouver la question plus tard → choisir la graine** (option A, validée). On n'impose pas
la variation : la variation est le premier tirage de `generateInstance`, on essaie donc les graines
suivantes jusqu'à tomber sur la variation voulue. La graine seule redonne la question partout
(évaluation, erreurs rejouées dans les statistiques, fiches) : ni migration ni colonne.
Défaut compensé (question de David) : l'instance porte `selectedVariationIndex` ; `variationOfSeed`
lit la variation d'une graine sans générer ; un test verrouille l'accord des deux.

**Q2. Pas assez de questions différentes → jamais de répétition** (David : « je n'aime pas l'idée
de remettre les mêmes questions »). Proposition de David : vérifier le nombre quand le prof le
choisit et proposer de l'abaisser. Puis David a suivi mes recommandations (« je suis tes recos ») :
vérification **dans le panier seulement** (pas côté serveur) ; si le modèle a changé après coup, la
ligne est **raccourcie** au moment de jouer la série.

**Q3. Doublon = « b + a »** (validé) : mêmes nombres tirés (variation + variables) **ou** même
énoncé affiché (choix d'un QCM triés). Deux calculs de même réponse (« 12 × 5 », « 15 × 4 ») ne sont
pas un doublon (David). « 2 + 3 » et « 3 + 2 » peuvent sortir tous les deux. Précision
d'implémentation, dite à David : l'empreinte des nombres n'est pas utilisée quand l'énoncé tire
lui-même (`{{carré|rectangle}}`), sinon sa ligne tomberait à une question.

## Idée 2 — phase 0 validée (David, 2026-11-21)

David a suivi mes recommandations sur Q1 à Q4 (« je te suis ») : exemple par variation (A),
panier + éditeur, numéros disparus ignorés (toutes s'il n'en reste aucun), révision espacée sur le
modèle entier.

Mesuré en prod (modèles publiés) : 468 à une variation, 678 à deux, 755 à trois, 473 à quatre,
266 à cinq ou plus (126 au plus). Une variation n'a **pas de nom** aujourd'hui.

Ce qui ne change pas : grâce à l'idée 1, la variation se lit dans la graine. Une évaluation qui
régénère sa copie retrouve donc la bonne question sans rien de plus : ni migration ni colonne. Le
choix s'ajoute à la ligne de série (champ facultatif, absent = toutes les variations), là où elle
vit déjà : série enregistrée, panier, lien partagé, évaluation.

**Comportements**

- Nominal : sur une ligne d'un modèle à plusieurs variations, le prof voit chaque variation avec un
  exemple de question et une case cochée ; il décoche « (ax + b)² − c² », la série ne tire plus que
  dans les autres, réparties à parts égales (idée 1).
- Nominal : un modèle à une seule variation ne montre rien de neuf.
- Limite : « Ce modèle n'a que N questions différentes » (#2955) compte dans les variations cochées
  seulement.
- Limite : toutes cochées = comme aujourd'hui ; le champ n'est pas enregistré.
- Erreur : on ne peut pas tout décocher (la dernière case reste cochée).

**Questions**

- **Q1. Comment le prof reconnaît une variation ?** A (reco) : un exemple de question tiré de
  chaque variation, à côté de sa case. B : l'auteur donne un nom à chaque variation (« forme
  développée », « avec un carré ») ; les 2 200 modèles actuels n'en ont pas, il faudrait un repli.
  C : A tout de suite, un nom facultatif plus tard.
- **Q2. Où le prof choisit-il ?** Reco : dans le panier et dans l'éditeur d'une série enregistrée ;
  le lien partagé et l'évaluation suivent ce qui est choisi.
- **Q3. L'auteur modifie le modèle après coup** (variation retirée ou déplacée). Le choix est
  enregistré par numéro de variation. Reco : un numéro qui n'existe plus est ignoré ; s'il n'en
  reste aucun, la ligne repart sur toutes les variations. Défaut : si l'auteur inverse deux
  variations, la série tire l'autre sans le dire (comme un modèle modifié aujourd'hui).
- **Q4. La révision espacée** (qui reprend les modèles des séries d'un chapitre) tient-elle compte
  du choix ? Reco : non, elle revoit le modèle entier.

## Idée 3 — phase 0 validée (David, 2026-11-21)

David suit mes recommandations (Q1 A, Q2 A, Q3 A, découpage en 3 PR), après une
réexplication en mots simples. **Ajout de David** : les scripts qui écrivent les modèles (fichiers
de lot, skills `couvrir-niveau` et `idees-rubrique`) proposent **déjà** des erreurs prévues ; le
prof les modifie ou les complète ensuite dans l'éditeur. → PR 1 : champ dans les fichiers de lot +
consigne dans `couvrir-un-niveau.md` et les deux skills.

But : une case dit « si l'élève répond `(x − 3)²`, lui écrire : “Tu as confondu a² − b² et
(a − b)².” ». Aujourd'hui, `error-kinds.ts` ne fait que **deviner** une relation (signe, ×10,
inverse, double, moitié, carré) ; l'erreur prévue, c'est le prof qui l'écrit.

Ce qui existe : une case fausse sans remarque reçoit la phrase de son type deviné
(`blankErrorGuess`, `errorGuessSentence`), affichée par le seul chemin du résultat attendu
(Saisie, Contrôle blanc, copie corrigée) ; côté prof, la ligne « Types d'erreur : Erreur de signe :
4 · Non reconnue : 6 » (bilan d'un contrôle, erreurs par point). Les specs décrivent déjà les
erreurs classiques en commentaire (« 10 (1 et 72 oubliés) ») sans pouvoir les nommer à l'élève.

**Comportements**

- Nominal : le prof ajoute à une case une erreur prévue : réponse fausse `{{eval:a-b}}` (variables
  permises, comme la réponse attendue) et message « Tu as soustrait au lieu d'additionner. »
  (variables et `$…$` permis). L'élève qui répond la valeur de cette erreur voit ce message à la
  place de la phrase du type deviné. La note ne change pas : faux reste faux.
- Nominal : côté prof, l'erreur prévue compte dans la ligne « Types d'erreur » à côté des types
  devinés (« Soustraction au lieu d'addition : 3 · Erreur de signe : 2 »).
- Limite : sur un tirage où l'erreur prévue tombe sur la bonne réponse (erreur de signe quand le
  résultat vaut 0), elle est ignorée : l'élève a juste.
- Limite : deux erreurs prévues de même valeur sur un tirage → la première écrite l'emporte.
- Limite : bonne valeur, mauvaise forme → déjà « mauvaise forme », l'erreur prévue n'est pas lue.
- Limite : une remarque de case (unité, %, arrondi) reste affichée après le message.
- Limite : un contrôle déjà passé garde son énoncé tiré : pas de message rétroactif.
- Erreur (auteur) : réponse fausse qui ne se calcule pas, ou message vide → publication refusée,
  message situé (« Variation 2, case 1, erreur prévue 1 : … »).
- Sécurité : en évaluation notée, les erreurs prévues sont retirées de l'énoncé envoyé à l'élève,
  comme la réponse attendue (elles en disent trop).

Vérification automatique : le rejeu de publication répond chaque erreur prévue sur ses tirages et
vérifie « faux + ce message ». Une spec peut aussi asserter le message (champ facultatif).

**Questions**

- **Q1. Quand dit-on que l'élève a fait « cette erreur » ?** A (reco) : même valeur que l'erreur
  prévue, quelle que soit l'écriture (`8/6` déclenche l'erreur `4/3`). B : même écriture exacte.
- **Q2. Que lit le prof dans « Types d'erreur » ?** A (reco) : un nom court facultatif
  (« Soustraction au lieu d'addition ») ; sans nom, le message de l'élève. B : nom court
  obligatoire. C : le message de l'élève, toujours.
- **Q3. Quelles cases ?** A (reco) : les cases à écriture mathématique ordinaire (celles où l'on
  devine déjà un type) ; texte, choix, figures plus tard (l'idée 4 reprend les choix). B : aussi
  les cases texte tout de suite.

**Découpage validé** : PR 1 moteur (type de case, Zod, tirage, message à l'élève, rejeu, specs,
fichiers de lot et consigne des scripts, retrait en évaluation notée) · PR 2 éditeur du prof (sous chaque case, « Ajouter
une erreur prévue ») · PR 3 ligne « Types d'erreur » côté prof.

## Idée 4 — phase 0 : réponses de David (2026-11-21)

But : une case à erreurs prévues (idée 3) peut se répondre en QCM : la bonne réponse et jusqu'à
trois erreurs prévues, mélangées, sans doublon de valeur ; une erreur prévue égale à la bonne
réponse sur le tirage est retirée ; cliquer une erreur prévue affiche son message. En prod : aucun
modèle n'a d'erreurs prévues (#2962 pas livré).

- **Q1 → C** : le prof coche « en QCM » **pour chaque variation** (déjà choisi par David), et
  l'auteur peut interdire le QCM sur une case (« jamais en QCM »). Case absente pour une variation
  sans erreur prévue, à plusieurs cases (Q3) ou interdite par l'auteur.
- **Q2 → A** : moins de choix s'il manque des erreurs prévues (2 au moins) ; aucune utilisable sur
  le tirage → la question reste en saisie.
- **Q3 → B** : QCM seulement pour une question à **une seule case**.
- **Q4 → B** : une réussite en QCM = **demi-réussite** pour la mémoire de révision (comme l'indice
  de l'idée 5) ; un échec reste un échec.
- **Révision espacée en saisie** : jamais décidée (héritage du premier SRS, oct. 2025) ; David →
  **chantier à part, futur** (mémoire `archives.md`), l'idée 4 reste sur les séries.
- Usage mesuré en prod (90 jours) : 101 traces, 2 élèves, aucune avec lieu → rien à en tirer.
- **Q5 → A** : la trace garde « répondu en QCM » (colonne de `skill_attempts`) ; personne ne gagne
  d'accès (mêmes lignes, mêmes lecteurs).

**Découpage validé (David, 2026-11-22)** : PR 1 migration (colonne `answered_as_choice`) · PR 2
moteur (veto « jamais en QCM » de l'auteur, variations « en QCM » de la ligne, case → choix au
tirage, 2 à 4 choix, message, correction en contrôle) · PR 3 demi-réussite (FSRS) + trace + bilan
« en QCM » · PR 4 case « en QCM » par variation dans le panier et l'éditeur de série. Limite
assumée : en série libre, le navigateur dit « en QCM » (même enjeu que « Réussi » en flash-card) ;
en contrôle, le serveur le sait par la série.

## Idée 4, PR 1 — trace « répondu en QCM » (2026-11-22)

Branche `feat/idees-format-qcm-trace`. Migration `20261121234509_trace_repondu_en_qcm.sql` :
`skill_attempts.answered_as_choice boolean not null default false` ; CHECK : vrai seulement en
`source = 'auto'` et lieu Saisie, Contrôle blanc, Course aux nombres ou contrôle (ni Flash-cards,
ni révision, ni Descente). Aucune policy touchée. Test `trace-repondu-en-qcm.test.ts` (13, rouges
sans la migration : colonne inconnue ; témoin « en saisie » pour chaque refus) ; suites voisines
des traces vertes (98). Relecture `security-auditor` : aucun finding. Mergée (#2979), `db:migrate`
le 2026-11-22 (seule migration en attente), colonne vérifiée en prod.

## Idée 4, PR 2 — QCM depuis les erreurs prévues : le moteur (2026-11-22)

Branche `feat/idees-format-qcm`. `questions/choice-from-errors.ts` : `asChoiceInstance(instance,
seed)` transforme la question tirée APRÈS le générateur (mêmes nombres en saisie et en QCM) :
case `math` seule, erreurs prévues, sans veto → case choix (bonne réponse à l'indice d'origine 0,
puis jusqu'à 3 erreurs prévues de valeurs distinctes, ni égales à la bonne réponse) ; mélange sur
une source à part ; la case devient `\ldots` dans la formule et le bloc ```choix suit l'énoncé ;
`null` → la question reste en saisie. `expectedErrorOf` lit l'erreur du choix coché ; le résultat
attendu montre son message sous le bloc (cases choix : ce message seul, jamais de type deviné).
Veto de l'auteur : `neverChoice` (types, Zod, générateur, case « Jamais en QCM » sous les
erreurs prévues de l'éditeur). Ligne de série : `choiceVariations` (`validation/series.ts`) ;
tirage `drawLineQuestions(…, choiceVariations)` ; `drawSeriesQuestions({ choiceCases })` :
vrai pour toutes les formes sauf flash-cards (page de jeu) et pour l'évaluation (instance figée
en QCM, corrigée telle quelle ; la version envoyée n'a ni erreurs prévues ni ordre d'origine).
Le lien de série porte le JSON de la ligne : `choiceVariations` y passe sans rien changer.

- Choix faits sans question (à signaler à David) : « En classe » (diaporama) montre aussi les
  choix ; la case dans la formule devient des pointillés ; les choix sous l'énoncé.
- ⚠️ PR 3 : les statistiques rejouées depuis la graine (`server/stats/point-errors.ts`)
  rejouent la question EN SAISIE ; une trace « en QCM » (indice de choix) doit être rejouée
  avec `asChoiceInstance` (colonne `answered_as_choice`).
- Relectures : `security-auditor` (Opus) aucun bloquant ; `code-reviewer` (Opus) : corrigés,
  comparaison de valeur aveugle aux unités (l'erreur lue aussi sous son LaTeX), veto gardé par
  « Retirer » ; ajoutés, cases d'opération exclues, choix de même écriture écartés, test du trajet
  serveur (positions affichées → indices d'origine → message). **Case à arrondir → B (David, 2026-11-22)** :
  la bonne réponse montrée est l'arrondi demandé (`roundToPrecision`, jugé juste par la case) ;
  ordre de grandeur et tolérance restent en saisie.
- Tests : `choice-from-errors.test.ts` (26), `series-draw.test.ts` (+3), `series.test.ts`
  (+2), `AnswerEditor-jamais-en-qcm.svelte.test.ts` (3).

## Idée 4, PR 3 — demi-réussite, trace, bilan « en QCM » (2026-11-22)

Branche `feat/idees-format-qcm-demi-reussite` (worktree `ubumaths-wt-idees-format`). **Phase 0
(David, 2026-11-22, « je suis tes recos »)** : Q1 A, une réussite en QCM compte pour « acquis »
(suivi des points inchangé, pas de migration), seule la révision espacée la divise ; Q2 A, mention
« en QCM » dans le bilan d'un contrôle ET dans « Top points à remédier » ; Q3 A, traces en saisie
et en QCM d'un même modèle mêlées, mention « en QCM » sur chaque réponse.

- Repère : `fromExpectedErrors: true` sur la case choix posée par `asChoiceInstance` ;
  `isAnsweredAsChoice(instance)` (accepte une copie relue en base). Un QCM de l'auteur : non.
- Note : `answerGrade` (`server/srs/answer-grade.ts`) : réussi en QCM → Difficile (2), raté → 1.
- Série libre : `buildSeriesTrace` envoie `answered_as_choice` (formes où l'on tape, réponse
  donnée ou non) ; Zod de la route (refus en Flash-cards) ; `recordStudentAttempt` écrit la
  colonne et la note. Contrôle : `srsReviewsOf` lit le repère sur la copie figée du serveur.
- Tests : `choice-from-errors` (+5), `series-trace` (+6), `skill-attempts` Zod (+6),
  `answer-grade` (4), `evaluation-attempts-srs` (+1), intégration `skill-attempts-endpoint`
  (+3, rouges sans `record-attempt.ts`).
- Côté prof (2ᵉ commit) : `choiceAnswers` par ligne du bilan (repère lu seul par PostgREST,
  `question_instance->blanks->0->>fromExpectedErrors`, vérifié sous RLS dans `bilan-controle.test.ts`),
  mention « en QCM » / « dont N en QCM » (`choiceAnswersLabel`) ; `asChoice` par groupe d'erreurs
  (`QuestionErrorsPanel`) ; `point-errors.ts` rejoue en QCM une trace `answered_as_choice` (tirage
  qui ne se pose plus en QCM → écarté) ; export RGPD de la colonne. Doc : `srs.md`, `questions.md`,
  `evaluations.md`, `analytique-prof.md`.
- Relectures : `security-auditor` (Opus) aucun bloquant (ajouté : test avec le client de l'élève,
  RLS réelle). `code-reviewer` : corrigé, une carte de cours déclarée « en QCM » écrivait FSRS puis
  voyait sa trace refusée par le CHECK (500) → « en QCM » ignoré quand `selfAssessed` (test rouge
  puis vert). Faux : « aucune série libre ne tire de QCM » (`automaths/test/+page.svelte`,
  `choiceCases: mode !== 'flash'`). Laissé, limite connue : le dédoublonnage du tirage compare la
  question déjà posée ; deux lignes d'un même modèle sans variables, l'une en QCM et l'autre en
  saisie, peuvent donner la même question sous les deux formes.

## Idée 4, PR 4 — case « En QCM » dans le panier et l'éditeur de série (2026-11-22)

Branche `feat/idees-format-qcm-panier` (worktree `ubumaths-wt-idees-format`). Phase 0 : découpage
validé (Q1 C : case par variation, absente sans erreur prévue, à plusieurs cases ou sous veto).

- `VariationPicker` : `choiceSelected` / `onchoicechange` (absent = pas de case : élève, lien) ; case
  « En QCM » sous chaque variation où `mayBeChoice` (modèle seul) puis `canBeChoice` (exemple tiré)
  disent oui ; désactivée si la variation est décochée ; retirer une variation retire son QCM ;
  résumé « … · N en QCM » ; modèle à une variation : bouton « Réponse en saisie / en QCM ».
- Panier : `addToCart(…, choiceVariations)`, `setChoiceVariations`, fusion et lien gardent le choix
  (bug corrigé : `mergeItems` le perdait). `CartQuestionCard` : `onUpdateChoiceVariations` (prof).
- Éditeur de série : `handleChoiceVariations` (clé retirée quand vide).
- Tests (rouges avant le code) : `choice-eligibility` (4), `questionCart-qcm` (4),
  `VariationPicker` (+7), éditeur `variations` (+1).
- Relecture `code-reviewer` (Sonnet). Corrigé (tests rouges puis verts) : le pré-filtre `mayBeChoice` ne
  voit ni le type de case ni le bloc d'opération (décidés au tirage) → bouton, résumé et cases jugés sur
  l'exemple tiré (`choosable`, seulement pour les variations à erreurs prévues) ; retirer une variation
  retire son QCM enregistré même invisible, et `setVariations` du panier élague `choiceVariations` ;
  dialogue : « si un tirage ne le permet pas, reste en saisie », titre « Réponse en QCM » pour un
  modèle à une variation. Faux : « seule l'évaluation tire en QCM » (`automaths/test` aussi). Laissé :
  un élève qui ouvre le lien du prof garde son QCM sans le voir, comme les variations choisies.

## Idée 5 — coup de pouce : phase 0 (2026-11-22)

Déjà tranché (`idees-format-exercices.md`, décisions de David, 2026-11-21) : coup de pouce **oui** ;
masqué en évaluation notée (la question publique est une liste blanche : rien à retirer) ; indice
ouvert puis réponse juste = **demi-réussite** pour la révision espacée (« Difficile »,
`answerGrade`) ; piste : l'indice pourrait être la première étape de la correction.

Mesure en prod (2026-11-22) : 2 644 modèles publiés, 2 567 avec correction écrite (7 685 variations),
aucun avec étapes générées. Première étape inutilisable telle quelle comme indice : correction en une
seule étape pour 991 variations, première étape qui affiche `{{solution}}` pour 635, et beaucoup
d'autres calculent la réponse elles-mêmes (« Le double de $b$ est $2b$ car… »). Seule une lecture
humaine dit si une première étape aide sans donner la réponse.

Comportements proposés : bouton « Coup de pouce » sous l'énoncé, seulement si la variation a un
indice ; un clic l'ouvre, il reste ouvert ; le chrono continue ; les variables de l'indice sont
celles du tirage. À l'écriture, un indice qui contient la réponse attendue est refusé.

Questions posées à David :

- **Q1 — d'où vient l'indice ?** A : l'auteur l'écrit (champ neuf par variation) ; B : la première
  étape de la correction, automatiquement ; C : A, et l'auteur peut cocher « la première étape de la
  correction sert d'indice ». Recommandation : C (B donnerait la réponse trop souvent).
- **Q2 — où l'élève le voit-il ?** Séries d'entraînement et révisions : oui. Course aux nombres
  (chronométrée) et combats de la descente : recommandation non (vitesse, jeu).
- **Q3 — le prof voit-il « avec indice » dans le bilan ?** Il faut alors une colonne de trace
  (migration, comme `answered_as_choice` ; mêmes lignes, mêmes lecteurs : personne ne gagne d'accès).
  Recommandation : oui.
- **Q4 — modèles existants** : aucun n'a d'indice. Recommandation : le champ seulement, puis des
  indices dans les nouveaux modèles et dans le lot « nombres et calculs » de Seconde (sa revue est
  déjà au programme) ; pas de passe sur les 2 644.

**Réponse de David (2026-11-22) : « je te suis »**, aux quatre questions, chacune posée avec sa
recommandation : **Q1 → C** (champ « indice » écrit par l'auteur, ou case « la première étape de la
correction sert d'indice ») · **Q2** : bouton en séries d'entraînement et en révisions, jamais en
course aux nombres ni en combat · **Q3 → oui** (« avec indice » dans le bilan, colonne de trace ;
question d'accès : personne ne gagne d'accès) · **Q4** : le champ seulement, indices dans les
nouveaux modèles et le lot de Seconde.

Lieux de trace (lecture du code) : `typing` (Saisie), `flash_cards` (Flash-cards) et `review`
(révision) montrent le bouton. Rien en Contrôle blanc
(`mock_test`), comme en évaluation — **confirmé par David le 2026-11-22** (« non, on ne le met pas »).
En Flash-cards et en révision (auto-évaluées), « Je savais » après un indice ouvert donne
« Difficile » au lieu de « Bien ».

**Colonne de trace (David, 2026-11-22, « je te suis » à la recommandation)** : `skill_attempts.with_help`
réutilisée (prévue en juin pour un tuteur jamais construit, jamais écrite à vrai, 101 traces en prod
toutes fausses ; décision 58 : marqueur sans pénalité pour l'acquisition, toujours vraie : la
demi-réussite ne touche que la date de révision). **Pas de migration.**

**Découpage** : PR moteur et éditeur (champ `hint` et case « première étape » par variation, refus
d'un indice qui donne la réponse, résolution au tirage) ; PR élève et prof (bouton, trace
`with_help`, demi-réussite, bilan « avec indice »).

## Idée 5, PR moteur — coup de pouce : schéma, tirage, éditeur (2026-11-22)

Branche `feat/idees-format-indice-moteur` (worktree `ubumaths-wt-idees-format-indice`).

- `hint.ts` : `hintSchema` (texte non vide, 1 000 caractères), `hintIssues` / `refineHints`
  (contrôles croisés), branchés sur le schéma strict et la route d'écriture (objet non strict : sans
  les champs, il les RETIRAIT).
- Tirage : `hint` et `hintFromFirstStep` passent par `resolveVariationWithShared` (et son double de
  `test-instance-builder.ts`) ; `instance.hint` = première étape résolue, ou indice résolu sur sa
  source `hintSeed` (aucun tirage décalé, vérifié sur 5 graines).
- Formulaire : carte « Coup de pouce » (MyCheckbox + MarkdownEditor), `setHint` /
  `setHintFromFirstStep`, `buildTemplate` et la duplication les gardent.
- Tests : `coup-de-pouce.test.ts` (17, 12 rouges avant le code), `QuestionTemplateForm-coup-de-pouce`
  (5, 4 rouges sans le formulaire) ; suites `questions` et `validation` vertes (8 552).
- Relecture `code-reviewer` (Sonnet). Corrigé (tests rouges puis verts) : `\b` laissait passer
  `{{solution_0}}` / `{{answer_1}}` (regex `(?![A-Za-z])`) ; l'instantané du formulaire ignorait le
  coup de pouce (« Modifications non sauvegardées » muet) ; indice résolu en vide → aucun indice.
  Laissé : une variable qui vaut la réponse (`{{b2}}`) ne se voit pas (dit dans la doc) ; le texte
  écrit revient si on décoche la case. Note pour la PR élève : `{{if:…}}` est rendu côté navigateur,
  l'indice doit passer par le même rendu que les étapes de correction.

## Idée 5, PR élève et prof — bouton, trace, demi-réussite, « avec indice » (2026-11-22)

Branche `feat/idees-format-indice-eleve` (worktree `ubumaths-wt-idees-format-indice-eleve`).

- Carte (`FlashCard`, `showHint` / `onHintOpen`) : bouton « Coup de pouce » sous l'énoncé si la
  variation a un indice (jamais carte de cours) ; ouvert pour de bon, rattaché à l'instance ; rendu
  `MarkdownRenderer` de la version détaillée (`splitCorrectionDetail`) ; bouton retiré après
  « Valider » s'il n'a pas servi. `showHint` passé par Saisie, Flash-cards et `ReviewSession` (paquet
  et chapitre) seulement.
- Trace : `buildSeriesTrace({ withHelp })` → `with_help` en `typing` / `flash_cards` ; Zod de
  `api/skill-attempts` refuse `with_help` en `mock_test` / `number_race`. Révision : `withHelp` dans
  `submitRequest`, schémas `submitReviewSchema` / `chapterReviewSubmitSchema` (défaut faux).
- Note : `answerGrade(success, enQcm || avecIndice)` ; `helpedGrade` en révision (3-4 → 2, 1 reste 1) ;
  `recordSrsReviewAttempt(…, withHelp)`. Statistiques de séance de révision : note choisie par l'élève.
- Prof : `point-errors.ts` lit `with_help`, nom suivi de « (avec indice) ».
- Tests : `answer-grade` (+6), Zod (+5), `series-trace` (+5), `review-source` (+2), `point-errors` (+3),
  routes de révision (`coup-de-pouce.test.ts` ×2, 7), `FlashCard-coup-de-pouce` (5, 2 rouges avant),
  Saisie / Flash-cards / révision (+3, rouges sans le branchement), intégration
  `skill-attempts-endpoint` (+1).
- Doc : `questions.md`, `srs.md` (note ⁵), `analytique-prof.md`.
- Relectures : `security-auditor` (Opus) aucun bloquant (le champ ne peut que baisser la note ;
  le prof lisait déjà la colonne ; `hint` absent de la question publique). `code-reviewer` (Sonnet) :
  corrigé, `withHelp` sur une carte personnelle baissait la note FSRS sans trace → ignoré (test).
  Laissé : `with_help` accepté sur une carte de cours par un appel direct (ne peut que baisser la
  note) ; aucun CHECK en base pour les lieux (règle dans le Zod) ; « (avec indice) » collé au nom
  (aucun dédoublonnage par nom aujourd'hui).

## PR 1 — tirage (#2954, mergée le 2026-11-21)

- `src/lib/questions/series-draw.ts` : `variationOfSeed`, `questionFingerprints`,
  `drawLineQuestions` (tours mélangés de variations, 50 essais par variation avant de la dire
  épuisée), `distinctQuestionCount` (graine fixe).
- `series-items.ts` : une graine par **ligne** (plus par question), d'où sortent celles de ses
  questions ; `drawSeriesQuestions` génère et rend l'instance ; `buildSeriesItems` s'appuie dessus.
- `evaluation-attempts.ts` : utilise l'instance du tirage (plus de seconde génération).
- Conséquence : un lien « Mêmes nombres pour tous » envoyé avant la mise en prod donnera d'autres
  questions après (même effet qu'un modèle modifié).
- Tests : `series-draw.test.ts` (18, vrai générateur ; vérifiés rouges sans répartition, sans
  refus des doublons, sans la précaution des tirages dans le texte, sans le tri des choix).
- Relecture (`code-reviewer`, Sonnet) : aucun bloquant. Corrigé : variations épuisées retenues pour
  les lignes suivantes du même modèle (coût), échec de génération journalisé par le logger serveur
  en évaluation. Accepté : une variation presque vidée peut être dite épuisée à tort (~1 %).

## PR 2 — avertissement du panier (2026-11-21)

- `series-draw.ts` : `distinctLimit(template, quantity, generate)` rend N quand la quantité dépasse
  les N questions différentes, sinon `null`. Cache par modèle (`WeakMap`) : modèle épuisé jamais
  recompté, quantité déjà atteinte non plus ; un `+` au-delà relance un compte plus loin.
- `CartQuestionCard` : « Ce modèle n'a que N questions différentes. » (« qu'une question. » pour 1),
  bouton « Passer à N » (`questionCart.updateQuantity`). Icône `CopyX` en `text-warning`.
- Panier seulement (décision Q2) : l'éditeur de série n'avertit pas, le tirage raccourcit.
- Tests : 3 de `distinctLimit` (vérifiés rouges avant l'écriture), 3 de la tuile (rendu, singulier,
  rien quand assez).
- Relecture (`code-reviewer`, Sonnet) : bloquant corrigé, une génération en échec donnait « Passer à
  0 » (le clic retirait la ligne) → échec = pas d'avertissement, rien en cache. Corrigé aussi :
  recherche au moins deux fois plus loin (monter de 1 à 99 recomptait à chaque pas), `role="status"`,
  bouton nommé « Passer à N répétitions ». Laissé : focus perdu après le clic (le bouton disparaît).

## PR 3 — variations choisies : schéma, tirage, panier (#2958, mergée le 2026-11-21)

- `validation/series.ts` : `variations?` sur une ligne (`itemVariationsSchema` : numéros distincts,
  1 à 200, rangés ; absent = toutes). Ni migration ni colonne : la ligne est déjà du JSON.
- `series-draw.ts` : `allowedVariations` (Q3), répartition parmi les variations permises,
  `distinctLimit` compté par choix, `variationExample` (exemple à graine fixe, Q1).
- `series-items.ts` : passe `item.variations` au tirage (évaluation comprise).
- Panier : `setVariations`, choix gardé par une fusion (comme la durée) et par un lien ;
  `VariationPicker` dans la tuile, prof seulement ; l'aperçu montre la 1re variation choisie.
- Révision espacée : rien à faire, elle ne lit que le modèle de la ligne (Q4).
- Tests : 12 de tirage / schéma / panier vérifiés rouges avant le code ; 6 du sélecteur, 2 de la
  tuile.
- Relecture (`code-reviewer` Sonnet + `security-auditor` Opus) : aucun bloquant. Ajouté : test de
  deux lignes d'un même modèle à choix différents. Assumé : une fusion de panier garde le choix de
  la ligne déjà là (comme la durée) ; l'élève qui ouvre un lien restreint ne voit pas le choix ;
  un élève peut fabriquer un lien restreint à la variation facile (série libre, sans enjeu).

## PR 4 — variations choisies dans l'éditeur d'une série (2026-11-21)

- `server/question-template-columns.ts` : colonnes du modèle sans les cas de test, sorties de
  `/api/questions/templates/all` (garde de compilation comprise), partagées avec l'éditeur.
- `series/[id]/edit/+page.server.ts` : modèles publiés de la série lus complets (`mapDbTemplateToForm`)
  au lieu de titre et niveau ; `+page.svelte` : `VariationPicker` sur chaque ligne d'un modèle
  publié, choix écrit dans la copie de travail (absent = toutes, la clé est retirée).
- Tests : `variations.svelte.test.ts` (3, vérifiés rouges avant le code) : choix affiché, rien pour
  un modèle à une variation, décocher enregistre, tout recocher retire le choix.
- Relecture (`code-reviewer`, Sonnet) : aucun bloquant. Corrigé : le sélecteur sur sa propre ligne
  (`w-full`, comme les marques de durée). Mesuré (prod, 2 644 modèles publiés, taille en base) :
  3,3 Ko en moyenne, 17 Ko au 99e centile, 127 Ko au plus → poids accepté (une série a au plus 50
  lignes ; le panier charge déjà tout le catalogue). Laissé : chargeur sans test propre (mêmes
  colonnes et même conversion que le catalogue).

## Idée 3, PR 5 — erreurs prévues : le moteur (2026-11-21)

Branche `feat/idees-format-erreurs-prevues`. `expectedErrors` sur une case (`types.ts`, Zod strict
et non strict) ; reconnaissance `expected-errors.ts` (`expectedErrorOf`, même valeur, case fausse
seulement) ; message en tête des remarques (`expected-result.ts`, avant le type deviné) ;
générateur : résolution sur une source de hasard à part (graine + 7919), refus situé hors case
mathématique ordinaire ; rejeu `checkTemplate` ; spec `expected.expectedErrorMessage` ; consigne
des scripts de lot (`couvrir-un-niveau.md` § 5, skills `couvrir-niveau`, `idees-rubrique`).
L'éditeur actuel garde les cases telles quelles : un modèle modifié par le prof garde ses erreurs
prévues avant même la PR de l'éditeur. ⚠️ Fichiers de lot avec erreurs prévues : la prod ne les
accepte qu'après le `deploy:prod` qui livre cette PR.

## Idée 3, PR 6 — erreurs prévues : l'éditeur du prof (#2963, mergée le 2026-11-21)

`ExpectedErrorsEditor.svelte` sous chaque case ordinaire d'`AnswerEditor` : « Ajouter une erreur
prévue », champs « Si l'élève répond », « Lui écrire », « Nom court » (facultatif, clé retirée si
vide) ; dernière erreur retirée → `expectedErrors` absent ; ligne incomplète signalée ;
`maxlength` des plafonds du schéma. Retenu de la revue : une case devenue choix ou figure qui garde
des erreurs prévues le dit et offre « Retirer » (sinon la génération échoue sans recours). Tests :
`AnswerEditor-erreurs-prevues.svelte.test.ts` (7). Doc : `docs/systeme/questions.md`.

## Idée 3, PR 7 — erreurs prévues : ligne « Types d'erreur » côté prof (2026-11-21)

Branche `feat/idees-format-types-erreur`. `answerErrorKinds` (`error-kinds.ts`) : une case fausse
qui fait une erreur prévue (`expectedErrorOf`) donne `{ blank, expected: nom }` (nom court, sinon
message, Q2), avant le type deviné et même avec une remarque. `ErrorKindCount` passe de `kind` à
`label` : comptes par nom (`evaluation-question-errors.ts`), une erreur prévue nommée comme un type
deviné partage son compte ; à égalité, erreurs prévues d'abord. `QuestionErrorsPanel` : formules
`$…$` rendues (`remarkSegments` + `InlineMarkdown`). Limite assumée : sans nom court, un message
qui dit les nombres du tirage fait un compte par tirage. Tests : 7 de `error-kinds`, 4 du calcul
serveur, 1 du panneau (vérifiés rouges avant le code). Doc : `evaluations.md`, `questions.md`.
Relecture (`code-reviewer`, Sonnet) : aucun bloquant. Corrigé : la ligne des comptes rendue d'un
seul tenant appariait le `$` isolé d'un nom avec celui du suivant → chaque compte rendu à part
(test ajouté). Laissé : une erreur prévue nommée « Non reconnue » se confondrait avec cette ligne.

## Revue du lot « nombres et calculs » de Seconde (2026-11-22)

Worktree `../ubumaths-wt-idees-format-revue-2de`, branche `feat/idees-format-revue-2de`. 52 modèles
(`scripts/questions/2de-nombres-{a,b,c1,c2,publies}/`), tous publiés ; fichiers = prod vérifié
(`migration-contenu.ts` : 52 « inchangé »). Verdicts en prod (`question_template_reviews`) : un seul
(« Arrondir », validé, sans commentaire). David : « attaque la revue du lot de seconde : n'oublie pas
d'essayer de mettre des erreurs prévues ».

- Critères : erreurs prévues (3 par case ordinaire, visées pour le QCM), spec `incorrect` par erreur
  prévue, coup de pouce par variation, specs justes, meilleure case, bornes de Seconde.
- Règles de la revue : variations jamais retirées ni déplacées ; seuls `variations`, `testSpecs`,
  `description` changent (garde de `migration-contenu.ts`) ; réponse attendue, forme exigée et type
  de case d'une variation existante inchangés → toute correction de ce genre = proposition à David.
- Les JSON font foi désormais (ids dedans) : les scripts `docs/wip/questions/lot-2de-nombres-*.py`
  ne sont plus à relancer.
- ⚠️ Livraison : `hint` (#2991) n'est pas en prod ; la migration de contenu ne se joue qu'après le
  `deploy:prod` qui livre #2991 (les erreurs prévues, #2962, y sont déjà).

### Passe 1 : erreurs prévues, coups de pouce, specs (commit `1caca9d636`, pas de PR)

Cinq agents (`pedagogy-expert`), un par dossier. 189 variations, toutes avec un coup de pouce
(114 écrits, 75 « première étape ») ; 435 erreurs prévues ; 277 specs ajoutées ; contrôle
`create-questions` sans ⛔ sur les 52, specs vertes à 300-400 tirages. Seuls `variations`
(erreurs prévues, indice) et `testSpecs` changent (vérifié par script contre HEAD).
Pas de PR : David (2026-11-22) rappelle que la revue doit **garder l'idée et revoir la forme**
(bon type de case, outils existants ou à créer) ; la passe 1 l'avait interdit aux agents (modèles
publiés). Une nouvelle forme peut rendre des erreurs prévues caduques : PR après la passe 2.
Remarques de la passe 1 à reprendre : indice de « (√a)² » qui souffle presque la réponse
(c2/03 v0) ; décimaux écrits avec un point dans la correction de 3b0a04c0 v3 et a692569a v3, v5
(`toFrenchDecimal` au rendu : à vérifier à l'écran) ; 03 b v1 permet b = 1 (« 5 ÷ 7/1 ») ;
02 c1 v1 toujours « négatif ».

### Passe 2 : forme (2026-11-22, en cours)

Trois agents en lecture seule (a + publiés, b, c1 + c2) : idée de chaque modèle, meilleure forme,
outil existant ou à créer, voie (variation ajoutée, modifiée, nouveau modèle). → page à cocher pour
David (phase 0), rien n'est réécrit avant.

Passe 2 rendue : a + publiés 14 garder / 8 améliorer / 1 refaire ; b 7 / 5 / 1 ; c1 + c2 6 / 10 / 0.
Défaut réel : 04b1cc7f v4 et 73514cdb v4 refusent 10⁴ pour (−2)⁴ × 5⁴. Choix du 2026-11-20 à
revoir : 1 (rationaliser), 2 (décomposition), 3 (entier + fraction : la raison était fausse, un
motif sait exiger p < w), 5 (arrondi), 6 (puissances) ; 4 (téra) tient. Outils proposés : message
de forme écrit par l'auteur, « sans racine au dénominateur », « produit de facteurs premiers »,
arrondi trop court à demi-point, |a − b| = |b − a|, réglages du modèle par la migration de contenu,
règle sur deux cases, encadrement à l'envers, étapes générées. Propositions brutes :
scratchpad de session `forme-{a,b,c}/propositions.json` (copiées dans la page).
Page à cocher : https://claude.ai/artifact/NzDUsxMUyjn8Ke1rSJf2Af

### Passe 2 complétée (2026-11-28)

Relevé de ce qui a changé depuis le 22 (sessions `idees-rubrique` d'autres niveaux, outils) :
`migration-contenu.ts` écrit les `options` d'un publié (2026-11-23) ; outils livrés : droite avec
zoom (n° 54, refuse `placer:`), labyrinthe (n° 53), case « impossible » (n° 51) ; rangement généré.
Les outils de la passe 2 n'étaient pas dans `outils-manquants.md` : inscrits n° 75 à 81 et une
question au § 3 (étapes de correction générée), commit `e0cca07663` sur `main`.
Page à cocher, version 2 : fiches neuves `n-zoom-lire` (a692569a), `n-zoom-encadrer` (c99ae1e8),
`n-laby-multiples` (fa65910d ; pas de labyrinthe « premier », hors BO de Seconde),
`n-impossible-entier` (04), `n-impossible-decimal` (09, démonstration « 1/3 n'est pas décimal »),
`n-impossible-puissance` (04b1cc7f), fiches en attente `n-f16`, `n-f17` (outil n° 49, lot python en
cours), `n-f34`, `n-f52` ; mises à jour : `g-choix2`, `t-reglages-publie` (livré),
`b-12-nombre-premier-decomp-0` (voie : ajout), `c1-07-ecriture-scientifique-1` et
`c1-08-calculer-avec-puissan-0` (réglage existant).

### Passe 2 tranchée (David, 2026-11-28)

« Je valide toute la page à cocher » (aucune case cochée en ligne : la validation est ce message).
Lue comme : **ma recommandation sur chaque fiche**.

- Questions d'ensemble : `g-voie` = au cas par cas (ajout par défaut ; modifier la variation pour
  une vraie correction : bonne réponse refusée, consigne floue) ; choix 1, 2, 3, 5, 6 = oui ;
  choix 4 (téra) = garder.
- Outils : oui pour n° 75 (message de forme), 76 (produit de facteurs premiers), 77 (sans racine au
  dénominateur), 78 (arrondi à demi-point), 79 (|a − b|) ; réglages du modèle = s'en servir ;
  **plus tard** : n° 80 (deux cases), 81 (encadrement à l'envers), étapes de correction générée.
- Fiches : 74 « oui », dont 3 « rien à changer » (b-01, b-02, b-05 : corrections écrites gardées) ;
  **plus tard** : a-06 (droite à deux morceaux), publies-7d411132-0 (n° 80), n-f17 (n° 49) ;
  **non** : n-f16.
- **Attendent un outil** (8) : a-01-0 (n° 78), a-05-2 (n° 79), b-04-1, b-10-1, c1-03-1, c1-07-0
  (n° 75), b-12-1 (n° 76), c2-07-0 (n° 77). **Faisables tout de suite** : les 66 autres, dont
  b-12-0 et c1-07-1 / c1-08-0 par les réglages du modèle.

### Passe 2 appliquée (2026-11-28)

Cinq agents `pedagogy-expert`, un par dossier (fiches neuves rangées dans le modèle qu'elles
complètent). 61 variations ajoutées, 13 corrigées (toutes demandées par une fiche ou une remarque
de la passe 1), réglages du modèle sur b-12, c1-07, c1-08 (specs d'origine vertes). Garde contre
HEAD : seuls `variations`, `testSpecs`, `description`, `options`. `create-questions` : 52 acceptés ;
`question:specs` verts ; `sonde-horloges` 0 problème ; 5 migrations `…20261128151748` à
`…151803`, intégration verte (`migrations-contenu-publie`). Vu à l'écran (base locale, `/dev/modeles`) :
zooms « lire » et « encadrer » justes, labyrinthe des multiples, case « pas un nombre décimal ».

- 10a51999 (Arrondir) changé en prod le 26 (`;aN`, d7b6a57aec) : fichier recollé sur la prod +
  ajouts de la passe 1 ; corrigé de v5 « que l'on peut aussi écrire 3 » remplacé (3 est « à
  améliorer » depuis le 26).
- Écarts aux fiches : labyrinthe n de 11 à 49 (pas 2 à 99 : trop facile / trop large au
  téléphone), l'élève trace le chemin (pas de mode « donne la sortie ») ; zoom « lire » : erreur
  prévue « 1,4004 » remplacée par « arrêt au premier zoom » ; c2-02 : la fiche disait v2, c'est v1 ;
  c1-02 : la remarque « toujours négatif » visait v2 (variable `t` ajoutée en dernier).
- Variable ajoutée à une variation en prod (c1-02 v2) : contrôles figés (`instance`), séries =
  verdict stocké ; même effet qu'une variation ajoutée.
- Moins de 3 erreurs prévues quand il n'en existe pas d'autre réelle : a-05 v6, b-07 v4, b-08 v4,
  b-09 v4, b-12 v5, 04 v7.
- Reste : a-06-0, publies-7d411132-0 (n° 80), n-f17 (n° 49) plus tard ; n-f16 non ; 7 fiches à
  outil (a-05-2 n° 79 ; b-04-1, b-10-1, c1-03-1, c1-07-0 n° 75 ; b-12-1 n° 76 ; c2-07-0 n° 77).
- Vérification à l'écran laissée à la série : décimaux des corrigés de 3b0a04c0 v3, a692569a v3, v5
  (valeurs `;d` : virgule posée au rendu ?).
