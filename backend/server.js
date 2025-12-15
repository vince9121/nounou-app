// ==========================
// server.js
// Backend nounou app
// ==========================

const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');

// 🔹 Charger .env seulement en local
if (process.env.NODE_ENV !== "production") {
  require('dotenv').config();
}

const app = express();
const port = process.env.PORT || 8080;

app.use(express.json());
app.use(cors());

// ==========================
// CONFIG MYSQL
// ==========================
const dbConfig = {
  host: process.env.MYSQLHOST || '127.0.0.1',
  user: process.env.MYSQLUSER || 'root',
  password: process.env.MYSQLPASSWORD || '',
  database: process.env.MYSQLDATABASE || 'nounou_db',
  port: Number(process.env.MYSQLPORT) || 3306,
};

let pool;

// ==========================
// INITIALISATION DB
// ==========================
(async () => {
  try {
    // Connexion simple pour créer la DB si besoin
    const connection = await mysql.createConnection({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password,
      port: dbConfig.port,
    });
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\``);
    await connection.end();

    // Pool sur la DB
    pool = await mysql.createPool(dbConfig);

    console.log("✅ Connecté à MySQL et base vérifiée");

    // Création de la table si elle n’existe pas
    await pool.query(`
      CREATE TABLE IF NOT EXISTS suivi (
        id INT AUTO_INCREMENT PRIMARY KEY,
        date DATE NOT NULL,
        heure_debut TIME NOT NULL,
        heure_fin TIME NOT NULL,
        duree INT NOT NULL,
        km INT NOT NULL
      )
    `);
    console.log("✅ Table 'suivi' vérifiée/créée");
  } catch (err) {
    console.error("❌ Erreur MySQL:", err.message);
  }
})();

async function getPool() {
  if (!pool) {
    pool = mysql.createPool(dbConfig);
  }
  return pool;
}

// ==========================
// ROUTES API
// ==========================

// Route de reveil de la base et de l'application
app.get("/health", async (req, res) => {
  try {
    const p = await getPool();
    await p.query("SELECT 1");
    res.json({ status: "ok" });
  } catch (err) {
    console.error("HEALTH CHECK:", err.message);
    pool = null; // 🔥 on force la recréation
    res.status(503).json({ status: "db_sleeping" });
  }
});

// Ajouter une entrée
app.post('/ajouter', async (req, res) => {
  const { date, heure_debut, heure_fin, km } = req.body;
  if (!date || !heure_debut || !heure_fin || km === undefined) {
    return res.status(400).json({ error: "Champs manquants" });
  }

  const duree = Math.round(
    (new Date(`${date} ${heure_fin}:00`) - new Date(`${date} ${heure_debut}:00`)) / 60000
  );

  try {
    const p = await getPool();
    const [result] = await p.query(
      'INSERT INTO suivi (date, heure_debut, heure_fin, duree, km) VALUES (?, ?, ?, ?, ?)',
      [date, heure_debut, heure_fin, duree, km]
    );
    res.json({ id: result.insertId });
  } catch (err) {
    console.error("Erreur MySQL /ajouter :", err.message);
    pool = null; // 🔥 on force la recréation
    res.status(503).json({ status: "db_sleeping" });
  }
});

// Récupérer toutes les données
app.get('/donnees', async (req, res) => {
  try {
    const p = await getPool();
    const [rows] = await p.query('SELECT * FROM suivi ORDER BY date ASC');
    res.json(rows);
  } catch (err) {
    console.error("Erreur MySQL /donnees :", err.message);
    pool = null; // 🔥 reset
    res.status(503).json({ error: "db_not_ready" });
  }
});

// Modifier une entrée
app.put('/modifier/:id', async (req, res) => {
  const { id } = req.params;
  const { date, heure_debut, heure_fin, km } = req.body;
  const duree = Math.round(
    (new Date(`${date} ${heure_fin}:00`) - new Date(`${date} ${heure_debut}:00`)) / 60000
  );

  try {
    const p = await getPool();
    const [result] = await p.query(
      'UPDATE suivi SET date = ?, heure_debut = ?, heure_fin = ?, duree = ?, km = ? WHERE id = ?',
      [date, heure_debut, heure_fin, duree, km, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Entrée non trouvée" });
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Erreur MySQL /modifier :", err.message);
    pool = null; // 🔥 reset
    res.status(503).json({ error: "db_not_ready" });
  }
});

// Supprimer une entrée
app.delete('/supprimer/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const p = await getPool();
    const [result] = await p.query('DELETE FROM suivi WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Entrée non trouvée" });
    }
    res.json({ message: "Entrée supprimée avec succès" });
  } catch (err) {
    console.error("Erreur MySQL /supprimer :", err.message);
    pool = null; // 🔥 reset
    res.status(503).json({ error: "db_not_ready" });
  }
});

// ==========================
// FRONTEND STATIC
// ==========================
app.use(express.static(path.join(__dirname, "../frontend")));
app.get(/^\/(?!api).*$/, (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

// ==========================
// LANCEMENT SERVEUR
// ==========================
app.listen(port, () => {
  console.log(`🚀 Serveur démarré sur http://localhost:${port}`);
});