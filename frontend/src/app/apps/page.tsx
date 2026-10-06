import { LayoutGrid } from "lucide-react";
import { ComingSoon } from "@/components/ui/ComingSoon";

export const metadata = { title: "AI Apps" };
export default function Page() {
  return <ComingSoon icon={LayoutGrid} title="AI Apps" body="Run ready-made prompts on your meetings: sales scorecards, interview feedback, follow-up emails and more." />;
}
