---
titre: Atelier — URL, mode éphémère et garanties /grapheur (lot 5)
statut: Phase 0, validée le 2026-09-16 — les tests peuvent être écrits
date: 2026-09-16
scope: partage par URL, mode éphémère, ouverture épurée de /grapheur
---

# Lot 5 — l'URL remplace le compte

> Les §6 et §7 de la [Phase 0 générale](atelier-recherche-eleve-phase0.md) sont
> déjà validés. Ce document ajoute ce que les **mesures du 2026-09-16**
> changent, et pose **trois questions** (§4).

C'est le lot qui tient la promesse du cadrage : **sans compte**. Un élève copie
un lien, l'envoie ou le colle dans son cahier de texte, et l'atelier se rouvre
tel quel.

---

## 1. La mesure qui décide de tout

**D8 affirme que ses plafonds ont été choisis « pour qu'un atelier complet tienne
sous les 2 000 caractères d'URL qui passent partout ».** Mesuré :

| Atelier                                 | base64 brut | **compressé** |
| --------------------------------------- | ----------- | ------------- |
| 1 fonction                              | 108         | 100           |
| réaliste (4 fonctions + 3 listes de 50) | 1 508       | **308**       |
| **plafond D8** (8 listes × 200)         | **16 752**  | **788**       |

⛔ **Sans compression, la promesse est fausse d'un facteur 8** — et de 15 si l'on
encode l'URI avant (29 940 caractères).

✅ **Avec `CompressionStream('deflate-raw')`, elle est vraie avec une marge de
2,5×** : 788 caractères pour l'atelier le plus lourd que D8 autorise.

> La compression n'est donc pas une optimisation : **c'est elle qui rend D8
> honnête**. Sans elle, il faudrait diviser les plafonds par huit.

⚠️ `CompressionStream` n'existe pas partout (Safari < 16.4). Il faut un repli —
voir **Q1**.

---

## 2. Partager

| #      | Cas                                   | Attendu                                                                         |
| ------ | ------------------------------------- | ------------------------------------------------------------------------------- |
| **N1** | « Partager »                          | Choix de portée : **cette vue** ou **tout l'atelier** (décision figée n° 5)     |
| **N2** | Lien copié                            | Confirmation explicite, et le lien reste visible pour un copier-coller manuel   |
| **N3** | Partager un atelier vide              | Refusé avec sa raison — un lien vide ne rend service à personne                 |
| **L1** | Contenu trop volumineux               | ⚠️ Prévenu **avant** de copier (§6 L1), avec la taille et ce qu'il faut retirer |
| **L2** | `CompressionStream` indisponible      | Le partage marche quand même, jusqu'à une taille plus petite — et le dit        |
| **E1** | La copie dans le presse-papier échoue | Le lien reste affiché et sélectionnable ; jamais un échec muet                  |

---

## 3. Recevoir

| #      | Cas                                       | Attendu                                                                                                            |
| ------ | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **N1** | Ouvrir un lien reçu                       | **Mode éphémère** : le contenu s'affiche, l'atelier personnel n'est **ni affiché ni modifié**, une bannière le dit |
| **N2** | « Garder dans mon atelier »               | Fusion, collisions réglées selon §2.2 — voir **Q2**                                                                |
| **N3** | Modifier ce qu'on a reçu, sans le garder  | Les modifications vivent le temps de l'onglet, et **rien n'est écrit**                                             |
| **N4** | Fermer l'onglet sans garder               | L'atelier personnel est exactement comme avant                                                                     |
| **L1** | Lien reçu alors qu'on a déjà un atelier   | Les deux coexistent : l'éphémère à l'écran, le sien intact derrière la bannière                                    |
| **L2** | URL tronquée par le transport (mail, ENT) | « Lien incomplet » ; **jamais d'ouverture à moitié**                                                               |
| **L3** | URL d'une version plus récente            | « Ce lien vient d'une version plus récente » ; rien n'est ouvert partiellement                                     |
| **E1** | URL corrompue                             | Message en français, atelier intact                                                                                |
| **E2** | Contenu hostile                           | Bornes de taille, **validation Zod avant toute utilisation**, aucun rendu de ce qui n'a pas été validé             |

> ⚠️ **Une URL est une entrée non fiable**, et celles-ci circuleront entre
> élèves. En v1 le contenu est du texte mathématique, déjà validé par le schéma
> de persistance. **Dès que Python entrera dans l'atelier (v3), du code venu
> d'une URL ne devra jamais s'exécuter sans une action explicite.** Écrit ici
> pour ne pas l'oublier.

---

## 4. Les trois questions — tranchées le 2026-09-16

### Q1 — Compresser ? → **oui, avec repli base64 brut et préfixe**

| Approche                                                   | Avantages                                                                                                       | Inconvénients                                                                |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| **A — compresser, replier sur base64 brut** _(recommandé)_ | D8 tient partout où la compression existe ; ailleurs le partage marche quand même, pour de plus petits ateliers | Deux formats à relire — mais le préfixe les distingue sans ambiguïté         |
| **B — compresser seulement**                               | Un seul format                                                                                                  | Sur Safari < 16.4, **aucun partage** — un élève ne comprendrait pas pourquoi |
| **C — base64 brut seulement**                              | Simple                                                                                                          | Plafonds à diviser par huit, ou promesse de D8 abandonnée                    |

**Tranché : A.** Le lien porte un préfixe d'un caractère (`1` =
compressé, `0` = brut), donc la relecture ne devine rien. Et la limite annoncée
à l'élève s'adapte à ce que son navigateur sait faire.

### Q2 — Collision à la fusion ? → **l'arrivant est renommé, avec compte rendu**

L'élève reçoit un atelier contenant `f`, et il a déjà un `f`.

| Approche                                                 | Avantages                                                     | Inconvénients                                            |
| -------------------------------------------------------- | ------------------------------------------------------------- | -------------------------------------------------------- |
| **A — renommer l'arrivant** (`f` → `f_1`) _(recommandé)_ | Rien n'est perdu, jamais ; le §2.2 interdit déjà l'écrasement | L'élève doit comprendre d'où vient `f_1` — on le lui dit |
| **B — demander pour chaque collision**                   | Contrôle total                                                | Un écran par nom ; insupportable au-delà de deux         |
| **C — refuser la fusion**                                | Sans surprise                                                 | L'élève ne peut rien garder de ce qu'il a reçu           |

**Tranché : A**, avec un compte rendu (« 3 objets ajoutés, `f` renommé
en `f_1` »). C'est la règle qui vaut déjà partout ailleurs dans l'atelier :
**jamais d'écrasement silencieux**.

### Q3 — L'ouverture épurée de `/grapheur` ? → **maintenant, et réversible**

Le §7 demande que `/grapheur` s'ouvre sur la vue Graphe seule, panneau replié,
sans onglets. C'est un **changement d'écran sur une page en production**, que
tu utilises pour projeter en classe.

**Tranché : la faire, en la gardant réversible** — l'état replié ou
déplié est retenu (§7 N3), donc un dépliage te ramène à l'écran actuel. Le
risque est borné, et sans ça la garantie de la décision figée n° 5 n'est pas
tenue.

---

## 5. Hors de ce lot

- La géométrie (v2), Python (v3), l'annulation globale (D6)
- L'export en fichier : évoqué au §6 L1 comme **porte de sortie** si l'URL ne
  suffit pas. La compression la rend inutile pour le v1 — à rouvrir si un usage
  réel dépasse les plafonds
