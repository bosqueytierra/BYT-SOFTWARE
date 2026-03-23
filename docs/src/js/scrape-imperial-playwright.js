import { chromium } from 'playwright'; // usa el Chromium que instala Playwright

const CAT_URL = 'https://www.imperial.cl/api/catalog_system/pub/category/tree/3/';
const PAGE_SIZE = 50;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';

const flatten = (nodes, acc = []) => {
  for (const n of nodes) {
    if (!n.children || n.children.length === 0) acc.push({ id: n.id, name: n.name });
    else acc.push(...flatten(n.children));
  }
  return acc;
};

async function fetchJsonWithBrowser(page, url) {
  const res = await page.evaluate(async (u) => {
    const r = await fetch(u, { credentials: 'include' });
    const t = await r.text();
    return { status: r.status, ok: r.ok, body: t };
  }, url);
  return res;
}

async function getProductsByCat(page, catId) {
  let from = 0;
  const items = [];
  while (true) {
    const url = `https://www.imperial.cl/api/catalog_system/pub/products/search/?fq=C:${catId}&_from=${from}&_to=${from + PAGE_SIZE - 1}`;
    const chunk = await page.evaluate(async (u) => {
      const r = await fetch(u, { credentials: 'include' });
      if (!r.ok) return { ok: false, data: [] };
      return { ok: true, data: await r.json() };
    }, url);

    if (!chunk.ok || !chunk.data.length) break;

    for (const p of chunk.data) {
      const sku = p.items?.[0]?.itemId;
      const price = p.items?.[0]?.sellers?.[0]?.commertialOffer?.Price ?? 0;
      const stock = p.items?.[0]?.sellers?.[0]?.commertialOffer?.AvailableQuantity ?? 0;
      const category = (p.categories || []).slice(-1)[0] || '';
      items.push({
        sku,
        name: p.productName,
        price: `$${price.toLocaleString('es-CL')}`,
        stock: stock > 0 ? 'Disponible' : 'Sin stock',
        category,
        updated_at: new Date().toISOString(),
      });
    }
    from += PAGE_SIZE;
  }
  return items;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ userAgent: UA });

  // Pasar challenge y obtener cookies
  await page.goto('https://www.imperial.cl/', { waitUntil: 'networkidle' });

  const catRes = await fetchJsonWithBrowser(page, CAT_URL);
  console.log('getCategories status:', catRes.status);
  console.log('getCategories body (0-400):', catRes.body.slice(0, 400));

  if (!catRes.ok) {
    console.log('No obtuve categorías; termina.');
    await browser.close();
    return;
  }

  const cats = flatten(JSON.parse(catRes.body));
  const all = [];
  for (const c of cats) {
    const prods = await getProductsByCat(page, c.id);
    all.push(...prods);
  }
  const seen = new Set();
  const unique = all.filter(p => p.sku && !seen.has(p.sku) && seen.add(p.sku));
  console.log(JSON.stringify(unique));
  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
