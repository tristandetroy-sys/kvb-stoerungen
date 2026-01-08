import express from "express";
import fetch from "node-fetch";
import * as cheerio from "cheerio";

const app = express();
const PORT = process.env.PORT || 10000;

/**
 * WORKAROUND:
 * Wandelt alle deutschen Umlaute in HTML-Entities um.
 * Dadurch ist das Ergebnis 100 % encoding-unabhängig.
 */
function fixUmlauts(str = "") {
  return str
    .replace(/ä/g, "&auml;")
    .replace(/ö/g, "&ouml;")
    .replace(/ü/g, "&uuml;")
    .replace(/Ä/g, "&Auml;")
    .replace(/Ö/g, "&Ouml;")
    .replace(/Ü/g, "&Uuml;")
    .replace(/ß/g, "&szlig;");
}

app.get("/", async (req, res) => {
  try {
    const response = await fetch(
      "https://www.kvb.koeln/fahrtinfo/betriebslage/index.html"
    );

    // ⚠️ absichtlich KEIN Encoding-Handling mehr
    const html = await response.text();

    const $ = cheerio.load(html);

    const stoerungen = [];

    $("#stoer_bahn li.list-group-item").each((_, el) => {
      const linieRaw = $(el).find(".liniennummer").text().trim();
      const textRaw = $(el).find("b").text().trim();

      if (!linieRaw || !textRaw) return;

      stoerungen.push({
        linie: fixUmlauts(linieRaw),
        text: fixUmlauts(textRaw)
      });
    });

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(buildHTML(stoerungen));
  } catch (err) {
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

  <!-- TRMNL / Screenshot-optimiert -->
  <style>
    body {
      font-family: Arial, Helvetica, sans-serif;
      background: #ffffff;
      color: #000000;
      padding: 24px;
    }

    h1 {
      font-size: 22px;
      margin-bottom: 20px;
    }

    .item {
      margin-bottom: 18px;
    }

    .linie {
      font-weight: bold;
      font-size: 18px;
      margin-bottom: 4px;
    }

    .text {
      font-size: 16px;
      line-height: 1.35;
    }

    .footer {
      margin-top: 30px;
      font-size: 12px;
      color: #444;
    }
  </style>
</head>

<body>
  <h1>KVB St&ouml;rungen</h1>

  ${
    stoerungen.length === 0
      ? "<p>Keine aktuellen St&ouml;rungen.</p>"
      : stoerungen
          .map(
            s => `
    <div class="item">
      <div class="linie">Linie ${s.linie}</div>
      <div class="text">${s.text}</div>
    </div>
  `
          )
          .join("")
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
