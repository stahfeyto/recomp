/**
 * Fundo da app: quase preto, com gradientes radiais azuis desfocados que derivam
 * devagar (só desktop, sem "reduzir movimento") e um grain muito subtil.
 */
export function AppBackground() {
  return (
    <div className="app-bg" aria-hidden="true">
      <div className="app-bg__blob app-bg__blob--a" />
      <div className="app-bg__blob app-bg__blob--b" />
      <div className="app-bg__blob app-bg__blob--c" />
      <div className="app-bg__grain" />
    </div>
  );
}
