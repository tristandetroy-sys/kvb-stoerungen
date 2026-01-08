import express from "express";
import fetch from "node-fetch";
import * as cheerio from "cheerio";

const app = express();
const PORT = process.env.PORT || 10000;

/**
 * 1️⃣ Repariert typische kaputte UTF-8 → � Zeichen
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
 * 2️⃣ Wandelt Umlaute in HTML-Entities (encoding-sicher)
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
  <title>KVB St&ouml;rungen</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">

  <!-- TRMNL Screenshot-optimiert -->
  <style>
    body {
      margin: 0;
      padding: 32px;
      background: #fff;
      color: #000;
      font-family: Arial, Helvetica, sans-serif;
    }

    h1 {
      text-align: center;
      font-size: 28px;
      margin-bottom: 28px;
    }

    .grid {
      display: flex;
      justify-content: center;
      gap: 24px;
      flex-wrap: wrap;
    }

    .card {
      width: 200px;
      border: 3px solid #000;
      border-radius: 18px;
      padding: 16px;
      text-align: center;
    }

    .emoji {
      font-size: 40px;
      margin-bottom: 8px;
    }

    .line {
      font-size: 22px;
      font-weight: bold;
      margin-bottom: 8px;
    }

    .text {
      font-size: 14px;
      line-height: 1.3;
    }

    .ok {
      font-size: 64px;
      text-align: center;
    }

    .footer {
      margin-top: 24px;
      text-align: center;
      font-size: 12px;
    }
  </style>
</head>

<body>
  <h1>KVB Betriebslage</h1>

  ${
    stoerungen.length === 0
      ? `<div class="ok">✅<br>Keine St&ouml;rungen</div>`
      : `
        <div class="grid">
          ${stoerungen
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
