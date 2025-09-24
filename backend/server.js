const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require("path");

const app = express();
const port = process.env.PORT || 8080;

app.use(express.json());
app.use(cors());

// ==========================
// CONFIG MYSQL
// ==========================
const dbConfig = {
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  port: process.env.MYSQLPORT,
};

console.log("🔍 Config DB :", dbConfig);

let pool;

// ==========================
// INITIALISATION DB
// ==========================
(async () => {
  try {
    // 🔹 Sur Railway, PAS de création automatique de base → juste connexion
    pool = await mysql.createPool(dbConfig);
    console.log("✅ Connecté à MySQL sur Railway");

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

// ==========================
// ROUTES API
// ==========================
app.post('/ajouter', async (req, res) => {
  const { date, heure_debut, heure_fin, km } = req.body;

  if (!date || !heure_debut || !heure_fin || km === undefined) {
    return res.status(400).json({ error: "Champs manquants" });
  }

  const duree = Math.round(
    (new Date(`${date} ${heure_fin}:00`) - new Date(`${date} ${heure_debut}:00`)) / 60000
  );

  try {
    const [result] = await pool.query(
      'INSERT INTO suivi (date, heure_debut, heure_fin, duree, km) VALUES (?, ?, ?, ?, ?)',
      [date, heure_debut, heure_fin, duree, km]
    );
    res.json({ id: result.insertId });
  } catch (err) {
    console.error("Erreur MySQL /ajouter :", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/donnees', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM suivi ORDER BY date ASC');
    res.json(rows);
  } catch (err) {
    console.error("Erreur MySQL /donnees :", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.put('/modifier/:id', async (req, res) => {
  const { id } = req.params;
  const { date, heure_debut, heure_fin, km } = req.body;

  if (!date || !heure_debut || !heure_fin || km === undefined) {
    return res.status(400).json({ error: "Champs manquants" });
  }

  const duree = Math.round(
    (new Date(`${date} ${heure_fin}:00`) - new Date(`${date} ${heure_debut}:00`)) / 60000
  );

  try {
    await pool.query(
      'UPDATE suivi SET date = ?, heure_debut = ?, heure_fin = ?, duree = ?, km = ? WHERE id = ?',
      [date, heure_debut, heure_fin, duree, km, id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("Erreur MySQL /modifier :", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/supprimer/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM suivi WHERE id = ?', [id]);
    res.json({ message: 'Entrée supprimée' });
  } catch (err) {
    console.error("Erreur MySQL /supprimer :", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ==========================
// FRONTEND STATIC
// ==========================
// Servir le frontend statique
app.use(express.static(path.join(__dirname, "../frontend")));

// Toutes les routes non-API renvoient index.html
app.get(/^\/(?!api|ajouter|donnees|modifier|supprimer).*$/, (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

app.listen(port, () => {
  console.log(`🚀 Serveur démarré sur http://localhost:${port}`);
});