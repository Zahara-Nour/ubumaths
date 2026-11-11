# 0037 — Cinq formes de série, deux boutons d'auto-évaluation

- **Statut** : acceptée — mise en œuvre par le chantier `formes-de-serie` (journal :
  [`docs/wip/formes-de-serie-progress.md`](../wip/formes-de-serie-progress.md))
- **Date** : 2026-11-11 · **Décidée par** : David

## Contexte

Relecture de `cours-suites` : une carte de cours ne se montre pas pareil en Flash-cards et en
Entraînement, et l'auto-évaluation n'a pas les mêmes boutons partout (deux en Flash-cards, quatre notes
FSRS Again/Hard/Good/Easy en révision). Constats vérifiés le 2026-11-11 :

- quatre formes de série : Flash-cards (`flash`), Entraînement (`interactive`, chrono par question,
  correction à la fin), Course aux nombres (`course`), En classe (`display`) ; les cartes de cours sont
  retirées de l'Entraînement et de la Course (`seriesFormExcludesCourseCards`) ;
- `FlashCard` sait déjà faire saisir puis se retourner, mais aucun élève ne le voit ;
- les **séances libres** (`test_sessions` + `test_answers` sans `evaluation_id`) ne sont lues que par
  l'export RGPD (en prod : 4 séances, 33 réponses) et doublent les traces (`skill_attempts`).

## Décision

1. **Cinq formes de série** :
   - **Flash-cards** : carte retournée, auto-évaluation, correction immédiate ; cartes de cours gardées ;
   - **Saisie** (nouvelle) : l'élève tape, la carte se retourne d'elle-même après « Valider » (sa
     réponse face à la bonne, puis la correction) ; pas de chrono ; cartes de cours gardées,
     auto-évaluées ;
   - **Contrôle blanc** : l'ancien Entraînement (`interactive`), pour préparer un contrôle ; saisie,
     correction et note à la fin ; **note non enregistrée** ; cartes de cours retirées ;
   - **Course aux nombres** et **En classe** : inchangées.
2. Un **contrôle** se passe sous forme de Contrôle blanc ou de Course aux nombres, noté pour de vrai
   ([ADR 0015](0015-evaluation-notee-correction-serveur.md) inchangé).
3. **Auto-évaluation : deux boutons, « Réussi / Pas réussi », partout** (Flash-cards, cartes de cours,
   révisions SRS). Les origines `student_self` et `srs` des traces fusionnent en une seule
   (« déclaré »). « Aller au plus simple pour les élèves. »
4. `srs_card_stats` s'appelle l'**état de mémorisation**. Pas d'historique des séances côté élève.
5. Les séances libres **ne s'écrivent plus** : la trace porte tout le nécessaire
   ([ADR 0038](0038-contenu-d-une-trace.md)). Les contrôles gardent leurs séances et réponses.

## Écarté

- **Garder les quatre notes FSRS en révision** : deux boutons partout, pour les élèves.
- **Garder « Entraînement » comme nom** de la forme qui prépare un contrôle : elle devient Contrôle blanc.
- **Retirer la Course aux nombres des contrôles** : non, le contrôle garde ses deux formes.
- **Continuer d'écrire les séances libres à côté des traces** : doublon, à condition que la trace
  enregistre tout le nécessaire (« je n'ai pas dit qu'il ne faut rien écrire »).
- **Un historique des séances pour l'élève** : non.

## Conséquences

- [ADR 0016](0016-auto-evaluation-meilleur-resultat-du-jour.md) tient : le meilleur résultat du jour
  est « Réussi ». FSRS reçoit Good / Again, comme les Flash-cards aujourd'hui.
- L'histogramme des notes 1-4 de l'analyse de classe (widget D) perd son sens : à remplacer.
- Nouvelle valeur de `TestMode` pour la Saisie ; `FlashCard` en mode saisie passe côté élève.
- Les séances libres déjà écrites restent lues par l'export RGPD ; les supprimer est destructif, à
  décider à part.
- « Saisie » nomme aussi la page prof `teacher/evaluation-tasks/[id]/saisie` (observation) : ne pas
  confondre.
