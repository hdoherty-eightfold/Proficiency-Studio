import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
    'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
    {
        variants: {
            variant: {
                default: 'bg-primary text-primary-foreground',
                secondary: 'bg-secondary text-secondary-foreground',
                destructive: 'bg-destructive text-destructive-foreground',
                success: 'bg-success text-success-foreground',
                warning: 'bg-warning text-warning-foreground',
                info: 'bg-info text-info-foreground',
                outline: 'border border-current bg-transparent',
                muted: 'bg-muted text-muted-foreground',
            },
            size: {
                sm: 'text-[10px] px-2 py-0',
                default: 'text-xs px-2.5 py-0.5',
                lg: 'text-sm px-3 py-1',
            },
        },
        defaultVariants: {
            variant: 'default',
            size: 'default',
        },
    }
);

interface BadgeProps
    extends React.HTMLAttributes<HTMLDivElement>,
        VariantProps<typeof badgeVariants> {
    dot?: boolean;
    dotColor?: string;
    removable?: boolean;
    onRemove?: () => void;
}

function Badge({
    className,
    variant,
    size,
    dot,
    dotColor,
    removable,
    onRemove,
    children,
    ...props
}: BadgeProps) {
    return (
        <div className={cn(badgeVariants({ variant, size }), className)} {...props}>
            {dot && (
                <span
                    className="mr-1.5 h-1.5 w-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: dotColor || 'currentColor' }}
                />
            )}
            {children}
            {removable && (
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove?.();
                    }}
                    className="ml-1 -mr-1 h-3.5 w-3.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 inline-flex items-center justify-center"
                >
                    <svg
                        className="h-2.5 w-2.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            )}
        </div>
    );
}

export { Badge, badgeVariants };
