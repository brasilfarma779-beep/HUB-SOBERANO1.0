import express from "express";
import { createServer as createViteServer } from "vite";
import db from "./server/db.ts";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  // API Routes
  
  // Sellers
  app.get("/api/sellers", (req, res) => {
    const sellers = db.prepare("SELECT * FROM sellers ORDER BY name ASC").all();
    res.json(sellers);
  });

  app.post("/api/sellers", (req, res) => {
    const { name, phone, commission_rate } = req.body;
    const info = db.prepare("INSERT INTO sellers (name, phone, commission_rate) VALUES (?, ?, ?)").run(name, phone, commission_rate);
    res.json({ id: info.lastInsertRowid });
  });

  app.put("/api/sellers/:id", (req, res) => {
    const { id } = req.params;
    const { name, phone, commission_rate } = req.body;
    db.prepare("UPDATE sellers SET name = ?, phone = ?, commission_rate = ? WHERE id = ?").run(name, phone, commission_rate, id);
    res.json({ success: true });
  });

  app.delete("/api/sellers/:id", (req, res) => {
    const { id } = req.params;
    // Check if seller has maletas
    const hasMaletas = db.prepare("SELECT COUNT(*) as count FROM maletas WHERE seller_id = ?").get() as { count: number };
    if (hasMaletas.count > 0) {
      return res.status(400).json({ error: "Não é possível excluir vendedora com maletas vinculadas." });
    }
    db.prepare("DELETE FROM sellers WHERE id = ?").run(id);
    res.json({ success: true });
  });

  // Maletas
  app.get("/api/maletas", (req, res) => {
    const maletas = db.prepare(`
      SELECT m.*, s.name as seller_name 
      FROM maletas m 
      LEFT JOIN sellers s ON m.seller_id = s.id 
      ORDER BY m.created_at DESC
    `).all();
    res.json(maletas);
  });

  app.delete("/api/maletas/:id", (req, res) => {
    const { id } = req.params;
    console.log(`Deleting maleta with ID: ${id}`);
    try {
      // With ON DELETE CASCADE, we only need to delete the maleta
      const result = db.prepare("DELETE FROM maletas WHERE id = ?").run(id);
      
      if (result.changes === 0) {
        return res.status(404).json({ error: "Maleta não encontrada" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Delete Maleta Error:", error);
      res.status(500).json({ error: "Erro interno ao excluir maleta" });
    }
  });

  app.delete("/api/maletas/status/:status", (req, res) => {
    const { status } = req.params;
    try {
      // With ON DELETE CASCADE, we only need to delete the maletas
      const result = db.prepare("DELETE FROM maletas WHERE status = ?").run(status);
      res.json({ success: true, changes: result.changes });
    } catch (error) {
      console.error("Delete All Maletas Error:", error);
      res.status(500).json({ error: "Erro ao excluir maletas" });
    }
  });

  app.delete("/api/system/reset", (req, res) => {
    try {
      const transaction = db.transaction(() => {
        db.prepare("DELETE FROM items").run();
        db.prepare("DELETE FROM maletas").run();
        db.prepare("DELETE FROM sellers").run();
      });
      transaction();
      res.json({ success: true });
    } catch (error) {
      console.error("System Reset Error:", error);
      res.status(500).json({ error: "Erro ao resetar o sistema" });
    }
  });

  app.patch("/api/maletas/:id/status", (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    db.prepare("UPDATE maletas SET status = ? WHERE id = ?").run(status, id);
    res.json({ success: true });
  });

  app.get("/api/maletas/:id/items", (req, res) => {
    const { id } = req.params;
    const items = db.prepare("SELECT * FROM items WHERE maleta_id = ?").all(id);
    res.json(items);
  });

  app.put("/api/maletas/:id", (req, res) => {
    const { id } = req.params;
    const { seller_id, items, total_bruto, commission_value, estimated_profit } = req.body;

    const transaction = db.transaction(() => {
      // Update maleta totals
      db.prepare(`
        UPDATE maletas 
        SET seller_id = ?, total_bruto = ?, commission_value = ?, estimated_profit = ?
        WHERE id = ?
      `).run(seller_id, total_bruto, commission_value, estimated_profit, id);

      // Refresh items (delete and re-insert for simplicity/replacement)
      db.prepare("DELETE FROM items WHERE maleta_id = ?").run(id);
      const insertItem = db.prepare("INSERT INTO items (maleta_id, description, price) VALUES (?, ?, ?)");
      for (const item of items) {
        insertItem.run(id, item.description, item.price);
      }
    });

    transaction();
    res.json({ success: true });
  });

  app.post("/api/maletas", (req, res) => {
    const { seller_id, photo_url, items, total_bruto, commission_value, estimated_profit } = req.body;
    
    const delivery_date = new Date().toISOString();
    const return_date = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(); // 60 days

    const transaction = db.transaction(() => {
      const info = db.prepare(`
        INSERT INTO maletas (seller_id, status, photo_url, total_bruto, commission_value, estimated_profit, delivery_date, return_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(seller_id, 'Em Campo', photo_url, total_bruto, commission_value, estimated_profit, delivery_date, return_date);

      const maletaId = info.lastInsertRowid;

      const insertItem = db.prepare("INSERT INTO items (maleta_id, description, price) VALUES (?, ?, ?)");
      for (const item of items) {
        insertItem.run(maletaId, item.description, item.price);
      }

      return maletaId;
    });

    const maletaId = transaction();
    res.json({ id: maletaId });
  });

  // Dashboard Stats
  app.get("/api/stats", (req, res) => {
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total_maletas,
        SUM(CASE WHEN status = 'Em Campo' THEN 1 ELSE 0 END) as maletas_em_campo,
        SUM(CASE WHEN status = 'Em Campo' THEN estimated_profit ELSE 0 END) as total_profit_estimated,
        SUM(CASE WHEN status = 'Em Campo' THEN total_bruto ELSE 0 END) as total_bruto
      FROM maletas
    `).get();
    
    const ranking = db.prepare(`
      SELECT s.name, SUM(m.total_bruto) as total_value
      FROM sellers s
      JOIN maletas m ON s.id = m.seller_id
      WHERE m.status = 'Em Campo'
      GROUP BY s.id
      ORDER BY total_value DESC
      LIMIT 5
    `).all();

    res.json({ ...stats, ranking });
  });

  // OCR with Gemini
  app.post("/api/ocr", async (req, res) => {
    const { image } = req.body; // base64
    
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: image.split(',')[1] || image
                }
              },
              {
                text: "Analise esta imagem de maleta de semijoias. Identifique os itens presentes e sugira uma descrição curta para cada um. Retorne um JSON com uma lista de objetos contendo 'description'. Se houver preços visíveis, inclua-os no campo 'price' (número), caso contrário deixe como null."
              }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    description: { type: Type.STRING },
                    price: { type: Type.NUMBER }
                  },
                  required: ["description"]
                }
              }
            }
          }
        }
      });

      res.json(JSON.parse(response.text));
    } catch (error) {
      console.error("OCR Error:", error);
      res.status(500).json({ error: "Falha ao processar imagem" });
    }
  });

  // 404 for API routes
  app.use("/api/*", (req, res) => {
    res.status(404).json({ error: "API route not found" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
