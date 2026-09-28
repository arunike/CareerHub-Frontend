import { findApplicationStatus } from '../../constants/applicationStages';
import type { ApplicationStage } from '../../constants/applicationStages';

// The configured stage list is the source of the label; titlecasing the key is only a fallback.
export const stageLabel = (status: string, stages: ApplicationStage[]) =>
  findApplicationStatus(status, stages)?.label ??
  (status === 'UNKNOWN'
    ? 'No stage'
    : status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, ' '));
