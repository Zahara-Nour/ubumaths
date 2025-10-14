# Père Ubu Chatbot - Démarrage Rapide

## ✅ Installation Terminée

Tous les fichiers nécessaires ont été créés ! Voici comment démarrer.

## 🚀 Étapes Rapides

### 1. Obtenir une clé API Groq (2 minutes)

1. Allez sur **https://console.groq.com**
2. Créez un compte gratuit (avec Google/GitHub)
3. Cliquez sur **"API Keys"** → **"Create API Key"**
4. Copiez la clé (format: `gsk_xxxxxxxxxx`)

### 2. Configurer la clé

Ouvrez `.env` et remplacez :

```bash
GROQ_API_KEY="your_groq_api_key_here"
```

Par votre vraie clé :

```bash
GROQ_API_KEY="gsk_votre_cle_ici"
```

### 3. Redémarrer le serveur

```bash
# Arrêtez le serveur (Ctrl+C si en cours)
pnpm dev
```

### 4. Tester le chatbot

Ouvrez votre navigateur :

```
http://localhost:5173/pere-ubu
```

**Cornegidouille ! Ça fonctionne ! 🎭**

## 📁 Fichiers Créés

- ✅ `src/lib/config/personalities.ts` - Personnalité du Père Ubu
- ✅ `src/lib/components/ChatBot.svelte` - Composant chatbot
- ✅ `src/routes/api/chat/+server.ts` - API endpoint
- ✅ `src/routes/(public)/pere-ubu/+page.svelte` - Page publique
- ✅ `.env` - Variable d'environnement ajoutée
- ✅ `PERE_UBU_CHATBOT_SETUP.md` - Documentation complète

## 🎯 Caractéristiques

- 🌐 **Accès public** (pas d'authentification)
- 💬 **Personnalité absurde** mais bienveillante
- 🎓 **Pédagogique** pour les mathématiques
- 💾 **Éphémère** (localStorage uniquement)
- 🎨 **Design cohérent** avec Shadcn UI

## 🔧 Si ça ne marche pas

### Erreur "API key not configured"

1. Vérifiez que la clé est dans `.env`
2. Redémarrez le serveur (`pnpm dev`)
3. La clé doit commencer par `gsk_`

### Erreur "Service temporairement indisponible"

1. Vérifiez que votre clé est valide sur console.groq.com
2. Vérifiez votre quota (gratuit = ~14 400 requêtes/jour)
3. Attendez quelques minutes et réessayez

## 📚 Documentation Complète

Pour plus de détails, consultez [PERE_UBU_CHATBOT_SETUP.md](PERE_UBU_CHATBOT_SETUP.md)

## 💡 Exemples de Questions à Poser

- "Comment résoudre une équation du second degré ?"
- "Explique-moi les fractions"
- "C'est quoi le théorème de Pythagore ?"
- "Je suis en 6ème et j'ai du mal avec les divisions"

Le Père Ubu répondra avec son style unique ! 👑

---

**Par ma chandelle verte, bon courage avec votre chatbot pataphysique ! 🕯️**
