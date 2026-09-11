import "server-only";

import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { Profile, UserRole } from "@/lib/types/database";

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

export async function getSessionUser() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    return user;
  } catch {
    return null;
  }
}

export async function getCurrentProfile(): Promise<Profile | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return null;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return data as Profile;
  } catch {
    return null;
  }
}

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export async function requireProfile() {
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect("/login");
  }
  return profile;
}

export async function requireRole(role: UserRole) {
  const profile = await requireProfile();
  if (profile.role !== role) {
    redirect(role === "admin" ? "/book" : "/admin");
  }
  return profile;
}

export async function requireAdmin() {
  return requireRole("admin");
}

export async function requireCustomer() {
  return requireRole("customer");
}

/** Soft check for Server Actions — throws instead of redirecting */
export async function assertAdmin(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") {
    throw new AuthError("Unauthorized admin access");
  }
  return profile;
}

export async function assertCustomer(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) {
    throw new AuthError("Authentication required");
  }
  return profile;
}
