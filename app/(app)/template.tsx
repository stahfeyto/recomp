import { PageTransition } from "@/components/layout/page-transition";

/**
 * O template (ao contrário do layout) é recriado a cada navegação, por isso as
 * animações de entrada e saída da View Transition disparam aqui.
 */
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
