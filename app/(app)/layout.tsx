import Link from "next/link";
import { AccountMenu } from "@/components/layout/account-menu";
import { AppBackground } from "@/components/layout/app-background";
import { Dock } from "@/components/layout/dock";
import { SpotlightLayer } from "@/components/layout/spotlight-layer";
import { Providers } from "@/components/layout/providers";
import "./app-shell.css";

/**
 * Layout das páginas autenticadas. O proxy.ts já redireciona quem não tem sessão;
 * a leitura de dados de cada página volta a validar a sessão.
 */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <Providers>
      <a href="#conteudo" className="skip-link">
        Saltar para o conteúdo
      </a>
      <AppBackground />
      <SpotlightLayer />

      <header className="app-header">
        <Link href="/" className="app-header__mark" aria-label="RECOMP, ir para o Painel">
          RECOMP
        </Link>
        <AccountMenu />
      </header>

      <Dock />

      <main id="conteudo" className="app-main" tabIndex={-1}>
        {children}
      </main>
    </Providers>
  );
}
