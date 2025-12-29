import { supabase } from "../lib/supabase/client";
import { daily_task } from "../types/db";

export type DailyTaskInsert = Omit<daily_task, "id" | "created_at" | "updated_at">;
export type DailyTaskUpdate = Partial<
  Omit<daily_task, "id" | "created_at" | "updated_at">
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
    .from<daily_task>("daily_task")
    .select("*")
    .eq("owner_user_id", ownerUserId)
    .order("start_at", { ascending: true })
    .order("created_at", { ascending: true });

  query = applyPagination(query, options);
  const { data, error } = await query;
  return { data, error };
}

export async function listByOwnerAndRange(
  ownerUserId: string,
  startAt: string,
  endAt: string,
  options?: PaginationOptions
) {
  let query = supabase
    .from<daily_task>("daily_task")
    .select("*")
    .eq("owner_user_id", ownerUserId)
    .gte("start_at", startAt)
    .lte("start_at", endAt)
    .order("start_at", { ascending: true })
    .order("created_at", { ascending: true });

  query = applyPagination(query, options);
  const { data, error } = await query;
  return { data, error };
}

export async function getById(id: string) {
  const { data, error } = await supabase
    .from<daily_task>("daily_task")
    .select("*")
    .eq("id", id)
    .single();

  return { data, error };
}

export async function create(payload: DailyTaskInsert) {
  const { data, error } = await supabase
    .from<daily_task>("daily_task")
    .insert(payload)
    .select("*")
    .single();

  return { data, error };
}

export async function update(id: string, patch: DailyTaskUpdate) {
  const { data, error } = await supabase
    .from<daily_task>("daily_task")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  return { data, error };
}

export async function remove(id: string) {
  const { data, error } = await supabase
    .from<daily_task>("daily_task")
    .delete()
    .eq("id", id)
    .select("*")
    .single();

  return { data, error };
}
