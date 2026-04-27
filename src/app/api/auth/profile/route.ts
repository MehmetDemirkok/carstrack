import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ profile: null, company: null }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("*, companies(*)")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error("Profile API error:", error);
      return NextResponse.json({ profile: null, company: null, error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ profile: null, company: null }, { status: 404 });
    }

    const comp = data.companies as Record<string, string> | null | undefined;

    return NextResponse.json({
      profile: {
        id: data.id,
        companyId: data.company_id,
        role: data.role,
        fullName: data.full_name,
        createdAt: data.created_at,
      },
      company: comp
        ? {
            id: comp.id,
            name: comp.name,
            createdAt: comp.created_at,
            inviteCode: comp.invite_code,
          }
        : null,
    });
  } catch (err) {
    console.error("Profile API unexpected error:", err);
    return NextResponse.json({ profile: null, company: null, error: "Internal error" }, { status: 500 });
  }
}
