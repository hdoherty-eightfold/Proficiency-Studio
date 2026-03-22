import * as React from 'react';
import { cn } from '@/lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
    width?: string | number;
    height?: string | number;
    lines?: number;
}

function Skeleton({
    className,
    variant = 'rounded',
    width,
    height,
    lines = 1,
    style,
    ...props
}: SkeletonProps) {
    const baseStyles = 'animate-pulse bg-muted shimmer';

    const variantStyles = {
        text: 'h-4 rounded',
        circular: 'rounded-full',
        rectangular: 'rounded-none',
        rounded: 'rounded-md',
    };

    const computedStyle = {
        ...style,
        width: width !== undefined ? (typeof width === 'number' ? `${width}px` : width) : undefined,
        height: height !== undefined ? (typeof height === 'number' ? `${height}px` : height) : undefined,
    };

    if (lines > 1) {
        return (
            <div className={cn('space-y-2', className)} {...props}>
                {Array.from({ length: lines }).map((_, i) => (
                    <div
                        key={i}
                        className={cn(baseStyles, variantStyles.text)}
                        style={{
                            width: i === lines - 1 ? '60%' : width || '100%',
                            height: height || undefined,
                        }}
                    />
                ))}
            </div>
        );
    }

    return (
        <div
            className={cn(baseStyles, variantStyles[variant], className)}
            style={computedStyle}
            {...props}
        />
    );
}

function SkeletonCard({ className }: { className?: string }) {
    return (
        <div className={cn('rounded-lg border bg-card p-6 space-y-4', className)}>
            <div className="flex items-center gap-4">
                <Skeleton variant="circular" width={48} height={48} />
                <div className="space-y-2 flex-1">
                    <Skeleton variant="text" className="w-3/4" />
                    <Skeleton variant="text" className="w-1/2" />
                </div>
            </div>
            <Skeleton lines={3} />
        </div>
    );
}

function SkeletonTable({
    rows = 5,
    columns = 4,
    className,
}: {
    rows?: number;
    columns?: number;
    className?: string;
}) {
    return (
        <div className={cn('space-y-3', className)}>
            {/* Header */}
            <div className="flex gap-4 pb-2 border-b">
                {Array.from({ length: columns }).map((_, i) => (
                    <Skeleton key={i} variant="text" className="flex-1 h-5" />
                ))}
            </div>
            {/* Rows */}
            {Array.from({ length: rows }).map((_, rowIndex) => (
                <div key={rowIndex} className="flex gap-4">
                    {Array.from({ length: columns }).map((_, colIndex) => (
                        <Skeleton key={colIndex} variant="text" className="flex-1 h-4" />
                    ))}
                </div>
            ))}
        </div>
    );
}

function SkeletonList({
    items = 5,
    className,
}: {
    items?: number;
    className?: string;
}) {
    return (
        <div className={cn('space-y-3', className)}>
            {Array.from({ length: items }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
                    <Skeleton variant="circular" width={40} height={40} />
                    <div className="flex-1 space-y-2">
                        <Skeleton variant="text" className="w-3/4" />
                        <Skeleton variant="text" className="w-1/2 h-3" />
                    </div>
                    <Skeleton variant="rounded" width={60} height={24} />
                </div>
            ))}
        </div>
    );
}

function SkeletonStats({ className }: { className?: string }) {
    return (
        <div className={cn('grid grid-cols-2 md:grid-cols-4 gap-4', className)}>
            {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-lg border bg-card p-4 space-y-2">
                    <Skeleton variant="text" className="w-1/2 h-3" />
                    <Skeleton variant="text" className="w-3/4 h-8" />
                    <Skeleton variant="text" className="w-full h-3" />
                </div>
            ))}
        </div>
    );
}

export { Skeleton, SkeletonCard, SkeletonTable, SkeletonList, SkeletonStats };
