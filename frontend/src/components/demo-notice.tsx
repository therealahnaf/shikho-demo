import { FlaskConical } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function DemoNotice() {
  return (
    <Alert className="border-[#f5d993] bg-[#fff9e9] text-[#684900] [&>svg]:text-[#684900]">
      <FlaskConical />
      <AlertTitle>Demo access only</AlertTitle>
      <AlertDescription>
        This key is intentionally simple and cannot be recovered. Do not reuse a real password.
      </AlertDescription>
    </Alert>
  );
}
