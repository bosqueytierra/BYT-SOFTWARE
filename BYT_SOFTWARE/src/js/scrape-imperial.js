const CAT_URL = 'https://www.imperial.cl/api/catalog_system/pub/category/tree/3';
const PAGE_SIZE = 50;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';

const flatten = (nodes, acc = []) => {
  for (const n of nodes) {
    if (!n.children || n.children.length === 0) acc.push({ id: n.id, name: n.name });
    else acc.push(...flatten(n.children));
  }
  return acc;
};

async function getSessionCookie() {
  const res = await fetch('https://www.imperial.cl/', {
    headers: {
      'User-Agent': UA,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'es-CL,es;q=0.9,en;q=0.8'
    },
    redirect: 'follow'
  });
  const setCookie = res.headers.get('set-cookie') || '';
  // ej: "__cf_bm=xxx; path=/; domain=.imperial.cl; ..."
  const cookie = setCookie.split(';')[0];
  return cookie;
}

async function getCategories() {
  const cookie = await getSessionCookie();
  const res = await fetch(CAT_URL, {
    headers: {
      'User-Agent': UA,
      'Accept': 'application/json',
      'Accept-Language': 'es-CL,es;q=0.9,en;q=0.8',
      'Referer': 'https://www.imperial.cl/',
      'Cookie': cookie
    }
  });

  const text = await res.text();
  console.log(`getCategories status: ${res.status} ${res.statusText}`);
  console.log(`cookie used: ${cookie}`);
  console.log(`getCategories body (0-300): ${text.slice(0,300)}`);

  if (!res.ok) throw new Error(`No pude leer categorías (status ${res.status})`);
  return flatten(JSON.parse(text));
}

async function getProductsByCat(catId, cookie) {
  let from = 0;
  const items = [];
  while (true) {
    const url = `https://www.imperial.cl/api/catalog_system/pub/products/search/?fq=C:${catId}&_from=${from}&_to=${from + PAGE_SIZE - 1}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': UA,
        'Accept': 'application/json',
        'Referer': 'https://www.imperial.cl/',
        'Cookie': cookie
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
  const cookie = await getSessionCookie();
  const cats = await getCategories();
  const all = [];
  for (const c of cats) {
    const prods = await getProductsByCat(c.id, cookie);
    all.push(...prods);
  }
  const seen = new Set();
  const unique = all.filter(p => p.sku && !seen
