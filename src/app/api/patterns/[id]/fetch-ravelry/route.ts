import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const YARN_WEIGHT_MAP: Record<string, string> = {
  "lace":        "Lace",
  "light fingering": "Lace",
  "fingering":   "Fingering",
  "sport":       "Sport",
  "dk":          "DK",
  "worsted":     "Worsted",
  "aran":        "Aran",
  "bulky":       "Bulky",
  "super bulky": "Super Bulky",
  "cobweb":      "Lace",
};

const CATEGORY_KEYWORDS: [string, string][] = [
  ["cardigan",  "Cardigan"],
  ["sweater",   "Sweater"],
  ["pullover",  "Sweater"],
  ["yoke",      "Sweater"],
  ["hat",       "Hat"],
  ["beanie",    "Hat"],
  ["toque",     "Hat"],
  ["sock",      "Socks"],
  ["stocking",  "Socks"],
  ["shawl",     "Shawl"],
  ["wrap",      "Shawl"],
  ["mitten",    "Mittens"],
  ["glove",     "Mittens"],
  ["cowl",      "Cowl"],
  ["blanket",   "Blanket"],
  ["afghan",    "Blanket"],
  ["throw",     "Blanket"],
];

function mapWeight(ravelryWeight: string | null | undefined): string | null {
  if (!ravelryWeight) return null;
  return YARN_WEIGHT_MAP[ravelryWeight.toLowerCase()] ?? null;
}

function mapCategory(categories: string[]): string | null {
  const joined = categories.join(" ").toLowerCase();
  for (const [kw, cat] of CATEGORY_KEYWORDS) {
    if (joined.includes(kw)) return cat;
  }
  return "Accessory";
}

function mapDifficulty(avg: number | null | undefined): string | null {
  if (!avg) return null;
  if (avg <= 2)  return "Beginner";
  if (avg <= 4)  return "Easy";
  if (avg <= 6)  return "Intermediate";
  if (avg <= 8)  return "Advanced";
  return "Expert";
}

function ravelryAuth() {
  const key   = process.env.RAVELRY_ACCESS_KEY;
  const token = process.env.RAVELRY_PERSONAL_TOKEN;
  if (!key || !token || key === "your_access_key_here") return null;
  return "Basic " + Buffer.from(`${key}:${token}`).toString("base64");
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const auth = ravelryAuth();
  if (!auth) {
    return NextResponse.json({ error: "Ravelry API credentials not configured" }, { status: 400 });
  }

  const pattern = await prisma.pattern.findUnique({ where: { id } });
  if (!pattern) return NextResponse.json({ error: "Pattern not found" }, { status: 404 });

  // Extract permalink from URL like https://www.ravelry.com/patterns/library/noomi-tee
  const url = pattern.sourceUrl ?? "";
  const match = url.match(/\/patterns\/library\/([^/?#]+)/);
  if (!match) {
    return NextResponse.json({ error: "No Ravelry URL found on this pattern" }, { status: 400 });
  }
  const permalink = match[1];

  // Search for the pattern by permalink
  const searchRes = await fetch(
    `https://api.ravelry.com/patterns/search.json?query=${encodeURIComponent(permalink)}&page_size=3`,
    { headers: { Authorization: auth } }
  );
  if (!searchRes.ok) {
    return NextResponse.json({ error: "Ravelry API error", status: searchRes.status }, { status: 502 });
  }
  const searchData = await searchRes.json();
  const hit = (searchData.patterns as Array<{ id: number; permalink: string }>)
    ?.find((p) => p.permalink === permalink);

  if (!hit) {
    return NextResponse.json({ error: "Pattern not found on Ravelry" }, { status: 404 });
  }

  // Fetch full pattern details
  const detailRes = await fetch(
    `https://api.ravelry.com/patterns/${hit.id}.json`,
    { headers: { Authorization: auth } }
  );
  if (!detailRes.ok) {
    return NextResponse.json({ error: "Ravelry detail fetch failed" }, { status: 502 });
  }
  const { pattern: rp } = await detailRes.json();

  // Map fields
  const photoUrl: string | null = rp.photos?.[0]?.medium_url ?? rp.first_photo?.medium_url ?? null;
  const weight   = mapWeight(rp.yarn_weight?.name);
  const category = mapCategory(
    (rp.pattern_categories as Array<{ name: string }> ?? []).map((c) => c.name)
  );
  const difficulty = mapDifficulty(rp.difficulty_average);
  const designer   = rp.pattern_author?.name ?? pattern.designer ?? null;

  const updates: Record<string, unknown> = {};
  if (weight    && !pattern.yarnWeight) updates.yarnWeight  = weight;
  if (category  && !pattern.category)  updates.category    = category;
  if (difficulty && !pattern.difficulty) updates.difficulty = difficulty;
  if (designer  && !pattern.designer)  updates.designer    = designer;
  if (photoUrl  && !pattern.coverImage) updates.coverImage = JSON.stringify([photoUrl]);

  const updated = await prisma.pattern.update({
    where: { id },
    data:  updates,
    include: { _count: { select: { projects: true } } },
  });

  return NextResponse.json(updated);
}
