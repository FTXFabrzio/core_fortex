import { supabase } from "../lib/supabase/client";
import { task } from "../types/db";

export type TaskInsert = Omit<task, "id" | "created_at" | "updated_at">;
export type TaskUpdate = Partial<Omit<task, "id" | "created_at" | "updated_at">>;

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

export async function listByStory(
  storyId: string,
  options?: PaginationOptions
) {
  let query = supabase
    .from("task")
    .select<"*", task>("*")
    .eq("story_id", storyId)
    .order("order_no", { ascending: true })
    .order("created_at", { ascending: true });

  query = applyPagination(query, options);
  const { data, error } = await query;
  return { data, error };
}

export async function getById(id: string) {
  const { data, error } = await supabase
    .from("task")
    .select<"*", task>("*")
    .eq("id", id)
    .single();

  return { data, error };
}

export async function create(payload: TaskInsert) {
  const { data, error } = await supabase
    .from("task")
    .insert(payload)
    .select<"*", task>("*")
    .single();

  return { data, error };
}

export async function update(id: string, patch: TaskUpdate) {
  const { data, error } = await supabase
    .from("task")
    .update(patch)
    .eq("id", id)
    .select<"*", task>("*")
    .single();

  return { data, error };
}

export async function remove(id: string) {
  const { data, error } = await supabase
    .from("task")
    .delete()
    .eq("id", id)
    .select<"*", task>("*")
    .single();

  return { data, error };
}



