const CAT_URL = 'https://www.imperial.cl/api/catalog_system/pub/category/tree/3';
const PAGE_SIZE = 50;

const flatten = (nodes, acc = []) => {
  for (const n of nodes) {
    if (!n.children || n.children.length === 0) acc.push({ id: n.id, name: n.name });
    else acc.push(...flatten(n.children));
  }
  return acc;
};

async function getCategories() {
  const res = await fetch(CAT_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      'Accept': 'application/json',
      'Referer': 'https://www.imperial.cl/'
    }
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`getCategories failed: status ${res.status} ${res.statusText}`);
    console.error(text.slice(0, 500));
    throw new Error('No pude leer categorías');
  }

  return flatten(await res.json());
}

async function getProductsByCat(catId) {
  let from = 0;
  const items = [];
  while (true) {
    const url = `https://www.imperial.cl/api/catalog_system/pub/products/search/?fq=C:${catId}&_from=${from}&_to=${from + PAGE_SIZE - 1}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': 'application/json',
        'Referer': 'https://www.imperial.cl/'
      }
    });
    if (!res.ok) break;
    const data = await res.json();
    if (!data.length) break;
    for (const p of data) {
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
        updated_at: new Date().toISOString()
      });
    }
    from += PAGE_SIZE;
  }
  return items;
}

async function main() {
  const cats = await getCategories();
  const all = [];
  for (const c of cats) {
    const prods = await getProductsByCat(c.id);
    all.push(...prods);
  }
  const seen = new Set();
  const unique = all.filter(p => p.sku && !seen.has(p.sku) && seen.add(p.sku));
  console.log(JSON.stringify(unique));
}

main().catch(e => { console.error(e); process.exit(1); });
