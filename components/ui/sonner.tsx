"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useTheme();

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      position="top-center"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          fontFamily: "var(--font-sans)",
          "--normal-bg": "var(--color-surface)",
          "--normal-text": "var(--color-text)",
          "--normal-border": "var(--color-border)",
          "--border-radius": "var(--radius-md)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
