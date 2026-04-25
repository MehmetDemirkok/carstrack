const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: users, error: err1 } = await supabase.from("profiles").select("*");
  console.log("Profiles:", users?.length || 0);
  const { data: vehicles, error: err2 } = await supabase.from("vehicles").select("*");
  console.log("Vehicles:", vehicles?.length || 0);
  if (vehicles?.length > 0) {
    console.log("Vehicle 0:", vehicles[0]);
  }
}
run();
