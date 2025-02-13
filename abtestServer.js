// popupServer.js

// 1) Importer
const express = require('express');
const cors = require('cors');   // För CORS-stöd
const { Pool } = require('pg');

// 2) Skapa Express-app
const app = express();
const port = process.env.PORT || 3000; // Render sätter PORT, annars 3000 lokalt

// 3) Använd cors() och JSON-parser
app.use(cors());        
app.use(express.json());

// 4) Anslut mot PostgreSQL 
//    (På Render: process.env.DATABASE_URL, med SSL avstängd "rejectUnauthorized: false")
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// 5) POST /api/popup/track
//    Förväntar { "actionType": "click" } eller { "actionType": "close" }
//    Ökar popup_clicks eller popup_closes i databasen (id=1).
app.post('/api/popup/track', async (req, res) => {
  const { actionType } = req.body;
  let updateSql;

  if (actionType === 'click') {
    updateSql = 'UPDATE popup_stats SET popup_clicks = popup_clicks + 1 WHERE id = 1';
  } else if (actionType === 'close') {
    updateSql = 'UPDATE popup_stats SET popup_closes = popup_closes + 1 WHERE id = 1';
  } else {
    return res.status(400).json({ error: 'Ogiltig actionType (ska vara "click" eller "close").' });
  }

  try {
    // Kör SQL: uppdatera klick eller stängningar
    await pool.query(updateSql);

    // Hämta nya värden
    const result = await pool.query('SELECT popup_clicks, popup_closes FROM popup_stats WHERE id = 1');
    const row = result.rows[0];

    // Skicka tillbaka uppdaterade värden
    return res.json({
      success: true,
      popupClicks: row.popup_clicks,
      popupCloses: row.popup_closes
    });
  } catch (err) {
    console.error('Fel vid POST /api/popup/track:', err);
    return res.status(500).json({ error: 'Serverfel' });
  }
});

// 6) GET /api/popup/stats
//    Returnerar popupClicks och popupCloses
app.get('/api/popup/stats', async (req, res) => {
  try {
    const result = await pool.query('SELECT popup_clicks, popup_closes FROM popup_stats WHERE id = 1');
    if (result.rows.length > 0) {
      const row = result.rows[0];
      return res.json({
        popupClicks: row.popup_clicks,
        popupCloses: row.popup_closes
      });
    } else {
      // Om ingen rad fanns, returnera 0
      return res.json({
        popupClicks: 0,
        popupCloses: 0
      });
    }
  } catch (err) {
    console.error('Fel vid GET /api/popup/stats:', err);
    return res.status(500).json({ error: 'Serverfel' });
  }
});

// 7) Starta servern
app.listen(port, () => {
  console.log(`Servern kör på port ${port}`);
});
