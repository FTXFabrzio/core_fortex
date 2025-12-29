import { supabase } from "../lib/supabase/client";
import { core_domain } from "../types/db";

export type CoreDomainInsert = Omit<core_domain, "id" | "created_at" | "updated_at">;
export type CoreDomainUpdate = Partial<
  Omit<core_domain, "id" | "created_at" | "updated_at">
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
    .from("core_domain")
    .select<"*", core_domain>("*")
    .eq("owner_user_id", ownerUserId)
    .order("created_at", { ascending: false });

  query = applyPagination(query, options);
  const { data, error } = await query;
  return { data, error };
}

export async function getById(id: string) {
  const { data, error } = await supabase
    .from("core_domain")
    .select<"*", core_domain>("*")
    .eq("id", id)
    .single();

  return { data, error };
}

export async function create(payload: CoreDomainInsert) {
  const { data, error } = await supabase
    .from("core_domain")
    .insert(payload)
    .select<"*", core_domain>("*")
    .single();

  return { data, error };
}

export async function update(id: string, patch: CoreDomainUpdate) {
  const { data, error } = await supabase
    .from("core_domain")
    .update(patch)
    .eq("id", id)
    .select<"*", core_domain>("*")
    .single();

  return { data, error };
}

export async function remove(id: string) {
  const { data, error } = await supabase
    .from("core_domain")
    .delete()
    .eq("id", id)
    .select<"*", core_domain>("*")
    .single();

  return { data, error };
}



