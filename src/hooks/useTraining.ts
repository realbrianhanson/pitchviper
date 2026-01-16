import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "@/hooks/use-toast";

export type ModuleType = 'video' | 'reading' | 'quiz' | 'roleplay';
export type ModuleStatus = 'not_started' | 'in_progress' | 'completed';

export interface LearningPath {
  id: string;
  name: string;
  description: string;
  icon: string;
  sort_order: number;
  is_required: boolean;
  team_id: string | null;
  estimated_hours: number;
  created_at: string;
  modules?: TrainingModule[];
  completedCount?: number;
  totalModules?: number;
}

export interface TrainingModule {
  id: string;
  path_id: string;
  title: string;
  description: string;
  module_type: ModuleType;
  content: any;
  duration_minutes: number;
  xp_reward: number;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  progress?: ModuleProgress;
}

export interface ModuleProgress {
  id: string;
  user_id: string;
  module_id: string;
  status: ModuleStatus;
  score: number | null;
  completed_at: string | null;
  time_spent_seconds: number;
  progress_data: any;
  created_at: string;
}

export interface Certification {
  id: string;
  name: string;
  description: string;
  path_id: string;
  badge_id: string | null;
  icon: string;
  created_at: string;
  earned_at?: string;
}

export interface TrainingStats {
  modulesCompleted: number;
  totalModules: number;
  certificationsEarned: number;
  totalCertifications: number;
  xpFromTraining: number;
  currentPathProgress: number;
}

export function useTraining() {
  const { user } = useAuth();
  const [learningPaths, setLearningPaths] = useState<LearningPath[]>([]);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [userCertifications, setUserCertifications] = useState<string[]>([]);
  const [stats, setStats] = useState<TrainingStats>({
    modulesCompleted: 0,
    totalModules: 0,
    certificationsEarned: 0,
    totalCertifications: 0,
    xpFromTraining: 0,
    currentPathProgress: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchLearningPaths = async () => {
    if (!user) return;

    try {
      // Fetch learning paths
      const { data: paths, error: pathsError } = await supabase
        .from('learning_paths')
        .select('*')
        .order('sort_order', { ascending: true });

      if (pathsError) throw pathsError;

      // Fetch modules for each path
      const { data: modules, error: modulesError } = await supabase
        .from('training_modules')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (modulesError) throw modulesError;

      // Fetch user progress
      const { data: progress, error: progressError } = await supabase
        .from('user_module_progress')
        .select('*')
        .eq('user_id', user.id);

      if (progressError) throw progressError;

      const progressMap = new Map(progress?.map(p => [p.module_id, p]) || []);

      // Build paths with modules and progress
      const pathsWithModules = (paths || []).map(path => {
        const pathModules = (modules || [])
          .filter(m => m.path_id === path.id)
          .map(m => ({
            ...m,
            progress: progressMap.get(m.id) as ModuleProgress | undefined
          }));

        const completedCount = pathModules.filter(m => m.progress?.status === 'completed').length;

        return {
          ...path,
          modules: pathModules,
          completedCount,
          totalModules: pathModules.length,
        } as LearningPath;
      });

      setLearningPaths(pathsWithModules);

      // Calculate stats
      const allModules = pathsWithModules.flatMap(p => p.modules || []);
      const completedModules = allModules.filter(m => m.progress?.status === 'completed');
      const xpEarned = completedModules.reduce((sum, m) => sum + m.xp_reward, 0);

      setStats(prev => ({
        ...prev,
        modulesCompleted: completedModules.length,
        totalModules: allModules.length,
        xpFromTraining: xpEarned,
      }));

    } catch (error) {
      console.error('Error fetching learning paths:', error);
    }
  };

  const fetchCertifications = async () => {
    if (!user) return;

    try {
      const { data: certs, error: certsError } = await supabase
        .from('certifications')
        .select('*');

      if (certsError) throw certsError;

      const { data: userCerts, error: userCertsError } = await supabase
        .from('user_certifications')
        .select('certification_id, earned_at')
        .eq('user_id', user.id);

      if (userCertsError) throw userCertsError;

      const earnedMap = new Map(userCerts?.map(uc => [uc.certification_id, uc.earned_at]) || []);
      const earnedIds = userCerts?.map(uc => uc.certification_id) || [];

      setCertifications((certs || []).map(c => ({
        ...c,
        earned_at: earnedMap.get(c.id)
      })) as Certification[]);

      setUserCertifications(earnedIds);

      setStats(prev => ({
        ...prev,
        certificationsEarned: earnedIds.length,
        totalCertifications: certs?.length || 0,
      }));

    } catch (error) {
      console.error('Error fetching certifications:', error);
    }
  };

  const updateModuleProgress = async (
    moduleId: string,
    status: ModuleStatus,
    score?: number,
    progressData?: any
  ) => {
    if (!user) return;

    try {
      const updateData: any = {
        status,
        progress_data: progressData || {},
      };

      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }

      if (score !== undefined) {
        updateData.score = score;
      }

      const { error } = await supabase
        .from('user_module_progress')
        .upsert({
          user_id: user.id,
          module_id: moduleId,
          ...updateData,
        }, { onConflict: 'user_id,module_id' });

      if (error) throw error;

      // Refresh data
      await fetchLearningPaths();

      // Check if path is completed
      await checkPathCompletion(moduleId);

      if (status === 'completed') {
        const module = learningPaths
          .flatMap(p => p.modules || [])
          .find(m => m.id === moduleId);
        
        if (module) {
          toast({
            title: '🎉 Module Completed!',
            description: `You earned ${module.xp_reward} XP`,
          });
        }
      }

    } catch (error) {
      console.error('Error updating progress:', error);
      toast({ title: 'Error', description: 'Could not save progress', variant: 'destructive' });
    }
  };

  const checkPathCompletion = async (moduleId: string) => {
    if (!user) return;

    // Find the path this module belongs to
    const path = learningPaths.find(p => 
      p.modules?.some(m => m.id === moduleId)
    );

    if (!path || !path.modules) return;

    // Check if all modules are completed
    const allCompleted = path.modules.every(m => 
      m.id === moduleId || m.progress?.status === 'completed'
    );

    if (allCompleted) {
      // Award certification
      const cert = certifications.find(c => c.path_id === path.id);
      
      if (cert && !userCertifications.includes(cert.id)) {
        try {
          await supabase
            .from('user_certifications')
            .insert({
              user_id: user.id,
              certification_id: cert.id,
            });

          toast({
            title: '🏆 Certification Earned!',
            description: `You are now a ${cert.name}!`,
          });

          await fetchCertifications();
        } catch (error) {
          console.error('Error awarding certification:', error);
        }
      }
    }
  };

  const startModule = async (moduleId: string) => {
    await updateModuleProgress(moduleId, 'in_progress');
  };

  const completeModule = async (moduleId: string, score?: number) => {
    await updateModuleProgress(moduleId, 'completed', score);
  };

  useEffect(() => {
    if (user) {
      setIsLoading(true);
      Promise.all([fetchLearningPaths(), fetchCertifications()])
        .finally(() => setIsLoading(false));
    }
  }, [user]);

  return {
    learningPaths,
    certifications,
    userCertifications,
    stats,
    isLoading,
    startModule,
    completeModule,
    updateModuleProgress,
    refetch: () => Promise.all([fetchLearningPaths(), fetchCertifications()]),
  };
}
