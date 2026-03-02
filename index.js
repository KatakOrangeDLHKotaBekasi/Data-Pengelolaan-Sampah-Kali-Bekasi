const express = require("express");
const cors = require("cors");
const path = require("path");
const crypto = require("crypto");
const https = require("https");
const http = require("http");

require("dotenv").config();

// ==================== CRASH PROTECTION ====================
// Prevent server from crashing on unhandled errors
process.on("uncaughtException", (err) => {
  console.error("⚠️  Uncaught Exception (server kept alive):", err.message);
});
process.on("unhandledRejection", (reason) => {
  console.error("⚠️  Unhandled Promise Rejection (server kept alive):", reason);
});

const app = express();
const PORT = process.env.PORT || 3001;

// ==================== CONFIG ====================
const SPREADSHEET_ID = "1SQlPtS8enwmfqnGKixrRvjBVN63cSFFTh06Q7oXPbT8";
const CSV_EXPORT_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=0`;

// ==================== MIDDLEWARE ====================
app.use(cors());
app.use(express.json());
// Serve static files from the same directory (for Railway deployment)
app.use(express.static(__dirname + "/public"));

// ==================== AUTH ====================
const USERS = {
  admin: {
    password: "admin2026",
    role: "admin",
    name: "Administrator DLH Kota Bekasi",
  },
  jambuxbewok: {
    password: "katak2018",
    role: "member",
    name: "Anggota Pasukan Katak Orange",
  },
};

const sessions = new Map();

// Login
app.post("/api/auth/login", (req, res) => {
  try {
    const { username, password } = req.body;
    const user = USERS[username];
    if (user && user.password === password) {
      const token = crypto.randomBytes(32).toString("hex");
      sessions.set(token, {
        username,
        role: user.role,
        name: user.name,
        loginAt: Date.now(),
      });
      return res.json({
        success: true,
        token,
        role: user.role,
        name: user.name,
      });
    }
    return res
      .status(401)
      .json({ success: false, message: "Username atau password salah" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Verify token
app.get("/api/auth/verify", (req, res) => {
  const token = (req.headers.authorization || "").replace("Bearer ", "");
  const session = sessions.get(token);
  if (session) {
    return res.json({ success: true, role: session.role, name: session.name });
  }
  return res.status(401).json({ success: false, message: "Token tidak valid" });
});

// Logout
app.post("/api/auth/logout", (req, res) => {
  const token = (req.headers.authorization || "").replace("Bearer ", "");
  sessions.delete(token);
  res.json({ success: true });
});

// Auth middleware
function requireAuth(req, res, next) {
  const token = (req.headers.authorization || "").replace("Bearer ", "");
  const session = sessions.get(token);
  if (!session)
    return res
      .status(401)
      .json({ success: false, message: "Silakan login terlebih dahulu" });
  req.user = session;
  next();
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== "admin")
      return res
        .status(403)
        .json({ success: false, message: "Akses admin diperlukan" });
    next();
  });
}

// ==================== GOOGLE SHEETS DATA ====================
// Instagram API Token
const INSTAGRAM_TOKEN = process.env.INSTAGRAM_TOKEN;
// Instagram feed cache (refresh every 15 minutes for near real-time updates)
let igCache = null;
let igLastFetch = 0;
const IG_CACHE_TTL = 15 * 60 * 1000; // 15 minutes — auto-updates when new posts appear

// Instagram feed endpoint — returns up to 9 posts, prioritizing the last 7 days
app.get("/api/instagram/feed", async (req, res) => {
  if (!INSTAGRAM_TOKEN) {
    return res.json({
      success: false,
      message: "Instagram token not configured.",
    });
  }

  // Return cached data if still fresh
  const now = Date.now();
  if (igCache && now - igLastFetch < IG_CACHE_TTL) {
    return res.json({ success: true, data: igCache, cached: true });
  }

  try {
    const igUrl = `https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp&limit=25&access_token=${INSTAGRAM_TOKEN}`;
    const igData = await fetchUrl(igUrl);
    const parsed = JSON.parse(igData);

    if (parsed.error) {
      console.error("Instagram API error:", parsed.error.message);
      return res.json({ success: false, message: parsed.error.message });
    }

    // Filter posts from the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const allPosts = parsed.data || [];
    const recentPosts = allPosts.filter((post) => {
      const postDate = new Date(post.timestamp);
      return postDate >= sevenDaysAgo;
    });

    // Build final list: prioritize last 7 days, fill up to 9 with older posts
    let finalPosts;
    if (recentPosts.length >= 9) {
      finalPosts = recentPosts.slice(0, 9);
    } else {
      // Take all recent posts, then fill remaining slots with older posts
      const olderPosts = allPosts.filter((post) => {
        const postDate = new Date(post.timestamp);
        return postDate < sevenDaysAgo;
      });
      finalPosts = [...recentPosts, ...olderPosts].slice(0, 9);
    }

    // Cache the result
    igCache = finalPosts;
    igLastFetch = now;

    console.log(
      `📸 Instagram: ${allPosts.length} total, ${recentPosts.length} in last 7 days, returning ${finalPosts.length} (max 9)`,
    );
    res.json({
      success: true,
      data: finalPosts,
      total: allPosts.length,
      recent: recentPosts.length,
    });
  } catch (err) {
    console.error("Instagram API error:", err.message);
    // Return cached data if available on error
    if (igCache) {
      return res.json({
        success: true,
        data: igCache,
        cached: true,
        stale: true,
      });
    }
    res.json({ success: false, message: err.message });
  }
});

// Simple HTTPS fetch with redirect support
function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith("https") ? https : http;
    protocol
      .get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
        if (
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          return fetchUrl(res.headers.location).then(resolve).catch(reject);
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode}`));
        }
        let data = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve(data));
        res.on("error", reject);
      })
      .on("error", reject);
  });
}

