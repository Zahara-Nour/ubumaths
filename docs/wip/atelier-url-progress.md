# Atelier — lot 5, progression

> Spécification : [`atelier-url-phase0.md`](atelier-url-phase0.md), validée le
> 2026-09-16. Q1 = compresser avec repli, Q2 = renommer l'arrivant, Q3 =
> ouverture épurée réversible.

## Étape 1 — porter l'atelier dans une URL (fait)

`src/lib/atelier/url.ts` : `encodeAtelier()` et `decodeAtelier()`.

### La compression rend D8 honnête

| Atelier                           | base64 brut | compressé |
| --------------------------------- | ----------- | --------- |
| 1 fonction                        | 108         | 100       |
| réaliste (4 fonctions + 3 listes) | 1 508       | **308**   |
| **plafond D8** (8 listes × 200)   | **16 752**  | **788**   |

Sans compression, la promesse de D8 — « tenir sous les 2 000 caractères » — est
fausse d'un facteur 8. Avec, elle tient avec 2,5× de marge.

**Q1 : repli sur base64 brut** là où `CompressionStream` manque (Safari < 16.4),
un préfixe d'un caractère distinguant les deux formats. La relecture ne devine
jamais.

### Le tri des objets est PARTAGÉ avec le stockage

`salvageObjects` sert aux deux chemins. Deux règles différentes feraient qu'un
atelier rangé, puis partagé, ne survivrait pas au même filtre.

Mon premier test attendait un refus en bloc sur un objet hostile ; c'était faux.
L'enveloppe est **volontairement permissive** — le tri se fait objet par objet
pour n'en perdre qu'**un** à la fois. C'est la décision du lot 1, prise après un
test qui validait une perte silencieuse.

### Ce qui est vérifié avant d'ouvrir quoi que ce soit

- la charge est **bornée avant d'être décodée** — on ne décompresse pas ce qu'on
  n'ouvrira pas ;
- une **version plus récente** n'est pas une corruption : c'est l'élève qui a
  ouvert son atelier ailleurs, et le lui dire évite de lui faire croire que son
  lien est cassé ;
- une charge **tronquée** meurt à l'inflation : `deflate-raw` refuse un flux
  incomplet, donc jamais d'ouverture à moitié ;
- rien qui n'ait passé Zod n'est rendu.

## Étapes suivantes

- [ ] Étape 2 — partager : choix de portée, taille annoncée AVANT la copie
- [ ] Étape 3 — recevoir : mode éphémère et bannière
- [ ] Étape 4 — « garder dans mon atelier » avec renommage (Q2)
- [ ] Étape 5 — l'ouverture épurée de `/grapheur` (Q3)
