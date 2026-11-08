"use client";

import { Check } from "lucide-react";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { haptic } from "@/lib/haptics";
import { applyRecommendation } from "./actions";

export function ApplyButton() {
  const [pending, start] = useTransition();
  const { toast } = useToast();
  return (
    <Button
      variant="acid"
      size="lg"
      loading={pending}
      onClick={() =>
        start(async () => {
          const res = await applyRecommendation();
          if (res.ok) haptic(15);
          toast({ variant: res.ok ? "success" : "error", title: res.message, duration: 7000 });
        })
      }
    >
      {pending ? "A aplicar…" : (
        <>
          <Check /> Aplicar às metas
        </>
      )}
    </Button>
  );
}
