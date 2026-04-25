const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function run() {
  console.log("Starting query...");
  const start = Date.now();
  const { data, error } = await supabase.from("profiles").select("*, companies(*)").limit(1);
  console.log(`Query finished in ${Date.now() - start}ms`, { data, error });
}
run();
