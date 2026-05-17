const path = require("path");
const Database = require("better-sqlite3");

const dbUrl = process.env.DATABASE_URL ?? `file:${path.join(process.cwd(), "prisma", "knitting.db")}`;
const dbPath = dbUrl.replace(/^file:/, "");

const fs = require("fs");
const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = OFF");

db.exec(`
CREATE TABLE IF NOT EXISTS "Pattern" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "designer" TEXT,
    "source" TEXT,
    "sourceUrl" TEXT,
    "category" TEXT,
    "yarnWeight" TEXT,
    "difficulty" TEXT,
    "notes" TEXT,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'wishlist',
    "coverImage" TEXT,
    "patternFile" TEXT,
    "readerState" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS "Yarn" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "brand" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "colorway" TEXT,
    "colorCode" TEXT,
    "weight" TEXT,
    "fiber" TEXT,
    "yardage" INTEGER,
    "skeinCount" REAL,
    "yardagePerSkein" INTEGER,
    "color" TEXT,
    "notes" TEXT,
    "image" TEXT,
    "status" TEXT NOT NULL DEFAULT 'stash',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS "GaugeSwatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stitchesPer10" REAL NOT NULL,
    "rowsPer10" REAL,
    "needleSize" TEXT,
    "yarnBrand" TEXT,
    "yarnName" TEXT,
    "yarnWeight" TEXT,
    "notes" TEXT,
    "image" TEXT,
    "yarns" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS "Needle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "material" TEXT,
    "brand" TEXT,
    "length" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'owned',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "patternId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'planning',
    "startDate" DATETIME,
    "endDate" DATETIME,
    "needleSize" TEXT,
    "gauge" TEXT,
    "size" TEXT,
    "notes" TEXT,
    "coverImage" TEXT,
    "progress" INTEGER,
    "currentRow" INTEGER,
    "totalRows" INTEGER,
    "gaugeSwatchId" TEXT,
    "modifications" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    FOREIGN KEY ("patternId") REFERENCES "Pattern" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY ("gaugeSwatchId") REFERENCES "GaugeSwatch" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "KnittingSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "startTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" DATETIME,
    "duration" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "ProjectYarn" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "yarnId" TEXT NOT NULL,
    "amount" REAL,
    FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY ("yarnId") REFERENCES "Yarn" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "JournalEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "mood" TEXT,
    "projectId" TEXT,
    "images" TEXT,
    "tags" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
`);

db.pragma("foreign_keys = ON");
db.close();
console.log("Database initialized at", dbPath);
