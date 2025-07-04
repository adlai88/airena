import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  variant?: 'narrow' | 'standard' | 'wide';
  className?: string;
}

export function PageHeader({ 
  title, 
  subtitle, 
  variant = 'standard',
  className 
}: PageHeaderProps) {
  const containerClasses = {
    narrow: 'max-w-2xl mx-auto',
    standard: 'max-w-4xl mx-auto', 
    wide: 'max-w-6xl mx-auto'
  };

  return (
    <div className={cn('py-12', containerClasses[variant], className)}>
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-6">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xl text-muted-foreground mb-8">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}