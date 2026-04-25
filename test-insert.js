const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const { data: profiles } = await supabase.from("profiles").select("*");
  if (!profiles || profiles.length === 0) {
    console.log("No profiles found.");
    return;
  }
  const companyId = profiles[0].company_id;
  
  const { data, error } = await supabase.from("vehicles").insert({
    company_id: companyId,
    plate: "34TEST34",
    brand: "Test",
    model: "Test",
    year: 2024,
    mileage: 1000
  }).select();
  
  console.log("Insert Result:", data, "Error:", error);
}
run();
