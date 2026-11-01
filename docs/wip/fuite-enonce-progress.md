---
status: en cours
---

# Chantier `fuite-enonce` — l'énoncé public d'une évaluation notée ne dit plus la réponse

## Reprendre ici

_Mis à jour le 2026-11-01, lot 1 codé (§ 5), PR ouverte._

- **État** : lot 1 codé, PR #2120 ; revues faites (aucun bloquant, mineurs corrigés, § 6), CI en cours.
- **Prochaine action** : revues, CI, merge ; puis lot 2 (une question par cas à David).
- **En attente de David** : valider les recos du lot 2 (§ 6) ; garde-fou d'ici là (§ 6).
- **Pièges en cours** : `construire` (genre du bloc) passe désormais dans la version publique (garde de `generation-ranger.test.ts` précisée) ; branche fusionnée avec `origin/main` (103 commits, #2096 compris).
- **Worktree / branche** : `ubumaths-wt-fuite-enonce` · `fix/fuite-enonce`.

---

## 1. Origine

Trouvé pendant `points-repere` (lot 1, #2096, 2026-11-01). En évaluation notée, `toPublicQuestion`
(`src/lib/questions/public-question.ts`) copie `instance.statement` tel quel : le texte source des blocs à
geste part au navigateur, réponse comprise. Les cases (`publicBlank`) sont propres : liste blanche, jamais
`expectedAnswer`, jamais l'indice juste d'un choix.

Seul chemin d'envoi en évaluation notée : `toPublicQuestion` ← `toPublicQuestions`
(`src/lib/server/evaluation-attempts.ts`, reprise, reprise après régénération, nouvelle tentative) ←
`startEvaluationAttempt` ← `src/routes/api/evaluations/assignments/[id]/start/+server.ts`.

La fuite compte quand la tâche demande un calcul (« place l'image de 2 par f », « colorie les 3/4 » d'une
figure à 8 parts, « construis le double de 17 ») : la consigne ne donne pas la valeur, le source oui.

## 2. Inventaire (2026-11-01, à revérifier dans le code avant de coder)

| Bloc               | Ce qui fuit                                                     | L'écran doit garder                          |
| ------------------ | --------------------------------------------------------------- | -------------------------------------------- |
| line               | `placer: A=3 ; B=7` (valeurs)                                   | noms, nombre de points                       |
| courbe             | `placer: A=(2 ; 3)` (coordonnées)                               | noms, nombre de points                       |
| horloge            | `placer: 9 h 25`                                                | un `placer:` sans heure (marqueur)           |
| collection/monnaie | `construire: N`                                                 | marqueur « à construire »                    |
| partage            | `colorier: 3/8`                                                 | marqueur « à colorier », la forme            |
| barres             | valeurs des barres à construire ; l'échelle si `axe: à choisir` | noms des barres à construire, axe            |
| patron             | cible de `designer:` ; cases retirées de `completer:`           | patron amputé, nombre de cases               |
| cubes              | `hauteurs:` (avec `retrouver:` = la réponse)                    | lot 2 : la perspective a besoin des hauteurs |
| figure-a-completer | `verifier:`, positions de points                                | lot 2 : la figure de départ                  |

Sans fuite : `ranger` (bloc réécrit dans l'ordre mélangé, `instance-generator.ts`), figure de travail
(jamais notée), opération posée (les termes sont la question). `PublicQuestion.expressions` : à vérifier.

## 3. Phase 0 — validée par David le 2026-11-01 (« je valide »)

1. **Masquer toujours**, bloc par bloc, sans chercher si la consigne donne déjà la valeur.
2. **Lot 1** : masques simples (line, courbe, horloge, collection, monnaie, partage, patron, valeurs des barres
   à construire). **Lot 2** : cubes `dessiner:`, barres à échelle à choisir, figure à compléter — une question
   par cas à David.
3. **Auditer d'abord** les devoirs, séances, défis : servent-ils des questions notées avec l'instance complète ?
4. **Ordre** : `fuite-enonce` avant le lot 2 de `points-repere`.

Comportement : avant l'envoi, le serveur remplace dans chaque bloc à geste ce qui dit la réponse par une forme
neutre ; l'élève voit le même écran ; la correction ne change pas (serveur, instance complète). Tests : de bout
en bout, démarrer une évaluation et vérifier qu'aucune cible n'apparaît dans le JSON ; et que chaque bloc
masqué se dessine encore avec son geste.

## 4. Audit Q3 — les autres chemins (2026-11-01)

Question : un autre chemin sert-il des questions **notées** avec l'instance complète ? **Non.** Seule
l'évaluation est corrigée par le serveur (ADR 0015) ; partout ailleurs, l'instance complète part au
navigateur **par décision** (ADR 0001) et c'est le navigateur qui rend le verdict : masquer l'énoncé n'y
servirait à rien, `expectedAnswer` est dans le même JSON.

| Chemin                                                                  | Ce qui part                                                                         | Noté ?                                                     | Verdict                 |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------- | ----------------------- |
| Évaluation (`api/evaluations/assignments/[id]/start`)                   | `toPublicQuestion` (liste blanche)                                                  | oui                                                        | **lot 1 ici**           |
| Copie rendue (`readSubmittedCopy`, `test_answers`)                      | instance complète, **après** l'envoi                                                | —                                                          | sans objet              |
| Instance stockée (`evaluation_attempt_questions`)                       | `revoke all` sauf `service_role` (migr. 20260930)                                   | —                                                          | pas lisible par l'élève |
| Devoirs / fiches (`api/student/worksheets/[assignmentId]`)              | exercices (`student-copy.ts`), pas de modèles ; corrigé masqué tant que non visible | non (papier, prof)                                         | hors chantier           |
| SRS (`api/srs/review/due`, `srs/chapters/[id]/due`)                     | instance complète (`generateSRSInstance`)                                           | non : grade envoyé par le client (+ gidouilles du Palotin) | ADR 0001                |
| Quiz interactif (`api/skill-attempts`), Automaths, `questions/generate` | instance complète                                                                   | non : `success` envoyé par le client                       | ADR 0001                |
| Course aux nombres hors évaluation (`api/tests/save`)                   | résultat corrigé par le client                                                      | non ; `assignmentId` refusé (400)                          | ADR 0001                |
| « Séances » : cahier de texte, classroom (`shared_coursework`)          | aucune question                                                                     | —                                                          | sans objet              |
| « Défis » : Navadra (`game_challenges`), énigmes (`riddles`)            | tables à part, pas de modèles ni de blocs à geste                                   | non                                                        | hors chantier           |

Hors chantier, à signaler : le combat Navadra reçoit `correct_answer` **du client** (`submitAnswer`,
`navadra/combat/[combatId]/+page.server.ts`) : jeu, pas de note, même logique que l'ADR 0001.

## 5. Lot 1 — codé (2026-11-01)

**Forme neutre : `?`** à la place de la valeur (`placer: A=? ; B=?`, `placer: ?`, `construire: ?`,
`colorier: ?`, `Natation = ?`). `maskGestureAnswers` (`src/lib/questions/masked-statement.ts`) réécrit
l'énoncé dans `toPublicQuestion` ; l'instance complète (enregistrée, corrigée) ne change pas. Les parseurs
lisent `?` comme une valeur de remplacement (`ubumark/utils/masked-value.ts`), sans vérification :
droite → début de la droite, repère → (0 ; 0), horloge → 12 h 00, collection → 1, monnaie → plus petite
coupure, partage → 1/1, barre → 0. Elle ne sert qu'au dessin de la solution (montré après verdict
seulement). `buildAnswerOf` refuse `?` écrit par un auteur (aucun modèle en prod n'en a : 107 modèles à
blocs vérifiés le 2026-11-01).

Trouvé en route : la case d'un geste perdait `construire` (genre du bloc) dans la version publique →
l'écran d'évaluation affichait « Remplissez les blancs avec vos réponses » sous un geste. Ajouté à la liste
blanche (aucun secret : l'énoncé montre le bloc).

`axe: à choisir` (barres) : masqué aussi — tous les effectifs deviennent `?`, l'échelle ne se déduit plus.

**Patron, pas fait** :

- `designer:` : sans objet — la valeur est la tâche (`opposee`, `face EFGH`), que la consigne dit ; les faces
  se trouvent par le pliage.
- `completer: 4` : fuite réelle (les cases retirées = une solution), mais le patron vient du catalogue
  (`layout: 1`) ; le patron amputé n'a pas d'écriture. **Question à David** (avec le lot 2).

Tests : `masked-statement.test.ts` (19 : masque, bloc relu, refus du `?` ; 10 rouges sans le masque),
`FillBlanksInput-enonce-masque.svelte.test.ts` (8 : même HTML instance complète / version publique pour les
7 blocs, geste de la droite), `evaluation-notee-serveur.test.ts` (3 de bout en bout : démarrer, reprendre,
correction juste ; 2 rouges sans le masque).

## 6. Revues de #2120, recos pour le lot 2 (2026-11-01)

**security-auditor (Opus)** : aucun bloquant. Aucun autre chemin vers la réponse (`graphicalConfig` jamais
rempli, `expressions` sans `value`, reprise masquée, `evaluation_attempt_questions` sans droit ni policy en
prod, `test_answers` écrit à l'envoi seulement) ; `construire` n'apprend rien. Corrigé : bloc à geste dans une
option de ```choix laissé tel quel (sinon options identiques). Proposé : d'ici le lot 2, refuser dans une
évaluation notée les genres pas encore masqués (0 modèle publié aujourd'hui) — **à trancher par David**.

**code-reviewer (Opus)** : aucun bloquant. Corrigés : commentaire périmé (`axe: à choisir` est masqué), barres
illisibles (toutes les données masquées), refus du `?` limité à la ligne de la réponse (`légendes: ?`,
`axes: Sport ; ?` permis), tests du refus pour courbe / monnaie / barres, énoncé à plusieurs blocs.

**Recos pour le lot 2** (données à David le 2026-11-01, pas encore validées) :

1. Patron `designer:` : rien à masquer (la tâche est dans la consigne, les faces se trouvent par le pliage).
2. Patron `completer:` : masquer ; le serveur écrit le patron amputé dans le même cadre + `completer: ? ?`
   (un `?` par face) ; forme refusée dans un modèle.
3. Barres `axe: à choisir` : réglé au lot 1.
4. Cubes `dessiner:` : sans doute rien (les hauteurs sont la figure montrée) ; `retrouver:` : masquer, le serveur
   envoie les vues calculées sans les hauteurs. À confirmer en lisant le code.
5. Figure à compléter : masquer `verifier:` ; vérifier si les positions de points trahissent la réponse.
6. Garde-fou de l'auditeur d'ici là : à trancher.
