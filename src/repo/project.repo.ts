import { supabase } from "../lib/supabase/client";
import { core_project } from "../types/db";

export type CoreProjectInsert = Omit<
  core_project,
  "id" | "created_at" | "updated_at"
>;
export type CoreProjectUpdate = Partial<
  Omit<core_project, "id" | "created_at" | "updated_at">
>;

type PaginationOptions = {
  limit?: number;
  offset?: number;
};

const applyPagination = (query: any, options?: PaginationOptions) => {
  if (!options?.limit) {
    return query;
  }

  const from = options.offset ?? 0;
  const to = from + options.limit - 1;
  return query.range(from, to);
};

export async function listByOwner(
  ownerUserId: string,
  options?: PaginationOptions
) {
  let query = supabase
    .from<core_project>("core_project")
    .select("*")
    .eq("owner_user_id", ownerUserId)
    .order("created_at", { ascending: false });

  query = applyPagination(query, options);
  const { data, error } = await query;
  return { data, error };
}

export async function getById(id: string) {
  const { data, error } = await supabase
    .from<core_project>("core_project")
    .select("*")
    .eq("id", id)
    .single();

  return { data, error };
}

export async function create(payload: CoreProjectInsert) {
  const { data, error } = await supabase
    .from<core_project>("core_project")
    .insert(payload)
    .select("*")
    .single();

  return { data, error };
}

export async function update(id: string, patch: CoreProjectUpdate) {
  const { data, error } = await supabase
    .from<core_project>("core_project")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  return { data, error };
}

export async function remove(id: string) {
  const { data, error } = await supabase
    .from<core_project>("core_project")
    .delete()
    .eq("id", id)
    .select("*")
    .single();

  return { data, error };
}
