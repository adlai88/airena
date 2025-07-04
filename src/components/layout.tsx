import { Navigation } from './navigation';
import { Footer } from './footer';

interface LayoutProps {
  children: React.ReactNode;
  hideNavigation?: boolean;
}

export function Layout({ children, hideNavigation }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      {!hideNavigation && <Navigation />}
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}