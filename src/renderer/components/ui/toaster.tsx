import {
    Toast,
    ToastClose,
    ToastDescription,
    ToastProvider,
    ToastTitle,
    ToastViewport,
} from '@/components/ui/toast';
import { useToastStore, ToastData } from '@/stores/toast-store';
import { CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react';

const getToastIcon = (variant: ToastData['variant']) => {
    switch (variant) {
        case 'success':
            return <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />;
        case 'warning':
            return <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />;
        case 'destructive':
            return <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />;
        default:
            return <Info className="h-5 w-5 text-slate-600 dark:text-slate-400 flex-shrink-0" />;
    }
};

export function Toaster() {
    const toasts = useToastStore((state) => state.toasts);

    return (
        <ToastProvider>
            {toasts.map((toast) => (
                <Toast key={toast.id} variant={toast.variant}>
                    <div className="flex items-start gap-3">
                        {getToastIcon(toast.variant)}
                        <div className="grid gap-0.5">
                            {toast.title && (
                                <ToastTitle className="font-semibold text-sm">
                                    {toast.title}
                                </ToastTitle>
                            )}
                            {toast.description && (
                                <ToastDescription className="text-xs opacity-80">
                                    {toast.description}
                                </ToastDescription>
                            )}
                        </div>
                    </div>
                    <ToastClose />
                </Toast>
            ))}
            <ToastViewport />
        </ToastProvider>
    );
}
