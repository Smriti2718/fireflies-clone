import { BarChart3 } from "lucide-react";
import { ComingSoon } from "@/components/ui/ComingSoon";

export const metadata = { title: "Analytics" };
export default function Page() {
  return <ComingSoon icon={BarChart3} title="Conversation analytics" body="Track talk time, sentiment and topic trends across every meeting in your workspace." />;
}
