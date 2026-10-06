import type {
  ActionItem, AskMessage, MeetingDetail, MeetingListItem, MeetingQuery, Participant, Summary, User,
} from "./types";

export const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const isForm = init.body instanceof FormData;
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: isForm ? init.headers : { "Content-Type": "application/json", ...init.headers },
      cache: "no-store",
    });
  } catch {
    throw new ApiError(0, "Can't reach the server. Check that the API is running.");
  }
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = typeof body.detail === "string" ? body.detail : body.detail?.[0]?.msg ?? detail;
    } catch { /* non-JSON error */ }
    throw new ApiError(res.status, detail);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

const json = (method: string, body?: unknown): RequestInit => ({ method, body: body === undefined ? undefined : JSON.stringify(body) });

function toQuery(q: MeetingQuery): string {
  const p = new URLSearchParams();
  if (q.q) p.set("q", q.q);
  q.participant?.forEach((n) => p.append("participant", n));
  if (q.date_from) p.set("date_from", q.date_from);
  if (q.date_to) p.set("date_to", q.date_to);
  if (q.sort) p.set("sort", q.sort);
  const s = p.toString();
  return s ? `?${s}` : "";
}

export interface MeetingCreateInput {
  title: string; meeting_date?: string; participants: string[]; platform?: string;
  transcript_text?: string; transcript_format?: "auto" | "txt" | "vtt" | "json";
}

export const api = {
  me: () => request<User>("/api/me"),
  participants: () => request<Participant[]>("/api/participants"),

  listMeetings: (q: MeetingQuery = {}) => request<{ items: MeetingListItem[]; total: number }>(`/api/meetings${toQuery(q)}`),
  getMeeting: (id: number) => request<MeetingDetail>(`/api/meetings/${id}`),
  createMeeting: (data: MeetingCreateInput) => request<MeetingDetail>("/api/meetings", json("POST", data)),
  uploadMeeting: (file: File, extra: { title?: string; participants?: string; meeting_date?: string }) => {
    const form = new FormData();
    form.append("file", file);
    Object.entries(extra).forEach(([k, v]) => v && form.append(k, v));
    return request<MeetingDetail>("/api/meetings/upload", { method: "POST", body: form });
  },
  updateMeeting: (id: number, data: { title?: string; participants?: string[]; meeting_date?: string }) =>
    request<MeetingDetail>(`/api/meetings/${id}`, json("PATCH", data)),
  deleteMeeting: (id: number) => request<void>(`/api/meetings/${id}`, { method: "DELETE" }),
  regenerateSummary: (id: number) => request<MeetingDetail>(`/api/meetings/${id}/summary/regenerate`, { method: "POST" }),
  updateSummary: (id: number, data: { overview?: string; keywords?: string[] }) =>
    request<Summary>(`/api/meetings/${id}/summary`, json("PATCH", data)),

  allActionItems: (completed?: boolean) =>
    request<ActionItem[]>(`/api/action-items${completed === undefined ? "" : `?completed=${completed}`}`),
  createActionItem:(meetingId: number, data: { text: string; assignee_name?: string; due_date?: string }) =>
    request<ActionItem>(`/api/meetings/${meetingId}/action-items`, json("POST", data)),
  updateActionItem: (id: number, data: Partial<{ text: string; assignee_name: string; due_date: string; clear_due_date: boolean; completed: boolean }>) =>
    request<ActionItem>(`/api/action-items/${id}`, json("PATCH", data)),
  deleteActionItem: (id: number) => request<void>(`/api/action-items/${id}`, { method: "DELETE" }),

  askHistory: (meetingId: number) => request<AskMessage[]>(`/api/meetings/${meetingId}/ask`),
  ask: (meetingId: number, question: string) =>
    request<{ question: AskMessage; answer: AskMessage }>(`/api/meetings/${meetingId}/ask`, json("POST", { question })),
  clearAsk: (meetingId: number) => request<void>(`/api/meetings/${meetingId}/ask`, { method: "DELETE" }),

  exportUrl: (meetingId: number, fmt: "md" | "txt" | "pdf", transcript = true) =>
    `${API_URL}/api/meetings/${meetingId}/export?fmt=${fmt}&transcript=${transcript}`,
};
