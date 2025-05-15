# Structure du projet séparée

- `backend/` : contient le serveur Node.js, Express, Socket.io, la logique serveur et les dépendances npm.
- `frontend/` : contient les fichiers statiques (HTML, CSS, JS, assets) et les vues.

## Lancer le projet

1. Ouvrez un terminal dans le dossier `backend/`.
2. Installez les dépendances si besoin :
   ```sh
   npm install
   ```
3. Démarrez le serveur :
   ```sh
   npm start
   ```
4. Accédez à l'application sur [http://localhost:3000](http://localhost:3000)

---

- Le backend sert automatiquement le frontend via Express.
- Modifiez le code frontend dans `frontend/` et le code serveur dans `backend/`.
