import { useAppStore } from '@/stores/app-store';
import { useThemeStore } from '@/stores/theme-store';
import { cn } from '@/lib/utils';
import {
    Home,
    GitBranch,
    FileText,
    Settings as SettingsIcon,
    Gauge,
    PlayCircle,
    CheckCircle,
    Database,
    ChevronLeft,
    ChevronRight,
    Moon,
    Sun,
    History,
    BarChart3,
    Sparkles,
    BookOpen,
    LucideIcon,
    Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { CircularProgress } from '@/components/ui/progress';
import logoImage from '@/assets/logo.png';

interface NavItem {
    step: number;
    label: string;
    icon: LucideIcon;
    description?: string;
}

// Workflow steps (0-5) - The main sequential workflow
const WORKFLOW_ITEMS: NavItem[] = [
    { step: 0, label: 'Welcome', icon: Home, description: 'Get started' },
    { step: 1, label: 'Integration', icon: GitBranch, description: 'Connect data source' },
    { step: 2, label: 'Extract Skills', icon: FileText, description: 'Extract and review skills' },
    { step: 3, label: 'Configure', icon: Gauge, description: 'Set proficiency levels' },
    { step: 4, label: 'Assessment', icon: PlayCircle, description: 'Run AI assessment' },
    { step: 5, label: 'Review', icon: CheckCircle, description: 'Review and export' },
];

// Tools & Settings (6-11) - Non-sequential utility pages
const TOOLS_ITEMS: NavItem[] = [
    { step: 6, label: 'History', icon: History, description: 'Past assessments' },
    { step: 7, label: 'Analytics', icon: BarChart3, description: 'Insights & metrics' },
    { step: 8, label: 'Prompts', icon: Sparkles, description: 'Edit AI prompts' },
    { step: 9, label: 'Environments', icon: Database, description: 'Manage environments' },
    { step: 10, label: 'Settings', icon: SettingsIcon, description: 'App settings' },
    { step: 11, label: 'Documentation', icon: BookOpen, description: 'Help & guides' },
];

function NavButton({
    item,
    isActive,
    isCompleted,
    isCollapsed,
    onClick,
}: {
    item: NavItem;
    isActive: boolean;
    isCompleted: boolean;
    isCollapsed: boolean;
    onClick: () => void;
}) {
    const Icon = item.icon;

    const button = (
        <button
            onClick={onClick}
            className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-sidebar-foreground/70',
                'hover:bg-white/10 hover:text-sidebar-foreground',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                isActive && 'bg-primary text-primary-foreground hover:bg-primary/90',
                isCollapsed && 'justify-center px-2'
            )}
        >
            <div className="relative">
                <Icon className="h-5 w-5 shrink-0" />
                {isCompleted && !isActive && (
                    <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-success flex items-center justify-center">
                        <Check className="h-2 w-2 text-success-foreground" />
                    </div>
                )}
            </div>
            {!isCollapsed && (
                <>
                    <span className="text-sm font-medium truncate">{item.label}</span>
                    {isActive && (
                        <div className="ml-auto h-1.5 w-1.5 rounded-full bg-current shrink-0" />
                    )}
                </>
            )}
        </button>
    );

    if (isCollapsed) {
        return (
            <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>{button}</TooltipTrigger>
                <TooltipContent side="right" sideOffset={12}>
                    <div className="flex items-center gap-2">
                        <span className="font-medium">{item.label}</span>
                        {isCompleted && (
                            <Check className="h-3 w-3 text-success" />
                        )}
                    </div>
                    {item.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                    )}
                </TooltipContent>
            </Tooltip>
        );
    }

    return button;
}

function WorkflowProgress({ collapsed }: { collapsed: boolean }) {
    const getWorkflowProgress = useAppStore((state) => state.getWorkflowProgress);
    const progress = getWorkflowProgress();

    if (collapsed) {
        return (
            <div className="px-2 py-3 flex justify-center">
                <Tooltip delayDuration={0}>
                    <TooltipTrigger>
                        <CircularProgress
                            value={progress.completed}
                            max={progress.total}
                            size={32}
                            strokeWidth={3}
                            color="success"
                            showLabel={false}
                        />
                    </TooltipTrigger>
                    <TooltipContent side="right" sideOffset={12}>
                        <p className="font-medium">Workflow Progress</p>
                        <p className="text-xs text-muted-foreground">
                            {progress.completed} of {progress.total} steps completed
                        </p>
                    </TooltipContent>
                </Tooltip>
            </div>
        );
    }

    return (
        <div className="px-4 py-3">
            <div className="flex justify-between text-xs text-sidebar-foreground/60 mb-2">
                <span>Workflow Progress</span>
                <span className="font-medium tabular-nums">
                    {progress.completed}/{progress.total}
                </span>
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                    className="h-full bg-gradient-to-r from-primary to-success transition-all duration-500 ease-out rounded-full"
                    style={{ width: `${progress.percentage}%` }}
                />
            </div>
        </div>
    );
}

