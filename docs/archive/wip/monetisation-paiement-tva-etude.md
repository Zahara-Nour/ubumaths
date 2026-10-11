# Monétisation UbuMaths — Paiement, TVA & facturation (étude sourcée)

> **Statut** : étude de recherche vérifiée (deep-research, 24 sources, 25 affirmations vérifiées en contrôle adversarial, 3 réfutées). **Rien implémenté.** > **Date** : 2026-06-16
> **Cas étudié** : micro-entrepreneur **français** vendant du **contenu pédagogique numérique** (abonnements + chapitres à l'unité) à des **particuliers (B2C)** France + UE + international.
> **Voir aussi** : `docs/wip/monetisation-architecture.md` (architecture conceptuelle).
> ⚠️ **Sujet à forte péremption** (seuils TVA, réforme e-invoicing) : re-vérifier sur impots.gouv.fr avant toute décision d'immatriculation.

---

## Résumé exécutif

Contenu de maths vendu **automatiquement** = **service électronique taxable** (PAS un enseignement exonéré). En micro, pas de TVA française sous **37 500 €**, mais dès **> 10 000 €/an** de ventes B2C numériques vers d'autres pays UE → TVA **du pays du client** via guichet **OSS**. Cette complexité OSS/internationale casse la simplicité du statut micro → un **Merchant of Record** (Paddle/Polar/Stripe Managed Payments…) l'absorbe, au prix de ~5 % de frais.

---

## 1. Statut & seuils (à jour 2025-2026)

- **Réforme du seuil unique de franchise TVA à 25 000 € : DÉFINITIVEMENT ABANDONNÉE** par la **loi n° 2025-1044 du 3 novembre 2025** (jamais appliquée ; 3 suspensions en 2025). [vote 3-0]
- Seuils **rétroactifs au 1ᵉʳ mars 2025 et maintenus 2026**, pour les **prestations de services** :

| Seuil                                               | Montant (prestations de services) |
| --------------------------------------------------- | --------------------------------- |
| Plafond régime **micro** (rester micro)             | **~77 700 €**                     |
| **Franchise en base TVA** — base (CA N-1)           | **37 500 €**                      |
| **Franchise en base TVA** — majoré (année en cours) | **41 250 €**                      |

- ⚠️ **Deux seuils distincts** : entre **37 500 € et 77 700 €**, on reste micro **mais redevable de la TVA**.
- Le seuil bas résiduel de **25 000 €** ne concerne **que le BTP**, pas les services intellectuels. [vote 3-0]

## 2. TVA numérique B2C transfrontalier

- Service électronique → taxé **dans le pays du consommateur** (directive 2006/112/CE art. 58). [vote 3-0]
- **Seuil 10 000 €/an** intra-UE : en deçà → règles FR ; au-delà → TVA pays client via **OSS**.
- **Franchise et OSS NE sont PAS incompatibles** (incompatibilité affirmée → **réfutée 0-3**).
- **Franchise en base européenne** depuis le 1ᵉʳ janvier 2025 : CA UE ≤ 100 000 € + seuils nationaux. [vote 3-0]
- **Hors UE** : règles propres à chaque pays (argument fort pour un MoR).

## 3. Exonération « enseignement » → ❌ NON applicable

- Contenu **automatisé, sans intervention humaine ni cours en direct** = service électronique (4 critères BOFiP BOI-TVA-CHAMP-20-50-40-20 §70) → **taxable**. [TBE 3-0]
- L'exonération **CGI art. 261-4-4°** vise uniquement les **leçons données personnellement par une personne physique payée directement par l'élève** (BOI-TVA-CHAMP-30-10-20-50) → exclut le modèle d'app. [exonération 2-1]
- 👉 **Rescrit fiscal** conseillé si l'enjeu est important (analyse déduite, pas de rescrit nommant les apps).

## 4. Facturation électronique (e-invoicing / e-reporting) — vérifié 2026-06-16

**Le micro EST concerné**, même en franchise : c'est un « assujetti à la TVA non redevable » → dans le périmètre. Seuls les vrais hors-champ TVA sont exclus. [3-0, FAQ impots.gouv.fr]

**Calendrier confirmé** (LF 2024 ; amendement de report **rejeté le 11 avril 2025** ; LF 2026 art. 123 = relève les sanctions 15→50 €/facture + clarifie le périmètre e-reporting, **sans décaler les dates**) :

| Obligation                              | GE / ETI      | PME / TPE / **micro** |
| --------------------------------------- | ------------- | --------------------- |
| **Réception** de e-factures             | 1ᵉʳ sept 2026 | **1ᵉʳ sept 2026**     |
| **Émission** (B2B FR) + **e-reporting** | 1ᵉʳ sept 2026 | **1ᵉʳ sept 2027**     |

(un décret peut ajuster la date 2027 sans dépasser le 1ᵉʳ déc 2027). Le « 2028 » parfois cité = **faux** (réfuté 0-3).

**B2C = e-reporting, PAS e-invoicing** : l'e-invoicing obligatoire ne vise que le **B2B domestique** entre assujettis FR. Tes ventes à des **particuliers** + à l'**international** relèvent de l'**e-reporting** : transmission à l'administration des **données de transaction** (CA des opérations soumises à TVA FR) + éventuellement **données de paiement**, via une plateforme agréée. Échéance micro : **1ᵉʳ sept 2027**. [3-0]

**PDP obligatoire, PPF gratuit abandonné** : l'État a renoncé (oct 2024) au Portail Public de Facturation comme plateforme d'échange gratuite (« écosystème PDP suffisamment robuste »). Le PPF ne subsiste que comme **annuaire + concentrateur de données**. Il faut donc passer par une **PDP / « plateforme agréée » (PA)** — 134 immatriculées au 26 mai 2026. Pour un micro : un **outil de facturation intégrant une PDP** est la voie réaliste (coûts précis non documentés). [3-0]

### MoR & e-reporting — ⚠️ analyse NON vérifiée (raisonnement)

Les deux études ont laissé ce point **ouvert** (aucune source vérifiée). Raisonnement à confirmer : avec un Merchant of Record, le MoR (souvent étranger) est le **vendeur légal** vis-à-vis du consommateur → il porte la facture + la TVA B2C. David n'a plus qu'une relation **B2B avec le MoR** (un seul partenaire au lieu de milliers de particuliers), vente B2B internationale relevant de l'**e-reporting** côté David. Ce serait donc une **simplification** — mais à **vérifier par une recherche dédiée** avant de s'y fier.

Sources section 4 : impots.gouv.fr (facturation-electronique ; FAQ franchise micro ; reporting), economie.gouv.fr (annuaire), incwo/itforbusiness (abandon PPF), francenum.gouv.fr.

## 5. Solutions de paiement — MoR vs Stripe

|                                | **Merchant of Record** (Paddle, Polar.sh, Lemon Squeezy→Stripe Managed Payments, FastSpring, Gumroad) | **Stripe + Stripe Tax**                                                            |
| ------------------------------ | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Vendeur légal                  | le prestataire                                                                                        | **toi**                                                                            |
| TVA UE/OSS + international     | **pris en charge** (OSS du MoR)                                                                       | calcul/collecte auto, **inscription + déclarations OSS + e-reporting à ta charge** |
| Factures conformes             | **par le MoR**                                                                                        | à ta charge                                                                        |
| Abonnements + achats unitaires | oui / oui                                                                                             | oui / oui                                                                          |
| Frais indicatifs               | **~5 % + ~0,50 $** (Polar ~4 %+0,40 $)                                                                | **~1,5 % UE + 0,25 €** + ~0,5 % Stripe Tax                                         |
| Effort conformité              | **quasi nul**                                                                                         | **élevé**                                                                          |

- **Lemon Squeezy racheté par Stripe** (juillet 2024) → fusion 2026 dans **« Stripe Managed Payments »** (coexistence). [3-0]
- **Polar.sh** : MoR, OSS UE n° EU372061545, basé sur Stripe Tax. [3-0]
- Frais exacts hors Lemon Squeezy (5 %+0,50 $) = **indicatifs, à confirmer**.

## 6. Recommandation + arbre de décision

```
Ventes ~100% France + transfrontalier UE < 10 000 €/an + CA < 37 500 €
   → STRIPE DIY (franchise = zéro TVA, admin minimale, le moins cher)

CA UE/international significatif  OU  CA > 37 500 €  OU  « zéro admin TVA »
   → MERCHANT OF RECORD (Polar / Paddle / Stripe Managed Payments)
     ~5% mais ni OSS, ni TVA multi-pays, ni factures à gérer
```

Arbitrage : la TVA OSS/internationale **casse la simplicité du micro**. Petit + franco-français → Stripe. UE/international → le MoR **achète la conformité**.

## Caveats / à confirmer

- Une future LF (2026/2027) pourrait rebouger les seuils → re-vérifier impots.gouv.fr.
- Même via MoR : déclaration du CA à l'**URSSAF** (impact plafond micro 77 700 €) ; conformité FR des factures MoR à confirmer.
- Frais MoR (hors Lemon Squeezy) à confirmer sur pages tarifaires officielles.
- Non-exonération : rescrit fiscal prudent si enjeu fort.

## Sources clés

impots.gouv.fr · service-public.gouv.fr (A17995) · BOFiP BOI-TVA-CHAMP-20-50-40-20 & -30-10-20-50 · loi n° 2025-1044 (Légifrance JORFTEXT000052485808) · Commission UE (sme-vat-rules / taxation-customs) · docs Polar.sh · blog Lemon Squeezy (2026 update)
