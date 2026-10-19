---
couvre:
  - src/lib/qr/qr-code.ts
  - src/lib/components/qr/QrCodeButton.svelte
---

# QR codes vers les pages et les ressources

> Vérifié contre le code le 2026-10-19 (lot 1). Décisions : [qr-codes-phase0.md](../wip/qr-codes-phase0.md).

## Ce que fait le bouton

`QrCodeButton` est posé à côté des liens partagés : exercice (lien public et chaque lien à jeton),
série (`SeriesLinkShare`), cours (`CourseShareLinkCard`), cahier de texte, article du Shtam, glossaire.
Il ouvre une fenêtre avec :

- le QR en grand, noir sur blanc quel que soit le thème (un QR inversé se lit mal) ;
- l'adresse en clair, avec Copier (repli : l'adresse est sélectionnée si le presse-papiers est refusé) ;
- Télécharger (PNG), dessiné sur un canvas à 10 px par module, et Télécharger (SVG) ;
- quand le lien porte un jeton (`containsToken`) : « une fois imprimé, il ne se reprend pas ».

Sans adresse (`url: null`, lien expiré ou révoqué, temps limite de série hors bornes), le bouton est
`aria-disabled` et dit pourquoi dans son infobulle ; la fenêtre ne s'ouvre pas.

## L'adresse : toujours `https://www.chiph.re`

Le QR encode `canonicalUrl(url)` (`src/lib/seo/site.ts`) : l'origine reçue (serveur local, aperçu
Vercel, `chiph.re`) est remplacée par `SITE_URL`, chemin, requête et fragment gardés. Un QR imprimé
depuis un aperçu mène donc au site. `www` : `chiph.re` répond 308 vers `www.chiph.re` (mesuré le
2026-10-19). Les liens COPIÉS, eux, gardent l'origine de la page.

## Le code (`src/lib/qr/qr-code.ts`)

- `uqr` 0.1.3 : MIT, ESM, aucune dépendance ; tout se fait dans le navigateur, aucune adresse ne
  quitte le site.
- `encodeQr(text)` : correction M (`QR_ECC`), marge de 4 modules (`QR_BORDER`), version 15 au plus
  (`QR_MAX_VERSION` : 77 modules, 412 octets). Au-delà, `null` et la fenêtre dit « Ce lien est trop
  long pour un QR code lisible » au lieu de montrer un QR illisible.
- `qrSvg(matrix, title)` : SVG autonome, un module par unité, `<title>` échappé.
- `qrFileName(resource, extension)` : `qr-aire-du-disque.png`.

## Écarts connus

- Un lien de série porte sa composition en JSON doublement encodé : une série de plusieurs
  catégories dépasse vite le plafond et n'a pas de QR.
- Pas de QR pour l'Atelier : décision de David, seulement vers un atelier sauvegardé et public, qui
  n'existe pas encore. Pas encore de QR pour les fiches ni dans les PDF (lots suivants).
