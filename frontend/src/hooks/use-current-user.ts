import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { api, ApiError } from "@/lib/api";
import { clearCredentials, getCredentials } from "@/lib/storage";

export function useCurrentUser() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const credentials = getCredentials();
  const query = useQuery({
    queryKey: ["me"],
    queryFn: api.getMe,
    enabled: Boolean(credentials),
    retry: false,
  });

  useEffect(() => {
    if (!credentials) {
      navigate("/login", { replace: true });
    } else if (query.error instanceof ApiError && query.error.status === 401) {
      clearCredentials();
      queryClient.clear();
      navigate("/login", { replace: true });
    }
  }, [credentials, navigate, query.error, queryClient]);

  return query;
}

