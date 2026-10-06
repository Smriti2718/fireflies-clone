"use client";

import { Plug } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

const APPS = [
  { name: "Zoom", group: "Video conferencing", body: "Auto-join and transcribe Zoom calls.", color: "#2D8CFF" },
  { name: "Google Meet", group: "Video conferencing", body: "Capture Meet calls from your calendar.", color: "#00897B" },
  { name: "Microsoft Teams", group: "Video conferencing", body: "Record Teams meetings with the notetaker.", color: "#5B5FC7" },
  { name: "Google Calendar", group: "Calendar", body: "Find meetings to join automatically.", color: "#4285F4" },
  { name: "Outlook Calendar", group: "Calendar", body: "Sync your Outlook events.", color: "#0F6CBD" },
  { name: "Salesforce", group: "CRM", body: "Log notes and action items on accounts.", color: "#00A1E0" },
  { name: "HubSpot", group: "CRM", body: "Attach call summaries to deals.", color: "#FF7A59" },
  { name: "Slack", group: "Collaboration", body: "Post meeting recaps to channels.", color: "#4A154B" },
  { name: "Notion", group: "Collaboration", body: "Send notes to a Notion database.", color: "#37352F" },
];

export default function IntegrationsPage() {
  const toast = useToast();
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">
      <div className="mb-6 flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand"><Plug size={20} /></div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Integrations</h1>
          <p className="mt-1 text-sm text-muted">Connect the tools your team already uses. Integrations are not available in this demo yet.</p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {APPS.map((a) => (
          <div key={a.name} className="panel flex flex-col p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold text-white" style={{ backgroundColor: a.color }}>{a.name[0]}</span>
              <div>
                <p className="text-sm font-semibold text-ink">{a.name}</p>
                <p className="text-xs text-muted">{a.group}</p>
              </div>
            </div>
            <p className="mt-3 flex-1 text-sm text-muted">{a.body}</p>
            <button className="btn-outline mt-4 self-start" onClick={() => toast(`${a.name} integration is coming soon`, "info")}>Connect</button>
          </div>
        ))}
      </div>
    </div>
  );
}
