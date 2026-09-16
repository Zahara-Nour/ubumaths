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

## Ce que ce lot n'est pas

Les trois vues sont des **espaces réservés** : elles affichent leur nom et
attendent leur lot. Les actions qui dépendent d'une vue (tracer, tabuler) ne sont
pas encore câblées — seule « Supprimer » l'est, parce qu'elle ne dépend de rien.
