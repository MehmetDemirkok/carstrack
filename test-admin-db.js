const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const { data: companies } = await supabase.from("companies").select("*");
  console.log("Companies:", companies);

  const { data: profiles } = await supabase.from("profiles").select("*");
  console.log("Profiles:", profiles);

  const { data: vehicles } = await supabase.from("vehicles").select("*");
  console.log("Vehicles:", vehicles);
}
run();
