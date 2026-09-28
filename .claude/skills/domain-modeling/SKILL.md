---
name: domain-modeling
description: Faire vivre le vocabulaire et les décisions de Chiphre pendant la conception. Utiliser quand on discute d'un terme du domaine (nom de concept, de table, de rubrique), en phase 0 d'une fonctionnalité, quand on modifie CONTEXT.md, ou quand David tranche une décision d'architecture à consigner dans docs/adr/.
---

# Modélisation du domaine

Adapté de `mattpocock/skills` (`domain-modeling` + `grilling`).

C'est la discipline **active** : contester les termes, inventer des scénarios limites, écrire le
glossaire et les décisions au moment où ils se figent. Simplement _lire_ `CONTEXT.md` pour employer le
bon mot n'est pas ce skill, c'est un réflexe de chaque session.

## Les deux fichiers

- **[`CONTEXT.md`](../../../CONTEXT.md)** (racine) : le glossaire. Un terme, un sens.
- **[`docs/adr/`](../../../docs/adr/)** : les décisions figées de David. Index et modèle de fiche dans
  `docs/adr/README.md`.

Les lire **avant** la discussion, et relire les ADR de la zone touchée.

## Pendant la discussion

### Confronter au glossaire

Un terme employé contredit `CONTEXT.md` → le dire tout de suite : « Le glossaire définit _publier_
comme X, tu sembles dire Y. Lequel ? » Les termes **bannis** (section en fin de `CONTEXT.md`) se
signalent à chaque apparition, y compris dans mes propres messages.

### Préciser le flou

Terme vague ou surchargé → proposer un terme canonique. « Quand tu dis _la classe voit_, tu parles des
élèves actifs ou aussi des archivés ? » Chiphre a des pièges connus : « publier » (trois sens),
« compétence » (jamais seule), « variation » (paramétrage d'un même cas, pas une autre question).

### Scénarios concrets

Tester chaque relation par un cas limite précis, qui force une frontière : un élève inscrit après la
publication, un élève hors-classe, un élève d'une autre école, une date de publication dans le futur,
deux variations de difficulté inégale.

### Confronter au code

Quand David décrit un fonctionnement, **vérifier que le code dit pareil** (grep ciblé, lecture de la
migration ou de la policy). Contradiction → la montrer : « Le code archive l'élève à la sortie de
classe, tu viens de dire qu'il perd l'accès. Lequel est juste ? » Chercher un fait est mon travail,
jamais le sien. Pas de sous-agent qui parcourt tout le dépôt (RAM, cf. CLAUDE.md) : des greps ciblés.

### Poser les questions par tours

Les décisions sont à David : je ne tranche jamais seul une architecture. Poser les questions dont les
prérequis sont déjà tranchés, **toutes dans le même tour**, numérotées, chacune avec ma recommandation.
Attendre ses réponses. Une question qui dépend d'une autre encore ouverte attend le tour suivant.

```
❓ **Q1 — <titre>** : <la question, avec les options>

➡️ <ma recommandation, et pourquoi>
```

La discussion est finie quand plus rien n'est supposé en silence. Ne pas agir avant que David confirme.

## Mettre à jour CONTEXT.md

**Au moment où un terme est tranché**, pas en fin de session.

- Définir ce que la chose **est**, en une ou deux phrases, pas ce qu'elle fait.
- Être tranché : plusieurs mots pour un même concept → garder le meilleur, mettre les autres dans les
  termes bannis.
- Uniquement des termes **propres à Chiphre** : pas de concept général de programmation.
- Colonne « Code » : le **nom** de la table, du type ou du dossier, pour relier le mot français à
  l'identifiant anglais. Rien de plus — `CONTEXT.md` n'est ni une spec, ni un brouillon, ni un
  registre de décisions d'implémentation. Le _pourquoi_ va dans un ADR.
- Un terme cité avec un nom de code : ce nom est **vérifié** dans le dépôt (`database.ts`, migrations,
  `src/`), pas repris de mémoire.

## Proposer un ADR — avec parcimonie

Seulement si les **trois** conditions sont réunies :

1. **Difficile à défaire** : changer d'avis plus tard coûterait cher.
2. **Surprenant sans contexte** : un lecteur futur se demandera « pourquoi diable ont-ils fait ça ? ».
3. **Un vrai arbitrage** : il existait des alternatives réelles, rejetées pour des raisons précises.

Une condition manque → pas d'ADR.

Ce qui en relève typiquement ici : une frontière d'accès (qui voit quoi), un choix qui touche les
données d'élèves mineurs, un « non » explicite (option écartée qu'on risque de re-proposer), un
écart délibéré à la voie évidente, une décision de produit sur ce qui est compté juste.

Règles d'écriture :

- Numéro suivant le plus élevé de `docs/adr/`, modèle de `docs/adr/README.md`, ligne ajoutée à l'index.
- **Décidée par David**, jamais par moi. Une justification que David n'a pas donnée et que je ne peux
  pas sourcer ne s'écrit pas : je la retire ou je la demande.
- La section **Écarté** est la plus précieuse : c'est elle qui empêche de re-proposer.
- Un ADR accepté ne se réécrit pas. Décision qui change → nouvel ADR, l'ancien passe en « remplacée par
  NNNN ».
- Une proposition qui contredit un ADR existant se dit explicitement (« contredit l'ADR 0005, parce
  que… ») et c'est David qui rouvre.

## Livrer

`CONTEXT.md` et `docs/adr/` sont de la documentation : la règle de commit du CLAUDE.md s'applique
(test mécanique ; commit direct sur `main` si 100 % doc, sinon avec la branche du chantier en cours).
