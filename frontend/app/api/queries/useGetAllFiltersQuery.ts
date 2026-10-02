import {
  type UseQueryOptions,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { KnowledgeFilter } from "./useGetFiltersSearchQuery";
import { apiClient } from "@/lib/api-client";

async function getAllFilters(): Promise<KnowledgeFilter[]> {
  const response = await apiClient("/api/knowledge-filter/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: "", limit: 1000 }),
  });

  const json = await response.json();
  if (!response.ok || !json.success) {
    return [];
  }
  return (json.filters || []) as KnowledgeFilter[];
}

export const useGetAllFiltersQuery = (
  options?: Omit<UseQueryOptions<KnowledgeFilter[]>, "queryKey" | "queryFn">,
) => {
  const queryClient = useQueryClient();

  return useQuery<KnowledgeFilter[]>(
    {
      queryKey: ["knowledge-filters", "all"],
      queryFn: getAllFilters,
      ...options,
    },
    queryClient,
  );
};
