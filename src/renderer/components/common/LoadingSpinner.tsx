import React from 'react';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
    size?: number;
    text?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
    className,
    size = 24,
    text,
    ...props
}) => {
    return (
        <div className={cn("flex flex-col items-center justify-center gap-2", className)} {...props}>
            <Loader2 className="animate-spin text-primary" size={size} />
            {text && <p className="text-sm text-muted-foreground">{text}</p>}
        </div>
    );
};
