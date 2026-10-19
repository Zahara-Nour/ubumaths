---
title: Atelier — remplacer son atelier par un atelier reçu (phase 0)
date: 2026-10-18
status: phase 0 VALIDÉE (R1-R5 le 2026-10-18 ; cas limites B1-B9 le 2026-10-19) — en cours
---

# Atelier — remplacer son atelier par un atelier reçu

Chapeau : [atelier-progress.md](atelier-progress.md). Doc système : [atelier.md](../systeme/atelier.md)
(§ Session, persistance, URL : mode éphémère, « Garder dans mon atelier », `mergeInto`).

## Le besoin

Un atelier reçu par lien (`?a=`) s'ouvre en **mode éphémère** : rien n'est lu ni écrit dans
l'atelier personnel, et le travail fait dessus est perdu à la fermeture. La seule façon de le
garder est la **fusion** (« Garder dans mon atelier »), qui renomme les objets dont le nom est
pris (`f` reçu devient `g`). Pour un atelier de départ d'activité partagé par le prof, l'élève qui
a déjà des objets se retrouve avec un mélange où la consigne (« fais glisser a ») ne correspond
plus à ce qu'il voit.

## Décisions de David (2026-10-18, « ok pour tes recos »)

| #   | Décision                                                                                                                                                                                                                                                           |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| R1  | Deux gestes sur un atelier reçu : « **Garder dans mon atelier** » (la fusion, inchangée) et « **Remplacer mon atelier** ».                                                                                                                                         |
| R2  | « Remplacer » demande une **confirmation qui compte ce qui sera perdu** (« Tes 6 objets et ta grille seront remplacés. »). Un remplacement choisi et confirmé n'est pas un écrasement silencieux : la règle « jamais d'écrasement silencieux » tient.              |
| R3  | **L'atelier précédent est mis de côté** (une seule copie, clé `localStorage` à part) ; « **Retrouver mon atelier précédent** » le rétablit tant qu'un autre remplacement ne l'a pas écrasé. Troisième exception à D6, du même genre que la suppression en cascade. |
| R4  | **L'historique de la vue Calcul est gardé** (clé à part, `CALC_HISTORY_STORAGE_KEY`) : ce sont les calculs de l'élève, pas des objets de l'atelier.                                                                                                                |
| R5  | **Charger un fichier `.atelier.json`** (barre d'icônes, refonte lot 1, #1479), qui remplace aussi l'atelier, **profite de la même copie de côté** que R3 (décision de David du 2026-10-18, « je suis tes recos »).                                                 |

## Coordination avec la refonte de l'interface (2026-10-18)

La session « modifs-fixes » a mergé le suivi de revue de Charger (#1480, `104b8937b` :
`handleLoadFile` vérifie `MAX_ATELIER_FILE_BYTES` avant lecture, `consoleNotice` /
`offeredLineCount` dans `atelier-file.ts`, barre d'outils au clavier `roving-toolbar.ts`). **Ce
chantier part de là ; Charger est à lui** (modifs-fixes n'y touche plus).

## Cas limites — validés par David (2026-10-19, « je suis tes recos »)

| #   | Décision                                                                                                                                                       |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | Atelier personnel **vide** : « Remplacer » sans confirmation et sans copie mise de côté (rien à perdre).                                                       |
| B2  | **Confirmation** qui compte (« Tes 6 objets et ta grille seront remplacés. ») et rassure (« Ton atelier est mis de côté : tu pourras le retrouver. »).         |
| B3  | **« Retrouver mon atelier précédent » ÉCHANGE** : l'atelier courant devient à son tour la copie de côté — rien n'est jamais perdu, on passe de l'un à l'autre. |
| B4  | « Retrouver » est proposé dans l'**avis qui suit le remplacement**, puis dans la **barre d'icônes**, près de Charger, **seulement quand une copie existe**.    |
| B5  | **Sauvegarde impossible** (quota, stockage indisponible) : remplacement refusé, rien ne change, message qui le dit.                                            |
| B6  | Atelier reçu **trop récent** (`too-recent`) ou **abîmé** : mêmes refus que la fusion.                                                                          |
| B7  | La copie de côté est **relue par Zod** comme l'atelier rangé (migrations comprises, `y`) ; une copie abîmée est oubliée, avec un message.                      |
| B8  | **Charger** un `.atelier.json` suit le même chemin (R5) : confirmation, copie de côté.                                                                         |
| B9  | Le **défaut de la fusion** (ci-dessous) est prouvé par un test rouge puis corrigé dans ce chantier.                                                            |

**Coordination avec le lot 5 (annuler / rétablir, session « modifs-fixes », 2026-10-19)** : ce
chantier crée `Atelier.replaceWith(state, label)` — une étape (`atelier.step`), par la voie
interne de restauration qui NE vide PAS la pile : un remplacement s'annule d'un Ctrl+Z tant que
la page est ouverte ; la copie de côté couvre le rechargement. **La console ne fait pas partie de
l'état remplacé** (R4) : pas dans la photo de l'étape. La PR 3 du lot 5 reprendra `replaceWith`
pour Charger et Repartir de zéro, en partant de ce merge.

## Constaté, à traiter avec ce chantier (proposé, non tranché)

- **Fusion** (`mergeInto`, lu dans le code par l'agent de la PR 1 de la géométrie, non mesuré) :
  quand un arrivant est renommé pour cause de collision, les définitions des AUTRES arrivants qui
  le citent ne sont pas réécrites. Exemple : reçu `a = 3` et `f(x) = a x`, local `a = 5` → le `a`
  reçu devient `b`, mais `f` reste `a x` et suit le `a = 5` local, sans rien dire. À prouver par un
  test rouge, puis corriger.

## Journal

### 2026-10-19 — implémentation (branche `feat/atelier-remplacer`)

- **Modèle** : `Atelier.replaceWith(state, label, { onLeave })` — une étape (`step`), par
  `#restoreState` (la pile est gardée) ; `onLeave(atelier quitté)` appelé quand Annuler ou
  Rétablir quitte un côté de l'étape. La console n'est ni remplacée ni dans la photo (R4).
- **Stockage** (`replace.ts`) : copie sous `SET_ASIDE_STORAGE_KEY` (`chiphre-atelier-de-cote`),
  écrite AVANT ; une écriture refusée défait la précédente (B5) ; plus récent / abîmé → refus
  comme la fusion (B6) ; Retrouver = échange, les deux écritures ou aucune (B3) ; copie relue par
  `loadAtelier(…, clé)` (Zod), migrations à la relecture par l'atelier ; abîmée → oubliée (B7).
- **Interface** : bouton « Remplacer mon atelier » (`ShareBar`, `onReplace`) ; le conteneur sort
  du mode éphémère SANS recharger (`linkMode`, `openSession(…, { adopt: true })`, console de
  l'élève relue, `?a=` retiré par `replaceState` dans les pages `/atelier` et `/grapheur`) ;
  « Retrouver » dans l'avis (bouton dans la zone `aria-live`) et dans la barre (`ArchiveRestore`).
- **Undo et copie** : Annuler / Rétablir d'un remplacement ou d'un Retrouver réécrivent la copie
  avec l'atelier quitté (`keepLeftAside`) — sans cela, Ctrl+Z après Retrouver laissait la copie
  égale à l'écran, et l'autre atelier n'existait plus que dans la pile.
- **Charger** (R5, B8) : copie de côté avant `restore`, confirmation qui rassure, avis avec
  Retrouver ; refus si la copie ne s'écrit pas. **Toujours `restore`** (la pile est vidée) : la
  PR 3 du lot 5 remplacera la ligne commentée dans `loadNow` par
  `atelier.replaceWith(state, 'charger un atelier', { onLeave: keepLeftAside })`.
- **B9** : test rouge (7 cas : `a x`, `2a+1`, chaîne `a`/`b`/`c`, `a_1`, `a_{1}` de carte,
  `milieu(A, B)`, `(AB)`, `AB`, construction LaTeX) puis corrigé : `mergeInto` choisit les noms
  avant de créer (`planNames`, une lettre libre évite aussi les autres arrivants — sinon le `A`
  reçu devenait `B`, le nom d'un autre arrivant), puis réécrit les définitions
  (`rewriteCitations` → `renameInObject`, règle partagée avec `Atelier.rename` dans `rename.ts`).
  `renameInDefinition` lit désormais `a_{1}` (MathLive) : renommer `a` changeait la base de
  `a_{1}`, dans `rename` comme dans la fusion.

- **Revue** (`code-reviewer`) : (1) après Annuler d'un remplacement, la copie était réécrite
  500 ms avant l'atelier personnel → `keepLeftAside` range d'abord (`saveNow`), tests sur la clé
  personnelle ; (2) l'Annuler d'un remplacement s'écrivait comme un geste rejouable → plus de
  `replay` (`remplacer-rejeu.test.ts`, rouge prouvé ; au merge de main, le cas particulier
  `isReplacement` a cédé la place à la règle générale `#replayable` de #1521) ; (3) focus rendu à « Mes
  objets » quand le bouton disparaît ; (4) un objet écarté au remplacement est dit. Laissé : les
  entrées de `#onLeave` des étapes sorties de la pile (fuite minime).

### À trancher par David

1. **Ce que « Remplacer » garde** : l'atelier AFFICHÉ (le lien + ce que l'élève y a fait), pas le
   lien d'origine — choix le plus prudent (le travail fait sur le lien n'est pas perdu). « Garder »
   verse, lui, le lien d'origine (inchangé).
2. **Un Ctrl+Z juste après « Remplacer »** rend l'ancien atelier (il est remis à l'écran puis
   remplacé en une étape) ; les gestes faits sur le lien AVANT de remplacer ne sont plus
   annulables (l'atelier est relu).
3. **Charger sans stockage** (navigateur qui n'enregistre rien) : reste ce qu'il était, sans
   copie, au lieu d'être refusé (B5 appliqué seulement quand une écriture échoue).
