import type { ReactNode } from "react";
import { AppFrame } from "@/components/app-frame";
import { CommandPalette } from "@/components/search/command-palette";
import { NativeBridge } from "@/components/native-bridge";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AppFrame>
      {children}
      <CommandPalette />
      <NativeBridge />
    </AppFrame>
  );
}
