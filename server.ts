import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Firebase Setup
const firebaseConfig = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'firebase-applet-config.json'), 'utf8'));
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

const DATA_FILE = path.join(process.cwd(), "keys_data.json");

// Default Emotes
const getFallbackAllEmotes = () => {
  try {
    const defaultData = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data', 'default_emotes.json'), 'utf8'));
    return defaultData.emotes || [];
  } catch (e) {
    return [["100 Level","909042007"],["Rose","909000010"]].map(e => ({ name: e[0], id: e[1] }));
  }
};

const defaultEmotes = {
  evo: [["P90","909049010"],["M60","909051003"],["MP5","909033002"],["Groza","909041005"],["Thompson","909038010"]].map(e => ({ name: e[0], id: e[1] })),
  all: getFallbackAllEmotes(),
  rear: [["LOL", "909000002"],["Rose", "909000010"],["Aura Boat","909050028"],["Flying Guns","909049012"]].map(e => ({ name: e[0], id: e[1] }))
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '5mb' }));

  const readData = async () => {
    try {
      const docRef = doc(db, "app", "data");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (!data.keys) data.keys = {};
        if (!data.emotes || !data.emotes.all) {
           data.emotes = defaultEmotes;
           await setDoc(docRef, data);
        }
        return data;
      } else {
        // Seed from local if possible, or defaults
        let initialData = { keys: {}, emotes: defaultEmotes, settings: {} };
        try {
          if (fs.existsSync(DATA_FILE)) {
             initialData = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
          }
        } catch(e) {}
        await setDoc(docRef, initialData);
        return initialData;
      }
    } catch (e) {
      console.error(e);
      return { keys: {}, emotes: defaultEmotes, settings: {} };
    }
  };

  const writeData = async (data: any) => {
    await setDoc(doc(db, "app", "data"), data);
  };

  // Serve emotes from Firestore
  app.get("/emotes/:filename", async (req, res, next) => {
    try {
      const match = req.params.filename.match(/([^.]+)\.png$/);
      if (!match) return next();
      const id = match[1];
      const docRef = doc(db, "images", id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists() && docSnap.data().base64) {
        const imgBuffer = Buffer.from(docSnap.data().base64, 'base64');
        res.writeHead(200, {
          'Content-Type': 'image/png',
          'Content-Length': imgBuffer.length
        });
        return res.end(imgBuffer);
      }
    } catch(e) {
      console.error(e);
    }
    next(); // Fallback to public/emotes handled by Vite
  });

  // --- PUBLIC API ---

  app.get("/api/emotes", async (req, res) => {
    try {
      const data = await readData();
      res.json({ success: true, emotes: data.emotes, settings: data.settings || {} });
    } catch(e) {
      res.json({ success: false });
    }
  });

  app.post("/api/verify-key", async (req, res) => {
    const { key, deviceId } = req.body;
    if (!key || !deviceId) return res.status(400).json({ success: false, message: "Required data missing" });

    const data = await readData();
    const keyData = data.keys[key];

    if (!keyData) return res.status(404).json({ success: false, message: "Invalid Security Key!" });
    
    if (keyData.expiresAt && Date.now() > keyData.expiresAt) {
      return res.status(403).json({ success: false, message: "Key has expired!" });
    }

    if (keyData.boundDeviceId && keyData.boundDeviceId !== deviceId) {
      return res.status(403).json({ success: false, message: "This key is bound to another device!" });
    }

    if (!keyData.boundDeviceId) {
      keyData.boundDeviceId = deviceId;
      await writeData(data);
    }

    return res.json({ success: true, message: "Verified", token: Buffer.from(`${key}:${deviceId}`).toString('base64') });
  });

  app.post("/api/check-session", async (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(401).json({ success: false });

    try {
      const decoded = Buffer.from(token, 'base64').toString('ascii');
      const [key, deviceId] = decoded.split(':');
      const data = await readData();
      const keyData = data.keys[key];
      
      if (keyData && keyData.boundDeviceId === deviceId) {
        if (keyData.expiresAt && Date.now() > keyData.expiresAt) return res.json({ success: false });
        return res.json({ success: true });
      }
    } catch (e) {}
    return res.status(401).json({ success: false });
  });

  // --- ADMIN API ---
  const checkAdmin = (req: any, res: any, next: any) => {
    const adminKey = req.headers['x-admin-key'];
    if (adminKey !== "Ankit,ankush.1490") return res.status(403).json({ success: false, message: "Unauthorized" });
    next();
  };

  app.post("/api/admin/settings", checkAdmin, async (req, res) => {
    try {
      const data = await readData();
      data.settings = { ...data.settings, ...req.body };
      await writeData(data);
      res.json({ success: true, settings: data.settings });
    } catch(e) {
      res.json({ success: false, error: String(e) });
    }
  });

  app.get("/api/admin/keys", checkAdmin, async (req, res) => {
    res.json({ success: true, keys: (await readData()).keys });
  });

  app.post("/api/admin/keys", checkAdmin, async (req, res) => {
    const { keyName, days } = req.body;
    if (!keyName) return res.status(400).json({ success: false });
    
    const data = await readData();
    let expiresAt = null;
    if (days && days > 0) {
      expiresAt = Date.now() + (days * 24 * 60 * 60 * 1000);
    }
    
    data.keys[keyName] = { boundDeviceId: null, expiresAt };
    await writeData(data);
    res.json({ success: true, keys: data.keys });
  });

  app.delete("/api/admin/keys/:key", checkAdmin, async (req, res) => {
    const data = await readData();
    delete data.keys[req.params.key];
    await writeData(data);
    res.json({ success: true, keys: data.keys });
  });

  app.post("/api/admin/emotes/add", checkAdmin, async (req, res) => {
    const { id, name, slot, image } = req.body;
    if (!id || !name || !slot) return res.status(400).json({ success: false });
    
    if (image) {
      try {
        const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
        await setDoc(doc(db, "images", id), { base64: base64Data }); // Save to Firestore
      } catch (err) {
        console.error("Failed to save image to Firestore:", err);
      }
    }

    const data = await readData();
    if (!data.emotes[slot]) data.emotes[slot] = [];
    
    if (!data.emotes[slot].find((e: any) => e.id === id)) {
      data.emotes[slot].push({ id, name });
      await writeData(data);
    }
    res.json({ success: true, emotes: data.emotes });
  });

  app.post("/api/admin/emotes/move", checkAdmin, async (req, res) => {
    const { id, fromSlot, toSlot } = req.body;
    const data = await readData();
    
    if (data.emotes[fromSlot]) {
      const emoteIndex = data.emotes[fromSlot].findIndex((e: any) => e.id === id);
      if (emoteIndex > -1) {
        const emote = data.emotes[fromSlot].splice(emoteIndex, 1)[0];
        if (!data.emotes[toSlot]) data.emotes[toSlot] = [];
        data.emotes[toSlot].push(emote);
        await writeData(data);
      }
    }
    res.json({ success: true, emotes: data.emotes });
  });

  app.post("/api/admin/emotes/edit", checkAdmin, async (req, res) => {
    const { slot, oldId, newId, newName, image } = req.body;
    const data = await readData();
    if (data.emotes[slot]) {
      const emote = data.emotes[slot].find((e: any) => e.id === oldId);
      if (emote) {
        emote.id = newId;
        emote.name = newName;
        
        if (image) {
          try {
            const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
            await setDoc(doc(db, "images", newId), { base64: base64Data });
            
            if (oldId !== newId) {
              await deleteDoc(doc(db, "images", oldId));
            }
          } catch (err) { }
        } else if (oldId !== newId) {
           try {
             // Rename existing image in Firestore
             const oldImageSnap = await getDoc(doc(db, "images", oldId));
             if (oldImageSnap.exists() && oldImageSnap.data().base64) {
                await setDoc(doc(db, "images", newId), { base64: oldImageSnap.data().base64 });
                await deleteDoc(doc(db, "images", oldId));
             }
           } catch(err) {}
        }

        await writeData(data);
      }
    }
    res.json({ success: true, emotes: data.emotes });
  });

  app.post("/api/admin/emotes/copy", checkAdmin, async (req, res) => {
    const { id, name, toSlot } = req.body;
    const data = await readData();
    if (!data.emotes[toSlot]) data.emotes[toSlot] = [];
    if (!data.emotes[toSlot].find((e: any) => e.id === id)) {
      data.emotes[toSlot].push({ id, name });
      await writeData(data);
    }
    res.json({ success: true, emotes: data.emotes });
  });

  app.delete("/api/admin/emotes/:slot/:id", checkAdmin, async (req, res) => {
    const { slot, id } = req.params;
    const data = await readData();
    if (data.emotes[slot]) {
      data.emotes[slot] = data.emotes[slot].filter((e: any) => e.id !== id);
      await writeData(data);
    }
    // Also delete associated image if no longer used
    let isUsed = false;
    Object.values(data.emotes).forEach((s: any) => {
       if (s.find((e: any) => e.id === id)) isUsed = true;
    });
    if (!isUsed) {
       await deleteDoc(doc(db, "images", id)).catch(()=>{});
    }
    
    res.json({ success: true, emotes: data.emotes });
  });

  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => res.sendFile(path.join(distPath, "index.html")));
  }

  app.listen(PORT, "0.0.0.0", () => console.log(`Server running on port ${PORT}`));
}

startServer();
