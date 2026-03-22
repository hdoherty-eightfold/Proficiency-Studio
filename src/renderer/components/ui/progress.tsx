import * as React from 'react';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const progressVariants = cva(
    'relative w-full overflow-hidden rounded-full bg-secondary',
    {
        variants: {
            size: {
                xs: 'h-1',
                sm: 'h-1.5',
                default: 'h-2',
                lg: 'h-3',
                xl: 'h-4',
            },
        },
        defaultVariants: {
            size: 'default',
        },
    }
);

interface ProgressProps
    extends React.HTMLAttributes<HTMLDivElement>,
        VariantProps<typeof progressVariants> {
    value?: number;
    max?: number;
    showLabel?: boolean;
    label?: string;
    color?: 'default' | 'success' | 'warning' | 'destructive' | 'info';
    indeterminate?: boolean;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
    (
        {
            className,
            value = 0,
            max = 100,
            showLabel,
            label,
            color = 'default',
            size,
            indeterminate,
            ...props
        },
        ref
    ) => {
        const percentage = Math.min(100, Math.max(0, (value / max) * 100));

        const colorStyles = {
            default: 'bg-primary',
            success: 'bg-success',
            warning: 'bg-warning',
            destructive: 'bg-destructive',
            info: 'bg-info',
        };

        return (
            <div className="space-y-1.5">
                {(showLabel || label) && (
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{label || 'Progress'}</span>
                        {!indeterminate && (
                            <span className="font-medium tabular-nums">{Math.round(percentage)}%</span>
                        )}
                    </div>
                )}
                <div
                    ref={ref}
                    role="progressbar"
                    aria-valuenow={indeterminate ? undefined : value}
                    aria-valuemin={0}
                    aria-valuemax={max}
                    className={cn(progressVariants({ size }), className)}
                    {...props}
                >
                    <div
                        className={cn(
                            'h-full transition-all duration-300 ease-out rounded-full',
                            colorStyles[color],
                            indeterminate && 'animate-indeterminate w-1/3'
                        )}
                        style={indeterminate ? {} : { width: `${percentage}%` }}
                    />
                </div>
            </div>
        );
    }
);

Progress.displayName = 'Progress';

// Circular progress variant
interface CircularProgressProps {
    value?: number;
    max?: number;
    size?: number;
    strokeWidth?: number;
    color?: 'default' | 'success' | 'warning' | 'destructive' | 'info';
    showLabel?: boolean;
    className?: string;
}

function CircularProgress({
    value = 0,
    max = 100,
    size = 40,
    strokeWidth = 4,
    color = 'default',
    showLabel,
    className,
}: CircularProgressProps) {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100));
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    const colorStyles = {
        default: 'stroke-primary',
        success: 'stroke-success',
        warning: 'stroke-warning',
        destructive: 'stroke-destructive',
        info: 'stroke-info',
    };

    return (
        <div className={cn('relative inline-flex items-center justify-center', className)}>
            <svg width={size} height={size} className="-rotate-90">
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    className="stroke-secondary"
                    strokeWidth={strokeWidth}
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    className={cn('transition-all duration-300', colorStyles[color])}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                />
            </svg>
            {showLabel && (
                <span className="absolute text-xs font-medium tabular-nums">
                    {Math.round(percentage)}%
                </span>
            )}
        </div>
    );
}

export { Progress, CircularProgress, progressVariants };
