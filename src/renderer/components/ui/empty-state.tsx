// React import not needed with JSX transform
import { cn } from '@/lib/utils';
import { LucideIcon, Inbox, Search, FileX, AlertCircle, FolderOpen } from 'lucide-react';
import { Button } from './button';

interface EmptyStateProps {
    icon?: LucideIcon;
    title: string;
    description?: string;
    action?: {
        label: string;
        onClick: () => void;
        variant?: 'default' | 'secondary' | 'outline';
    };
    secondaryAction?: {
        label: string;
        onClick: () => void;
    };
    className?: string;
    size?: 'sm' | 'default' | 'lg';
}

function EmptyState({
    icon: Icon = Inbox,
    title,
    description,
    action,
    secondaryAction,
    className,
    size = 'default',
}: EmptyStateProps) {
    const sizeStyles = {
        sm: {
            container: 'py-8',
            icon: 'w-8 h-8',
            iconWrapper: 'w-14 h-14',
            title: 'text-base',
            description: 'text-sm',
        },
        default: {
            container: 'py-12',
            icon: 'w-10 h-10',
            iconWrapper: 'w-20 h-20',
            title: 'text-lg',
            description: 'text-sm',
        },
        lg: {
            container: 'py-16',
            icon: 'w-12 h-12',
            iconWrapper: 'w-24 h-24',
            title: 'text-xl',
            description: 'text-base',
        },
    };

    const styles = sizeStyles[size];

    return (
        <div
            className={cn(
                'flex flex-col items-center justify-center text-center',
                styles.container,
                className
            )}
        >
            <div
                className={cn(
                    'flex items-center justify-center rounded-full bg-muted mb-4',
                    styles.iconWrapper
                )}
            >
                <Icon className={cn('text-muted-foreground', styles.icon)} />
            </div>
            <h3 className={cn('font-semibold text-foreground mb-2', styles.title)}>{title}</h3>
            {description && (
                <p className={cn('text-muted-foreground max-w-sm mb-6', styles.description)}>
                    {description}
                </p>
            )}
            {(action || secondaryAction) && (
                <div className="flex items-center gap-3">
                    {action && (
                        <Button onClick={action.onClick} variant={action.variant || 'default'}>
                            {action.label}
                        </Button>
                    )}
                    {secondaryAction && (
                        <Button variant="outline" onClick={secondaryAction.onClick}>
                            {secondaryAction.label}
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}

// Pre-built empty state variants for common scenarios
function NoDataEmptyState({
    action,
    className,
}: {
    action?: { label: string; onClick: () => void };
    className?: string;
}) {
    return (
        <EmptyState
            icon={Inbox}
            title="No data yet"
            description="Get started by adding your first item."
            action={action}
            className={className}
        />
    );
}

function NoResultsEmptyState({
    searchQuery,
    onClear,
    className,
}: {
    searchQuery?: string;
    onClear?: () => void;
    className?: string;
}) {
    return (
        <EmptyState
            icon={Search}
            title="No results found"
            description={
                searchQuery
                    ? `No results found for "${searchQuery}". Try adjusting your search.`
                    : 'No results match your filters. Try adjusting your criteria.'
            }
            action={onClear ? { label: 'Clear search', onClick: onClear, variant: 'outline' } : undefined}
            className={className}
        />
    );
}

function ErrorEmptyState({
    error,
    onRetry,
    className,
}: {
    error?: string;
    onRetry?: () => void;
    className?: string;
}) {
    return (
        <EmptyState
            icon={AlertCircle}
            title="Something went wrong"
            description={error || 'An error occurred while loading the data. Please try again.'}
            action={onRetry ? { label: 'Try again', onClick: onRetry } : undefined}
            className={className}
        />
    );
}

function NoFileEmptyState({
    action,
    className,
}: {
    action?: { label: string; onClick: () => void };
    className?: string;
}) {
    return (
        <EmptyState
            icon={FileX}
            title="No file selected"
            description="Upload or select a file to get started."
            action={action}
            className={className}
        />
    );
}

function EmptyFolderState({
    folderName,
    action,
    className,
}: {
    folderName?: string;
    action?: { label: string; onClick: () => void };
    className?: string;
}) {
    return (
        <EmptyState
            icon={FolderOpen}
            title={folderName ? `${folderName} is empty` : 'This folder is empty'}
            description="There are no items in this location."
            action={action}
            className={className}
        />
    );
}

export {
    EmptyState,
    NoDataEmptyState,
    NoResultsEmptyState,
    ErrorEmptyState,
    NoFileEmptyState,
    EmptyFolderState,
};
