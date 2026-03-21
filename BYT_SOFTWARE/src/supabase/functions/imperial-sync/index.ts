import { serve } from "https://deno.land/std@0.180.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!; // service role
const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (_req) => {
  try {
    // TODO: aquí llama a tu scraper o feed y obtén un array de productos
    // Ejemplo mock (cámbialo por los datos reales):
    const products = [
      {
        sku: "123",
        name: "Producto demo",
        price: "$9.990",
        stock: "Disponible",
        category: "Ferretería",
      },
    ];

    const { error } = await supabase
      .from("imperial_products")
      .upsert(products, { onConflict: "sku" });
    if (error) throw error;

    return new Response(JSON.stringify({ ok: true, count: products.length }), {
      headers: { "content-type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
});
