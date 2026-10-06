// Mirrors backend/app/schemas.py

export interface User { id: number; name: string; email: string; avatar_color: string }

export interface Participant { id: number; name: string; email: string | null; color: string }
export interface MeetingParticipant extends Participant { role: "host" | "attendee"; talk_time_sec: number }

export interface Segment {
  id: number; position: number; speaker_id: number; speaker_name: string;
  start_ms: number; end_ms: number; text: string;
}

export interface Summary { overview: string; keywords: string[]; generated_by: string; updated_at: string }
export interface Chapter { id: number; title: string; summary: string; start_ms: number }

export interface ActionItem {
  id: number; meeting_id: number; text: string; assignee: Participant | null;
  due_date: string | null; completed: boolean; completed_at: string | null;
  source_start_ms: number | null; created_at: string;
}

export interface MeetingListItem {
  id: number; title: string; meeting_date: string; duration_sec: number; source: string;
  platform: string | null; participants: Participant[]; overview_snippet: string; keywords: string[];
  action_items_total: number; action_items_open: number; match_snippet: string | null;
}

export interface MeetingDetail {
  id: number; title: string; meeting_date: string; duration_sec: number; source: string;
  platform: string | null; media_url: string | null; created_at: string; updated_at: string;
  participants: MeetingParticipant[]; segments: Segment[]; summary: Summary | null;
  chapters: Chapter[]; action_items: ActionItem[];
}

export interface AskMessage { id: number; role: "user" | "assistant"; content: string; citations: number[]; created_at: string }

export type SortKey = "recent" | "oldest" | "longest" | "shortest" | "title";
export interface MeetingQuery {
  q?: string; participant?: string[]; date_from?: string; date_to?: string; sort?: SortKey;
}
