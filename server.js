const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// JSON file as database (easy to inspect, zero config)
const DB_PATH = path.join(__dirname, 'database.json');

function loadDB() {
  if (!fs.existsSync(DB_PATH)) {
    const seed = {
      deals: [
        { id: uuidv4(), store: "Anwar General Store", product: "Super Kernel Basmati Rice 5kg", category: "grocery", oldPrice: 2800, newPrice: 2200, city: "karachi", location: "Saddar", phone: "03001234567", expiry: "2026-08-20", postedBy: "demo", createdAt: new Date().toISOString() },
        { id: uuidv4(), store: "Biryani House", product: "Chicken Biryani (Full plate)", category: "food", oldPrice: 450, newPrice: 350, city: "lahore", location: "Anarkali", phone: "03011234567", expiry: "2026-08-18", postedBy: "demo", createdAt: new Date().toISOString() },
        { id: uuidv4(), store: "Gul Ahmed Outlet", product: "Lawn Suit (Unstitched 3pc)", category: "textile", oldPrice: 5500, newPrice: 3800, city: "karachi", location: "Tariq Road", phone: "03021234567", expiry: "2026-08-25", postedBy: "demo", createdAt: new Date().toISOString() },
        { id: uuidv4(), store: "Sabzi Mandi", product: "Fresh Aloo (5kg bag)", category: "grocery", oldPrice: 400, newPrice: 280, city: "rawalpindi", location: "Raja Bazaar", phone: "03031234567", expiry: "2026-08-15", postedBy: "demo", createdAt: new Date().toISOString() },
        { id: uuidv4(), store: "Pizza Max", product: "Large Fajita Pizza", category: "food", oldPrice: 1200, newPrice: 899, city: "karachi", location: "Clifton", phone: "03041234567", expiry: "2026-08-19", postedBy: "demo", createdAt: new Date().toISOString() },
        { id: uuidv4(), store: "Khaadi", product: "Kurta Shalwar (Cotton)", category: "textile", oldPrice: 3500, newPrice: 2499, city: "lahore", location: "Liberty Market", phone: "03051234567", expiry: "2026-08-30", postedBy: "demo", createdAt: new Date().toISOString() },
        { id: uuidv4(), store: "Daily Fresh Bakery", product: "Fresh Naan (per dozen)", category: "food", oldPrice: 180, newPrice: 120, city: "faisalabad", location: "D Ground", phone: "03061234567", expiry: "2026-08-17", postedBy: "demo", createdAt: new Date().toISOString() },
        { id: uuidv4(), store: "Mobile World", product: "Infinix Hot 40 (6GB/128GB)", category: "mobile", oldPrice: 42000, newPrice: 38500, city: "islamabad", location: "Blue Area", phone: "03071234567", expiry: "2026-08-22", postedBy: "demo", createdAt: new Date().toISOString() },
        { id: uuidv4(), store: "Electronic Palace", product: "Haier 1.5 Ton Inverter AC", category: "electronics", oldPrice: 125000, newPrice: 98000, city: "lahore", location: "Hall Road", phone: "03081234567", expiry: "2026-09-05", postedBy: "demo", createdAt: new Date().toISOString() },
        { id: uuidv4(), store: "Shan Grocery", product: "Cooking Oil 5L (Dalda)", category: "grocery", oldPrice: 3200, newPrice: 2750, city: "karachi", location: "Gulshan", phone: "03091234567", expiry: "2026-08-21", postedBy: "demo", createdAt: new Date().toISOString() }
      ],
      stores: []
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(seed, null, 2));
    return seed;
  }
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

function saveDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// ===== API ROUTES =====

// Get all deals (with optional filters)
app.get('/api/deals', (req, res) => {
  const db = loadDB();
  let { city, category, search } = req.query;
  let deals = db.deals;

  if (city && city !== 'all') deals = deals.filter(d => d.city === city);
  if (category && category !== 'all') deals = deals.filter(d => d.category === category);
  if (search) {
    const s = search.toLowerCase();
    deals = deals.filter(d => d.product.toLowerCase().includes(s) || d.store.toLowerCase().includes(s) || d.location.toLowerCase().includes(s));
  }
  // Sort by newest first
  deals.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ success: true, count: deals.length, deals });
});

// Get single deal
app.get('/api/deals/:id', (req, res) => {
  const db = loadDB();
  const deal = db.deals.find(d => d.id === req.params.id);
  if (!deal) return res.status(404).json({ success: false, message: 'Deal not found' });
  res.json({ success: true, deal });
});

// Create new deal
app.post('/api/deals', (req, res) => {
  const db = loadDB();
  const { store, product, category, oldPrice, newPrice, city, location, phone, expiry } = req.body;
  
  if (!store || !product || !oldPrice || !newPrice || !city || !location || !phone || !expiry) {
    return res.status(400).json({ success: false, message: 'All fields are required' });
  }

  const deal = {
    id: uuidv4(),
    store, product, category, oldPrice: Number(oldPrice), newPrice: Number(newPrice),
    city, location, phone, expiry,
    postedBy: 'business',
    createdAt: new Date().toISOString()
  };

  db.deals.unshift(deal);
  saveDB(db);
  res.status(201).json({ success: true, deal });
});

// Delete deal
app.delete('/api/deals/:id', (req, res) => {
  const db = loadDB();
  const idx = db.deals.findIndex(d => d.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Deal not found' });
  db.deals.splice(idx, 1);
  saveDB(db);
  res.json({ success: true, message: 'Deal deleted' });
});

// Get stats for dashboard
app.get('/api/stats', (req, res) => {
  const db = loadDB();
  const deals = db.deals;
  const totalDeals = deals.length;
  const activeDeals = deals.filter(d => new Date(d.expiry) >= new Date()).length;
  const expiredDeals = totalDeals - activeDeals;
  const totalSavings = deals.reduce((sum, d) => sum + (d.oldPrice - d.newPrice), 0);
  
  const byCategory = {};
  deals.forEach(d => { byCategory[d.category] = (byCategory[d.category] || 0) + 1; });

  const byCity = {};
  deals.forEach(d => { byCity[d.city] = (byCity[d.city] || 0) + 1; });

  res.json({
    success: true,
    stats: { totalDeals, activeDeals, expiredDeals, totalSavings },
    byCategory,
    byCity
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'SastaPakistan API is running' });
});

app.listen(PORT, () => {
  console.log(`\n🚀 SastaPakistan Backend running on http://localhost:${PORT}`);
  console.log(`📊 API Endpoints:`);
  console.log(`   GET  http://localhost:${PORT}/api/deals`);
  console.log(`   POST http://localhost:${PORT}/api/deals`);
  console.log(`   GET  http://localhost:${PORT}/api/stats`);
  console.log(`   GET  http://localhost:${PORT}/api/health\n`);
});