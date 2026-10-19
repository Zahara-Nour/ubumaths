# QR codes — journal de progression

Phase 0 : [qr-codes-phase0.md](qr-codes-phase0.md), tranchée par David le 2026-10-19.

## Lot 1 — bouton « QR code » à côté des partages existants (branche `feat/qr-codes-partage`)

- Bibliothèque : `uqr` 0.1.3 (MIT, ESM, aucune dépendance, ~80 ko décompressée, publiée le 2026-04-03 : au-delà du `minimumReleaseAge` de 3 jours). Écartée : `qrcode` 1.5.4 (CommonJS, trois dépendances dont `yargs` et `pngjs`, ~135 ko).
- Réglages : correction M, marge de 4 modules, version 15 au plus (77 modules, 412 octets) ; au-delà, « Ce lien est trop long pour un QR code lisible ». Un lien de série porte sa composition en JSON doublement encodé : une série de plusieurs catégories dépasse vite ce plafond.
- Adresse : toujours `https://www.chiph.re` (`canonicalUrl` dans `src/lib/seo/site.ts`, qui réutilise `SITE_URL`). Les liens copiés existants ne changent pas.
- PNG fabriqué par un canvas (10 px par module), SVG par `qrSvg` ; aucune requête réseau.
- Posé sur : exercice (lien public et chaque lien à jeton), série, cours, cahier de texte, article du Shtam, glossaire. Pas l'Atelier (QR seulement vers un atelier sauvegardé et public, qui n'existe pas encore), pas les fiches (lot suivant).
