/**
 * KBC Event Command Center - Shared Domain Types
 * Authoritative types matching the PRD and TRD.
 */

export type ApplicationRole = 'USER' | 'LEAD' | 'ADMIN';

export type PersonType = 'STUDENT' | 'FACULTY' | 'OTHER';

export type AccommodationType = 'HOSTEL' | 'DAY_SCHOLAR';

export type EventStatus =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'CHANGES_REQUESTED'
  | 'RESUBMITTED'
  | 'APPROVED'
  | 'PUBLISHED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'COMPLETED';

export type ReviewStatus = 'PENDING' | 'APPROVED' | 'CHANGES_REQUESTED' | 'REJECTED';

export type EventHealth = 'HEALTHY' | 'AT_RISK' | 'CRITICAL';

export type DependencyEntityType =
  | 'VENUE'
  | 'SESSION'
  | 'SPEAKER'
  | 'RESOURCE'
  | 'VOLUNTEER'
  | 'TASK';

export type DependencySeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED';

export type ResourceStatus = 'REQUESTED' | 'CONFIRMED' | 'ALLOCATED' | 'CONFLICT';

export type AttendanceSessionStatus = 'ACTIVE' | 'CLOSED';

export type RegistrationStatus = 'CONFIRMED' | 'CANCELLED';

export interface UserProfile {
  uid: string;
  email: string;
  emailVerified: boolean;
  displayName: string;
  photoURL?: string;
  personType: PersonType;
  rollNumber: string | null; // Derived from @kiit.ac.in email local part for STUDENT, null for FACULTY/OTHER
  accommodationType: AccommodationType;
  hostelName: string | null; // null for DAY_SCHOLAR
  hostelEmail: string | null; // null for DAY_SCHOLAR
  role: ApplicationRole;
  isActive: boolean;
  assignedSocieties?: string[]; // IDs of societies where user is a lead
  createdAt: string;
  updatedAt: string;
}

export interface Society {
  id: string;
  name: string;
  category: string;
  description: string;
  logoPath?: string;
  leadUids: string[];
  leadNames?: string[];
  leadEmails?: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EventScheduleItem {
  time: string;
  title: string;
  venue?: string;
  speaker?: string;
}

export interface CampusEvent {
  id: string;
  societyId: string;
  societyName: string;
  name: string;
  description: string;
  category: string;
  logoPath?: string;
  posterPath?: string;
  startAt: string; // ISO string
  endAt: string; // ISO string
  duration: string;
  venue: string;
  capacity: number;
  registeredCount: number;
  registrationOpenAt: string;
  registrationCloseAt: string;
  eligibility: string;
  rules: string;
  contactDetails: string;
  sessions?: EventSession[];
  resources?: EventResource[];
  volunteersCount?: number;
  operationalNotes?: string;
  status: EventStatus;
  leadUids: string[];
  leadNames?: string[];
  leadEmails?: string[];
  reviewFeedback?: string;
  rejectionReason?: string;
  currentRevisionId?: string;
  health: EventHealth;
  healthReason?: string;
  notionPageId?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface EventRevision {
  id: string;
  eventId: string;
  revisionNumber: number;
  submittedBy: string;
  submittedByName?: string;
  submittedAt: string;
  snapshot: Partial<CampusEvent>;
  reviewStatus: ReviewStatus;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  feedback?: string;
  rejectionReason?: string;
}

export interface EventSession {
  id: string;
  eventId: string;
  title: string;
  speaker: string;
  speakerConfirmed: boolean;
  venue: string;
  startAt: string;
  endAt: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  description?: string;
}

export interface EventTask {
  id: string;
  eventId: string;
  title: string;
  owner: string;
  ownerName?: string;
  team: string;
  due: string;
  priority: TaskPriority;
  status: TaskStatus;
  progress: number;
  blocker?: string;
  sessionId?: string;
  prerequisites?: string[];
  downstreamTasks?: string[];
}

export interface EventResource {
  id: string;
  eventId: string;
  name: string;
  type: string;
  quantity: number;
  status: ResourceStatus;
  location: string;
  assignedSessionId?: string;
}

export interface EventVolunteer {
  id: string;
  eventId: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  shiftStart: string;
  shiftEnd: string;
  venue: string;
  status: 'ASSIGNED' | 'CHECKED_IN' | 'CONFLICT';
}

export interface EventDependency {
  id: string;
  eventId: string;
  sourceType: DependencyEntityType;
  sourceId: string;
  sourceLabel?: string;
  targetType: DependencyEntityType;
  targetId: string;
  targetLabel?: string;
  relationshipType: string;
  severity: DependencySeverity;
  createdAt: string;
  createdBy: string;
}

export interface RegistrationRecord {
  uid: string;
  eventId: string;
  nameSnapshot: string;
  emailSnapshot: string;
  rollNumberSnapshot: string | null;
  personTypeSnapshot: PersonType;
  accommodationSnapshot: AccommodationType;
  hostelSnapshot: string | null;
  hostelEmailSnapshot: string | null;
  status: RegistrationStatus;
  registeredAt: string;
}

export interface AttendanceSession {
  id: string;
  eventId: string;
  name: string;
  description: string;
  startsAt: string;
  endsAt: string;
  status: AttendanceSessionStatus;
  tokenHash: string;
  tokenExpiresAt: string;
  presentCount: number;
  createdBy: string;
  createdByName?: string;
  createdAt: string;
  closedAt?: string;
}

export interface AttendanceRecord {
  uid: string;
  sessionId: string;
  eventId: string;
  nameSnapshot: string;
  emailSnapshot: string;
  rollNumberSnapshot: string | null;
  personTypeSnapshot: PersonType;
  accommodationSnapshot: AccommodationType;
  hostelSnapshot: string | null;
  hostelEmailSnapshot: string | null;
  markedAt: string;
}

export interface ImpactAnalysisResult {
  venueChangedFrom: string;
  venueChangedTo: string;
  affectedSessions: Array<{ id: string; title: string; currentVenue: string; time: string }>;
  affectedSpeakers: Array<{ name: string; sessionTitle: string }>;
  affectedResources: Array<{ id: string; name: string; quantity: number; issue: string }>;
  affectedVolunteers: Array<{ id: string; name: string; role: string; shift: string }>;
  affectedTasks: Array<{ id: string; title: string; owner: string; due: string; priority: string }>;
  requiredCommunicationActions: string[];
  calculatedRisk: DependencySeverity;
  riskReasons: string[];
  aiExplanation?: string;
}

export interface AuditLogEntry {
  id: string;
  actorUid: string;
  actorEmail: string;
  actorRole: ApplicationRole;
  action: string;
  entity: string;
  entityId: string;
  eventId?: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  timestamp: string;
}

export interface NotionSyncRecord {
  id: string;
  entityType: 'EVENT' | 'SESSION' | 'TASK' | 'RESOURCE' | 'VENUE' | 'DECISION';
  entityId: string;
  notionPageId: string;
  databaseId: string;
  syncStatus: 'SYNCED' | 'FAILED' | 'PENDING';
  lastSyncedAt: string;
  lastError?: string;
}

export interface OperationalBriefing {
  date: string;
  eventName: string;
  summary: string;
  urgentTasks: string[];
  overdueTasks: string[];
  blockedTasks: string[];
  scheduleHighlights: string[];
  topRisks: string[];
  aiGenerated: boolean;
}