// Parse CSV properly (handles quoted fields with commas)
function parseCSV(text) {
  const rows = [];
  let currentRow = [];
  let currentField = "";
  let inQuote = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuote) {
      if (ch === '"' && next === '"') {
        currentField += '"';
        i++;
      } else if (ch === '"') {
        inQuote = false;
      } else {
        currentField += ch;
      }
    } else {
      if (ch === '"') {
        inQuote = true;
      } else if (ch === ",") {
        currentRow.push(currentField.trim());
        currentField = "";
      } else if (ch === "\n" || (ch === "\r" && next === "\n")) {
        currentRow.push(currentField.trim());
        if (currentRow.some((f) => f !== "")) rows.push(currentRow);
        currentRow = [];
        currentField = "";
        if (ch === "\r") i++;
      } else {
        currentField += ch;
      }
    }
  }

  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((f) => f !== "")) rows.push(currentRow);
  }

  return rows;
}

// Parse Indonesian number format (comma = decimal)
function parseNumber(str) {
  if (!str || str === "") return 0;
  return parseFloat(str.replace(/\./g, "").replace(",", ".")) || 0;
}

// Data cache (refresh every 5 minutes)
let dataCache = null;
let lastFetch = 0;
const CACHE_TTL = 5 * 60 * 1000;

async function getSheetData() {
  const now = Date.now();
  if (dataCache && now - lastFetch < CACHE_TTL) {
    return dataCache;
  }

  try {
    const csvText = await fetchUrl(CSV_EXPORT_URL);
    const rows = parseCSV(csvText);

    if (rows.length < 2) {
      throw new Error("No data in spreadsheet");
    }

    // First row is headers: Tgl, Bulan, Kategori Sampah, Item Sampah, Berat, Rata Perhari, Total Berat, ...
    const data = rows
      .slice(1)
      .map((row, idx) => ({
        id: idx + 1,
        tgl: row[0] || "",
        bulan: row[1] || "",
        kategori_sampah: row[2] || "",
        item_sampah: row[3] || "",
        berat: parseNumber(row[4]),
        rata_perhari: parseNumber(row[5]),
        total_berat: parseNumber(row[6]),
      }))
      .filter((r) => r.tgl !== "");

    dataCache = data;
    lastFetch = now;
    console.log(`✅ Fetched ${data.length} records from Google Sheets`);
    return data;
  } catch (error) {
    console.error("⚠️  Error fetching from Google Sheets:", error.message);
    if (dataCache) return dataCache;
    return getMockData();
  }
}

