import {
  CampusEvent,
  EventHealth,
  EventResource,
  EventSession,
  EventTask,
  EventVolunteer
} from '../../shared/types.ts';

export interface EvaluatedRisk {
  id: string;
  type: 'OVERDUE_TASK' | 'BLOCKED_TASK' | 'RESOURCE_CONFLICT' | 'STAFF_CONFLICT' | 'MISSING_VENUE' | 'SPEAKER_RISK';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  explanation: string;
  entityId: string;
  entityName: string;
}

export interface HealthEvaluationResult {
  health: EventHealth;
  healthReason: string;
  risks: EvaluatedRisk[];
  metrics: {
    taskCompletionRate: number;
    completedTasks: number;
    blockedTasks: number;
    overdueTasks: number;
    confirmedSpeakers: number;
    totalSpeakers: number;
    resourceConflicts: number;
  };
}

export class RiskEngine {
  public static evaluate(params: {
    event: CampusEvent;
    sessions: EventSession[];
    tasks: EventTask[];
    resources: EventResource[];
    volunteers: EventVolunteer[];
  }): HealthEvaluationResult {
    const { event, sessions, tasks, resources, volunteers } = params;
    const now = Date.now();
    const risks: EvaluatedRisk[] = [];

    let completedTasks = 0;
    let blockedTasks = 0;
    let overdueTasks = 0;

    // 1. Evaluate Tasks
    tasks.forEach((t) => {
      if (t.status === 'COMPLETED') {
        completedTasks++;
        return;
      }

      if (t.status === 'BLOCKED') {
        blockedTasks++;
        risks.push({
          id: `risk_blocked_${t.id}`,
          type: 'BLOCKED_TASK',
          severity: t.priority === 'CRITICAL' || t.priority === 'HIGH' ? 'HIGH' : 'MEDIUM',
          title: `Blocked Task: ${t.title}`,
          explanation: t.blocker ? `Blocked by: ${t.blocker}` : 'Task is blocked with unresolved dependency.',
          entityId: t.id,
          entityName: t.title,
        });
      }

      const dueTime = new Date(t.due).getTime();
      if (!isNaN(dueTime) && dueTime < now) {
        overdueTasks++;
        risks.push({
          id: `risk_overdue_${t.id}`,
          type: 'OVERDUE_TASK',
          severity: 'HIGH',
          title: `Overdue Task: ${t.title}`,
          explanation: `Task was scheduled for completion on ${new Date(t.due).toLocaleDateString()}, but is still ${t.status}.`,
          entityId: t.id,
          entityName: t.title,
        });
      }
    });

    // 2. Evaluate Sessions (Missing Venue & Speaker confirmation)
    let confirmedSpeakers = 0;
    let totalSpeakers = 0;

    sessions.forEach((s) => {
      if (!s.venue || s.venue.trim().length === 0) {
        risks.push({
          id: `risk_venue_${s.id}`,
          type: 'MISSING_VENUE',
          severity: 'CRITICAL',
          title: `Missing Venue: ${s.title}`,
          explanation: 'Session has no physical or virtual venue assigned yet.',
          entityId: s.id,
          entityName: s.title,
        });
      }

      if (s.speaker && s.speaker !== 'TBD') {
        totalSpeakers++;
        if (s.speakerConfirmed) {
          confirmedSpeakers++;
        } else {
          const sessionStart = new Date(s.startAt).getTime();
          const hoursUntil = (sessionStart - now) / (1000 * 60 * 60);
          risks.push({
            id: `risk_speaker_${s.id}`,
            type: 'SPEAKER_RISK',
            severity: hoursUntil < 72 ? 'HIGH' : 'MEDIUM',
            title: `Unconfirmed Speaker: ${s.speaker}`,
            explanation: `Speaker invitation for "${s.title}" is pending confirmation with ${Math.max(0, Math.round(hoursUntil))} hours to session start.`,
            entityId: s.id,
            entityName: s.speaker,
          });
        }
      }
    });

    // 3. Evaluate Resources
    let resourceConflicts = 0;
    resources.forEach((r) => {
      if (r.status === 'CONFLICT') {
        resourceConflicts++;
        risks.push({
          id: `risk_resource_${r.id}`,
          type: 'RESOURCE_CONFLICT',
          severity: 'HIGH',
          title: `Resource Conflict: ${r.name}`,
          explanation: `Resource quantity (${r.quantity}) or allocation conflicts with another campus booking.`,
          entityId: r.id,
          entityName: r.name,
        });
      }
    });

    // 4. Evaluate Volunteers (Overlapping shifts or conflicts)
    volunteers.forEach((v) => {
      if (v.status === 'CONFLICT') {
        risks.push({
          id: `risk_vol_${v.id}`,
          type: 'STAFF_CONFLICT',
          severity: 'MEDIUM',
          title: `Volunteer Shift Conflict: ${v.name}`,
          explanation: `Volunteer ${v.name} has overlapping duties during ${v.shiftStart} - ${v.shiftEnd}.`,
          entityId: v.id,
          entityName: v.name,
        });
      }
    });

    const totalTasks = tasks.length;
    const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 100;

    // 5. Determine Event Health state
    const hasCritical = risks.some((r) => r.severity === 'CRITICAL');
    const highRiskCount = risks.filter((r) => r.severity === 'HIGH').length;

    let health: EventHealth = 'HEALTHY';
    let healthReason = 'All operational tasks, resources, and sessions are on schedule.';

    if (hasCritical || highRiskCount >= 3) {
      health = 'CRITICAL';
      healthReason = hasCritical
        ? 'Critical operational risks detected requiring immediate administrative escalation.'
        : `Multiple high risks detected (${highRiskCount} unresolved issues).`;
    } else if (highRiskCount > 0 || blockedTasks > 0 || overdueTasks > 0) {
      health = 'AT_RISK';
      healthReason = `${highRiskCount} high risk item(s) and ${blockedTasks} blocked task(s) require attention.`;
    }

    return {
      health,
      healthReason,
      risks,
      metrics: {
        taskCompletionRate,
        completedTasks,
        blockedTasks,
        overdueTasks,
        confirmedSpeakers,
        totalSpeakers,
        resourceConflicts,
      },
    };
  }
}
