import { supabase } from "../lib/supabase/client";
import { story } from "../types/db";

export type StoryInsert = Omit<story, "id" | "created_at" | "updated_at">;
export type StoryUpdate = Partial<
  Omit<story, "id" | "created_at" | "updated_at">
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
    .from<story>("story")
    .select("*")
    .eq("project_id", projectId)
    .order("priority", { ascending: false })
    .order("created_at", { ascending: false });

  query = applyPagination(query, options);
  const { data, error } = await query;
  return { data, error };
}

export async function listByEpic(
  epicId: string,
  options?: PaginationOptions
) {
  let query = supabase
    .from<story>("story")
    .select("*")
    .eq("epic_id", epicId)
    .order("priority", { ascending: false })
    .order("created_at", { ascending: false });

  query = applyPagination(query, options);
  const { data, error } = await query;
  return { data, error };
}

export async function getById(id: string) {
  const { data, error } = await supabase
    .from<story>("story")
    .select("*")
    .eq("id", id)
    .single();

  return { data, error };
}

export async function create(payload: StoryInsert) {
  const { data, error } = await supabase
    .from<story>("story")
    .insert(payload)
    .select("*")
    .single();

  return { data, error };
}

export async function update(id: string, patch: StoryUpdate) {
  const { data, error } = await supabase
    .from<story>("story")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  return { data, error };
}

export async function remove(id: string) {
  const { data, error } = await supabase
    .from<story>("story")
    .delete()
    .eq("id", id)
    .select("*")
    .single();

  return { data, error };
}
