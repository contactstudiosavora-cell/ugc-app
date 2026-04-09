# 🧪 Guide de Test : Assignation de Scripts aux Packages

## Prérequis pour Tester

✅ Une entreprise avec au moins un package créé  
✅ Au moins un script avec le statut "VALIDÉ", "EN PRODUCTION" ou "FILMÉ"

---

## 🚀 Scénario de Test #1 : Assigner un Script à un Package

### Étapes

1. **Accéder à la page entreprise**
   - Allez sur votre application déployée
   - Cliquez sur une entreprise existante

2. **Créer un package (si nécessaire)**
   - Cliquez sur l'onglet "PACKAGES"
   - Cliquez sur "+ NOUVEAU PACKAGE"
   - Remplissez :
     - Nom : "Pack Test Juin 2025"
     - Type : UGC
     - Nombre de scripts : 5
   - Cliquez sur "CRÉER"

3. **Aller dans l'onglet SCRIPTS**
   - Cliquez sur l'onglet "✓ SCRIPTS"

4. **Changer le statut d'un script en "Validé"**
   - Trouvez un script avec le statut "GÉNÉRÉ"
   - Dans le dropdown de statut, sélectionnez "Validé"

5. **Assigner le script à un package**
   - Une nouvelle section devrait apparaître sous le script
   - Label affiché : "AJOUTER À UN PACKAGE:"
   - Ouvrez le dropdown
   - Sélectionnez "Pack Test Juin 2025 (UGC)"
   - Un bouton vert "✓ ASSIGNER" devrait apparaître
   - Cliquez sur "✓ ASSIGNER"

6. **Vérifier le résultat**
   - ✅ Un badge "📦 Pack Test Juin 2025" devrait apparaître à côté de l'angle du script
   - ✅ Le label devrait changer pour "CHANGER DE PACKAGE:"
   - ✅ Le dropdown devrait afficher le package sélectionné
   - ✅ Un bouton "✕" devrait apparaître pour retirer du package

---

## 🚀 Scénario de Test #2 : Changer le Package d'un Script

### Étapes

1. **Partir d'un script déjà assigné** (voir Test #1)

2. **Créer un deuxième package** (si nécessaire)
   - Nom : "Pack Juillet 2025"
   - Type : UGC
   - Nombre : 5

3. **Changer l'assignation**
   - Dans la section d'assignation du script
   - Ouvrez le dropdown (affiche actuellement "Pack Test Juin 2025")
   - Sélectionnez "Pack Juillet 2025 (UGC)"
   - Cliquez sur "✓ ASSIGNER"

4. **Vérifier le résultat**
   - ✅ Le badge devrait maintenant afficher "📦 Pack Juillet 2025"
   - ✅ Le dropdown devrait afficher "Pack Juillet 2025"

---

## 🚀 Scénario de Test #3 : Retirer un Script d'un Package

### Étapes

1. **Partir d'un script assigné**

2. **Retirer du package**
   - Cliquez sur le bouton "✕" à droite du dropdown

3. **Vérifier le résultat**
   - ✅ Le badge "📦 Pack..." devrait disparaître
   - ✅ Le label devrait redevenir "AJOUTER À UN PACKAGE:"
   - ✅ Le dropdown devrait afficher "— Sélectionner un package —"

---

## 🚀 Scénario de Test #4 : Scripts Non Validés

### Étapes

1. **Trouver un script avec le statut "GÉNÉRÉ"**

2. **Vérifier l'absence de section d'assignation**
   - ✅ Aucune section d'assignation ne devrait être visible sous ce script
   - ✅ Seuls les boutons de statut et d'édition sont visibles

---

## 🚀 Scénario de Test #5 : Entreprise Sans Package

### Étapes

1. **Créer une nouvelle entreprise** (ou utiliser une existante sans packages)

2. **Créer et valider un script**
   - Générez un script pour cette entreprise
   - Changez son statut en "Validé"

3. **Vérifier l'absence de section d'assignation**
   - ✅ Aucune section d'assignation ne devrait apparaître
   - ✅ L'interface reste normale (car il n'y a pas de packages disponibles)

---

## 🔍 Points de Contrôle Visuels

### ✅ Checklist Design

- [ ] Les couleurs respectent le thème (olive, lime, cream)
- [ ] La typographie est cohérente (font-display, text-[9px])
- [ ] Le badge "📦 Package" est visible et en lime-dark
- [ ] La bordure de séparation (border-t) est subtile
- [ ] Le dropdown a le bon style (cream-input, border-olive/15)
- [ ] Le bouton "✓ ASSIGNER" est vert lime avec hover effect
- [ ] Le bouton "✕" devient rouge au survol
- [ ] Les espacements sont harmonieux (mt-3, pt-3, gap-2)

---

## 🐛 Tests de Cas Limites

### Test A : Assignation Rapide Multiple
1. Assigner 3 scripts différents à 3 packages différents
2. Vérifier que chaque assignation fonctionne indépendamment

### Test B : Annulation de Sélection
1. Sélectionner un package dans le dropdown
2. Changer d'avis et sélectionner "— Sélectionner un package —"
3. Vérifier que le bouton "✓ ASSIGNER" disparaît

### Test C : Même Package
1. Script déjà dans "Pack Juin"
2. Sélectionner à nouveau "Pack Juin" dans le dropdown
3. Vérifier que le bouton "✓ ASSIGNER" ne réapparaît PAS

### Test D : Navigation Entre Onglets
1. Assigner un script à un package
2. Naviguer vers l'onglet "PACKAGES"
3. Revenir à l'onglet "SCRIPTS"
4. Vérifier que l'assignation est toujours visible

---

## 📱 Test de Responsiveness (Optionnel)

Si l'application est responsive :
- [ ] Sur mobile, le dropdown ne déborde pas
- [ ] Les boutons restent accessibles
- [ ] Le badge du package s'affiche correctement

---

## 🔗 Vérification Base de Données (Optionnel)

Si vous avez accès à MongoDB Atlas :

```javascript
// Chercher un script assigné
db.scripts.findOne({ packageId: { $exists: true, $ne: null } })

// Résultat attendu :
{
  _id: "script-xxx",
  companyId: "company-yyy",
  packageId: "package-zzz",  // ← Doit être présent
  status: "validated",
  content: "...",
  ...
}
```

---

## ❌ Gestion d'Erreurs

### Test Erreur Réseau

1. Ouvrir les DevTools (F12)
2. Onglet Network → Mettre "Offline"
3. Essayer d'assigner un script
4. ✅ Une alerte devrait apparaître : "Erreur lors de l'assignation au package"

---

## ✅ Résultat Final Attendu

Une fois tous les tests passés :

```
┌─────────────────────────────────────────────────────────────┐
│ ✅ Les scripts validés peuvent être assignés à des packages  │
│ ✅ Le badge du package s'affiche correctement                │
│ ✅ On peut changer de package                                │
│ ✅ On peut retirer un script d'un package                    │
│ ✅ L'interface est cohérente avec le design existant         │
│ ✅ Les données sont bien persistées dans MongoDB             │
└─────────────────────────────────────────────────────────────┘
```

---

**Date de création** : 9 Avril 2025  
**Version** : 1.0  
**Statut** : ✅ Prêt pour tests
