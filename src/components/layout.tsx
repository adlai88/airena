import { Navigation } from './navigation';
import { Footer } from './footer';

interface LayoutProps {
  children: React.ReactNode;
  hideNavigation?: boolean;
  homeNav?: boolean;
}

export function Layout({ children, hideNavigation, homeNav }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      {!hideNavigation && <Navigation homeNav={homeNav} />}
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}