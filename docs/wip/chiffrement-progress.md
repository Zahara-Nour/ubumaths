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

## Lot 3a (Hill) — branche `feat/chiffrement-hill`

- [x] Module `hill.ts` : chiffrement par paires (X de complément), inverse modulo 26 pas à pas, collision si non inversible, attaque à clair connu (M = C·P⁻¹), attaque ligne par ligne (676 lignes classées par χ², ordre des lignes par bigrammes fréquents)
- [x] Mesure : attaque ligne par ligne 60/60 clés aléatoires, de 100 à 486 lettres
- [x] Page `/chiffrement/hill`, accueil, sitemap, CONTEXT.md ; 27 tests navigateur
- [x] code-reviewer (findings corrigés : lignes retenues désignées par leur rang, deux motifs d’échec distincts, seuil de 20 paires, groupe ARIA de la matrice)
- [ ] PR, merge
- [x] Livré #897

## Lot 3b (RSA de poche) — branche `feat/chiffrement-rsa`

- [x] Module `rsa.ts` : premiers 11 à 97, Euclide étendu en tableau (Bézout), exponentiation rapide (carrés successifs), blocs de 2 lettres (m = 26·x₁ + x₂ ≤ 675, n > 675), factorisation par divisions successives, table « lettre par lettre »
- [x] Exponentiation vérifiée contre un calcul BigInt indépendant (500 cas) ; aller-retour sur toutes les clés de la liste
- [x] Page `/chiffrement/rsa` (encadré Fermat, tableau d'Euclide, exponentiation du premier bloc, décryptage de la clé publique du Czar (2021, 5)), accueil, sitemap, CONTEXT.md ; 34 tests navigateur
- [x] code-reviewer (findings corrigés : preuve de Fermat complétée (p | m), n et e conservés au décryptage, message pour e < 2, n = p², table lettre par lettre seulement pour une clé valide, e valide choisi quand p ou q change, nombre réel de multiplications, Diffie-Hellman 1976)
- [ ] PR, merge
