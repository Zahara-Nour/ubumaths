---
title: Atelier — remplacer son atelier par un atelier reçu (phase 0)
date: 2026-10-18
status: phase 0 VALIDÉE (2026-10-18, « ok pour tes recos ») ; à faire après la PR 1 de la géométrie
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

## Comportements à préciser à l'ouverture du chantier

Cas nominal / limite / erreur à écrire et à faire valider avant le code, notamment :

- atelier personnel vide : « Remplacer » sans confirmation (rien à perdre), et sans copie mise de côté ;
- « Retrouver » quand l'atelier courant a été modifié depuis le remplacement : ce qui est perdu à
  son tour, et s'il faut le dire ;
- sauvegarde impossible (quota, stockage indisponible) : le remplacement est refusé, rien ne change ;
- atelier reçu en version plus récente (`too-recent`) ou abîmé : mêmes refus que la fusion ;
- la copie mise de côté passe par Zod à la relecture comme l'atelier rangé.

## Constaté, à traiter avec ce chantier (proposé, non tranché)

- **Fusion** (`mergeInto`, lu dans le code par l'agent de la PR 1 de la géométrie, non mesuré) :
  quand un arrivant est renommé pour cause de collision, les définitions des AUTRES arrivants qui
  le citent ne sont pas réécrites. Exemple : reçu `a = 3` et `f(x) = a x`, local `a = 5` → le `a`
  reçu devient `b`, mais `f` reste `a x` et suit le `a = 5` local, sans rien dire. À prouver par un
  test rouge, puis corriger.
