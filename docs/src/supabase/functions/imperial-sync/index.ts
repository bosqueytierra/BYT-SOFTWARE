import { serve } from "https://deno.land/std@0.180.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!; // no hardcodear
const supabase = createClient(supabaseUrl, supabaseKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};

serve(async (req) => {
  // Preflight CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // TODO: reemplaza este mock por tu scraper real
    const products = [
      { sku: "123", name: "Producto demo", price: "$9.990", stock: "Disponible", category: "Ferretería" },
    ];

    const { error } = await supabase
      .from("imperial_products")
      .upsert(products, { onConflict: "sku" });

    if (error) throw error;

    return new Response(
      JSON.stringify({ ok: true, count: products.length }),
      { headers: { ...corsHeaders, "content-type": "application/json" } }
    );
  } catch (e) {
    console.error(e);
    return new Response(
      JSON.stringify({ ok: false, error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "content-type": "application/json" } }
    );
  }
});
