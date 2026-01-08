import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static("public"));

app.get("/api/stoerungen", async (req, res) => {
  try {
    const response = await fetch("https://www.kvb.koeln/betriebslage");
    const html = await response.text();
    res.send(html);
  } catch (e) {
    res.status(500).send("Fehler beim Abrufen der KVB-Daten");
  }
});

app.listen(PORT, () => {
  console.log(`🚋 Server läuft auf http://localhost:${PORT}`);
});
