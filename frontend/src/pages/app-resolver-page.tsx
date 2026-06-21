import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { AppPageError, AppPageLoading } from "@/components/app-page-state";
import { useCurrentUser } from "@/hooks/use-current-user";
import { api } from "@/lib/api";

export function AppResolverPage() {
  const navigate = useNavigate();
  const userQuery = useCurrentUser();
  const membershipQuery = useQuery({
    queryKey: ["membership"],
    queryFn: api.getMembership,
    enabled: userQuery.isSuccess,
    retry: false,
  });

  useEffect(() => {
    if (!membershipQuery.isSuccess) return;
    const membership = membershipQuery.data.membership;
    navigate(
      membership ? `/app/study-circle/${membership.circle_id}` : "/app/study-circle/lobby",
      { replace: true },
    );
  }, [membershipQuery.data, membershipQuery.isSuccess, navigate]);

  if (userQuery.isError || membershipQuery.isError) {
    return <AppPageError onRetry={() => void (userQuery.refetch(), membershipQuery.refetch())} />;
  }
  return <AppPageLoading />;
}

