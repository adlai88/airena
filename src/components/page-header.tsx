import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  subtitle?: React.ReactNode;
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
    <div className={cn('py-6 sm:py-8 lg:py-12', containerClasses[variant], className)}>
      <div className="text-center px-4 sm:px-6">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 sm:mb-6">
          {title}
        </h1>
        {subtitle && (
          <p className="text-lg sm:text-xl text-muted-foreground mb-6 sm:mb-8">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}