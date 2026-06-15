# Analyse d'Impact relative à la Protection des Données (AIPD / DPIA) — UbuMaths

> Document de conformité RGPD (**article 35**). Méthodologie : guides **PIA de la CNIL**
> (description → nécessité & proportionnalité → mesures protectrices des droits → appréciation des
> risques de sécurité → plan d'action → validation).
> Document interne (non publié). Complémentaire du
> [registre des traitements](./registre-traitements.md) et de la
> [politique de confidentialité](../../src/routes/(public)/legal/confidentialite).

| | |
| --- | --- |
| **Responsable de traitement** | [À COMPLÉTER — voir registre] |
| **DPO / référent** | [À COMPLÉTER — ou « Non désigné »] |
| **Périmètre de l'AIPD** | Ensemble de la plateforme UbuMaths (comptes, suivi pédagogique, fonctions sociales) |
| **Date** | 15 juin 2026 |
| **Version** | 0.1 (brouillon) |

---

## 1. Pourquoi une AIPD est-elle nécessaire ?

Une AIPD est **obligatoire** lorsqu'un traitement est susceptible d'engendrer un **risque élevé**
pour les droits et libertés (art. 35 RGPD). La CNIL/le CEPD retiennent qu'à partir de **2 critères**
parmi 9, l'AIPD est requise. Pour UbuMaths :

| Critère (liste CEPD / CNIL) | Applicable ? |
| --- | --- |
| Données de **personnes vulnérables** (mineurs) | ✅ cœur du public (≈ 11–18 ans) |
| **Évaluation / scoring** incluant du **profilage** | ✅ niveau de maîtrise, progression, parcours personnalisé |
| Traitement de données **à grande échelle** | ⚠️ [À CONFIRMER selon le volume d'utilisateurs] |
| **Croisement** de données | ⚠️ pédagogique + social (messagerie, amis) |

➡️ **Au moins 2 critères réunis (mineurs + profilage) → AIPD obligatoire.**

---

## 2. Description du traitement

### 2.1 Vue d'ensemble

UbuMaths est une plateforme éducative de mathématiques (collège/lycée) offrant : exercices
interactifs, suivi de progression, gamification, **messagerie**, **marketplace/échanges**, **amis**,
intégration **Google Classroom**. Les finalités détaillées figurent dans le
[registre des traitements](./registre-traitements.md) (T1 à T8).

### 2.2 Catégories de données

| Catégorie | Exemples | Sensibilité |
| --- | --- | --- |
| Identité | prénom, nom, pseudonyme, avatar | Données de mineurs |
| Authentification | email, mot de passe **haché**, identifiants Google OAuth | Élevée (secrets) |
| Pédagogiques (profilage) | réponses, scores, niveau de maîtrise, progression | Données de mineurs |
| Contenus utilisateur (UGC) | messages, échanges marketplace, tableau blanc, notebooks | Modérables |
| Social | liste d'amis, présence | Données de mineurs |
| Gamification | gidouilles, cartes VIP, achievements | Faible |
| Techniques | logs, métriques de performance (sans cookie) | Pseudonymisées |

> **Données NON collectées** (minimisation, art. 5.1.c) : genre, date de naissance précise, adresse
> postale, téléphone, données biométriques ou de santé.

### 2.3 Cycle de vie et supports

```
Collecte (navigateur / import enseignant / Google OAuth)
   → Transit chiffré (TLS)
   → Traitement : fonctions Vercel (cdg1 / Paris, UE)
   → Stockage : Supabase PostgreSQL + Auth + Storage + Realtime (eu-west-3 / Paris, UE)
   → Restitution (RLS : chacun ne voit que son périmètre)
   → Conservation (cf. durées) → suppression / anonymisation
```

| Support | Rôle | Localisation |
| --- | --- | --- |
| Supabase | BDD, Auth, Storage, Realtime | **UE — France (eu-west-3)** |
| Vercel | Application + fonctions | Fonctions **cdg1 / Paris** |
| Google | OAuth / Classroom | USA (CCT + DPF) |
| Brevo | Emails transactionnels | France (UE) |
| Navigateur | Cookies de session + stockage local fonctionnel | Appareil utilisateur |

---

## 3. Nécessité et proportionnalité

| Principe | Évaluation | Statut |
| --- | --- | --- |
| Finalités déterminées, explicites, légitimes | Service éducatif + suivi + social (cf. registre) | ✅ |
| Base légale (art. 6) | Par traitement — [À CONFIRMER dans le registre] | ⚠️ |
| Minimisation (art. 5.1.c) | Données non nécessaires exclues | ✅ |
| Exactitude / qualité | Modification possible par l'utilisateur | ✅ |
| Durées de conservation | Profil scolarité+5 ans, pédago 5 ans, messages 3 ans, logs 90 j | ✅ (cf. registre — [à valider]) |
| Information des personnes (art. 12-14) | Politique de confidentialité | ✅ |

---

## 4. Mesures protectrices des droits des personnes

| Droit / mesure | Mise en œuvre | Statut |
| --- | --- | --- |
| Information | Politique de confidentialité accessible | ✅ |
| **Consentement parental (< 15 ans)** | Annoncé dans la politique | 🔴 **mécanisme à implémenter / vérifier** |
| Accès, rectification, effacement | Sur compte + contact@ubumaths.fr | ✅ / [à outiller] |
| Portabilité | [À COMPLÉTER — export des données ?] | ⚠️ |
| Opposition / retrait | contact@ubumaths.fr | ✅ |
| Sous-traitance (art. 28) | DPA Supabase / Vercel / Google / Brevo | 🟠 **copies signées à archiver** |
| Transferts hors UE | Google & Vercel via **CCT** (+ DPF Google) | ✅ documenté |

---

## 5. Mesures de sécurité (existantes / prévues)

- **Chiffrement** au repos et en transit (TLS).
- **Contrôle d'accès** : Row Level Security (RLS) sur toutes les tables ; séparation des rôles ;
  clés de service (`sb_secret_*`) côté serveur uniquement.
- **Authentification** : mots de passe hachés, OAuth, cookies de session `httpOnly`/`secure`/`sameSite`,
  protection CSRF par validation d'origine.
- **Validation des entrées** : schémas Zod côté serveur sur toutes les API.
- **UGC** : assainissement HTML (DOMPurify), filtre de langage (`bad-words`), modération
  enseignant sur la messagerie.
- **Secrets** : variables d'environnement Vercel ; **rotation effectuée le 15 juin 2026**.
- **Sauvegardes** : sauvegardes automatiques Supabase.
- **Journalisation** : logs d'accès / audit.
- 🟠 **Prévu** : mécanisme de **signalement de contenu illicite** (volet DSA) ; procédure de
  **notification de violation** (CNIL < 72 h).

---

## 6. Appréciation des risques de sécurité

Échelle CNIL — **gravité** et **vraisemblance** : *négligeable · limitée · importante · maximale*.
Les niveaux ci-dessous sont une **première estimation à valider**.

### Risque 1 — Accès illégitime aux données

| | |
| --- | --- |
| **Impacts** | Exposition de données de mineurs (identité, messages, progression) ; usurpation de compte. |
| **Sources de risques** | Attaquant externe, utilisateur malveillant, sous-traitant, fuite de secret. |
| **Menaces** | Vol de jeton/mot de passe, faille RLS, clé API exposée, injection. |
| **Mesures** | Hachage, RLS, chiffrement, CSRF, Zod, rotation des clés, secrets serveur. |
| **Gravité** | Importante [à valider] |
| **Vraisemblance** | Limitée [à valider] |

### Risque 2 — Modification non désirée des données

| | |
| --- | --- |
| **Impacts** | Altération de résultats/progression, falsification de messages, élévation de privilèges. |
| **Sources de risques** | Utilisateur malveillant, bug applicatif, attaquant. |
| **Menaces** | Contournement de RLS, requête forgée, absence de validation. |
| **Mesures** | RLS, validation Zod, contrôles serveur, journalisation, sauvegardes. |
| **Gravité** | Limitée [à valider] |
| **Vraisemblance** | Limitée [à valider] |

### Risque 3 — Disparition de données

| | |
| --- | --- |
| **Impacts** | Perte de progression, de comptes, de contenus ; indisponibilité du service. |
| **Sources de risques** | Panne d'un sous-traitant, suppression accidentelle, incident. |
| **Menaces** | Défaillance Supabase/Vercel, erreur de migration, ransomware. |
| **Mesures** | Sauvegardes automatiques, hébergement géré, migrations versionnées. |
| **Gravité** | Limitée [à valider] |
| **Vraisemblance** | Limitée [à valider] |

---

## 7. Risque spécifique — Protection des mineurs

Les fonctions **sociales** (messagerie, marketplace, amis) entre mineurs créent un risque propre,
au-delà de la sécurité technique :

| | |
| --- | --- |
| **Impacts** | Contact inapproprié, harcèlement, divulgation d'informations personnelles, exposition à un contenu illicite. |
| **Mesures existantes** | Filtre de langage (`bad-words`), accès enseignant aux messages de ses élèves, pas de publicité ni de profilage commercial, minimisation. |
| **Mesures à renforcer** | 🔴 **Mécanisme de signalement** (DSA) ; 🔴 **vérification du consentement/encadrement parental** ; cloisonnement des échanges (élève ↔ uniquement classe/amis validés ?) ; [À COMPLÉTER]. |
| **Gravité** | Importante [à valider] |
| **Vraisemblance** | [À ÉVALUER selon l'ouverture réelle des échanges] |

---

## 8. Plan d'action

| # | Mesure | Priorité | Responsable | Échéance | Statut |
| --- | --- | --- | --- | --- | --- |
| 1 | Implémenter / vérifier le **consentement parental < 15 ans** | 🔴 Haute | [À COMPLÉTER] | [À COMPLÉTER] | À faire |
| 2 | Ajouter un **mécanisme de signalement** de contenu/message (DSA) | 🔴 Haute | | | À faire |
| 3 | **Archiver les DPA signés** (Supabase/Vercel/Google/Brevo) | 🟠 Moyenne | | | À faire |
| 4 | Rédiger la **procédure de violation de données** (notification 72 h) | 🟠 Moyenne | | | À faire |
| 5 | Outiller **export / portabilité** des données utilisateur | 🟡 Basse | | | À évaluer |
| 6 | Confirmer/valider les **bases légales** par traitement | 🟠 Moyenne | | | À faire |
| 7 | Trancher **conservation logs** (90 j vs identification 1 an LCEN) | 🟡 Basse | | | À arbitrer |

---

## 9. Validation

| | |
| --- | --- |
| **Avis du DPO** | [À COMPLÉTER — ou « Non désigné »] |
| **Point de vue des personnes concernées** | [À COMPLÉTER — recueilli ? ou justification de non-recueil] |
| **Décision du responsable de traitement** | ☐ Traitement validé · ☐ Validé sous réserve du plan d'action · ☐ À revoir |
| **Date / signature** | [À COMPLÉTER] |

> 🔁 **Réviser l'AIPD** à chaque évolution significative (nouvelle fonctionnalité, nouveau
> sous-traitant, incident, changement de finalité), et au minimum tous les 3 ans.

---

## 10. Historique des révisions

| Date | Version | Modification |
| --- | --- | --- |
| 15 juin 2026 | 0.1 | Création du brouillon. Hébergement UE/France (eu-west-3) intégré. |
