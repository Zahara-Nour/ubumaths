# Écrire un article du Shtam

Charte (voix, qui parodier, rien du Collège) : Compendium §IX « Le Shtam » (`docs/Chiphres/lore-pataphysique.md`).

## Le fichier

Un article = `src/lib/server/shtam/articles/<slug>.md`. Le nom du fichier est l'adresse : `/shtam/<slug>` (kebab-case, sans accents).

```markdown
---
title: Bedonstan — un triangle rectangle porte plainte
date: 2026-10-05
author: cotice
lede: Une ou deux phrases de chapeau, formules ubumark permises (~\pi~).
---

Corps de l'article, en ubumark (voix de la Rédaction).

## Le vrai du faux

Le fait mathématique réel (voix de l'Académie). Section obligatoire et unique.
```

- `author` : `cotice` (rédacteur en chef), `giron`, `pile`, `merdanpot`.
- `date` : jour de parution, heure de Paris. **Daté dans le futur = invisible jusqu'à ce jour-là** (parution programmée, sans redéploiement).
- `draft: true` : jamais visible.
- Le titre est du texte brut (pas de `~…~`) : écrire π, ², √ en Unicode.
- Un titre ou un chapeau qui contient « : » ou « # » se met **entre guillemets simples** (`title: 'Exclusif : le Czar parle'`, apostrophe doublée : `'l''hypoténuse'`). Sinon YAML lit une clé ou un commentaire ; le test le signale.

## Les formules

Notation ubumark : `~\pi~` (grec **avec** antislash), `~q*2~` (produit affiché ×), décimales en `$3{,}14$`. Pièges : `docs/ref/notation-unites.md`.

Les articles sont **exclus de prettier** (`.prettierignore`) : il échappait `~q*2~` en `~q\*2~`, ce qui casse la formule.

## Vérifier

```bash
pnpm test:server src/lib/server/shtam      # en-tête, vrai du faux, formules sans erreur rouge
pnpm check:ubumark src/lib/server/shtam/articles
```

Un article mal formé fait échouer la CI, jamais la production.
