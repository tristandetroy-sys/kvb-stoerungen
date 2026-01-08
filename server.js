import express from "express";
import fetch from "node-fetch";
import * as cheerio from "cheerio";

const app = express();
const PORT = process.env.PORT || 10000;

/**
 * Repariert bekannte kaputte UTF-8-Umlaute (�)
 */
function repairBrokenUmlauts(str = "") {
  return str
    .replace(/H�he/g, "Höhe")
    .replace(/Glash�ttenstr/g, "Glashüttenstr")
    .replace(/Stra�e/g, "Straße")
    .replace(/S�rth/g, "Sürth")
    .replace(/Z�ndorf/g, "Zündorf")
    .replace(/Wei�er/g, "Weißer")
    .replace(/K�ln/g, "Köln");
}

/**
 * Wandelt Umlaute in HTML-Entities (100 % encoding-sicher)
 */
function toEntities(str = "") {
  return str
    .replace(/ä/g, "&auml;")
    .replace(/ö/g, "&ouml;")
    .replace(/ü/g, "&uuml;")
    .replace(/Ä/g, "&Auml;")
    .replace(/Ö/g, "&Ouml;")
    .replace(/Ü/g, "&Uuml;")
    .replace(/ß/g, "&szlig;");
}

const ALLOWED_LINES = ["1", "3", "4", "5", "7", "12", "15"];

app.get("/", async (req, res) => {
  try {
    const response = await fetch(
      "https://www.kvb.koeln/fahrtinfo/betriebslage/index.html"
    );

    const rawHtml = await response.text();
    const $ = cheerio.load(rawHtml);

    const stoerungen = [];

    $("#stoer_bahn li.list-group-item").each((_, el) => {
      const linie = $(el).find(".liniennummer").text().trim();
      if (!ALLOWED_LINES.includes(linie)) return;

      let text = $(el).find("b").text().trim();
      if (!text) return;

      text = repairBrokenUmlauts(text);
      text = toEntities(text);

      stoerungen.push({ linie, text });
    });

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(buildHTML(stoerungen));
  } catch (err) {
    console.error(err);
    res.status(500).send("Fehler beim Laden der KVB-Daten");
  }
});

function buildHTML(stoerungen) {
  return `
<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <title>KVB Betriebslage</title>

  <!-- FIXE TRMNL-GRÖSSE -->
  <meta name="viewport" content="width=800, height=480, initial-scale=1">

  <style>
    /* === TRMNL CANVAS === */
    html, body {
      width: 800px;
      height: 480px;
      margin: 0;
      padding: 0;
      overflow: hidden;
      background: #ffffff;
      color: #000000;
      font-family: Arial, Helvetica, sans-serif;
    }

    body {
      box-sizing: border-box;
      padding: 24px;
    }

    h1 {
      text-align: center;
      font-size: 28px;
      margin: 0 0 20px 0;
    }

    /* === GRID === */
    .grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      grid-gap: 16px;
    }

    .card {
      border: 3px solid #000;
      border-radius: 16px;
      padding: 12px;
      text-align: center;
      height: 140px;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
    }

    .emoji {
      font-size: 36px;
      margin-bottom: 6px;
    }

    .line {
      font-size: 20px;
      font-weight: bold;
      margin-bottom: 6px;
    }

    .text {
      font-size: 14px;
      line-height: 1.25;
      overflow: hidden;
    }

    .ok {
      height: 300px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      font-size: 64px;
      text-align: center;
    }

    .ok span {
      font-size: 20px;
      margin-top: 10px;
    }

    .footer {
      position: absolute;
      bottom: 12px;
      width: 100%;
      text-align: center;
      font-size: 12px;
    }
  </style>
</head>

<body>
  <h1>KVB Betriebslage</h1>

  ${
    stoerungen.length === 0
      ? `
        <div class="ok">
          ✅
          <span>Keine St&ouml;rungen</span>
        </div>
      `
      : `
        <div class="grid">
          ${stoerungen
            .slice(0, 6)
            .map(
              s => `
            <div class="card">
              <div class="emoji">🚧</div>
              <div class="line">Linie ${s.linie}</div>
              <div class="text">${s.text}</div>
            </div>
          `
            )
            .join("")}
        </div>
      `
  }

  <div class="footer">
    Stand: ${new Date().toLocaleTimeString("de-DE")}
  </div>
</body>
</html>
`;
}

app.listen(PORT, () => {
  console.log("Server läuft auf Port", PORT);
});
