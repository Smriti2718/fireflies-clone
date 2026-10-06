"use client";

import { createContext, useContext } from "react";

export type CreateMode = "upload" | "paste" | "form";

/** Lets any page (navbar, library empty state) open the shared "New meeting" modal. */
export const CreateMeetingContext = createContext<(mode?: CreateMode) => void>(() => {});
export const useCreateMeeting = () => useContext(CreateMeetingContext);
