import { motion } from 'motion/react';
import { useAppStore } from '@/stores/app-store';
import { useCommandStore } from '@/stores/command-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { NotificationCenter } from '@/components/common/NotificationCenter';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sparkles,
  Zap,
  Target,
  BarChart3,
  GitBranch,
  FileText,
  PlayCircle,
  History,
  Settings,
  Command,
  ChevronRight,
  Clock,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';

const features = [
  {
    icon: Sparkles,
    title: 'AI-Powered Analysis',
    description: 'Leverage advanced AI to extract and analyze skills from your data',
  },
  {
    icon: Zap,
    title: 'Lightning Fast',
    description: 'Process large datasets in seconds with optimized performance',
  },
  {
    icon: Target,
    title: 'Precise Mapping',
    description: 'Accurately map proficiency levels to your organizational framework',
  },
  {
    icon: BarChart3,
    title: 'Comprehensive Reports',
    description: 'Get detailed insights and visualizations of assessment results',
  },
];

const quickActions = [
  { icon: GitBranch, label: 'Connect Data Source', step: 1, color: 'text-blue-500' },
  { icon: FileText, label: 'Extract Skills', step: 2, color: 'text-green-500' },
  { icon: PlayCircle, label: 'Run Assessment', step: 4, color: 'text-purple-500' },
  { icon: History, label: 'View History', step: 6, color: 'text-orange-500' },
  { icon: BarChart3, label: 'Analytics', step: 7, color: 'text-cyan-500' },
  { icon: Settings, label: 'Settings', step: 10, color: 'text-gray-500' },
];

export default function Welcome() {
  const setCurrentStep = useAppStore((state) => state.setCurrentStep);
  const markStepCompleted = useAppStore((state) => state.markStepCompleted);
  const getWorkflowProgress = useAppStore((state) => state.getWorkflowProgress);
  const skillsState = useAppStore((state) => state.skillsState);
  const isLoading = useAppStore((state) => state.isLoading);
  const error = useAppStore((state) => state.error);
  const setError = useAppStore((state) => state.setError);
  const openCommand = useCommandStore((state) => state.openCommand);

  const progress = getWorkflowProgress();
  const hasStarted = progress.completed > 0 || skillsState.skills.length > 0;

  // Loading state — shown while store is initializing
  if (isLoading) {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          <Skeleton className="h-12 w-64 mx-auto" />
          <Skeleton className="h-5 w-96 mx-auto" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state — shown if store encountered a fatal error
  if (error) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <div className="max-w-md text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 mb-4">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Button onClick={() => setError(null)}>Dismiss</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 bg-gradient-to-br from-background via-muted/30 to-background">
      <div className="max-w-6xl mx-auto">
        {/* Header with Notification Center */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-end mb-4"
        >
          <NotificationCenter />
        </motion.div>

        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-4xl md:text-5xl font-bold mb-4"
          >
            {hasStarted ? 'Welcome Back to' : 'Welcome to'}{' '}
            <span className="text-primary">Proficiency Studio</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="text-lg text-muted-foreground max-w-2xl mx-auto"
          >
            AI-Powered Proficiency Assessment Platform for Data-Driven Talent Management
          </motion.p>

          {/* Keyboard Shortcut Hint */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            onClick={openCommand}
            className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 hover:bg-muted text-sm text-muted-foreground transition-colors"
          >
            <Command className="h-3.5 w-3.5" />
            <span>Press</span>
            <kbd className="px-1.5 py-0.5 rounded bg-background border text-xs font-mono">⌘K</kbd>
            <span>for quick actions</span>
          </motion.button>
        </motion.div>

        {/* Progress Card (if started) */}
        {hasStarted && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mb-8"
          >
            <Card variant="gradient" className="border-primary/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <TrendingUp className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Workflow Progress</h3>
                      <p className="text-sm text-muted-foreground">
                        {progress.completed} of {progress.total} steps completed
                      </p>
                    </div>
                  </div>
                  <Badge variant={progress.percentage === 100 ? 'success' : 'secondary'}>
                    {progress.percentage}%
                  </Badge>
                </div>
                <Progress
                  value={progress.completed}
                  max={progress.total}
                  color={progress.percentage === 100 ? 'success' : 'default'}
                />

                {skillsState.skills.length > 0 && (
                  <div className="mt-4 flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span>{skillsState.skills.length} skills extracted</span>
                    </div>
                    {skillsState.extractedAt && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>
                          Last updated {new Date(skillsState.extractedAt).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="text-center mb-10"
        >
          <Button
            size="lg"
            variant="gradient"
            onClick={() => {
              markStepCompleted(0);
              setCurrentStep(1);
            }}
            className="group"
          >
            {hasStarted ? 'Continue Workflow' : 'Get Started'}
            <ChevronRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Button>
          <p className="mt-4 text-sm text-muted-foreground">
            Follow the step-by-step workflow to complete your proficiency assessment
          </p>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mb-10"
        >
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <motion.button
                  key={action.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 + index * 0.05 }}
                  onClick={() => setCurrentStep(action.step)}
                  className="group flex flex-col items-center gap-2 p-4 rounded-xl border bg-card hover:bg-accent hover:border-primary/20 transition-all duration-200"
                >
                  <div
                    className={`p-2 rounded-lg bg-muted group-hover:bg-background transition-colors ${action.color}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-medium text-center">{action.label}</span>
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mb-10"
        >
          <h2 className="text-lg font-semibold mb-4">Key Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 + index * 0.1, duration: 0.5 }}
                >
                  <Card variant="interactive" className="h-full">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <CardTitle className="text-base">{feature.title}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CardDescription>{feature.description}</CardDescription>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
