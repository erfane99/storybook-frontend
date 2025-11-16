export type QualityGrade = 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'F';

export interface AutomatedScores {
  character: {
    averageConsistencyScore: number;
  };
  environmental: {
    worldBuildingCoherence: number;
  };
  narrative: {
    storyBeatCompletion: number;
  };
  visual: {
    artisticExecution: number;
  };
  technical: {
    generationSuccessRate: number;
  };
  audience: {
    ageAppropriateness: number;
  };
}

export interface GenerationMetrics {
  totalPanels: number;
  totalProcessingTime: number;
  validationAttempts: number;
  validationSuccesses: number;
  regenerationCount: number;
}

export interface QualityData {
  quality_grade: QualityGrade;
  overall_technical_quality: number;
  automated_scores: AutomatedScores;
  generation_metrics: GenerationMetrics;
}

export interface QualityBadgeProps {
  grade: QualityGrade;
  score: number;
}

export interface QualityScoreCardProps {
  dimension: string;
  score: number;
  description: string;
  icon: React.ReactNode;
  index?: number;
}

export interface QualityInsightsProps {
  generationMetrics: GenerationMetrics;
}

export interface QualityCertificateProps {
  grade: QualityGrade;
  score: number;
}
