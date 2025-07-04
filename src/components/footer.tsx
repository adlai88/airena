import { Button } from '@/components/ui/button';

export function Footer() {
  return (
    <footer className="border-t border-border bg-background mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground">Airena</h3>
            <p className="text-sm text-muted-foreground">
              Turn your are.na channels into a personal intelligence agent
            </p>
          </div>

          {/* Product */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-foreground">Product</h4>
            <div className="space-y-2">
              <Button variant="link" className="p-0 h-auto text-sm text-muted-foreground hover:text-foreground">
                Features
              </Button>
              <Button variant="link" className="p-0 h-auto text-sm text-muted-foreground hover:text-foreground">
                How it works
              </Button>
              <Button variant="link" className="p-0 h-auto text-sm text-muted-foreground hover:text-foreground">
                Templates
              </Button>
            </div>
          </div>

          {/* Resources */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-foreground">Resources</h4>
            <div className="space-y-2">
              <Button variant="link" className="p-0 h-auto text-sm text-muted-foreground hover:text-foreground">
                Documentation
              </Button>
              <Button variant="link" className="p-0 h-auto text-sm text-muted-foreground hover:text-foreground">
                Examples
              </Button>
              <Button variant="link" className="p-0 h-auto text-sm text-muted-foreground hover:text-foreground">
                Support
              </Button>
            </div>
          </div>

          {/* Connect */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-foreground">Connect</h4>
            <div className="space-y-2">
              <Button variant="link" className="p-0 h-auto text-sm text-muted-foreground hover:text-foreground">
                GitHub
              </Button>
              <Button variant="link" className="p-0 h-auto text-sm text-muted-foreground hover:text-foreground">
                Twitter
              </Button>
              <Button variant="link" className="p-0 h-auto text-sm text-muted-foreground hover:text-foreground">
                Are.na
              </Button>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-8 pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm text-muted-foreground">
            © 2024 Airena. Built with Are.na, OpenAI, and Vercel.
          </p>
          <div className="mt-4 md:mt-0 flex space-x-4">
            <Button variant="link" className="p-0 h-auto text-sm text-muted-foreground hover:text-foreground">
              Privacy
            </Button>
            <Button variant="link" className="p-0 h-auto text-sm text-muted-foreground hover:text-foreground">
              Terms
            </Button>
          </div>
        </div>
      </div>
    </footer>
  );
}