import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://qkldtqasgicelriarkrr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrbGR0cWFzZ2ljZWxyaWFya3JyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzAwMjQ5MiwiZXhwIjoyMDkyNTc4NDkyfQ.QahOPr9z2Gkbv_pK0Kxals-I6iQ9JE8inh4IfGHXQQU'
)

async function check() {
  const { data: users, error: err1 } = await supabase.auth.admin.listUsers()
  console.log("Users:", users?.users.length, "Error:", err1)

  const { data: profiles, error: err2 } = await supabase.from('profiles').select('*')
  console.log("Profiles:", profiles?.length, profiles, "Error:", err2)

  const { data: vehicles, error: err3 } = await supabase.from('vehicles').select('*')
  console.log("Vehicles:", vehicles?.length, vehicles, "Error:", err3)
}

check()
