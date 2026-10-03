import { z } from 'zod';

export const PersonTypeEnum = z.enum(['STUDENT', 'FACULTY', 'OTHER']);
export const AccommodationTypeEnum = z.enum(['HOSTEL', 'DAY_SCHOLAR']);
export const ApplicationRoleEnum = z.enum(['USER', 'LEAD', 'ADMIN']);

export const UserProfileSchema = z.object({
  displayName: z.string().min(1, 'Display name is required').max(100),
  personType: PersonTypeEnum,
  accommodationType: AccommodationTypeEnum,
  hostelName: z.string().max(100).nullable().optional(),
  hostelEmail: z.string().email('Invalid hostel email').max(100).nullable().optional(),
}).refine((data) => {
  if (data.accommodationType === 'HOSTEL') {
    return !!data.hostelName && data.hostelName.trim().length > 0;
  }
  return true;
}, {
  message: 'Hostel name is required for hostellers',
  path: ['hostelName']
});

export const EventDraftSchema = z.object({
  name: z.string().min(3, 'Event name must be at least 3 characters').max(150),
  description: z.string().min(10, 'Description must be at least 10 characters').max(5000),
  societyId: z.string().min(1, 'Society is required'),
  category: z.string().min(1, 'Category is required'),
  startAt: z.string().datetime({ message: 'Invalid start date/time' }),
  endAt: z.string().datetime({ message: 'Invalid end date/time' }),
  duration: z.string().min(1, 'Duration is required'),
  venue: z.string().min(2, 'Venue is required').max(100),
  capacity: z.number().int().positive('Capacity must be greater than 0').max(100000),
  registrationOpenAt: z.string().datetime({ message: 'Invalid registration opening date/time' }),
  registrationCloseAt: z.string().datetime({ message: 'Invalid registration closing date/time' }),
  eligibility: z.string().min(1, 'Eligibility is required').max(500),
  rules: z.string().min(1, 'Rules are required').max(3000),
  contactDetails: z.string().min(1, 'Contact details are required').max(500),
  logoPath: z.string().optional(),
  posterPath: z.string().optional(),
  operationalNotes: z.string().max(3000).optional(),
}).refine((data) => {
  const start = new Date(data.startAt).getTime();
  const end = new Date(data.endAt).getTime();
  return end > start;
}, {
  message: 'End date/time must be after start date/time',
  path: ['endAt']
}).refine((data) => {
  const regClose = new Date(data.registrationCloseAt).getTime();
  const start = new Date(data.startAt).getTime();
  return regClose <= start;
}, {
  message: 'Registration closing date must not be after event start',
  path: ['registrationCloseAt']
});

export const EventReviewSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT', 'REQUEST_CHANGES']),
  feedback: z.string().max(2000).optional(),
  rejectionReason: z.string().max(1000).optional(),
}).refine((data) => {
  if (data.action === 'REQUEST_CHANGES' && (!data.feedback || data.feedback.trim().length === 0)) {
    return false;
  }
  return true;
}, {
  message: 'Actionable feedback is required when requesting changes',
  path: ['feedback']
}).refine((data) => {
  if (data.action === 'REJECT' && (!data.rejectionReason || data.rejectionReason.trim().length === 0)) {
    return false;
  }
  return true;
}, {
  message: 'Rejection reason is required',
  path: ['rejectionReason']
});

export const VenueChangeSchema = z.object({
  newVenue: z.string().min(2, 'Venue is required').max(100),
  reason: z.string().min(3, 'Reason for venue change is required').max(500),
});

export const AttendanceSessionCreateSchema = z.object({
  name: z.string().min(2, 'Session name is required').max(100),
  description: z.string().max(500).optional().default(''),
  durationMinutes: z.number().int().min(5).max(480).default(60),
});

export const AIExtractedEventSchema = z.object({
  name: z.string().default('Untitled Campus Event'),
  description: z.string().default(''),
  category: z.string().default('Technical'),
  startAt: z.string().default(new Date(Date.now() + 86400000 * 7).toISOString()),
  endAt: z.string().default(new Date(Date.now() + 86400000 * 7 + 10800000).toISOString()),
  duration: z.string().default('3 hours'),
  venue: z.string().default('Campus 6 Auditorium'),
  capacity: z.number().int().default(200),
  eligibility: z.string().default('Open to all KIIT students'),
  rules: z.string().default('Standard campus discipline rules apply.'),
  contactDetails: z.string().default('events@kiit.ac.in'),
  suggestedSessions: z.array(z.object({
    title: z.string(),
    speaker: z.string().default('TBD'),
    duration: z.string().default('45 mins')
  })).optional().default([]),
  suggestedResources: z.array(z.object({
    name: z.string(),
    type: z.string(),
    quantity: z.number()
  })).optional().default([]),
});
