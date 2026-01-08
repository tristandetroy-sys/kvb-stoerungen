import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

// 🔁 Proxy zur KVB – korrektes UTF-8 erzwingen
app.get("/api/stoerungen", async (req, res) => {
  try {
    const response = await fetch(
      "https://www.kvb.koeln/fahrtinfo/betriebslage/"
    );

    // 🔥 WICHTIG: als Buffer lesen
    const buffer = await response.arrayBuffer();

    // 🔥 UTF-8 EXPLIZIT
    const text = new TextDecoder("utf-8").decode(buffer);

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(text);
  } catch (err) {
    res.status(500).send("Fehler beim Laden der KVB-Daten");
  }
});

// Frontend ausliefern
app.use(express.static("public"));

app.listen(PORT, () => {
  console.log("Server läuft auf Port", PORT);
});
