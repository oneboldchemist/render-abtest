// abtestServer.js

// 1) Importer
const express = require('express');
const cors = require('cors');       // <--- Viktigt för CORS-stöd
const { Pool } = require('pg');

// 2) Skapa Express-app
const app = express();
const port = process.env.PORT || 3000;  // Render sätter PORT åt dig i miljövariabeln

// 3) Använd cors() och JSON-parser
app.use(cors());        // Tillåt alla origins. (Du kan ange { origin: 'https://dinshopifydomän' } om du vill vara mer restriktiv.)
app.use(express.json()); 

// 4) Anslut mot PostgreSQL (Render sätter process.env.DATABASE_URL när du kopplar databasen)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// 5) GET /api/abtest/variant
//    Returnerar slumpmässigt 'popup' eller 'button' (50/50).
app.get('/api/abtest/variant', (req, res) => {
  const variant = Math.random() < 0.5 ? 'popup' : 'button';
  res.json({ variant });
});

// 6) POST /api/abtest/track
//    Förväntar { "clickType": "popup" } eller { "clickType": "button" }
//    Ökar popupClicks eller buttonClicks i databasen (id=1).
app.post('/api/abtest/track', async (req, res) => {
  const { clickType } = req.body;
  let updateSql;

  if (clickType === 'popup') {
    updateSql = `UPDATE abtest_stats SET popup_clicks = popup_clicks + 1 WHERE id = 1`;
  } else if (clickType === 'button') {
    updateSql = `UPDATE abtest_stats SET button_clicks = button_clicks + 1 WHERE id = 1`;
  } else {
    return res.status(400).json({ error: 'Ogiltig clickType (ska vara "popup" eller "button").' });
  }

  try {
    // Kör SQL: uppdatera klick
    await pool.query(updateSql);

    // Hämta nya värden
    const result = await pool.query('SELECT popup_clicks, button_clicks FROM abtest_stats WHERE id = 1');
    const row = result.rows[0];

    // Skicka tillbaka uppdaterade klick
    return res.json({
      success: true,
      popupClicks: row.popup_clicks,
      buttonClicks: row.button_clicks
    });
  } catch (err) {
    console.error('Fel vid POST /api/abtest/track:', err);
    return res.status(500).json({ error: 'Serverfel' });
  }
});

// 7) GET /api/abtest/stats
//    Returnerar popupClicks och buttonClicks
app.get('/api/abtest/stats', async (req, res) => {
  try {
    const result = await pool.query('SELECT popup_clicks, button_clicks FROM abtest_stats WHERE id = 1');
    if (result.rows.length > 0) {
      const row = result.rows[0];
      return res.json({
        popupClicks: row.popup_clicks,
        buttonClicks: row.button_clicks
      });
    } else {
      // Om ingen rad fanns
      return res.json({
        popupClicks: 0,
        buttonClicks: 0
      });
    }
  } catch (err) {
    console.error('Fel vid GET /api/abtest/stats:', err);
    return res.status(500).json({ error: 'Serverfel' });
  }
});

// 8) Starta server
app.listen(port, () => {
  console.log(`A/B-test-servern kör på port ${port}`);
});
