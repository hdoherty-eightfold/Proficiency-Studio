import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

const buttonVariants = cva(
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
    {
        variants: {
            variant: {
                default: 'bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98] shadow-sm hover:shadow-md',
                destructive:
                    'bg-destructive text-destructive-foreground hover:bg-destructive/90 active:scale-[0.98]',
                outline:
                    'border border-input bg-background hover:bg-accent hover:text-accent-foreground hover:border-primary/50 hover:shadow-sm active:scale-[0.98]',
                secondary:
                    'bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:shadow-sm active:scale-[0.98]',
                ghost: 'hover:bg-accent hover:text-accent-foreground active:scale-[0.98]',
                link: 'text-primary underline-offset-4 hover:underline',
                success: 'bg-success text-success-foreground hover:bg-success/90 active:scale-[0.98] shadow-sm',
                warning: 'bg-warning text-warning-foreground hover:bg-warning/90 active:scale-[0.98] shadow-sm',
                info: 'bg-info text-info-foreground hover:bg-info/90 active:scale-[0.98] shadow-sm',
                gradient: 'bg-gradient-to-r from-primary to-blue-600 text-white hover:opacity-90 active:scale-[0.98] shadow-md hover:shadow-lg',
                glass: 'bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 text-foreground',
            },
            size: {
                default: 'h-10 px-4 py-2',
                sm: 'h-9 rounded-md px-3 text-xs',
                lg: 'h-11 rounded-md px-8',
                xl: 'h-12 rounded-lg px-10 text-base',
                icon: 'h-10 w-10',
                'icon-sm': 'h-8 w-8',
                'icon-lg': 'h-12 w-12',
            },
        },
        defaultVariants: {
            variant: 'default',
            size: 'default',
        },
    }
);

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
        VariantProps<typeof buttonVariants> {
    asChild?: boolean;
    loading?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild = false, loading, leftIcon, rightIcon, children, disabled, ...props }, ref) => {
        const Comp = asChild ? Slot : 'button';

        // When loading, show spinner and make text invisible but preserve width
        const content = (
            <>
                {loading && (
                    <Loader2 className="h-4 w-4 animate-spin absolute" />
                )}
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
