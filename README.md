# ArchiQuest

Application web interactive pour explorer l'architecture de Rennes.

## Technologies
- React 18 (UMD)
- Leaflet (cartographie)
- Tailwind CSS
- Nginx (pour le déploiement)

## Déploiement sur VPS

### Prérequis
- Docker et Docker Compose installés sur votre VPS
- Accès SSH à votre VPS Hostinger

### Installation

1. **Cloner le repository sur votre VPS :**
```bash
cd /var/www/
git clone https://github.com/diquels/archiquest.git
cd archiquest
```

2. **Lancer l'application avec Docker :**
```bash
docker-compose up -d
```

L'application sera accessible sur le port 8080.

3. **Configuration Nginx reverse proxy (optionnel) :**

Créez un fichier `/etc/nginx/sites-available/archiquest` :
```nginx
server {
    listen 80;
    server_name archiquest.votredomaine.com;

    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Activez le site :
```bash
sudo ln -s /etc/nginx/sites-available/archiquest /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

4. **SSL avec Certbot (optionnel) :**
```bash
sudo certbot --nginx -d archiquest.votredomaine.com
```

### Mise à jour

Pour mettre à jour l'application :
```bash
cd /var/www/archiquest
git pull
docker-compose restart
```

### Commandes utiles

- **Voir les logs :**
```bash
docker-compose logs -f
```

- **Arrêter l'application :**
```bash
docker-compose down
```

- **Redémarrer :**
```bash
docker-compose restart
```

## Développement local

Ouvrez simplement `index.html` dans votre navigateur, ou utilisez un serveur local :

```bash
# Avec Python
python -m http.server 8000

# Avec Node.js
npx http-server
```

## Structure du projet

```
ArchiQuest/
├── index.html          # Point d'entrée
├── styles.css          # Styles personnalisés
├── app.js              # Application React principale
├── data.js             # Données des lieux
├── coordsById.js       # Coordonnées géographiques
├── detailsById.js      # Détails des lieux
├── rennesarhi.json     # Données JSON
└── docker-compose.yml  # Configuration Docker
```

## Licence

© Pierre Diquelou - Tous droits réservés
