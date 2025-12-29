import { supabase } from "../lib/supabase/client";
import { epic } from "../types/db";

export type EpicInsert = Omit<epic, "id" | "created_at" | "updated_at">;
export type EpicUpdate = Partial<Omit<epic, "id" | "created_at" | "updated_at">>;

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
    .from("epic")
    .select<"*", epic>("*")
    .eq("project_id", projectId)
    .order("order_no", { ascending: true })
    .order("created_at", { ascending: true });

  query = applyPagination(query, options);
  const { data, error } = await query;
  return { data, error };
}

export async function getById(id: string) {
  const { data, error } = await supabase
    .from("epic")
    .select<"*", epic>("*")
    .eq("id", id)
    .single();

  return { data, error };
}

export async function create(payload: EpicInsert) {
  const { data, error } = await supabase
    .from("epic")
    .insert(payload)
    .select<"*", epic>("*")
    .single();

  return { data, error };
}

export async function update(id: string, patch: EpicUpdate) {
  const { data, error } = await supabase
    .from("epic")
    .update(patch)
    .eq("id", id)
    .select<"*", epic>("*")
    .single();

  return { data, error };
}

export async function remove(id: string) {
  const { data, error } = await supabase
    .from("epic")
    .delete()
    .eq("id", id)
    .select<"*", epic>("*")
    .single();

  return { data, error };
}



