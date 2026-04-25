const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  console.log("Testing profiles select with companies join...");
  const start = Date.now();
  try {
    const { data, error } = await supabase.from("profiles").select("*, companies(*)").limit(1);
    console.log(`Query finished in ${Date.now() - start}ms`, { data, error });
  } catch (err) {
    console.log(`Query threw in ${Date.now() - start}ms`, err);
  }
}
run();
