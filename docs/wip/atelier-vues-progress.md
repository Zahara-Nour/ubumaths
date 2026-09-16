---
title: Atelier — les vues (lot 1 : le panneau d'objets)
date: 2026-09-16
status: lot 1 fait — panneau, actions, session, conteneur, route
branche: feat/atelier-panneau
---

# Les vues — découpage

« Les vues » est trop gros pour une PR. Par ordre de **dépendance** :

| Lot   | Contenu                                                         | État    |
| ----- | --------------------------------------------------------------- | ------- |
| **1** | Panneau d'objets, actions, session, conteneur, route `/atelier` | ✅ fait |
| 2     | Vue **Graphe** — `GrapheurContainer` prend déjà une instance    | à venir |
| 3     | Vue **Calcul** — fusion `/calc` + `/cas`, les commandes cachées | à venir |
| 4     | Vue **Données** — listes, nuage de points                       | à venir |
| 5     | **URL et mode éphémère** (§6) + garanties `/grapheur` (§7)      | à venir |

Le lot 1 d'abord parce que c'est la **colonne vertébrale** : sans ancrage pour
les objets, aucune vue n'a de sens.

## Ce que le lot 1 contient

| Fichier                       | Rôle                                                   |
| ----------------------------- | ------------------------------------------------------ |
| `atelier/actions.ts`          | Le catalogue par type — **la progressivité vit là**    |
| `atelier/context.ts`          | L'instance descend par le contexte                     |
| `atelier/session.svelte.ts`   | Charger, ranger en différé, écouter les autres onglets |
| `components/atelier/*.svelte` | `ObjectPanel`, `ObjectCard`, `AtelierContainer`        |
| `routes/(public)/atelier/`    | La route, publique et sans compte                      |

## Trois choses que les tests verrouillent

**La progressivité se voit.** Dans un atelier qui ne contient que des nombres,
le bouton « Dériver » **n'existe pas dans le DOM** — pas caché, absent (§3 N1).

**Une écriture venue d'un autre onglet prévient sans rien écraser.** Remplacer
d'office ce que l'élève a sous les yeux serait la perte silencieuse que le §5
interdit. On prévient, il décide (§5 L4).

**Le mode éphémère n'écrit rien.** Vérifié avec une sentinelle dans le stockage,
avant même que la vue Graphe existe — c'est la garantie du §7 N2, et elle est
plus facile à tenir maintenant qu'après coup.

## Deux choix de conception

**`context.ts` n'a pas de repli**, contrairement à `grapheur-context.ts` :
l'atelier est neuf, aucun composant n'est monté hors conteneur, et un repli
masquerait l'oubli au lieu de le signaler. Le grapheur, lui, en avait besoin —
sept fichiers de tests y montent les composants seuls.

**`session` ne tait jamais rien** : tout ce qui doit être dit à l'élève passe par
`onNotice`, y compris ce qu'une restauration n'a pas su recréer.

## Vérifications

|                     |                                        |
| ------------------- | -------------------------------------- |
| Tests               | **149 node + 13 navigateur**           |
| `check:incremental` | 1611 fichiers, **0 erreur, 0 warning** |
| `lint:fast`         | rien à signaler                        |

Un `svelte-ignore state_referenced_locally` sur `view` : elle donne la vue **de
départ** — celle qu'une URL demande — et l'élève change d'onglet librement
ensuite. Pattern documenté dans `docs/ref/warning-svelte.md` §1.

## ⚠️ Revue #336 — deux pertes du travail de l'élève

### 1. Créer un objet n'enregistrait rien

`sessionTouch` n'était appelé qu'à un seul endroit, pour « Supprimer ». L'élève
cliquait « + Fonction », saisissait, rechargeait — tout avait disparu.

**Corrigé par un compteur de révision** dans le modèle, suivi par un `$effect` du
conteneur : **une seule source de « ça a changé »**. Prévenir la session depuis
chaque appelant ne tenait pas — c'est exactement comme ça que le trou est né, et
chaque action à venir l'aurait rouvert.

### 2. `close()` jetait la sauvegarde en attente

L'élève supprime un objet, clique un lien dans les 500 ms : geste perdu. Fermer
**range** désormais ce qui attend, et un écouteur `pagehide` couvre la fermeture
d'onglet — `beforeunload` ne se déclenche pas sur iOS.

⚠️ **Mon test gravait ce défaut** : il s'appelait « ne sauve plus après avoir été
fermée » et vérifiait la perte. **Deuxième fois dans ce chantier** (le premier
était « ignore un objet de forme inattendue sans tout perdre », PR #335).

### Trois corrections de fond

- **a11y** : `aria-disabled` plutôt que `disabled`, et la **raison est écrite**,
  plus seulement en infobulle. Une infobulle ne se lit ni au clavier, ni au
  doigt, ni au lecteur d'écran — or c'est elle qui dit ce qui manque. Les avis
  passent en `aria-live`.
- **L'interface parlait anglais** : « FUNCTION », « SEQUENCE » s'affichaient.
- **Les boutons morts** : toute action dont la vue n'existe pas encore dit
  « Cette action arrive dans un prochain lot » au lieu de ne rien faire. Un test
  vérifie ce message — **il rougira quand les vues arriveront, et c'est voulu**.

Et `session.svelte.ts` → `session.ts` : aucune rune dedans, le suffixe n'avait
pas lieu d'être.

## Lot 2 — la vue Graphe

### La décision : **option B**, tranchée le 2026-09-16

Quand l'élève clique « Tracer » sur `f`, qui détient la courbe ?

|                                                                         |                                                 |
| ----------------------------------------------------------------------- | ----------------------------------------------- |
| A — l'atelier pousse une copie                                          | ⛔ deux vérités : modifier `f` ne redessine pas |
| **B — le grapheur est synchronisé depuis l'atelier, dans un seul sens** | ✅ retenue                                      |
| C — les fonctions du grapheur SONT les objets de l'atelier              | 🔜 plus tard                                    |

B tient la décision figée n° 1 — l'atelier détient l'état, la courbe le reflète —
**sans refondre le grapheur**, qui vient de passer en production. Et elle répond
à une question que A laissait ouverte : que se passe-t-il si on ajoute une
fonction depuis le panneau du grapheur ? En B la question disparaît, puisque ce
panneau n'est pas affiché dans l'atelier — c'est « Mes objets » qui tient ce rôle.

> 🔜 **C reste intéressant pour plus tard** (noté avec David le 2026-09-16).
> **Déclencheur : quand le grapheur n'aura plus d'autre usage que l'atelier.**
> Tant que `/grapheur` vit seul, son `functions` doit rester à lui.

### Ce que ça donne

`plot-sync.ts` reporte les objets tracés vers le grapheur. **Idempotent** :
re-synchroniser sans changement ne fait rien, sinon chaque frappe recréerait les
courbes et le graphe clignoterait. Et il ne touche jamais aux courbes ajoutées à
la main dans `/grapheur` — il ne connaît que celles qu'il a posées.

Un objet qui ne peut rien produire (`pending`, `error`) **n'est pas tracé** :
une courbe absente sans explication est pire qu'une action désactivée qui en
donne une.

### Un bug trouvé par un test

`update()` reconstruit l'objet et **perdait son état tracé** : l'élève modifiait
sa fonction, sa courbe disparaissait. Même famille que le curseur écrasé signalé
en revue #334 — tout état d'affichage ajouté devra être reporté au même endroit,
un commentaire le dit désormais dans le code.

### Le test qui a rougi comme prévu

Celui qui vérifiait que « Tracer » annonce son prochain lot. Il a rougi au moment
exact où l'action a été câblée, et il continue de surveiller les autres.

## Ce que ce lot n'est pas

Les trois vues sont des **espaces réservés** : elles affichent leur nom et
attendent leur lot. Les actions qui dépendent d'une vue (tracer, tabuler) ne sont
pas encore câblées — seule « Supprimer » l'est, parce qu'elle ne dépend de rien.

## Ce que la revue #337 a corrigé

Six points, dont un bloquant qui cassait le lot entier.

**Le panneau du grapheur écrivait par-dessus l'élève.** J'avais écrit dans un
commentaire que `GrapheurContainer` était monté « sans son panneau » — c'était
faux : il rendait `FunctionPanel` sans condition. Dans l'atelier, deux panneaux
pilotaient donc le même store, et la synchronisation réécrivait ce que l'élève
tapait dans celui du grapheur. Une prop `panel` (par défaut `true`) le masque
côté atelier ; `/calc` et `/grapheur` ne changent pas.

> ⚠️ **Un commentaire qui décrit un comportement est une assertion.** Celui-ci
> décrivait l'intention, pas le code, et il a rendu le bug invisible à ma
> relecture. Le vérifier coûtait un `grep`.

**Une définition fautive masque la courbe au lieu de la détruire.** En cours de
frappe, `f(x)=2x+` est momentanément invalide : détruire puis recréer la courbe
lui donnait une nouvelle couleur à chaque caractère. Elle reste désormais en
place, `visible: false`.

**« Retirer du graphe » reste actif sur un objet cassé** — c'est justement le
moment où l'on veut l'enlever.

**Le `WeakMap` est clé sur le couple (atelier, grapheur).** Clé sur le seul
atelier, deux grapheurs auraient partagé un état de synchronisation qui ne
décrivait ni l'un ni l'autre.

**`adoptGrapheurState` marque `plotted: true`.** Sans ça, la première
synchronisation effaçait les courbes qu'elle venait d'adopter.

**Un commentaire dit pourquoi l'effet ne boucle pas** : la synchronisation est
idempotente, et c'est la seule raison — sans elle,
`effect_update_depth_exceeded`.
