// ==========================
// server.js
// Backend nounou app
// ==========================

const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');

// ==========================
// ENV (local uniquement)
// ==========================
if (process.env.NODE_ENV !== "production") {
  require('dotenv').config({
    path: path.resolve(__dirname, '../.env')
  });
}

const app = express();
const port = process.env.PORT || 8080;

app.use(express.json());
app.use(cors());

// ==========================
// CONFIG MYSQL
// ==========================
const isProd = process.env.NODE_ENV === "production";

const mysqlConfig = {
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  port: Number(process.env.MYSQLPORT) || 3306,
  ...(isProd && { ssl: { rejectUnauthorized: false } })
};

// ==========================
// DB INIT (idempotent)
// ==========================
(async () => {
  try {
    const conn = await mysql.createConnection(mysqlConfig);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS suivi (
        id INT AUTO_INCREMENT PRIMARY KEY,
        date DATE NOT NULL,
        heure_debut TIME NOT NULL,
        heure_fin TIME NOT NULL,
        duree INT NOT NULL,
        km INT NOT NULL
      )
    `);

    await conn.end();
    console.log("✅ MySQL prêt (table vérifiée)");
  } catch (err) {
    console.error("❌ MySQL init error:", err.message);
  }
})();

// ==========================
// UTILS
// ==========================
async function getConnection() {
  return await mysql.createConnection(mysqlConfig);
}

// ==========================
// ROUTES API
// ==========================

// Health / wake-up
app.get("/health", async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    await conn.query("SELECT 1");
    res.json({ status: "ok" });
  } catch (err) {
    res.status(503).json({ status: "sleeping" });
  } finally {
    if (conn) await conn.end();
  }
});

// Ajouter une entrée
app.post('/ajouter', async (req, res) => {
  const { date, heure_debut, heure_fin, km } = req.body;

  if (!date || !heure_debut || !heure_fin || km === undefined) {
    return res.status(400).json({ error: "Champs manquants" });
  }

  const duree = Math.round(
    (new Date(`${date} ${heure_fin}`) - new Date(`${date} ${heure_debut}`)) / 60000
  );

  let conn;
  try {
    conn = await getConnection();
    const [result] = await conn.query(
      `INSERT INTO suivi (date, heure_debut, heure_fin, duree, km)
       VALUES (?, ?, ?, ?, ?)`,
      [date, heure_debut, heure_fin, duree, km]
    );
    res.json({ id: result.insertId });
  } catch (err) {
    res.status(503).json({ error: "db_unavailable" });
  } finally {
    if (conn) await conn.end();
  }
});

// Récupérer toutes les données
app.get('/donnees', async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const [rows] = await conn.query(
      'SELECT id, DATE_FORMAT(date, "%Y-%m-%d") AS date, heure_debut, heure_fin, duree, km FROM suivi ORDER BY date ASC'
    );
    res.json(rows);
  } catch (err) {
    res.status(503).json({ error: "db_unavailable" });
  } finally {
    if (conn) await conn.end();
  }
});

// Modifier une entrée
app.put('/modifier/:id', async (req, res) => {
  const { id } = req.params;
  const { date, heure_debut, heure_fin, km } = req.body;
  
  const duree = Math.round(
    (new Date(`${date} ${heure_fin}`) - new Date(`${date} ${heure_debut}`)) / 60000
  );

  let conn;
  try {
    conn = await getConnection();
    const [result] = await conn.query(
      `UPDATE suivi
       SET date = ?, heure_debut = ?, heure_fin = ?, duree = ?, km = ?
       WHERE id = ?`,
      [date, heure_debut, heure_fin, duree, km, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Entrée non trouvée" });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(503).json({ error: "db_unavailable" });
  } finally {
    if (conn) await conn.end();
  }
});

// Supprimer une entrée
app.delete('/supprimer/:id', async (req, res) => {
  const { id } = req.params;

  let conn;
  try {
    conn = await getConnection();
    const [result] = await conn.query(
      'DELETE FROM suivi WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Entrée non trouvée" });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(503).json({ error: "db_unavailable" });
  } finally {
    if (conn) await conn.end();
  }
});

// ==========================
// FRONTEND
// ==========================
app.use(express.static(path.join(__dirname, "../frontend")));

app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

// ==========================
// START
// ==========================
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});