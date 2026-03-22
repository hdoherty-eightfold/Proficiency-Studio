import React from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface PageContainerProps {
    /** Page title displayed in the header */
    title: string;
    /** Optional description text below the title */
    description?: string;
    /** Optional icon displayed next to the title */
    icon?: LucideIcon;
    /** Optional action buttons to display in the header */
    actions?: React.ReactNode;
    /** Maximum width of the content area */
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
    /** Whether to show a sticky header */
    stickyHeader?: boolean;
    /** Additional className for the container */
    className?: string;
    /** Page content */
    children: React.ReactNode;
}

const maxWidthClasses = {
    sm: 'max-w-2xl',
    md: 'max-w-4xl',
    lg: 'max-w-5xl',
    xl: 'max-w-6xl',
    '2xl': 'max-w-7xl',
    full: 'max-w-full',
};

export function PageContainer({
    title,
    description,
    icon: Icon,
    actions,
    maxWidth = 'xl',
    stickyHeader = true,
    className,
    children,
}: PageContainerProps) {
    const maxWidthClass = maxWidthClasses[maxWidth];

    return (
        <div className={cn('min-h-screen bg-background', className)}>
            {/* Header */}
            <header
                className={cn(
                    'bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b z-40',
                    stickyHeader && 'sticky top-0'
                )}
            >
                <div className={cn('mx-auto px-6 py-5', maxWidthClass)}>
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 min-w-0">
                            {Icon && (
                                <div className="p-2.5 rounded-xl bg-primary/10 shrink-0">
                                    <Icon className="h-6 w-6 text-primary" />
                                </div>
                            )}
                            <div className="min-w-0">
                                <h1 className="text-2xl font-bold tracking-tight truncate">
                                    {title}
                                </h1>
                                {description && (
                                    <p className="text-sm text-muted-foreground mt-0.5 truncate">
                                        {description}
                                    </p>
                                )}
                            </div>
                        </div>
                        {actions && (
                            <div className="flex items-center gap-2 shrink-0">{actions}</div>
                        )}
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className={cn('mx-auto px-6 py-8', maxWidthClass)}>{children}</main>
        </div>
    );
}

/**
 * Simple page header without the full container wrapper
 * Use when you need just the header styling without the container layout
 */
interface PageHeaderProps {
    title: string;
    description?: string;
    icon?: LucideIcon;
    actions?: React.ReactNode;
    className?: string;
}

export function PageHeader({
    title,
    description,
    icon: Icon,
    actions,
    className,
}: PageHeaderProps) {
    return (
        <div className={cn('flex items-center justify-between gap-4 mb-8', className)}>
            <div className="flex items-center gap-4 min-w-0">
                {Icon && (
                    <div className="p-2.5 rounded-xl bg-primary/10 shrink-0">
                        <Icon className="h-6 w-6 text-primary" />
                    </div>
                )}
                <div className="min-w-0">
                    <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
                    {description && (
                        <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
                    )}
                </div>
            </div>
            {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </div>
    );
}

/**
 * Section component for organizing content within a page
 */
interface PageSectionProps {
    title?: string;
    description?: string;
    actions?: React.ReactNode;
    className?: string;
    children: React.ReactNode;
}

export function PageSection({
    title,
    description,
    actions,
    className,
    children,
}: PageSectionProps) {
    return (
        <section className={cn('space-y-4', className)}>
            {(title || description || actions) && (
                <div className="flex items-center justify-between gap-4">
                    <div>
                        {title && (
                            <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
                        )}
                        {description && (
                            <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
                        )}
                    </div>
                    {actions && <div className="flex items-center gap-2">{actions}</div>}
                </div>
            )}
            {children}
        </section>
    );
}
