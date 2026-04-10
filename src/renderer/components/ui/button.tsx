import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98] shadow-sm hover:shadow-md',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/90 active:scale-[0.98]',
        outline:
          'border border-input bg-transparent backdrop-blur-sm hover:bg-accent/60 hover:text-accent-foreground hover:border-primary/50 hover:shadow-sm active:scale-[0.98] arc-border',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:shadow-sm active:scale-[0.98]',
        ghost: 'hover:bg-accent hover:text-accent-foreground active:scale-[0.98] arc-border',
        link: 'text-primary underline-offset-4 hover:underline',
        success:
          'bg-success text-success-foreground hover:bg-success/90 active:scale-[0.98] shadow-sm',
        warning:
          'bg-warning text-warning-foreground hover:bg-warning/90 active:scale-[0.98] shadow-sm',
        info: 'bg-info text-info-foreground hover:bg-info/90 active:scale-[0.98] shadow-sm',
        gradient:
          'bg-gradient-to-r from-primary via-primary/85 to-primary/60 text-primary-foreground hover:opacity-90 active:scale-[0.98] shadow-md hover:shadow-lg hover:shadow-primary/25',
        glass:
          'bg-white/10 dark:bg-white/5 backdrop-blur-md border border-white/25 dark:border-white/10 hover:bg-white/20 dark:hover:bg-white/10 text-foreground shadow-sm hover:shadow-md active:scale-[0.98]',
        // Back / secondary-navigation button — partial arc border (Google search-bar style)
        // The arc-border CSS class in globals.css draws a teal→blue→purple conic arc
        // covering the left + top edges only; the remaining edges are transparent.
        'back-nav':
          'bg-background/80 text-foreground border border-border/60 hover:bg-accent hover:border-transparent active:scale-[0.98] shadow-sm arc-border',
        // Google Gemini-style colored outlined buttons
        'outline-primary':
          'bg-transparent backdrop-blur-sm border-2 border-primary/70 text-primary hover:bg-primary/10 hover:border-primary active:scale-[0.98]',
        'outline-blue':
          'bg-transparent backdrop-blur-sm border-2 border-blue-500/70 text-blue-600 dark:text-blue-400 dark:border-blue-400/70 hover:bg-blue-500/10 hover:border-blue-500 dark:hover:border-blue-400 active:scale-[0.98]',
        'outline-purple':
          'bg-transparent backdrop-blur-sm border-2 border-purple-500/70 text-purple-600 dark:text-purple-400 dark:border-purple-400/70 hover:bg-purple-500/10 hover:border-purple-500 dark:hover:border-purple-400 active:scale-[0.98]',
        'outline-green':
          'bg-transparent backdrop-blur-sm border-2 border-green-500/70 text-green-600 dark:text-green-400 dark:border-green-400/70 hover:bg-green-500/10 hover:border-green-500 dark:hover:border-green-400 active:scale-[0.98]',
        'outline-orange':
          'bg-transparent backdrop-blur-sm border-2 border-orange-500/70 text-orange-600 dark:text-orange-400 dark:border-orange-400/70 hover:bg-orange-500/10 hover:border-orange-500 dark:hover:border-orange-400 active:scale-[0.98]',
        'outline-red':
          'bg-transparent backdrop-blur-sm border-2 border-red-500/70 text-red-600 dark:text-red-400 dark:border-red-400/70 hover:bg-red-500/10 hover:border-red-500 dark:hover:border-red-400 active:scale-[0.98]',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3 text-xs',
        lg: 'h-11 rounded-lg px-8',
        xl: 'h-12 rounded-xl px-10 text-base',
        pill: 'h-10 px-6 rounded-full',
        icon: 'h-10 w-10 rounded-full',
        'icon-sm': 'h-8 w-8 rounded-full',
        'icon-lg': 'h-12 w-12 rounded-full',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : 'button';

    // When loading, show spinner and make text invisible but preserve width
    const content = (
      <>
        {loading && <Loader2 className="h-4 w-4 animate-spin absolute" />}
        <span className={cn('flex items-center gap-2', loading && 'invisible')}>
          {leftIcon && <span className="shrink-0">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="shrink-0">{rightIcon}</span>}
        </span>
      </>
    );

    return (
      <Comp
        className={cn(
          buttonVariants({ variant, size, className }),
          loading && 'relative cursor-wait'
        )}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {asChild ? children : content}
      </Comp>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
