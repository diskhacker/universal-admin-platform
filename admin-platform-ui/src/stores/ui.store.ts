import { create } from "zustand";
import { persist } from "zustand/middleware";
import { STORAGE_KEYS } from "@/lib/config";

export type ThemeMode = "dark" | "light";
export type AnimationPref = "full" | "reduced" | "off";

interface UIState {
  themeMode: ThemeMode;
  animationPref: AnimationPref;
  sidebarOpen: boolean;
  setThemeMode: (m: ThemeMode) => void;
  toggleTheme: () => void;
  setAnimationPref: (p: AnimationPref) => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      themeMode: "dark",
      animationPref: "full",
      sidebarOpen: true,
      setThemeMode: (themeMode) => set({ themeMode }),
      toggleTheme: () =>
        set({ themeMode: get().themeMode === "dark" ? "light" : "dark" }),
      setAnimationPref: (animationPref) => set({ animationPref }),
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      toggleSidebar: () => set({ sidebarOpen: !get().sidebarOpen }),
    }),
    {
      name: STORAGE_KEYS.themeMode + ".ui",
    }
  )
);
