"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

export function ConfirmButton({ message, children }: { message: string; children: ReactNode }) {
  return (
    <Button
      type="submit"
      variant="danger"
      onClick={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </Button>
  );
}
