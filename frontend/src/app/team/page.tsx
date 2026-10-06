import { Users } from "lucide-react";
import { ComingSoon } from "@/components/ui/ComingSoon";

export const metadata = { title: "Team" };
export default function Page() {
  return <ComingSoon icon={Users} title="Team workspace" body="Invite teammates, share meetings and build channels of notes everyone can search." />;
}
