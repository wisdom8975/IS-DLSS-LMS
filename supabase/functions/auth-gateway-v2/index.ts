import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

function getKey(name: string, legacy: string) {
  const modern = Deno.env.get(name);
  if (modern) {
    try {
      const parsed = JSON.parse(modern);
      if (parsed?.default) return parsed.default;
    } catch (_) {}
  }
  return Deno.env.get(legacy) ?? "";
}

const url = Deno.env.get("SUPABASE_URL") ?? "";
const publishableKey = getKey("SUPABASE_PUBLISHABLE_KEYS", "SUPABASE_ANON_KEY");
const secretKey = getKey("SUPABASE_SECRET_KEYS", "SUPABASE_SERVICE_ROLE_KEY");

const auth = createClient(url, publishableKey, { auth: { persistSession: false } });
const admin = createClient(url, secretKey, { auth: { persistSession: false } });

async function login(identifier: string, password: string) {
  let email = identifier.toLowerCase();
  let profile: any = null;
  if (!identifier.includes("@")) {
    const { data, error } = await admin.from("profiles").select("*").eq("username", identifier).maybeSingle();
    if (error || !data || !data.active) return json({ error: "Invalid credentials." }, 401);
    profile = data;
    const { data: userData, error: userError } = await admin.auth.admin.getUserById(data.id);
    if (userError || !userData.user?.email) return json({ error: "Invalid credentials." }, 401);
    email = userData.user.email.toLowerCase();
  }
  const { data, error } = await auth.auth.signInWithPassword({ email, password });
  if (error || !data.user || !data.session) return json({ error: "Invalid credentials." }, 401);
  if (!profile) {
    const { data: p, error: pe } = await admin.from("profiles").select("*").eq("id", data.user.id).maybeSingle();
    if (pe) return json({ error: "Account profile lookup failed." }, 500);
    profile = p;
  }
  if (!profile?.active) return json({ error: "Account is inactive or not configured." }, 403);
  return json({ user: data.user, session: data.session, profile });
}

async function requireAdmin(req: Request) {
  const header = req.headers.get("Authorization") || "";
  if (!header.startsWith("Bearer ")) return null;
  const token = header.slice(7);
  const { data: { user } } = await auth.auth.getUser(token);
  if (!user) return null;
  const { data: profile } = await admin.from("profiles").select("id,role,active").eq("id", user.id).maybeSingle();
  return profile?.role === "Administrator" && profile.active ? user : null;
}

async function createUser(req: Request, body: any) {
  if (!await requireAdmin(req)) return json({ error: "Administrator authorization required." }, 403);
  const email = String(body.email ?? "").trim().toLowerCase();
  const username = String(body.username ?? "").trim();
  const full_name = String(body.full_name ?? "").trim();
  const role = String(body.role ?? "Student");
  const password = String(body.password ?? "");
  const institution = String(body.institution ?? "").trim() || null;
  if (!email || !username || !full_name || !password || !["Administrator", "Teacher", "Student"].includes(role)) return json({ error: "All required account fields must be provided." }, 400);
  if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) return json({ error: "Password must be at least 8 characters and contain letters, numbers and a special character." }, 400);
  const { data: existingUsername, error: usernameError } = await admin.from("profiles").select("id").eq("username", username).maybeSingle();
  if (usernameError) return json({ error: "Unable to verify username availability." }, 500);
  if (existingUsername) return json({ error: "Username already exists." }, 409);
  const { data: created, error: createError } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { username, full_name, institution } });
  if (createError || !created.user) return json({ error: createError?.message || "Unable to create account." }, 400);
  const { data: profile, error: profileError } = await admin.from("profiles").update({ username, full_name, role, institution, active: true }).eq("id", created.user.id).select("*").single();
  if (profileError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return json({ error: "Account creation could not be completed safely." }, 500);
  }
  return json({ profile });
}

async function resetPassword(identifier: string, redirectTo: string) {
  const value = identifier.trim();
  if (!value) return json({ error: "Username/email is required." }, 400);
  let email = value;
  if (!value.includes("@")) {
    const { data: p } = await admin.from("profiles").select("id").eq("username", value).maybeSingle();
    if (!p) return json({ ok: true });
    const { data: u } = await admin.auth.admin.getUserById(p.id);
    if (!u.user?.email) return json({ ok: true });
    email = u.user.email;
  }
  const { error } = await auth.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) return json({ error: "Unable to request password recovery right now." }, 503);
  return json({ ok: true });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const body = await req.json();
    const action = String(body?.action ?? "");
    if (action === "login") {
      const identifier = String(body.identifier ?? "").trim();
      const password = String(body.password ?? "");
      if (!identifier || !password) return json({ error: "Username/email and password are required." }, 400);
      return await login(identifier, password);
    }
    if (action === "create_user") return await createUser(req, body);
    if (action === "reset") return await resetPassword(String(body.identifier ?? ""), String(body.redirectTo ?? ""));
    return json({ error: "Unsupported action." }, 400);
  } catch (error) {
    console.error("auth-gateway-v2 error", error);
    return json({ error: "Unexpected server error." }, 500);
  }
});
