import { supabase } from "../lib/supabase/client";
import { test_log } from "../types/db";

export type TestLogInsert = Omit<test_log, "id" | "created_at">;
export type TestLogUpdate = Partial<Omit<test_log, "id" | "created_at">>;

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
    .from<test_log>("test_log")
    .select("*")
    .eq("story_id", storyId)
    .order("created_at", { ascending: false });

  query = applyPagination(query, options);
  const { data, error } = await query;
  return { data, error };
}

export async function getById(id: string) {
  const { data, error } = await supabase
    .from<test_log>("test_log")
    .select("*")
    .eq("id", id)
    .single();

  return { data, error };
}

export async function create(payload: TestLogInsert) {
  const { data, error } = await supabase
    .from<test_log>("test_log")
    .insert(payload)
    .select("*")
    .single();

  return { data, error };
}

export async function update(id: string, patch: TestLogUpdate) {
  const { data, error } = await supabase
    .from<test_log>("test_log")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  return { data, error };
}

export async function remove(id: string) {
  const { data, error } = await supabase
    .from<test_log>("test_log")
    .delete()
    .eq("id", id)
    .select("*")
    .single();

  return { data, error };
}
