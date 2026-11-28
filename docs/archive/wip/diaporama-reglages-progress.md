# Chantier `diaporama-reglages` — page d'attente et réglages des formes de série

Proposition 3 du chantier `inspiration` (cf. `docs/wip/inspiration-progress.md`), élargie par David le 2026-11-20 : une page d'attente avant de lancer une série.

## Reprendre ici

_Chantier CLOS le 2026-11-22._

- **État** : livré en trois PR, #2936 (En classe), #2984 (entraînements libres), #2988 (contrôles assignés) ; pas encore en prod à la clôture. Flash-cards et Saisie : pas de page d'attente (phase 0 de la PR 2).
- **Durable** : `docs/systeme/evaluations.md` (formes de série, page d'attente, réglages, pièges du `Deck`).
- **Reste** : les essais de David (`docs/wip/verifications-manuelles.md`).

## Phase 0 (validée par David le 2026-11-20)

### Découpage

- **PR 1 — En classe** : page d'attente, réglages (page d'attente + ⚙ pendant la série), correction après chaque question, pause à la fin du temps, son, plein écran. La page d'attente est un **cadre commun** (en-tête, réglages, indications, bouton « C'est parti ! »).
- **PR 2 — les autres formes** sur le même cadre, avec leur propre petite phase 0 : Course aux nombres (le temps imparti passe-t-il sur la page d'attente ?), Contrôle blanc en évaluation (la page doit venir AVANT le démarrage de la tentative par le serveur → revue sécurité), Flash-cards et Saisie (indications).

### Page d'attente (En classe)

- Dans la projection elle-même (pas dans la fenêtre de choix de la forme) : vue quel que soit le chemin (panier, lien de série).
- En tête : « 10 questions · environ 4 min » (somme des durées).
- Les réglages, puis des indications courtes : Espace = pause · F = plein écran · ← → = question précédente / suivante · −5 s / +5 s = durée du modèle.
- Gros bouton « C'est parti ! » : lance le chrono de la question 1 ; le clic débloque aussi le son et le plein écran (geste exigé par les navigateurs).
- « Recommencer » (écran de fin) revient à la page d'attente, réglages gardés.

### Réglages (tous gardés dans le navigateur, rien en base)

| Réglage                                                         | Défaut       |
| --------------------------------------------------------------- | ------------ |
| Plein écran au lancement                                        | **allumé**   |
| Correction après chaque question, durée 5 à 60 s par pas de 5 s | éteint, 10 s |
| Pause à la fin du temps                                         | éteint       |
| Son entre deux questions                                        | éteint       |

- Mêmes réglages sur la page d'attente et dans le panneau ⚙ de la projection (un seul morceau d'écran). Panneau ouvert = diaporama en pause ; ils s'appliquent sans recommencer la série.
- Navigateur qui ne garde rien (navigation privée) : réglages par défaut, sans message.
- Plein écran refusé par le navigateur : la série démarre normalement, sans message. Échap sort du plein écran sans arrêter la série.

### a) Correction après chaque question

- Chrono de la question à 0 → la carte montre son verso (réponse + correction concise) pendant la durée réglée ; en haut « Correction 3 / 10 » ; puis la question suivante.
- Toutes les questions ont une correction, **cartes de cours comprises** (leur verso est leur correction, `course-card.ts`).
- Espace met la correction en pause ; flèche « suivante » : question → sa correction → question suivante.
- −5 s / +5 s pendant une correction : durée des corrections.
- Grilles de fin inchangées.

### b) Pause à la fin du temps

- À 0, la question reste affichée, en pause : « Temps écoulé — Espace pour continuer ». Espace → la suite, sans relancer le chrono.
- Avec a) : question → pause → Espace → correction → question suivante (pas de pause après la correction).

### c) Son entre deux questions

- « Ding » court et discret quand une nouvelle question apparaît (Web Audio, sans fichier). Pas pour la correction, pas à la fin.
- Son impossible (pas de clic préalable, navigateur sans Web Audio) : rien, sans erreur.

### Pas de carton entre deux questions

Vérifié : « Question i / n » est déjà affiché en haut à gauche (`classroom-position`).

## Phase 0 de la PR 2 (validée par David le 2026-11-22 : « je suis tes recos »)

Constat : seule « En classe » avait une page d'attente ; les autres formes démarrent à l'ouverture. En contrôle assigné, le serveur démarre la tentative au chargement : le chrono d'une Course aux nombres tourne avant que l'élève ait rien vu.

- **Page d'attente seulement pour les formes à chrono** (même cadre `SeriesStartScreen`, sans réglages) :
  - **Contrôle blanc** libre : « 10 questions · environ 4 min » (somme des durées) ; le chrono de la question 1 part au clic ; « Recommencer » ramène à la page d'attente.
  - **Course aux nombres** libre : « 20 questions · 5 min » ; le chrono global part au clic. Le temps imparti reste choisi dans la fenêtre de choix de la forme (le lien de série le porte) ; la page d'attente l'affiche sans le changer.
- **Flash-cards, Saisie** : pas de page d'attente (sans chrono, elle n'ajouterait qu'un clic).
- **Aucun réglage** pour les formes en autonomie.
- **Contrôle assigné** (Contrôle blanc ou Course aux nombres) : page d'attente AVANT que le serveur démarre la tentative, ex. « Contrôle de fractions · Course aux nombres · 15 questions · 10 min » ; le clic démarre la tentative ; tentative déjà commencée → « Tu reprends ton contrôle : il te reste 6 min ». Demande un appel serveur en lecture seule (titre, forme, nombre de questions, temps) → PR à part, revue de sécurité.
- **Découpage** : **PR 2a** entraînements libres (sans serveur) · **PR 2b** contrôles assignés.