// ==================== API ENDPOINTS ====================

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "Pasukan Katak Orange API Server",
    timestamp: new Date().toISOString(),
  });
});

// Extract year from dd/mm/yyyy format
function extractYear(tgl) {
  if (!tgl) return "";
  const parts = tgl.split("/");
  return parts.length >= 3 ? parts[2] : "";
}

// Shared filter helper
function applyFilters(data, query) {
  let filtered = [...data];
  const { bulan, kategori, tahun, tgl } = query;

  if (bulan)
    filtered = filtered.filter(
      (r) => r.bulan.toLowerCase() === bulan.toLowerCase(),
    );
  if (kategori)
    filtered = filtered.filter((r) =>
      r.kategori_sampah.toLowerCase().includes(kategori.toLowerCase()),
    );
  if (tahun)
    filtered = filtered.filter((r) => extractYear(r.tgl) === String(tahun));
  if (tgl) filtered = filtered.filter((r) => r.tgl === tgl);

  return filtered;
}

// Get all reports (public)
app.get("/api/reports", async (req, res) => {
  try {
    const data = await getSheetData();
    const filtered = applyFilters(data, req.query);
    res.json({ success: true, data: filtered, total: filtered.length });
  } catch (error) {
    console.error("Error:", error);
    res.json({ success: true, data: getMockData(), source: "fallback" });
  }
});

