export function Footer() {
  return (
    <footer className="border-t border-border bg-background mt-auto">
      <div className="max-w-7xl mx-auto px-8 py-6 flex flex-row items-center justify-between">
        <p className="text-sm text-muted-foreground">© Airena 2025</p>
        <div className="flex space-x-6 items-center">
          <a href="#" className="text-sm text-muted-foreground hover:text-foreground">About</a>
          <a href="#" className="text-sm text-muted-foreground hover:text-foreground">Terms</a>
          <a href="#" className="text-sm text-muted-foreground hover:text-foreground">Privacy</a>
        </div>
      </div>
    </footer>
  );
}