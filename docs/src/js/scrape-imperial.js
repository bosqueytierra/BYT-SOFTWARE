// Usa fetch nativo de Node (>=18)
const CAT_URL = 'https://www.imperial.cl/api/catalog_system/pub/category/tree/3/'; // con slash final
const PAGE_SIZE = 50;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';

const flatten = (nodes, acc = []) => {
  for (const n of nodes) {
    if (!n.children || n.children.length === 0) acc.push({ id: n.id, name: n.name });
    else acc.push(...flatten(n.children));
  }
  return acc;
};

function parseCookies(headers) {
  // Node fetch no tiene raw(); usamos get('set-cookie') o getSetCookie() si existe
  if (typeof headers.getSetCookie === 'function') {
    return headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
  }
  const h = headers.get('set-cookie') || '';
  // si vienen varias, las separa por coma; tomamos cada valor hasta el primer ';'
  return h
    .split(/,(?=[^ ]*\=)/) // separa en comas que separan cookies
    .map(c => c.split(';')[0].trim())
    .filter(Boolean)
    .join('; ');
}

async function getSessionCookie() {
  const res = await fetch('https://www.imperial.cl/', {
    headers: {
      'User-Agent': UA,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'es-CL,es;q=0.9,en;q=0.8',
      'Referer': 'https://www.imperial.cl/'
    },
    redirect: 'follow'
  });
  const cookie = parseCookies(res.headers);
  console.log('session cookie:', cookie || '(vacío)');
  return cookie;
}

async function getCategories(cookie) {
  try {
    const res = await fetch(CAT_URL, {
      headers: {
        'User-Agent': UA,
        'Accept': 'application/json',
        'Accept-Language': 'es-CL,es;q=0.9,en;q=0.8',
        'Referer': 'https://www.imperial.cl/',
        'Origin': 'https://www.imperial.cl',
        'X-Requested-With': 'XMLHttpRequest',
        'Cookie': cookie,
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin'
      }
    });

    const text = await res.text();
    console.log(`getCategories status: ${res.status} ${res.statusText}`);
    console.log(`getCategories body (0-400): ${text.slice(0, 400)}`);

    if (!res.ok) return [];
    return flatten(JSON.parse(text));
  } catch (e) {
    console.error('getCategories error detail:', e);
    return [];
  }
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
        'Origin': 'https://www.imperial.cl',
        'X-Requested-With': 'XMLHttpRequest',
        'Cookie': cookie,
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin'
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
  const cats = await getCategories(cookie);
  if (!cats.length) {
    console.log('No obtuve categorías; termina.');
    return;
  }
  const all = [];
  for (const c of cats) {
    const prods = await getProductsByCat(c.id, cookie);
    all.push(...prods);
  }
  const seen = new Set();
  const unique = all.filter(p => p.sku && !seen.has(p.sku) && seen.add(p.sku));
  console.log(JSON.stringify(unique));
}

main().catch(e => { console.error(e); process.exit(1); });
