# Liens courts — phase 0

_Ouverte le 2026-10-19, suite du chantier [qr-codes](../../wip/qr-codes-progress.md). Tranchée par David le 2026-10-19._

## Le problème, mesuré

Un QR code accepte au plus 220 octets (version 15, correction H : `QR_MAX_VERSION`, `src/lib/qr/qr-code.ts`). Mesures du 2026-10-19 sur `https://www.chiph.re/…` :

| Lien                                                    | Longueur  | QR aujourd'hui |
| ------------------------------------------------------- | --------- | -------------- |
| Glossaire, Shtam, exercice public                       | 30 à 85   | oui            |
| Exercice avec jeton, cours partagé, cahier de texte     | 85 à 130  | oui            |
| **Série** (`/automaths/panier` ou `/test`), 1 catégorie | **≈ 350** | **non**        |
| Série, 4 catégories                                     | ≈ 1 200   | non            |

Seul le **lien de série** dépasse, et il dépasse **toujours**, dès la première catégorie : la composition est écrite dans l'adresse (JSON encodé deux fois, `buildSeriesLink`). Le bouton QR de `SeriesLinkShare` est donc inutile aujourd'hui (« Ce lien est trop long pour un QR code lisible »).

L'Atelier est hors sujet : son QR viendra avec l'atelier sauvegardé et public (chantier à part, décision 4 de [qr-codes-phase0.md](../../wip/qr-codes-phase0.md)).

## Ce que je propose

Une adresse courte **`https://www.chiph.re/l/<code>`** (environ 30 caractères) enregistrée côté serveur, qui redirige vers le lien long.

- **Code** : 8 caractères tirés au hasard (lettres et chiffres sans les ambigus `0 O 1 l I`), donc impossible à deviner ou à énumérer.
- **Cible** : seulement une adresse **interne** au site (un chemin qui commence par `/`, jamais un autre domaine). Sinon, n'importe qui pourrait fabriquer un lien `chiph.re` qui mène à un site piégé (redirection ouverte).
- **Même lien long → même code** : imprimer deux fois la même série ne crée pas deux lignes.
- **Durée de vie : pour toujours.** Un QR est fait pour être imprimé, et un QR mort sur une fiche ne se reprend pas.
- **Lien inconnu** : page 404 « Ce lien n'existe pas », qui propose d'aller à l'accueil.

## Comportements (à valider)

**Nominal**

1. Le prof ouvre « Partager la série » et clique sur « QR code ». Le serveur crée (ou retrouve) le lien court, et le QR encode `https://www.chiph.re/l/Xk7pQ2mZ`. L'adresse affichée et copiée dans la fenêtre est l'adresse courte.
2. Un élève scanne le QR, arrive sur `/l/Xk7pQ2mZ` et est redirigé vers la série. La suite est exactement celle du lien long (panier, ou test lancé avec sa forme et son temps).
3. Le même prof refait le QR de la même série : il obtient le même code.

**Limite**

4. Le lien long est déjà assez court (exercice, cours, cahier) : aucun lien court n'est créé et rien ne change.
5. Une série modifiée après l'impression : l'ancien QR mène toujours à l'ancienne composition, puisque le lien long ne change pas lui non plus.

**Erreur**

6. Code inconnu ou mal formé → 404, sans dire si un lien « presque pareil » existe.
7. Cible qui n'est pas un chemin interne → refus 400 (validation Zod), et rien n'est enregistré.
8. Le serveur ne répond pas au moment du QR → le bouton dit « QR indisponible pour l'instant, copie le lien » et le lien long reste copiable.

## Tranché par David (2026-10-19)

David a répondu « je suis tes recos » aux quatre questions ci-dessous :

1. Seul un **prof ou l'admin connecté** crée un lien court. Ailleurs (panier public, élève, anonyme), le QR de série reste indisponible et le lien long reste copiable.
2. **Accès** : celui qui a le code lit la cible, et rien d'autre. Personne ne liste la table, pas même un prof par l'API. L'auteur et la date sont gardés sans être exposés. Aucune donnée d'élève.
3. **Séries seulement** : pas de lien court pour le bloc ` ```qr ` des documents.
4. **Pas de liste « Mes liens courts »** en v1.

## Questions posées à David

1. **Qui peut créer un lien court ?** Le panier `/automaths/panier` est public : un visiteur anonyme ou un élève peut y composer une série et la partager.
   - (a) Un prof ou l'admin connecté seulement. Ailleurs, le QR reste indisponible et le lien long reste copiable. ← **ma recommandation** : pas de table que des inconnus remplissent, et c'est le prof qui imprime.
   - (b) Tout utilisateur connecté (élèves compris), avec une limite par jour.
   - (c) Tout le monde, même anonyme, avec une limite par adresse IP.
2. **Question d'accès : qui pourra lire quoi, qu'il ne pouvait pas lire avant ?** Ma proposition :
   - Quiconque a le code peut lire **la cible**. Il ne lit rien de neuf, puisque cette cible est déjà le lien long, que le prof a partagé.
   - **Personne** ne peut lister la table (ni anon, ni élève, ni prof par l'API) : la lecture passe par la route `/l/<code>` côté serveur.
   - On enregistre qui a créé le lien (l'id du prof) et quand, mais ces champs ne sont exposés nulle part.
   - Aucune donnée d'élève n'est stockée.

   Est-ce bien ce que tu veux ?

3. **Seulement les séries, ou aussi le bloc ` ```qr ` des documents** (lot 2), quand David y colle une adresse longue ?
   - Ma recommandation : séries seulement d'abord. Le bloc ` ```qr ` vient de l'auteur, qui choisit son adresse, et le PDF se compile sans réseau.
4. **Faut-il une liste « Mes liens courts »** pour le prof (voir et supprimer) ?
   - Ma recommandation : non pour la v1. Des liens éternels et sans donnée sensible n'ont pas besoin d'être gérés.

## Découpage prévu (après validation)

- **PR 1** : migration (table, RLS fermée à tous, fonction de création et de lecture), tests d'intégration rouges sans elle, puis `security-auditor`, `db:migrate` et `db:types`.
- **PR 2** : route `/l/[code]`, endpoint de création (Zod), `QrCodeButton` / `SeriesLinkShare` qui utilisent l'adresse courte, puis la doc.
