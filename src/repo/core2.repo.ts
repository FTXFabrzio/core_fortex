import { supabase } from "../lib/supabase/client";
import { project_core2 } from "../types/db";

export type Core2Insert = Omit<
  project_core2,
  "id" | "created_at" | "updated_at"
>;
export type Core2Update = Partial<
  Omit<project_core2, "id" | "created_at" | "updated_at">
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

export async function listByProject(
  projectId: string,
  options?: PaginationOptions
) {
  let query = supabase
    .from("project_core2")
    .select<"*", project_core2>("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  query = applyPagination(query, options);
  const { data, error } = await query;
  return { data, error };
}

export async function getById(id: string) {
  const { data, error } = await supabase
    .from("project_core2")
    .select<"*", project_core2>("*")
    .eq("id", id)
    .single();

  return { data, error };
}

export async function create(payload: Core2Insert) {
  const { data, error } = await supabase
    .from("project_core2")
    .insert(payload)
    .select<"*", project_core2>("*")
    .single();

  return { data, error };
}

export async function update(id: string, patch: Core2Update) {
  const { data, error } = await supabase
    .from("project_core2")
    .update(patch)
    .eq("id", id)
    .select<"*", project_core2>("*")
    .single();

  return { data, error };
}

export async function remove(id: string) {
  const { data, error } = await supabase
    .from("project_core2")
    .delete()
    .eq("id", id)
    .select<"*", project_core2>("*")
    .single();

  return { data, error };
}



