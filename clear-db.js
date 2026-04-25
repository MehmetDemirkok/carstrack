import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://qkldtqasgicelriarkrr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrbGR0cWFzZ2ljZWxyaWFya3JyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzAwMjQ5MiwiZXhwIjoyMDkyNTc4NDkyfQ.QahOPr9z2Gkbv_pK0Kxals-I6iQ9JE8inh4IfGHXQQU'
)

async function clearDemoData() {
  const { error } = await supabase.from('vehicles').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  if (error) {
    console.error("Error clearing vehicles:", error);
  } else {
    console.log("All vehicles cleared successfully.");
  }
}

clearDemoData();
