// abtestServer.js
const express = require('express');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 3000;

// Möjliggör JSON i request-body
app.use(express.json());

// Pool för att ansluta till databasen (Render sätter DATABASE_URL)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

/*
  GET /api/abtest/variant
  =======================
  Returnerar slumpmässigt 'popup' eller 'button' (50/50).
*/
app.get('/api/abtest/variant', (req, res) => {
  const variant = Math.random() < 0.5 ? 'popup' : 'button';
  res.json({ variant });
});

/*
  POST /api/abtest/track
  =======================
  Tar emot { "clickType": "popup" } eller { "clickType": "button" }
  Ökar popup_clicks eller button_clicks i tabellen (id=1).
*/
app.post('/api/abtest/track', async (req, res) => {
  const { clickType } = req.body;
  let updateSql;

  if (clickType === 'popup') {
    updateSql = 'UPDATE abtest_stats SET popup_clicks = popup_clicks + 1 WHERE id = 1';
  } else if (clickType === 'button') {
    updateSql = 'UPDATE abtest_stats SET button_clicks = button_clicks + 1 WHERE id = 1';
  } else {
    return res.status(400).json({ error: 'Ogiltig clickType (ska vara "popup" eller "button").' });
  }

  try {
    await pool.query(updateSql);
    // Hämta nya värden
    const result = await pool.query('SELECT popup_clicks, button_clicks FROM abtest_stats WHERE id = 1');
    const row = result.rows[0];
    res.json({
      success: true,
      popupClicks: row.popup_clicks,
      buttonClicks: row.button_clicks
    });
  } catch (err) {
    console.error('Fel vid track:', err);
    res.status(500).json({ error: 'Serverfel' });
  }
});

/*
  GET /api/abtest/stats
  ======================
  Returnerar popupClicks & buttonClicks.
*/
app.get('/api/abtest/stats', async (req, res) => {
  try {
    const result = await pool.query('SELECT popup_clicks, button_clicks FROM abtest_stats WHERE id = 1');
    if (result.rows.length > 0) {
      res.json({
        popupClicks: result.rows[0].popup_clicks,
        buttonClicks: result.rows[0].button_clicks
      });
    } else {
      res.json({ popupClicks: 0, buttonClicks: 0 });
    }
  } catch (err) {
    console.error('Fel vid stats:', err);
    res.status(500).json({ error: 'Serverfel' });
  }
});

// Starta servern
app.listen(port, () => {
  console.log(`A/B-test server kör på port ${port}`);
});
