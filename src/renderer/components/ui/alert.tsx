import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';

const alertVariants = cva(
  'relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground',
  {
    variants: {
      variant: {
        default: 'bg-background text-foreground',
        info: 'border-info/50 bg-info/10 text-info dark:border-info [&>svg]:text-info',
        success:
          'border-success/50 bg-success/10 text-success dark:border-success [&>svg]:text-success',
        warning:
          'border-warning/50 bg-warning/10 text-warning-foreground dark:border-warning [&>svg]:text-warning',
        destructive:
          'border-destructive/50 bg-destructive/10 text-destructive dark:border-destructive [&>svg]:text-destructive',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> &
    VariantProps<typeof alertVariants> & {
      dismissible?: boolean;
      onDismiss?: () => void;
    }
>(({ className, variant, dismissible, onDismiss, children, ...props }, ref) => {
  const icons = {
    default: Info,
    info: Info,
    success: CheckCircle2,
    warning: AlertTriangle,
    destructive: AlertCircle,
  };

  const Icon = icons[variant || 'default'];

  return (
    <div ref={ref} role="alert" className={cn(alertVariants({ variant }), className)} {...props}>
      <Icon className="h-4 w-4" />
      {children}
      {dismissible && (
        <button
          type="button"
          onClick={onDismiss}
          className="absolute right-2 top-2 rounded-md p-1 opacity-70 hover:opacity-100 transition-opacity"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Dismiss</span>
        </button>
      )}
    </div>
  );
});
Alert.displayName = 'Alert';

const AlertTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement> & { as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' }
>(({ className, as: Tag = 'h5', ...props }, ref) => (
  <Tag
    ref={ref}
    className={cn('mb-1 font-medium leading-none tracking-tight', className)}
    {...props}
  />
));
AlertTitle.displayName = 'AlertTitle';

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('text-sm [&_p]:leading-relaxed opacity-90', className)} {...props} />
));
AlertDescription.displayName = 'AlertDescription';

// Inline alert for smaller contexts
interface InlineAlertProps {
  variant?: 'info' | 'success' | 'warning' | 'destructive';
  children: React.ReactNode;
  className?: string;
}

function InlineAlert({ variant = 'info', children, className }: InlineAlertProps) {
  const icons = {
    info: Info,
    success: CheckCircle2,
    warning: AlertTriangle,
    destructive: AlertCircle,
  };

  const colorStyles = {
    info: 'text-info',
    success: 'text-success',
    warning: 'text-warning',
    destructive: 'text-destructive',
  };

  const Icon = icons[variant];

  return (
    <div className={cn('flex items-center gap-2 text-sm', colorStyles[variant], className)}>
      <Icon className="h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

export { Alert, AlertTitle, AlertDescription, InlineAlert, alertVariants };
