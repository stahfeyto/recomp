import Link from "next/link";
import { AccountMenu } from "@/components/layout/account-menu";
import { AppBackground } from "@/components/layout/app-background";
import { CommandPalette, CommandPaletteTrigger } from "@/components/layout/command-palette";
import { Dock } from "@/components/layout/dock";
import { LoginReveal } from "@/components/layout/login-reveal";
import { Providers } from "@/components/layout/providers";
import { RegisterFab } from "@/components/layout/register-fab";
import { SpotlightLayer } from "@/components/layout/spotlight-layer";
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
        <div className="app-header__actions">
          <CommandPaletteTrigger />
          <AccountMenu />
        </div>
      </header>

      <Dock />
      <RegisterFab />
      <CommandPalette />
      <LoginReveal />

      <main id="conteudo" className="app-main" tabIndex={-1}>
        {children}
      </main>
    </Providers>
  );
}
