import { FlaskConical } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function DemoNotice() {
  return (
    <Alert className="border-[#f5d993] bg-[#fff9e9] text-[#684900] [&>svg]:text-[#684900]">
      <FlaskConical />
      <AlertTitle>Keep your access key private</AlertTitle>
      <AlertDescription>
        There is no recovery process for this access key. Do not reuse a password from another account.
      </AlertDescription>
    </Alert>
  );
}