## Historique

### 2026-11-20 — ouverture

Phase 0 discutée et validée avec David (réglages avant ET pendant, page d'attente, plein écran allumé par défaut, 10 s de correction, deux PR).

### 2026-11-20 — PR 1 écrite et relue

- Fichiers : `SeriesStartScreen.svelte` (cadre commun), `ClassroomSettingsPanel.svelte`, `classroomSettings.svelte.ts`, `utils/chime.ts`, `Deck.svelte` (`holdOnExpire`), `ClassroomSeries.svelte`.
- Relecture : corrigés — panneau ⚙ ouvert, Espace / flèches allaient encore au Deck (délégation des événements Svelte) ; Échap ferme le panneau ; « Temps écoulé » périmé après remontage du Deck ; `restoring` jamais coincé. Gardés tels quels : flèche après « Temps écoulé » = question suivante en pause (comme la navigation manuelle) ; pas de son pour la 1re question (phase 0 : « entre deux questions »).
- Test d'environnement : les diapositives de correction (verso en grand) chargent le dictionnaire des mots cliquables ; en test, sans API, avertissement `wrapDynamicImport` en fin de fichier, sans échec (exit 0).

### 2026-11-22 — PR 2a écrite

- Phase 0 de la PR 2 validée (« je suis tes recos »).
- `TestInteractive`, `TestCourse` : page d'attente hors contrôle assigné (`started`, `handleStart`) ; la course compte ses durées depuis le clic (`raceStart()`), plus depuis `session.startTime` (ce n'est plus muté par « Recommencer »). Résumé commun : `series-summary.ts` (En classe y passe aussi, sortie inchangée).
- Tests : 8 nouveaux (page d'attente, durée tracée depuis le clic — vérifiés rouges sans la remise à zéro —, contrôle sans page d'attente) ; les tests existants passent la page d'attente (`startSeries`, `renderCourse`).
- Relecture (`code-reviewer`, Sonnet) : pas de bloquant. Corrigés : la durée de série envoyée à `/api/tests/save` partait de l'ouverture (`onStart` → la page remet `testSession.startTime`) ; test ajouté pour « Recommencer » sur place d'une course sans `onRestart` (vérifié rouge).
- Mergée (#2984) après un premier rouge de CI : trois fichiers de test montaient ces formes sans passer la page d'attente (`memes-nombres`, `page-demo-questions`, `QuestionPreviewTabs-units`) ; `Doc-inchangée:` pour `questions.md` (couvre la page `automaths/test` sans décrire le lancement des formes).

### 2026-11-22 — PR 2b écrite

- Worktree à part (`ubumaths-wt-diaporama-controles`) : celui du chantier garde le serveur de test 5177 de David.
- Serveur : `GET /api/evaluations/assignments/[id]` → `readEvaluationOverview` (lecture seule). Les droits de `startEvaluationAttempt` (destinataire, publiée, tentative ouverte, date limite, tentatives) sont sortis dans `resolveAssignmentAccess`, partagé : mêmes refus, aucune écriture. Questions comptées : tentative ouverte → ses lignes (service_role, durées seules) ; sinon lignes dont le modèle est publié et n'est pas une carte de cours (nombre visé par le tirage, une génération impossible peut en retirer une).
- Page : `SeriesStartScreen` avant `start` ; « Reprendre » si tentative commencée ; refus affiché dès la page d'attente ; bouton désactivé pendant le démarrage.
- Tests : route (8, rouges sans le module), intégration (7 : aucune séance créée, reprise et temps restant, archivé/brouillon → 404, date limite → 403, aperçu du prof), page (6 nouveaux, rouges sans le code ; les 8 existants passent la page d'attente).
- Relecture : `code-reviewer` (Sonnet) et `security-auditor` (Opus), aucun bloquant (aucun accès élargi : la route rend un sous-ensemble de ce que `start` rendait au même appelant ; service_role borné à la tentative trouvée sous RLS). Corrigés : nombre de questions par tirage à blanc (`drawSeriesQuestions`, l'épuisement des variantes en retire ; test rouge avec l'ancien décompte), aucune question → 409 dès la page d'attente ; Course reprise sans temps limite → repli commun `DEFAULT_COURSE_TIME_LIMIT_SECONDS` (plus « temps écoulé » à tort) ; échec au clic → retour à la page d'attente (test) ; « Quitter » d'un aperçu vers l'espace prof ; tests d'intégration Q37 (tentative en cours après la date limite → reprise) et élève hors classe → 404 (page d'attente et `start`) ; journal si une tentative ouverte n'a aucune question. Gardé : réponse non validée par Zod côté navigateur (notre serveur, titre échappé par Svelte).
- Mergée (#2988) après un premier rouge de CI : `types/evaluation-attempt.ts` exporte maintenant une constante lue par le serveur, il manquait au filtre `paths` de la suite d'intégration (`nightly-integration.yml`).

### 2026-11-22 — clôture

- PR 2b livrée par #2988 (route `GET /api/evaluations/assignments/[id]`, revues code et sécurité sans bloquant). Pièges versés dans `evaluations.md`, journal archivé, worktree retiré.
