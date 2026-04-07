import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { api } from '../../services/api';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { PROFICIENCY_CHART_COLORS, getProficiencyChartLabels } from '../../config/proficiency';
import { useToast } from '../../stores/toast-store';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Clock,
  Target,
  Brain,
  RefreshCw,
  Activity,
  FileText,
  Zap,
  CheckCircle,
} from 'lucide-react';

interface AnalyticsData {
  period: string;
  summary: {
    total_assessments: number;
    total_skills_assessed: number;
    average_confidence: number;
    average_processing_time: number;
    assessments_change: number;
    confidence_change: number;
  };
  model_performance: Array<{
    provider: string;
    model: string;
    assessments: number;
    avg_confidence: number;
    avg_latency_ms: number;
    accuracy_score: number;
  }>;
  confidence_distribution: {
    high: number; // 80-100%
    medium: number; // 60-80%
    low: number; // <60%
  };
  proficiency_distribution: {
    novice: number;
    developing: number;
    intermediate: number;
    advanced: number;
    expert: number;
  };
  daily_volume: Array<{
    date: string;
    count: number;
  }>;
  top_skills: Array<{
    skill: string;
    assessments: number;
    avg_proficiency: number;
  }>;
}

const AnalyticsDashboard: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const [data, setData] = useState<AnalyticsData | null>(null);

  // Fetch real data from API
  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);

      // Calculate date range based on period
      const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

      // Fetch data from multiple endpoints in parallel
      const [overviewRes, modelRes, volumeRes, skillsRes, historyRes] = await Promise.allSettled([
        api.getAnalyticsOverview({ start_date: startDate, end_date: endDate }),
        api.getModelPerformance(),
        api.getVolumeData({ days }),
        api.getTopSkills({ limit: 5 }),
        api.getAssessmentHistory({ limit: 100 }),
      ]);

      // Process overview data
      const overview = overviewRes.status === 'fulfilled' ? overviewRes.value : null;
      const models = modelRes.status === 'fulfilled' ? modelRes.value : null;
      const volume = volumeRes.status === 'fulfilled' ? volumeRes.value : null;
      const skills = skillsRes.status === 'fulfilled' ? skillsRes.value : null;
      const history = historyRes.status === 'fulfilled' ? historyRes.value : null;

      // Calculate metrics from history if overview not available
      const assessments = history?.assessments || [];
      const totalAssessments = overview?.total_assessments || assessments.length;
      const totalSkills =
        overview?.total_skills ||
        assessments.reduce((sum: number, a) => sum + (a.total_skills || 0), 0);

      // Calculate confidence distribution from history
      const highConfidence = assessments.filter((a) => (a.average_confidence || 0) >= 0.8).length;
      const medConfidence = assessments.filter(
        (a) => (a.average_confidence || 0) >= 0.6 && (a.average_confidence || 0) < 0.8
      ).length;
      const lowConfidence = assessments.filter((a) => (a.average_confidence || 0) < 0.6).length;
      const total = highConfidence + medConfidence + lowConfidence || 1;

      // Calculate proficiency distribution
      const profLevels = { novice: 0, developing: 0, intermediate: 0, advanced: 0, expert: 0 };
      assessments.forEach((a) => {
        const level = a.average_confidence * 5 || 3;
        if (level <= 1.5) profLevels.novice++;
        else if (level <= 2.5) profLevels.developing++;
        else if (level <= 3.5) profLevels.intermediate++;
        else if (level <= 4.5) profLevels.advanced++;
        else profLevels.expert++;
      });
      const profTotal = Object.values(profLevels).reduce((a, b) => a + b, 0) || 1;

      // Generate daily volume from history or API
      const dailyVolume =
        volume?.daily ||
        Array.from({ length: days }, (_, i) => {
          const date = new Date(Date.now() - (days - 1 - i) * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0];
          const count = assessments.filter((a) => a.created_at?.startsWith(date)).length;
          return { date, count };
        });

      // Build analytics data object
      const analyticsData: AnalyticsData = {
        period,
        summary: {
          total_assessments: totalAssessments,
          total_skills_assessed: totalSkills,
          average_confidence:
            overview?.avg_confidence ||
            (assessments.reduce((sum: number, a) => sum + (a.average_confidence || 0), 0) /
              (assessments.length || 1)) *
              100,
          average_processing_time: overview?.avg_processing_time || 2.1,
          assessments_change: overview?.assessments_change || 0,
          confidence_change: overview?.confidence_change || 0,
        },
        model_performance: (
          models?.models || [
            {
              provider: 'Google',
              model: 'Gemini 3.1 Flash',
              assessments: 0,
              avg_confidence: 0,
              avg_latency_ms: 0,
              accuracy_score: 0,
            },
            {
              provider: 'Moonshot',
              model: 'Kimi K2.5',
              assessments: 0,
              avg_confidence: 0,
              avg_latency_ms: 0,
              accuracy_score: 0,
            },
          ]
        ).map((m) => ({
          provider: m.provider,
          model: m.model,
          assessments: m.assessments ?? 0,
          avg_confidence: m.avg_confidence ?? 0,
          avg_latency_ms: m.avg_latency_ms ?? 0,
          accuracy_score: m.accuracy_score ?? 0,
        })),
        confidence_distribution: {
          high: Math.round((highConfidence / total) * 100),
          medium: Math.round((medConfidence / total) * 100),
          low: Math.round((lowConfidence / total) * 100),
        },
        proficiency_distribution: {
          novice: Math.round((profLevels.novice / profTotal) * 100),
          developing: Math.round((profLevels.developing / profTotal) * 100),
          intermediate: Math.round((profLevels.intermediate / profTotal) * 100),
          advanced: Math.round((profLevels.advanced / profTotal) * 100),
          expert: Math.round((profLevels.expert / profTotal) * 100),
        },
        daily_volume: dailyVolume,
        top_skills: (skills?.skills || []).map((s) => ({
          skill: s.skill ?? '',
          assessments: s.assessments ?? 0,
          avg_proficiency: s.avg_proficiency ?? 0,
        })),
      };

      setData(analyticsData);
    } catch (err: unknown) {
      console.error('Failed to fetch analytics:', err);
      toast({
        variant: 'destructive',
        title: 'Failed to load analytics',
        description: err instanceof Error ? err.message : 'Could not fetch analytics data',
      });
      // Set empty state
      setData({
        period,
        summary: {
          total_assessments: 0,
          total_skills_assessed: 0,
          average_confidence: 0,
          average_processing_time: 0,
          assessments_change: 0,
          confidence_change: 0,
        },
        model_performance: [],
        confidence_distribution: { high: 0, medium: 0, low: 0 },
        proficiency_distribution: {
          novice: 0,
          developing: 0,
          intermediate: 0,
          advanced: 0,
          expert: 0,
        },
        daily_volume: [],
        top_skills: [],
      });
    } finally {
      setLoading(false);
    }
  };

  // Load data on mount and when period changes
  useEffect(() => {
    fetchAnalyticsData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  const refreshData = async () => {
    toast({ title: 'Refreshing...', description: 'Fetching latest analytics data.' });
    await fetchAnalyticsData();
    toast({ title: 'Data refreshed', description: 'Analytics updated with latest data.' });
  };

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    change?: number;
    icon: React.ReactNode;
    subtitle?: string;
  }> = ({ title, value, change, icon, subtitle }) => (
    <Card variant="glass">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1 text-foreground">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
            {change !== undefined && (
              <div
                className={`flex items-center gap-1 mt-2 text-sm ${change >= 0 ? 'text-success' : 'text-destructive'}`}
              >
                {change >= 0 ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                <span>{Math.abs(change)}% vs last period</span>
              </div>
            )}
          </div>
          <div className="p-3 rounded-lg bg-muted/50">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );

  const ProgressBar: React.FC<{ value: number; color: string; label: string }> = ({
    value,
    color,
    label,
  }) => (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-foreground">{label}</span>
        <span className="font-medium text-foreground">{value}%</span>
      </div>
      <div className="w-full bg-muted/50 rounded-full h-2">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );

  if (!data) {
    return (
      <div className="h-full flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const fadeUp = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  };
  const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };

  return (
    <motion.div
      className="h-full flex flex-col p-6 space-y-6 overflow-y-auto"
      variants={stagger}
      initial="hidden"
      animate="show"
    >
      {/* Header */}
      <motion.div variants={fadeUp} className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <BarChart3 className="w-6 h-6" />
            Analytics Dashboard
          </h1>
          <p className="text-muted-foreground">Monitor assessment performance and trends</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 bg-card/80 backdrop-blur-sm border border-border/50 rounded-lg p-1">
            {(['7d', '30d', '90d'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  period === p
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : '90 Days'}
              </button>
            ))}
          </div>
          <Button variant="outline" onClick={refreshData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </motion.div>

      {/* Summary Stats — 4-col bento */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Assessments"
          value={data.summary.total_assessments.toLocaleString()}
          change={data.summary.assessments_change}
          icon={<FileText className="w-5 h-5 text-primary" />}
        />
        <StatCard
          title="Skills Assessed"
          value={data.summary.total_skills_assessed.toLocaleString()}
          icon={<Target className="w-5 h-5 text-success" />}
        />
        <StatCard
          title="Avg Confidence"
          value={`${data.summary.average_confidence}%`}
          change={data.summary.confidence_change}
          icon={<CheckCircle className="w-5 h-5 text-info" />}
        />
        <StatCard
          title="Avg Processing Time"
          value={`${data.summary.average_processing_time}s`}
          icon={<Clock className="w-5 h-5 text-warning" />}
        />
      </motion.div>

      {/* Charts Row — 8+4 bento */}
      <motion.div variants={fadeUp} className="grid grid-cols-12 gap-4">
        {/* Volume Chart */}
        <Card variant="glass" className="col-span-8">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Assessment Volume
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 flex items-end gap-1">
              {data.daily_volume.map((day) => {
                const maxCount = Math.max(...data.daily_volume.map((d) => d.count), 1);
                const height = Math.max((day.count / maxCount) * 100, 2);
                return (
                  <div
                    key={day.date}
                    className="flex-1 bg-primary/60 rounded-t hover:bg-primary transition-colors cursor-pointer group relative"
                    style={{ height: `${height}%` }}
                    title={`${day.date}: ${day.count} assessments`}
                  >
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:block bg-popover text-popover-foreground text-xs px-2 py-1 rounded border border-border whitespace-nowrap shadow-md">
                      {day.count}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>{data.daily_volume[0]?.date}</span>
              <span>{data.daily_volume[data.daily_volume.length - 1]?.date}</span>
            </div>
          </CardContent>
        </Card>

        {/* Confidence Distribution */}
        <Card variant="glass" className="col-span-4">
          <CardHeader>
            <CardTitle className="text-lg">Confidence</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ProgressBar
              value={data.confidence_distribution.high}
              color="bg-success"
              label="High (80-100%)"
            />
            <ProgressBar
              value={data.confidence_distribution.medium}
              color="bg-warning"
              label="Medium (60-80%)"
            />
            <ProgressBar
              value={data.confidence_distribution.low}
              color="bg-destructive"
              label="Low (<60%)"
            />
          </CardContent>
        </Card>
      </motion.div>

      {/* Bottom Row — 8+4 bento */}
      <motion.div variants={fadeUp} className="grid grid-cols-12 gap-4">
        {/* Model Performance */}
        <Card variant="glass" className="col-span-8">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Brain className="w-5 h-5" />
              Model Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 font-medium text-foreground">Model</th>
                    <th className="text-right py-2 font-medium text-foreground">Assessments</th>
                    <th className="text-right py-2 font-medium text-foreground">Avg Confidence</th>
                    <th className="text-right py-2 font-medium text-foreground">Avg Latency</th>
                    <th className="text-right py-2 font-medium text-foreground">Accuracy</th>
                  </tr>
                </thead>
                <tbody>
                  {data.model_performance.map((model, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td className="py-3">
                        <div className="font-medium text-foreground">{model.model}</div>
                        <div className="text-xs text-muted-foreground">{model.provider}</div>
                      </td>
                      <td className="text-right py-3 text-foreground">
                        {model.assessments.toLocaleString()}
                      </td>
                      <td className="text-right py-3">
                        <span
                          className={
                            model.avg_confidence >= 80
                              ? 'text-success'
                              : model.avg_confidence >= 70
                                ? 'text-warning'
                                : 'text-destructive'
                          }
                        >
                          {model.avg_confidence}%
                        </span>
                      </td>
                      <td className="text-right py-3 text-foreground">{model.avg_latency_ms}ms</td>
                      <td className="text-right py-3">
                        <div className="flex items-center justify-end gap-1">
                          <span className="font-medium text-foreground">
                            {model.accuracy_score.toFixed(1)}
                          </span>
                          <span className="text-muted-foreground">/5</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Top Skills */}
        <Card variant="glass" className="col-span-4">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Top Skills
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.top_skills.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No skill data yet</p>
            ) : (
              <div className="space-y-3">
                {data.top_skills.map((skill, i) => (
                  <div key={skill.skill} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate text-foreground">
                        {skill.skill}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {skill.assessments} assessments
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-sm text-foreground">
                        {skill.avg_proficiency.toFixed(1)}
                      </div>
                      <div className="text-xs text-muted-foreground">avg level</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Proficiency Distribution — full width */}
      <motion.div variants={fadeUp}>
        <Card variant="glass">
          <CardHeader>
            <CardTitle className="text-lg">Proficiency Level Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-4 h-32">
              {Object.entries(data.proficiency_distribution).map(([level, percentage], idx) => {
                const colors = PROFICIENCY_CHART_COLORS;
                const labels = getProficiencyChartLabels();
                return (
                  <div key={level} className="flex-1 flex flex-col items-center">
                    <div className="text-sm font-medium mb-2 text-foreground">{percentage}%</div>
                    <div
                      className={`w-full ${colors[idx]} rounded-t transition-all`}
                      style={{ height: `${Math.max(percentage, 2)}%` }}
                    />
                    <div className="text-xs text-muted-foreground mt-2 text-center">
                      {labels[idx]}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
};

export default AnalyticsDashboard;
