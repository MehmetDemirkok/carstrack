"use client";

import { createContext, useContext, useState } from "react";

interface CopilotContextType {
  open: boolean;
  setOpen: (v: boolean) => void;
}

const CopilotContext = createContext<CopilotContextType>({
  open: false,
  setOpen: () => {},
});

export function CopilotProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <CopilotContext.Provider value={{ open, setOpen }}>
      {children}
    </CopilotContext.Provider>
  );
}

export function useCopilot() {
  return useContext(CopilotContext);
}
