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

- [ ] Module pur `src/lib/ciphers/` + tests (normalisation, César, Atbash, substitution, scytale, Polybe, fréquences, force brute, substitution manuelle)
- [ ] Pages `/chiffrement` (accueil) + `/chiffrement/{cesar,atbash,substitution,scytale,polybe}`
- [ ] Tests client (rendu)
- [ ] Sitemap, CONTEXT.md (chiffrer / déchiffrer / décrypter)
- [ ] svelte:autofix, check:incremental, code-reviewer, PR

## Référence des fréquences

Wikipédia, « Fréquence d'apparition des lettres en français » — corpus Wikipédia francophone (2008, CLLE-ERSS, Toulouse). Les lettres accentuées y sont comptées à part : le module renormalise les 26 lettres de base à 100 %.
