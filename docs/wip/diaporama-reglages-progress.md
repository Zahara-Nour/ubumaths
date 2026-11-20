# Chantier `diaporama-reglages` — page d'attente et réglages des formes de série

Proposition 3 du chantier `inspiration` (cf. `docs/wip/inspiration-progress.md`), élargie par David le 2026-11-20 : une page d'attente avant de lancer une série.

## Reprendre ici

_Mis à jour le 2026-11-20 : phase 0 validée, PR 1 en cours._

- **État** : phase 0 validée (ci-dessous). PR 1 (En classe) en cours d'écriture.
- **Prochaine action** : tests rouges de la PR 1, puis implémentation.
- **En attente de David** : rien.
- **Pièges en cours** : `Slide` prend son index par ordre de montage (`claimNextH`) : la liste des diapositives ne peut pas changer en cours de route sans remonter le `Deck`.
- **Worktree / branche** : `../ubumaths-wt-diaporama-reglages` · `feat/diaporama-reglages`.

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

## Historique

### 2026-11-20 — ouverture

Phase 0 discutée et validée avec David (réglages avant ET pendant, page d'attente, plein écran allumé par défaut, 10 s de correction, deux PR).
