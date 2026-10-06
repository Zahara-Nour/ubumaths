# Section chiffrement — « Le Cabinet Noir de Turingrad » — progression

Branche `feat/chiffrement`, worktree `../ubumaths-wt-chiffrement`. Démarré le 2026-10-06.

## Décisions de David (2026-10-06)

- Public : **collège d'abord**, lycée ensuite (affine, Vigenère, Hill, RSA jouet).
- Section **autonome** (pas dans l'Atelier), URL `/chiffrement`, nom affiché **le Cabinet Noir de Turingrad** (Glitchistan, Turing → Enigma). Les **défis** viendront plus tard (« Dépêches du Czar »).
- Trois onglets par chiffre : **Chiffrer · Déchiffrer · Décrypter** (décrypter = sans la clé). « Crypter » est banni.
- Alphabet : A-Z normalisé (accents retirés, œ → OE, æ → AE, ç → C), espaces et ponctuation conservés, option « blocs de 5 ».
- Polybe : grille 5×5, **J fusionné avec I** (l'aller-retour perd le J, assumé et expliqué).
- Scytale : **pas de bourrage** par des X ; grille irrégulière, aller-retour exact.
- 100 % client : aucune donnée, aucune base.

## Lot 1 (collège)

- [x] Module pur `src/lib/ciphers/` + tests (81 tests, aller-retours par propriétés sur graines fixes)
- [x] Pages `/chiffrement` (accueil) + `/chiffrement/{cesar,atbash,substitution,scytale,polybe}`
- [x] Tests client (13, rendu réel) + captures bureau / mobile (pas de défilement horizontal, aucune erreur JS)
- [x] Sitemap, CONTEXT.md (chiffrer / déchiffrer / décrypter)
- [x] svelte:autofix, check:incremental (0 erreur), code-reviewer (findings corrigés : clé rendue deux fois, Ł/Ø, NFD qui changeait ≠ en =, hypothèses fantômes, bâton immense)
- [ ] PR, CI, merge

## Reste à faire (hors lot 1)

- Lien vers `/chiffrement` depuis l'accueil ou la navigation (non fait : l'accueil a des modifications locales de David sur `main`).
- Lot lycée : affine, Vigenère (Kasiski, indice de coïncidence), Hill, RSA de poche.
- Défis « Dépêches du Czar ».

## Référence des fréquences

Wikipédia, « Fréquence d'apparition des lettres en français » — corpus Wikipédia francophone (2008, CLLE-ERSS, Toulouse). Les lettres accentuées y sont comptées à part : le module renormalise les 26 lettres de base à 100 %.

## Lot 2 (lycée) — branche `feat/chiffrement-lycee`

- [x] Module : `modular.ts` (PGCD, inverse, réductions écrites), `affine.ts` (collisions, force brute 312 clés, attaque par deux lettres), `vigenere.ts` (Kasiski, indice de coïncidence, César par colonne)
- [x] Mesure : sur 480 lettres, longueur retrouvée 298/300 (clés aléatoires de 1 à 10 lettres), clé 300/300 quand la longueur est juste
- [x] Pages `/chiffrement/affine` et `/chiffrement/vigenere`, accueil (section lycée), sitemap, CONTEXT.md
- [x] Indice du français : 0,0778 (Friedman), pas recalculé depuis la table (accents comptés à part → 0,070)
- [x] code-reviewer (findings corrigés : longueur suggérée sur textes courts → seuil 0,068 + colonnes ≥ 12 lettres ; étapes de l’attaque à deux lettres réécrites ; force brute affine sur les comptes ; positions Kasiski à partir de 1 ; Bellaso 1553)
- [ ] PR, merge
