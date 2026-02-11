"use client";

import { createContext, useContext, ReactNode } from "react";
import { useActivityFeed, ActivityItem } from "@/hooks/useActivityFeed";
import ToastNotifications from "./ToastNotifications";

interface ActivityContextValue {
  activities: ActivityItem[];
  loading: boolean;
}

const ActivityContext = createContext<ActivityContextValue>({ activities: [], loading: true });

export function useActivity() {
  return useContext(ActivityContext);
}

export default function ActivityProvider({ children }: { children: ReactNode }) {
  const { activities, newItems, loading } = useActivityFeed(6000);

  return (
    <ActivityContext.Provider value={{ activities, loading }}>
      {children}
      <ToastNotifications newItems={newItems} />
    </ActivityContext.Provider>
  );
}
