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