export default function Sidebar() {
    const currentStep = useAppStore((state) => state.currentStep);
    const isSidebarCollapsed = useAppStore((state) => state.isSidebarCollapsed);
    const completedSteps = useAppStore((state) => state.completedSteps);
    const setCurrentStep = useAppStore((state) => state.setCurrentStep);
    const toggleSidebar = useAppStore((state) => state.toggleSidebar);

    const theme = useThemeStore((state) => state.theme);
    const toggleTheme = useThemeStore((state) => state.toggleTheme);

    return (
        <TooltipProvider>
            <div
                className={cn(
                    'fixed left-0 top-0 h-screen bg-sidebar text-sidebar-foreground border-r border-sidebar/50 transition-all duration-300 z-50 flex flex-col',
                    isSidebarCollapsed ? 'w-20' : 'w-64'
                )}
            >
                {/* Header */}
                <div className="p-4 border-b border-white/10 shrink-0">
                    {isSidebarCollapsed ? (
                        <>
                            <div className="flex justify-center">
                                <img
                                    src={logoImage}
                                    alt="Proficiency Studio"
                                    className="h-12 w-12 object-contain"
                                />
                            </div>
                            <div className="mt-3 flex justify-center">
                                <Tooltip delayDuration={0}>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon-sm"
                                            onClick={toggleSidebar}
                                            aria-label="Expand sidebar"
                                        >
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="right" sideOffset={12}>
                                        Expand sidebar
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="flex justify-center mb-2">
                                <img
                                    src={logoImage}
                                    alt="Proficiency Studio"
                                    className="h-24 w-auto object-contain"
                                />
                            </div>
                            <div className="flex justify-end">
                                <Tooltip delayDuration={0}>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon-sm"
                                            onClick={toggleSidebar}
                                            aria-label="Collapse sidebar"
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="right" sideOffset={12}>
                                        Collapse sidebar
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                        </>
                    )}
                </div>

                {/* Workflow Progress */}
                <WorkflowProgress collapsed={isSidebarCollapsed} />

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto py-2 scrollbar-thin" aria-label="Main navigation">
                    {/* Workflow Section */}
                    <div className="space-y-1 px-2">
                        {!isSidebarCollapsed && (
                            <p className="px-3 py-2 text-xs font-semibold sidebar-foreground/50 uppercase tracking-wider">
                                Workflow
                            </p>
                        )}
                        {WORKFLOW_ITEMS.map((item) => (
                            <NavButton
                                key={item.step}
                                item={item}
                                isActive={currentStep === item.step}
                                isCompleted={completedSteps.has(item.step)}
                                isCollapsed={isSidebarCollapsed}
                                onClick={() => setCurrentStep(item.step)}
                            />
                        ))}
                    </div>

                    {/* Divider */}
                    <div className="my-4 mx-4 border-t border-white/10" />

                    {/* Tools Section */}
                    <div className="space-y-1 px-2">
                        {!isSidebarCollapsed && (
                            <p className="px-3 py-2 text-xs font-semibold sidebar-foreground/50 uppercase tracking-wider">
                                Tools
                            </p>
                        )}
                        {TOOLS_ITEMS.map((item) => (
                            <NavButton
                                key={item.step}
                                item={item}
                                isActive={currentStep === item.step}
                                isCompleted={false} // Tools don't have completion state
                                isCollapsed={isSidebarCollapsed}
                                onClick={() => setCurrentStep(item.step)}
                            />
                        ))}
                    </div>
                </nav>

                {/* Footer */}
                <div className="p-4 border-t border-white/10 shrink-0">
                    <Tooltip delayDuration={0}>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size={isSidebarCollapsed ? 'icon' : 'default'}
                                onClick={toggleTheme}
                                className="w-full"
                                aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                            >
                                {theme === 'dark' ? (
                                    <Sun className="h-5 w-5" />
                                ) : (
                                    <Moon className="h-5 w-5" />
                                )}
                                {!isSidebarCollapsed && (
                                    <span className="ml-2">
                                        {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                                    </span>
                                )}
                            </Button>
                        </TooltipTrigger>
                        {isSidebarCollapsed && (
                            <TooltipContent side="right" sideOffset={12}>
                                {theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                            </TooltipContent>
                        )}
                    </Tooltip>
                </div>
            </div>
        </TooltipProvider>
    );
}
