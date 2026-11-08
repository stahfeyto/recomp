"use client";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

// Só para a pré-visualização do design system (fase 3). Sai na fase 5.
export function ToastDemo() {
  const { toast } = useToast();
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        onClick={() =>
          toast({ variant: "success", title: "Medição guardada", description: "Cintura 83,5 cm" })
        }
      >
        Sucesso
      </Button>
      <Button
        onClick={() =>
          toast({ variant: "error", title: "Não foi possível guardar", description: "Tenta de novo." })
        }
      >
        Erro
      </Button>
      <Button
        onClick={() =>
          toast({
            variant: "info",
            title: "Medição apagada",
            action: { label: "Anular", onClick: () => toast({ variant: "success", title: "Reposta" }) },
          })
        }
      >
        Com anular
      </Button>
    </div>
  );
}
