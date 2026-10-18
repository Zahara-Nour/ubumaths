# QR codes vers les pages et les ressources — phase 0, à valider

Demande de David du 2026-10-18 : « comment avoir facilement des QR codes vers les pages et les ressources du site ? ». Rien n'est codé.

## État des lieux (2026-10-18)

- **Aucun QR dans le code** : ni dépendance, ni composant, ni paquet Typst.
- **Les partages existants**, qui construisent tous l'adresse à partir de `window.location.origin` :

  | Ressource       | Adresse                                 | Où                                                      |
  | --------------- | --------------------------------------- | ------------------------------------------------------- |
  | Exercice        | `/exercice/<slug>` (`?token=` si privé) | `dashboard/teacher/contenu/exercices/[id]/+page.svelte` |
  | Série           | `buildSeriesLink`                       | `SeriesLinkShare.svelte`                                |
  | Cours           | `/cours/<token>`                        | `CourseShareLinkCard.svelte`                            |
  | Cahier de texte | `/cahier/<token>`                       | `dashboard/teacher/cahier-texte/+page.svelte`           |
  | Atelier         | `/atelier?a=<état complet>`             | `ShareBar.svelte`                                       |

- **Les pages publiques** (référence : `src/lib/resources/registry.ts`) :
  - `/exercice/<slug>`, si l'exercice est public ou avec son jeton ;
  - `/cours/<token>`, `/cahier/<token>` et leurs fiches ;
  - `/atelier`, `/shtam`, `/glossaire`.
- **Les pages qui demandent une connexion** :
  - page élève d'une fiche, `/dashboard/student/worksheets/fiche/<id>` ;
  - chapitre élève ;
  - exercice élève.

  Un QR vers l'une de ces pages mène l'élève à la connexion, puis à la page.

- **La CSP** autorise `img-src data: blob:` : un QR s'affiche en image, sans rien ouvrir de plus.
- **Images dans les PDF** : fichiers virtuels Typst (`mapShadow` → `#image("/virtual/images/…")`, SVG accepté). Un paquet Typst comme `tiaoma` se télécharge **en ligne** au moment de compiler : il ne marche que si le réseau répond.
- **L'adresse officielle du site** : il n'y en a pas de commune. `PUBLIC_APP_URL` sert seulement côté serveur, et `https://www.chiph.re` est écrit en dur dans les courriels.

## Proposition

### Lot 1 — un bouton « QR code » partout où il y a déjà un lien à partager

- Un seul composant, `QrCodeButton`, posé à côté de chaque « Copier le lien » existant : exercice, série, cours et cahier de texte. Plus les pages publiques sans bouton de partage aujourd'hui : un article du Shtam, le glossaire.
- Un clic ouvre une fenêtre avec :
  - le QR en grand, prêt à être projeté en classe ;
  - l'adresse en clair, avec un bouton Copier ;
  - **Télécharger (PNG)**, pour une diapositive ou un document ;
  - **Télécharger (SVG)**, pour l'impression.
- **Le QR est fabriqué dans le navigateur**, par une petite bibliothèque, sans service extérieur : aucune adresse ne quitte le site (RGPD).
- **Comportements :**
  - Cas nominal : le QR scanné ouvre exactement l'adresse affichée sous lui.
  - Adresse trop longue pour un QR lisible (l'Atelier, qui met tout son état dans l'adresse) : pas de QR illisible. Le message dit « Ce lien est trop long pour un QR code : enregistre l'atelier ou copie le lien. » → **Q4.**
  - Exercice privé : le QR porte le jeton, comme le lien. **Un QR imprimé ne se reprend pas** : on retire le jeton pour qu'il ne marche plus, et la fenêtre le dit en une ligne.

### Lot 2 — le QR imprimé dans l'en-tête des PDF de fiches

- Il serait coché par fiche (« QR code vers la fiche en ligne ») et imprimé petit, en haut à droite, avec l'adresse courte dessous.
- Il serait fabriqué en SVG par la même bibliothèque, puis posé en fichier virtuel. Pas de paquet Typst : le PDF ne dépendrait pas du réseau.
- On ne le fait que si le lot 1 sert en classe.

## Questions pour David

1. **Vers quoi pointe le QR d'une fiche ?**
   - (a) La page élève, qui demande une connexion : tes élèves arrivent directement sur la fiche après s'être connectés. ← **ma recommandation** pour tes classes.
   - (b) Le lien public du cahier de texte ou du cours, sans connexion, lisible par n'importe qui.
2. **Quelle adresse dans un QR ?**
   - (a) Toujours `https://www.chiph.re/…`, même depuis un aperçu Vercel ou le serveur local. ← **ma recommandation** : un QR imprimé depuis un aperçu ne doit pas pointer vers un site qui disparaîtra.
   - (b) L'adresse de la page où l'on est, comme les liens copiés aujourd'hui.
3. **Où mettre le bouton en premier ?**
   - Ma recommandation : exercice, série, cours et cahier de texte, là où le lien existe déjà.
   - Puis Shtam et glossaire.
   - Les fiches viennent avec la réponse à la Q1.
4. **L'Atelier :**
   - (a) Pas de QR quand l'adresse est trop longue, avec le message ci-dessus. ← **ma recommandation** pour le lot 1.
   - (b) Plus tard, un lien court enregistré côté serveur. C'est un vrai chantier : une table, la durée de vie des liens, le RGPD.
5. **Le lot 2 (QR dans le PDF) : maintenant, ou après usage du lot 1 ?**
   - Ma recommandation : après usage du lot 1.