// Get statistics (public) — supports same filters as /api/reports
app.get("/api/statistics", async (req, res) => {
  try {
    const allData = await getSheetData();
    const data = applyFilters(allData, req.query);

    // Total berat per entry (using total_berat column which is per-day total)
    const totalBeratEntries = data.filter((r) => r.total_berat > 0);
    const grandTotalBerat = totalBeratEntries.reduce(
      (sum, r) => sum + r.total_berat,
      0,
    );

    // Total individual berat
    const totalBerat = data.reduce((sum, r) => sum + r.berat, 0);

    // Rata-rata berat per entry
    const rataRataBerat = data.length > 0 ? totalBerat / data.length : 0;

    // Rata-rata berat per hari (total / unique collection days)
    const uniqueDatesForAvg = [...new Set(data.map((r) => r.tgl))];
    const rataRataPerHari =
      uniqueDatesForAvg.length > 0 ? totalBerat / uniqueDatesForAvg.length : 0;

    // Count by category
    const byCategory = {};
    data.forEach((r) => {
      const cat = r.kategori_sampah || "Lainnya";
      byCategory[cat] = (byCategory[cat] || 0) + r.berat;
    });

    // Count by item
    const byItem = {};
    data.forEach((r) => {
      const item = r.item_sampah || "Lainnya";
      byItem[item] = (byItem[item] || 0) + r.berat;
    });

    // Count by month (normalize capitalization: "april" → "April")
    const byMonth = {};
    data.forEach((r) => {
      let month = r.bulan || "Unknown";
      // Capitalize first letter for consistency
      if (month && month !== "Unknown") {
        month = month.charAt(0).toUpperCase() + month.slice(1).toLowerCase();
      }
      byMonth[month] = (byMonth[month] || 0) + r.berat;
    });

    // Unique dates
    const uniqueDates = [...new Set(data.map((r) => r.tgl))];

    // By year (filter out invalid years like '0204', 'Unknown')
    const byYear = {};
    data.forEach((r) => {
      const parts = r.tgl.split("/");
      const year = parts[2] || "";
      // Only include valid 4-digit years (2000-2099)
      if (/^20\d{2}$/.test(year)) {
        byYear[year] = (byYear[year] || 0) + r.berat;
      }
    });

    res.json({
      success: true,
      data: {
        total_berat: Math.round(totalBerat * 100) / 100,
        rata_rata_berat: Math.round(rataRataBerat * 100) / 100,
        rata_rata_perhari: Math.round(rataRataPerHari * 100) / 100,
        grand_total_berat: Math.round(grandTotalBerat * 100) / 100,
        total_entries: data.length,
        total_collection_days: uniqueDates.length,
        by_category: byCategory,
        by_item: byItem,
        by_month: byMonth,
        by_year: byYear,
        active_since: "2018",
        team_members: 45,
      },
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Submit new report (requires auth)
app.post("/api/reports", requireAuth, async (req, res) => {
  try {
    const {
      tgl,
      bulan,
      kategori_sampah,
      item_sampah,
      berat,
      rata_perhari,
      total_berat,
    } = req.body;

    if (!tgl || !kategori_sampah || !berat) {
      return res.status(400).json({
        success: false,
        message: "Field wajib: tgl, kategori_sampah, berat",
      });
    }

    // Try Google Sheets API (requires service account credentials)
    let sheetsSuccess = false;
    try {
      const { google } = require("googleapis");
      const auth = new google.auth.GoogleAuth({
        credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS),
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
      });
      const sheets = google.sheets({ version: "v4", auth });

      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: "'Pengumpulan Sampai Sungai'!A:G",
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [
            [
              tgl,
              bulan || "",
              kategori_sampah,
              item_sampah || "",
              String(berat).replace(".", ","),
              rata_perhari ? String(rata_perhari).replace(".", ",") : "",
              total_berat ? String(total_berat).replace(".", ",") : "",
            ],
          ],
        },
      });
      sheetsSuccess = true;
    } catch (sheetsError) {
      console.log(
        "⚠️  Google Sheets write not available (credentials needed):",
        sheetsError.message,
      );
    }

    // Invalidate cache so next read gets fresh data
    dataCache = null;
    lastFetch = 0;

    res.json({
      success: true,
      message: sheetsSuccess
        ? "Data berhasil ditambahkan ke Google Sheets!"
        : "Data diterima! (Tambahkan credentials.json untuk sync ke Google Sheets)",
      synced_to_sheets: sheetsSuccess,
      submitted_by: req.user.name,
    });
  } catch (error) {
    console.error("Error submitting report:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Batch submit multiple items at once (requires auth)
app.post("/api/reports/batch", requireAuth, async (req, res) => {
  try {
    const { tgl, bulan, items } = req.body;
    // items: [{ kategori_sampah, item_sampah, berat }]

    if (!tgl || !items || !items.length) {
      return res.status(400).json({
        success: false,
        message:
          "Field wajib: tgl, items (array of {kategori_sampah, item_sampah, berat})",
      });
    }

    // Calculate total berat and rata-rata per hari
    const totalBerat = items.reduce(
      (sum, it) => sum + (parseFloat(it.berat) || 0),
      0,
    );
    const rataPerhari = items.length > 0 ? totalBerat / items.length : 0;

    let sheetsSuccess = false;
    try {
      const { google } = require("googleapis");
      const auth = new google.auth.GoogleAuth({
        credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS),
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
      });
      const sheets = google.sheets({ version: "v4", auth });

      // Build rows: each item gets its own row
      // Only the first item row gets rata_perhari and total_berat
      const rows = items.map((item, idx) => [
        tgl,
        bulan || "",
        item.kategori_sampah || "",
        item.item_sampah || "",
        String(item.berat || 0).replace(".", ","),
        idx === 0
          ? String(Math.round(rataPerhari * 100) / 100).replace(".", ",")
          : "",
        idx === 0
          ? String(Math.round(totalBerat * 100) / 100).replace(".", ",")
          : "",
      ]);

      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: "'Pengumpulan Sampai Sungai'!A:G",
        valueInputOption: "USER_ENTERED",
        requestBody: { values: rows },
      });
      sheetsSuccess = true;
    } catch (sheetsError) {
      console.log(
        "⚠️  Google Sheets write not available:",
        sheetsError.message,
      );
    }

    // Invalidate cache
    dataCache = null;
    lastFetch = 0;

    res.json({
      success: true,
      message: sheetsSuccess
        ? `${items.length} item berhasil ditambahkan ke Google Sheets!`
        : `${items.length} item diterima! (credentials.json untuk sync ke Google Sheets)`,
      synced_to_sheets: sheetsSuccess,
      submitted_by: req.user.name,
      total_berat: Math.round(totalBerat * 100) / 100,
      rata_perhari: Math.round(rataPerhari * 100) / 100,
      items_count: items.length,
    });
  } catch (error) {
    console.error("Error batch submitting:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Admin: Get all data with full stats
app.get("/api/admin/data", requireAdmin, async (req, res) => {
  try {
    const data = await getSheetData();
    res.json({ success: true, data, total: data.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Admin: Refresh cache
app.post("/api/admin/refresh", requireAdmin, (req, res) => {
  dataCache = null;
  lastFetch = 0;
  res.json({
    success: true,
    message: "Cache cleared. Data will refresh on next request.",
  });
});

// ==================== MOCK DATA ====================
function getMockData() {
  return [
    {
      id: 1,
      tgl: "30/04/2021",
      bulan: "April",
      kategori_sampah: "Organic",
      item_sampah: "Organic",
      berat: 2.0,
      rata_perhari: 2.6,
      total_berat: 10.1,
    },
    {
      id: 2,
      tgl: "30/04/2021",
      bulan: "April",
      kategori_sampah: "Non - Organic",
      item_sampah: "Gelas Plastik (Plastic Cup)",
      berat: 2.0,
      rata_perhari: 0,
      total_berat: 0,
    },
    {
      id: 3,
      tgl: "30/04/2021",
      bulan: "April",
      kategori_sampah: "Non - Organic",
      item_sampah: "Plastik Lainnya (Others Plastic)",
      berat: 2.0,
      rata_perhari: 0,
      total_berat: 0,
    },
    {
      id: 4,
      tgl: "25/06/2021",
      bulan: "Juni",
      kategori_sampah: "Non - Organic",
      item_sampah: "Botol Plastik (Plastic Bottle)",
      berat: 4.0,
      rata_perhari: 2.0,
      total_berat: 17.0,
    },
    {
      id: 5,
      tgl: "23/08/2021",
      bulan: "Agustus",
      kategori_sampah: "Non - Organic",
      item_sampah: "Botol Plastik (Plastic Bottle)",
      berat: 5.0,
      rata_perhari: 2.8,
      total_berat: 13.0,
    },
    {
      id: 6,
      tgl: "10/09/2021",
      bulan: "September",
      kategori_sampah: "Non - Organic",
      item_sampah: "Gelas Plastik (Plastic Cup)",
      berat: 7.0,
      rata_perhari: 5.0,
      total_berat: 12.0,
    },
    {
      id: 7,
      tgl: "15/09/2021",
      bulan: "September",
      kategori_sampah: "Non - Organic",
      item_sampah: "Botol Plastik (Plastic Bottle)",
      berat: 3.0,
      rata_perhari: 4.5,
      total_berat: 41.0,
    },
    {
      id: 8,
      tgl: "01/10/2021",
      bulan: "Oktober",
      kategori_sampah: "Non - Organic",
      item_sampah: "Botol Plastik (Plastic Bottle)",
      berat: 7.0,
      rata_perhari: 5.0,
      total_berat: 61.0,
    },
    {
      id: 9,
      tgl: "15/10/2021",
      bulan: "Oktober",
      kategori_sampah: "Non - Organic",
      item_sampah: "Botol Plastik (Plastic Bottle)",
      berat: 8.0,
      rata_perhari: 5.8,
      total_berat: 44.7,
    },
    {
      id: 10,
      tgl: "01/11/2021",
      bulan: "November",
      kategori_sampah: "Residu",
      item_sampah: "Residu (Residue)",
      berat: 3.0,
      rata_perhari: 3.0,
      total_berat: 15.0,
    },
  ];
}

// ==================== CATCH-ALL ====================
app.get("*", (req, res) => {
  if (req.path.startsWith("/api")) {
    return res
      .status(404)
      .json({ success: false, message: "API endpoint not found" });
  }
  res.sendFile(path.join(__dirname, "index.html"));
});

// ==================== START ====================
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║   🐸 PASUKAN KATAK ORANGE - API SERVER                  ║
║   Dinas Lingkungan Hidup Kota Bekasi                     ║
║                                                          ║
║   Server: http://localhost:${PORT}                        ║
║   API:    http://localhost:${PORT}/api/health              ║
║                                                          ║
║   Login Admin:   admin / admin2026                        ║
║   Login Anggota: jambuxbewok / katak2018                  ║
║                                                          ║
║   Spreadsheet: ${SPREADSHEET_ID}                         ║
╚══════════════════════════════════════════════════════════╝
  `);
});
