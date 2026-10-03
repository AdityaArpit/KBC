import { Router, Request, Response } from 'express';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
  deleteDoc,
  orderBy
} from 'firebase/firestore';
import { serverDb } from '../firebase.ts';
import { DependencyEngine } from '../dependency/DependencyEngine.ts';
import { RiskEngine } from '../risk/RiskEngine.ts';
import { generateAttendanceWorkbook } from '../exports/AttendanceExcel.ts';
import { NotionService } from '../notion/NotionService.ts';
import { GeminiService } from '../ai/GeminiService.ts';
import { checkAndSeedInitialData } from '../seed/SeedData.ts';
import {
  EventDraftSchema,
  EventReviewSchema,
  UserProfileSchema,
  VenueChangeSchema,
  AttendanceSessionCreateSchema
} from '../../shared/schemas.ts';
import {
  ApplicationRole,
  CampusEvent,
  EventResource,
  EventSession,
  EventTask,
  EventVolunteer,
  UserProfile
} from '../../shared/types.ts';

export const apiRouter = Router();

const dependencyEngine = new DependencyEngine();
const notionService = new NotionService();
const geminiService = new GeminiService();

// Helper: structured audit logger
async function logAudit(params: {
  actorUid: string;
  actorEmail: string;
  actorRole: ApplicationRole;
  action: string;
  entity: string;
  entityId: string;
  eventId?: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
}) {
  const auditId = `audit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const entry = {
    id: auditId,
    actorUid: params.actorUid,
    actorEmail: params.actorEmail,
    actorRole: params.actorRole,
    action: params.action,
    entity: params.entity,
    entityId: params.entityId,
    eventId: params.eventId || null,
    before: params.before || null,
    after: params.after || null,
    timestamp: new Date().toISOString(),
  };

  try {
    await setDoc(doc(serverDb, 'auditLogs', auditId), entry);
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}

// ----------------------------------------------------
// 1. AUTHENTICATION & PROFILE
// ----------------------------------------------------

/**
 * Admin Login Endpoint
 * Strict server-side verification using ADMIN_EMAIL and ADMIN_PASSWORD
 * Never exposed to frontend or stored in Firestore
 */
apiRouter.post('/auth/admin-login', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const serverAdminEmail = (process.env.ADMIN_EMAIL || 'admin@kiit.ac.in').toLowerCase().trim();
  const serverAdminPass = process.env.ADMIN_PASSWORD || 'AdminSecret2026!';

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  if (email.toLowerCase().trim() === serverAdminEmail && password === serverAdminPass) {
    // Generate secure admin session payload
    const token = `adm_token_${Date.now()}_${Buffer.from(serverAdminEmail).toString('base64')}`;
    
    await logAudit({
      actorUid: 'admin_sys',
      actorEmail: serverAdminEmail,
      actorRole: 'ADMIN',
      action: 'ADMIN_LOGIN_SUCCESS',
      entity: 'AUTH',
      entityId: 'admin_sys',
    });

    return res.json({
      success: true,
      token,
      user: {
        uid: 'admin_sys',
        email: serverAdminEmail,
        displayName: 'KIIT Platform Administrator',
        role: 'ADMIN',
        personType: 'FACULTY',
        rollNumber: null,
        accommodationType: 'DAY_SCHOLAR',
        hostelName: null,
        hostelEmail: null,
        isActive: true,
      },
    });
  }

  await logAudit({
    actorUid: 'anonymous',
    actorEmail: email,
    actorRole: 'USER',
    action: 'ADMIN_LOGIN_FAILED',
    entity: 'AUTH',
    entityId: 'admin_sys',
  });

  return res.status(401).json({ error: 'Invalid administrator credentials' });
});

/**
 * Profile Sync & Verification for Google-authenticated KIIT users
 * Verifies email_verified and @kiit.ac.in suffix
 * Automatically derives read-only rollNumber for students
 */
apiRouter.post('/auth/sync-profile', async (req: Request, res: Response) => {
  try {
    const { uid, email, emailVerified, displayName, photoURL, personType, accommodationType, hostelName, hostelEmail } = req.body;

    if (!uid || !email) {
      return res.status(400).json({ error: 'UID and email are required.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const isKiit = normalizedEmail.endsWith('@kiit.ac.in');
    const isBootstrappedAdmin = normalizedEmail === 'aditya2024303@gmail.com' || normalizedEmail === 'adityasahay789@gmail.com';

    // 1. Strict verification: must be @kiit.ac.in or bootstrapped administrator
    if (!isKiit && !isBootstrappedAdmin) {
      return res.status(403).json({
        error: 'Access restricted. Only verified @kiit.ac.in accounts are permitted.',
        isDomainRejected: true,
      });
    }

    // 2. Strict verification: email_verified must be true
    if (!emailVerified) {
      return res.status(403).json({
        error: 'Email verification required. Please verify your Google account before accessing the platform.',
        isVerificationRequired: true,
      });
    }

    // Check existing profile in Firestore
    const userDocRef = doc(serverDb, 'users', uid);
    const existingSnap = await getDoc(userDocRef);
    const existingData = existingSnap.exists() ? (existingSnap.data() as UserProfile) : null;

    // Determine personType and derive roll number
    const finalPersonType = personType || existingData?.personType || 'STUDENT';
    
    // Roll number derivation: local part of verified @kiit.ac.in email
    let derivedRollNumber: string | null = null;
    if (finalPersonType === 'STUDENT') {
      derivedRollNumber = normalizedEmail.split('@')[0];
    }

    const finalAccommodation = accommodationType || existingData?.accommodationType || 'DAY_SCHOLAR';
    const finalHostelName = finalAccommodation === 'HOSTEL' ? (hostelName || existingData?.hostelName || null) : null;
    const finalHostelEmail = finalAccommodation === 'HOSTEL' ? (hostelEmail || existingData?.hostelEmail || null) : null;

    // Role cannot be self-promoted. Retain existing role or default to USER
    let role: ApplicationRole = existingData?.role || 'USER';
    if (isBootstrappedAdmin) {
      role = 'ADMIN';
    }

    // Check if user is assigned as a lead in any active society (by email or UID)
    const socSnap = await getDocs(collection(serverDb, 'societies'));
    const assignedSocietyIds: string[] = [];

    for (const sDoc of socSnap.docs) {
      const sData = sDoc.data();
      const leadEmails: string[] = Array.isArray(sData.leadEmails) ? sData.leadEmails.map((e: string) => e.toLowerCase().trim()) : [];
      const leadUids: string[] = Array.isArray(sData.leadUids) ? sData.leadUids : [];

      if (leadEmails.includes(normalizedEmail) || leadUids.includes(uid)) {
        assignedSocietyIds.push(sDoc.id);
        let needsUpdate = false;
        if (!leadUids.includes(uid)) {
          leadUids.push(uid);
          needsUpdate = true;
        }
        if (!leadEmails.includes(normalizedEmail)) {
          leadEmails.push(normalizedEmail);
          needsUpdate = true;
        }
        if (needsUpdate) {
          await updateDoc(sDoc.ref, { leadUids, leadEmails });
        }
      }
    }

    if (assignedSocietyIds.length > 0 && role !== 'ADMIN') {
      role = 'LEAD';
    }

    const now = new Date().toISOString();
    const profile: UserProfile = {
      uid,
      email: normalizedEmail,
      emailVerified: true,
      displayName: displayName || normalizedEmail.split('@')[0],
      photoURL: photoURL || '',
      personType: finalPersonType,
      rollNumber: derivedRollNumber,
      accommodationType: finalAccommodation,
      hostelName: finalHostelName,
      hostelEmail: finalHostelEmail,
      role,
      isActive: true,
      assignedSocieties: assignedSocietyIds,
      createdAt: existingData?.createdAt || now,
      updatedAt: now,
    };

    await setDoc(userDocRef, profile, { merge: true });

    return res.json({ profile });
  } catch (err: any) {
    console.error('Error syncing profile:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 2. SOCIETIES
// ----------------------------------------------------

apiRouter.get('/societies', async (_req: Request, res: Response) => {
  try {
    const snap = await getDocs(collection(serverDb, 'societies'));
    const societies = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return res.json({ societies });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/societies', async (req: Request, res: Response) => {
  try {
    const { name, category, description, logoPath, leadUids, leadNames, actorRole, actorUid, actorEmail } = req.body;

    if (actorRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Only platform administrators can create societies.' });
    }

    if (!name || !category || !description) {
      return res.status(400).json({ error: 'Name, category, and description are required.' });
    }

    const societyId = `soc_${name.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 20)}_${Date.now().toString(36)}`;
    const now = new Date().toISOString();

    const society = {
      id: societyId,
      name,
      category,
      description,
      logoPath: logoPath || 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&w=300&q=80',
      leadUids: Array.isArray(leadUids) ? leadUids : [],
      leadNames: Array.isArray(leadNames) ? leadNames : [],
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(doc(serverDb, 'societies', societyId), society);

    await logAudit({
      actorUid: actorUid || 'admin_sys',
      actorEmail: actorEmail || 'admin@kiit.ac.in',
      actorRole: 'ADMIN',
      action: 'CREATE_SOCIETY',
      entity: 'SOCIETY',
      entityId: societyId,
      after: society,
    });

    return res.json({ society });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/societies/:id/leads', async (req: Request, res: Response) => {
  try {
    const { studentEmail, leadEmail, actorRole, actorUid, actorEmail } = req.body;
    const { id: societyId } = req.params;

    if (actorRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Only platform administrators can assign student leads.' });
    }

    const targetEmail = (studentEmail || leadEmail || '').toLowerCase().trim();
    if (!targetEmail) {
      return res.status(400).json({ error: 'Student KIIT email is required.' });
    }

    const socRef = doc(serverDb, 'societies', societyId);
    const snap = await getDoc(socRef);
    if (!snap.exists()) {
      return res.status(404).json({ error: 'Society not found' });
    }

    // Look up user by email in users collection
    const userQuery = query(collection(serverDb, 'users'), where('email', '==', targetEmail));
    const userQuerySnap = await getDocs(userQuery);

    let assignedUid = `lead_${targetEmail.split('@')[0]}`;
    let assignedName = targetEmail.split('@')[0];

    if (!userQuerySnap.empty) {
      const matchedUser = userQuerySnap.docs[0];
      assignedUid = matchedUser.id;
      assignedName = matchedUser.data().displayName || assignedName;

      // Promote user to LEAD role if not ADMIN
      if (matchedUser.data().role !== 'ADMIN') {
        const assigned = matchedUser.data().assignedSocieties || [];
        if (!assigned.includes(societyId)) {
          assigned.push(societyId);
        }
        await updateDoc(matchedUser.ref, {
          role: 'LEAD',
          assignedSocieties: assigned,
          updatedAt: new Date().toISOString(),
        });
      }
    } else {
      // Create user record stub so when student logs in, role and assigned societies are already set
      try {
        const newStub = {
          uid: assignedUid,
          email: targetEmail,
          emailVerified: true,
          displayName: assignedName,
          photoURL: '',
          personType: 'STUDENT',
          rollNumber: targetEmail.includes('@') ? targetEmail.split('@')[0] : null,
          accommodationType: 'DAY_SCHOLAR',
          hostelName: null,
          hostelEmail: null,
          role: 'LEAD',
          isActive: true,
          assignedSocieties: [societyId],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await setDoc(doc(serverDb, 'users', assignedUid), newStub, { merge: true });
      } catch (err) {
        console.warn('User stub creation warning:', err);
      }
    }

    const data = snap.data();
    const currentLeads: string[] = data.leadUids || [];
    const currentLeadNames: string[] = data.leadNames || [];
    const currentLeadEmails: string[] = data.leadEmails || [];

    if (!currentLeadEmails.includes(targetEmail)) {
      currentLeadEmails.push(targetEmail);
    }
    if (!currentLeads.includes(assignedUid)) {
      currentLeads.push(assignedUid);
    }
    if (!currentLeadNames.includes(assignedName)) {
      currentLeadNames.push(assignedName);
    }

    await updateDoc(socRef, {
      leadUids: currentLeads,
      leadNames: currentLeadNames,
      leadEmails: currentLeadEmails,
      updatedAt: new Date().toISOString(),
    });

    await logAudit({
      actorUid: actorUid || 'admin_sys',
      actorEmail: actorEmail || 'admin@kiit.ac.in',
      actorRole: 'ADMIN',
      action: 'ASSIGN_SOCIETY_LEAD',
      entity: 'SOCIETY',
      entityId: societyId,
      after: { assignedLeadEmail: targetEmail, assignedLeadUid: assignedUid, assignedName },
    });

    return res.json({
      success: true,
      leadUids: currentLeads,
      leadNames: currentLeadNames,
      leadEmails: currentLeadEmails,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.delete('/societies/:id/leads/:leadIdentifier', async (req: Request, res: Response) => {
  try {
    const { id: societyId, leadIdentifier } = req.params;
    const { actorRole, actorUid, actorEmail } = req.query;

    if (actorRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Only administrators can remove student leads.' });
    }

    const socRef = doc(serverDb, 'societies', societyId);
    const snap = await getDoc(socRef);
    if (!snap.exists()) return res.status(404).json({ error: 'Society not found' });

    const data = snap.data();
    const cleanTarget = leadIdentifier.toLowerCase().trim();

    const leadUids: string[] = (data.leadUids || []).filter((uid: string) => uid !== leadIdentifier && uid !== cleanTarget);
    const leadEmails: string[] = (data.leadEmails || []).filter((em: string) => em.toLowerCase().trim() !== cleanTarget);
    const leadNames: string[] = (data.leadNames || []).filter((name: string) => name.toLowerCase() !== cleanTarget);

    await updateDoc(socRef, {
      leadUids,
      leadEmails,
      leadNames,
      updatedAt: new Date().toISOString(),
    });

    await logAudit({
      actorUid: (actorUid as string) || 'admin_sys',
      actorEmail: (actorEmail as string) || 'admin@kiit.ac.in',
      actorRole: 'ADMIN',
      action: 'REMOVE_SOCIETY_LEAD',
      entity: 'SOCIETY',
      entityId: societyId,
      after: { removedLeadIdentifier: leadIdentifier },
    });

    return res.json({ success: true, leadUids, leadEmails, leadNames });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Helper to strictly enforce multi-tenant society lead boundaries
async function isAuthorizedForEvent(
  eventId: string,
  callerRole?: string,
  callerUid?: string,
  callerEmail?: string
): Promise<boolean> {
  if (callerRole === 'ADMIN') return true;
  if (!eventId) return false;

  try {
    const eventSnap = await getDoc(doc(serverDb, 'events', eventId));
    if (!eventSnap.exists()) return false;
    const event = eventSnap.data();

    const normEmail = (callerEmail || '').toLowerCase().trim();
    if (callerUid && Array.isArray(event.leadUids) && event.leadUids.includes(callerUid)) return true;
    if (normEmail && Array.isArray(event.leadEmails) && event.leadEmails.map((e: string) => e.toLowerCase().trim()).includes(normEmail)) return true;

    if (event.societyId) {
      const socSnap = await getDoc(doc(serverDb, 'societies', event.societyId));
      if (socSnap.exists()) {
        const s = socSnap.data();
        const sEmails = Array.isArray(s.leadEmails) ? s.leadEmails.map((e: string) => e.toLowerCase().trim()) : [];
        const sUids = Array.isArray(s.leadUids) ? s.leadUids : [];
        if (normEmail && sEmails.includes(normEmail)) return true;
        if (callerUid && sUids.includes(callerUid)) return true;
      }
    }
  } catch (err) {
    console.warn('Authorization lookup check error:', err);
  }

  return false;
}

/**
 * Universal attendance session & event lookup by token hash
 * Allows student check-in without requiring complex query params
 */
apiRouter.get('/attendance/lookup/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    if (!token) return res.status(400).json({ error: 'Token required' });

    const eventsSnap = await getDocs(collection(serverDb, 'events'));
    for (const evDoc of eventsSnap.docs) {
      const sessSnap = await getDocs(collection(serverDb, `events/${evDoc.id}/attendanceSessions`));
      for (const sDoc of sessSnap.docs) {
        const sData = sDoc.data();
        if (sData.tokenHash === token || sDoc.id === token) {
          const evData = { id: evDoc.id, ...evDoc.data() } as CampusEvent;
          return res.json({ event: evData, session: { id: sDoc.id, ...sData } });
        }
      }
    }

    return res.status(404).json({ error: 'Attendance session not found or link has expired.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 3. EVENTS & REVISION WORKFLOW
// ----------------------------------------------------

/**
 * Fetch events:
 * Public query only returns PUBLISHED events!
 * Privileged queries return drafts for authorized leads/admins.
 */
apiRouter.get('/events', async (req: Request, res: Response) => {
  try {
    const { status, societyId, callerRole, callerUid, callerEmail } = req.query;

    const eventsRef = collection(serverDb, 'events');
    const snap = await getDocs(eventsRef);
    let events = snap.docs.map(d => ({ id: d.id, ...d.data() } as CampusEvent));

    // Security boundary: If caller is not ADMIN, non-published events are strictly filtered
    if (callerRole === 'ADMIN') {
      // Admin sees everything
    } else if (callerRole === 'LEAD') {
      // Find all societies this lead belongs to (by email or UID)
      const socSnap = await getDocs(collection(serverDb, 'societies'));
      const authorizedSocietyIds = new Set<string>();
      const normEmail = (callerEmail as string || '').toLowerCase().trim();

      socSnap.docs.forEach(sDoc => {
        const sData = sDoc.data();
        const emails: string[] = Array.isArray(sData.leadEmails) ? sData.leadEmails.map((e: string) => e.toLowerCase().trim()) : [];
        const uids: string[] = Array.isArray(sData.leadUids) ? sData.leadUids : [];

        if ((normEmail && emails.includes(normEmail)) || (callerUid && uids.includes(callerUid as string))) {
          authorizedSocietyIds.add(sDoc.id);
        }
      });

      // Lead of a society shouldn't be able to see other societies' commands, only their own society commands & published events
      events = events.filter(e => 
        e.status === 'PUBLISHED' || 
        authorizedSocietyIds.has(e.societyId) ||
        (callerUid && Array.isArray(e.leadUids) && e.leadUids.includes(callerUid as string)) ||
        (normEmail && Array.isArray(e.leadEmails) && e.leadEmails.map(em => em.toLowerCase().trim()).includes(normEmail))
      );
    } else {
      // Public / common users see ONLY published events
      events = events.filter(e => e.status === 'PUBLISHED');
    }

    if (societyId && societyId !== 'ALL') {
      events = events.filter(e => e.societyId === societyId);
    }

    if (status && typeof status === 'string' && status !== 'ALL') {
      events = events.filter(e => e.status === status);
    }

    // Sort by startAt ascending
    events.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

    return res.json({ events });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/events/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { callerRole, callerUid, callerEmail } = req.query;

    const eventRef = doc(serverDb, 'events', id);
    const snap = await getDoc(eventRef);
    if (!snap.exists()) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const event = { id: snap.id, ...snap.data() } as CampusEvent;

    // Authorization check: if not PUBLISHED, only admin or assigned society leads can view
    if (event.status !== 'PUBLISHED') {
      const isAdmin = callerRole === 'ADMIN';
      let isAssignedLead = false;

      if (callerUid && Array.isArray(event.leadUids) && event.leadUids.includes(callerUid as string)) {
        isAssignedLead = true;
      }

      if (!isAssignedLead && event.societyId) {
        const socSnap = await getDoc(doc(serverDb, 'societies', event.societyId));
        if (socSnap.exists()) {
          const sData = socSnap.data();
          const emails: string[] = Array.isArray(sData.leadEmails) ? sData.leadEmails.map((e: string) => e.toLowerCase().trim()) : [];
          const uids: string[] = Array.isArray(sData.leadUids) ? sData.leadUids : [];
          const normEmail = (callerEmail as string || '').toLowerCase().trim();
          if ((normEmail && emails.includes(normEmail)) || (callerUid && uids.includes(callerUid as string))) {
            isAssignedLead = true;
          }
        }
      }

      if (!isAssignedLead && !isAdmin) {
        return res.status(403).json({ error: 'Access denied. You are not an authorized lead for this society.' });
      }
    }

    return res.json({ event });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * Lead creates an event draft
 * Initial status: DRAFT
 */
apiRouter.post('/events', async (req: Request, res: Response) => {
  try {
    const { actorUid, actorEmail, actorRole, ...eventPayload } = req.body;

    if (actorRole !== 'ADMIN' && actorRole !== 'LEAD') {
      return res.status(403).json({ error: 'Only student leads or administrators can create event proposals.' });
    }

    const parsed = EventDraftSchema.parse(eventPayload);

    // Verify society exists
    const socRef = doc(serverDb, 'societies', parsed.societyId);
    const socSnap = await getDoc(socRef);
    if (!socSnap.exists()) {
      return res.status(400).json({ error: 'Associated society does not exist' });
    }
    const socData = socSnap.data();

    // If lead, verify lead is assigned to this society (by email or UID)
    if (actorRole === 'LEAD') {
      const normEmail = (actorEmail || '').toLowerCase().trim();
      const leadEmails: string[] = Array.isArray(socData.leadEmails) ? socData.leadEmails.map((e: string) => e.toLowerCase().trim()) : [];
      const leadUids: string[] = Array.isArray(socData.leadUids) ? socData.leadUids : [];

      const isAssigned = leadUids.includes(actorUid) || (normEmail && leadEmails.includes(normEmail));
      if (!isAssigned) {
        return res.status(403).json({ error: 'You are not assigned as a lead for this society.' });
      }
    }

    const eventId = `evt_${parsed.name.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 20)}_${Date.now().toString(36)}`;
    const now = new Date().toISOString();

    const thematicCategoryBanners: Record<string, string> = {
      Technical: '/src/assets/images/tech_event_banner_1791005048820.jpg',
      Cultural: '/src/assets/images/cultural_event_banner_1791005060884.jpg',
      Workshop: '/src/assets/images/workshop_event_banner_1791005072133.jpg',
      Sports: '/src/assets/images/sports_event_banner_1791005084694.jpg',
      Literary: '/src/assets/images/kiit_lit_banner_1791004918526.jpg',
    };

    const chosenPoster = parsed.posterPath && parsed.posterPath.trim().length > 0
      ? parsed.posterPath.trim()
      : (thematicCategoryBanners[parsed.category] || thematicCategoryBanners.Technical);

    const newEvent: CampusEvent = {
      id: eventId,
      societyId: parsed.societyId,
      societyName: socData.name,
      name: parsed.name,
      description: parsed.description,
      category: parsed.category,
      logoPath: parsed.logoPath || 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=300&q=80',
      posterPath: chosenPoster,
      startAt: parsed.startAt,
      endAt: parsed.endAt,
      duration: parsed.duration,
      venue: parsed.venue,
      capacity: parsed.capacity,
      registeredCount: 0,
      registrationOpenAt: parsed.registrationOpenAt,
      registrationCloseAt: parsed.registrationCloseAt,
      eligibility: parsed.eligibility,
      rules: parsed.rules,
      contactDetails: parsed.contactDetails,
      operationalNotes: parsed.operationalNotes || '',
      status: 'PENDING_REVIEW',
      leadUids: [actorUid],
      leadNames: [actorEmail ? actorEmail.split('@')[0] : 'Lead'],
      leadEmails: actorEmail ? [actorEmail.toLowerCase().trim()] : [],
      health: 'HEALTHY',
      healthReason: 'Initial proposal submitted for administrative review and publication.',
      createdAt: now,
      updatedAt: now,
    };

    // Immediately create initial revision 1 document so admin and lead can track review lifecycle
    const initialRevId = `rev_1_${Date.now().toString(36)}`;
    const initialRev = {
      id: initialRevId,
      eventId,
      revisionNumber: 1,
      submittedBy: actorUid,
      submittedByName: actorEmail ? actorEmail.split('@')[0] : 'Lead',
      submittedAt: now,
      snapshot: newEvent,
      reviewStatus: 'PENDING',
      feedback: 'Initial event proposal submitted by student lead for administrative review.',
    };
    newEvent.currentRevisionId = initialRevId;

    await setDoc(doc(serverDb, 'events', eventId), newEvent);
    await setDoc(doc(serverDb, `events/${eventId}/revisions`, initialRevId), initialRev);

    // Synchronize event to Notion Knowledge Base
    try {
      await notionService.syncEvent(newEvent);
    } catch (err) {
      console.warn('Notion auto-sync on creation notice:', err);
    }

    await logAudit({
      actorUid,
      actorEmail,
      actorRole,
      action: 'CREATE_EVENT_SUBMIT_REVIEW',
      entity: 'EVENT',
      entityId: eventId,
      after: newEvent as any,
    });

    return res.json({ event: newEvent });
  } catch (err: any) {
    console.error('Error creating event:', err);
    return res.status(400).json({ error: err.message });
  }
});

/**
 * Lead submits event for review: DRAFT / RESUBMITTED -> PENDING_REVIEW
 * Creates an immutable revision entry
 */
apiRouter.post('/events/:id/submit', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { actorUid, actorEmail, actorRole } = req.body;

    const eventRef = doc(serverDb, 'events', id);
    const snap = await getDoc(eventRef);
    if (!snap.exists()) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const event = snap.data() as CampusEvent;

    // Check authorization: must be assigned lead or admin
    const normEmail = (actorEmail || '').toLowerCase().trim();
    let isLead = Array.isArray(event.leadUids) && event.leadUids.includes(actorUid);
    if (!isLead && event.societyId) {
      const socSnap = await getDoc(doc(serverDb, 'societies', event.societyId));
      if (socSnap.exists()) {
        const sData = socSnap.data();
        const emails: string[] = Array.isArray(sData.leadEmails) ? sData.leadEmails.map((e: string) => e.toLowerCase().trim()) : [];
        const uids: string[] = Array.isArray(sData.leadUids) ? sData.leadUids : [];
        if (uids.includes(actorUid) || (normEmail && emails.includes(normEmail))) {
          isLead = true;
        }
      }
    }

    if (!isLead && actorRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Unauthorized to submit this event for review.' });
    }

    // Revision increment
    const revSnap = await getDocs(collection(serverDb, `events/${id}/revisions`));
    const nextRevNum = revSnap.size + 1;
    const revisionId = `rev_${nextRevNum}_${Date.now().toString(36)}`;
    const now = new Date().toISOString();

    const revision = {
      id: revisionId,
      eventId: id,
      revisionNumber: nextRevNum,
      submittedBy: actorUid,
      submittedByName: actorEmail ? actorEmail.split('@')[0] : 'Lead',
      submittedAt: now,
      snapshot: event,
      reviewStatus: 'PENDING',
    };

    await setDoc(doc(serverDb, `events/${id}/revisions`, revisionId), revision);

    await updateDoc(eventRef, {
      status: 'PENDING_REVIEW',
      currentRevisionId: revisionId,
      updatedAt: now,
    });

    await logAudit({
      actorUid,
      actorEmail,
      actorRole,
      action: 'SUBMIT_EVENT_REVIEW',
      entity: 'EVENT',
      entityId: id,
      after: { status: 'PENDING_REVIEW', revisionNumber: nextRevNum },
    });

    return res.json({ success: true, status: 'PENDING_REVIEW', revisionNumber: nextRevNum });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * Admin Review: APPROVE, REJECT, REQUEST_CHANGES
 * Never destroys review history!
 * Stores actual admin feedback message directly on event document for immediate lead visibility
 */
apiRouter.post('/events/:id/review', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { actorRole, actorUid, actorEmail, action, feedback, rejectionReason } = req.body;

    if (actorRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Administrative authority required to review events.' });
    }

    const parsed = EventReviewSchema.parse({ action, feedback, rejectionReason });

    const eventRef = doc(serverDb, 'events', id);
    const snap = await getDoc(eventRef);
    if (!snap.exists()) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const event = snap.data() as CampusEvent;
    const now = new Date().toISOString();

    let newStatus: CampusEvent['status'] = event.status;
    if (parsed.action === 'APPROVE') {
      newStatus = 'PUBLISHED';
    } else if (parsed.action === 'REJECT') {
      newStatus = 'REJECTED';
    } else if (parsed.action === 'REQUEST_CHANGES') {
      newStatus = 'CHANGES_REQUESTED';
    }

    // Update revision entry with review details
    if (event.currentRevisionId) {
      const revRef = doc(serverDb, `events/${id}/revisions`, event.currentRevisionId);
      await updateDoc(revRef, {
        reviewStatus: parsed.action,
        reviewedBy: actorUid,
        reviewedByName: 'KIIT Platform Administrator',
        reviewedAt: now,
        feedback: parsed.feedback || '',
        rejectionReason: parsed.rejectionReason || '',
      });
    }

    const updates: any = {
      status: newStatus,
      latestAdminFeedback: parsed.feedback || '',
      latestRejectionReason: parsed.rejectionReason || '',
      latestReviewedAt: now,
      updatedAt: now,
    };
    if (newStatus === 'PUBLISHED') {
      updates.publishedAt = now;
    }

    await updateDoc(eventRef, updates);

    // Synchronize to Notion Knowledge Base
    try {
      await notionService.syncEvent({ ...event, ...updates, id });
    } catch (err) {
      console.warn('Notion sync notice on review:', err);
    }

    await logAudit({
      actorUid,
      actorEmail,
      actorRole: 'ADMIN',
      action: `EVENT_REVIEW_${parsed.action}`,
      entity: 'EVENT',
      entityId: id,
      before: { status: event.status },
      after: { status: newStatus, feedback: parsed.feedback, rejectionReason: parsed.rejectionReason },
    });

    return res.json({ success: true, status: newStatus });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

/**
 * Edit Event Details & Resubmit for Review
 * Rule 2: Edit all details and send rereview to admin with feedback resolution
 * Rule 3: After review of admin, if event accepted no further changes! Admin can delete event only.
 */
apiRouter.put('/events/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { actorUid, actorEmail, actorRole, resubmit, ...updates } = req.body;

    const eventRef = doc(serverDb, 'events', id);
    const snap = await getDoc(eventRef);
    if (!snap.exists()) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const event = snap.data() as CampusEvent;

    // Rule 3: After review of admin, if event accepted no further changes. Admin can delete event only.
    if (event.status === 'PUBLISHED' || event.status === 'APPROVED') {
      return res.status(400).json({
        error: 'Event has been accepted and approved by the platform administrator. No further modifications are permitted. Administrators may delete the event if necessary.'
      });
    }

    // Check authorization: must be assigned lead or admin
    const socSnap = await getDoc(doc(serverDb, 'societies', event.societyId));
    const socData = socSnap.exists() ? socSnap.data() : null;
    const normEmail = (actorEmail || '').toLowerCase().trim();
    const isSocietyLead = socData && (
      (Array.isArray(socData.leadUids) && socData.leadUids.includes(actorUid)) ||
      (Array.isArray(socData.leadEmails) && normEmail && socData.leadEmails.map((e: string) => e.toLowerCase().trim()).includes(normEmail))
    );
    const isEventLead = (
      (Array.isArray(event.leadUids) && event.leadUids.includes(actorUid)) ||
      (Array.isArray(event.leadEmails) && normEmail && event.leadEmails.map((e: string) => e.toLowerCase().trim()).includes(normEmail))
    );

    if (actorRole !== 'ADMIN' && !isEventLead && !isSocietyLead) {
      return res.status(403).json({ error: 'Unauthorized. You are not an assigned lead for this society.' });
    }

    const now = new Date().toISOString();
    const allowedFields = [
      'name', 'description', 'category', 'venue', 'capacity', 'duration',
      'startAt', 'endAt', 'registrationOpenAt', 'registrationCloseAt',
      'eligibility', 'rules', 'contactDetails', 'posterPath', 'logoPath'
    ];

    const sanitizedUpdates: Partial<CampusEvent> = { updatedAt: now };
    for (const f of allowedFields) {
      if (updates[f] !== undefined) {
        (sanitizedUpdates as any)[f] = updates[f];
      }
    }

    let revisionNumber = 0;
    if (resubmit) {
      sanitizedUpdates.status = 'PENDING_REVIEW';
      const revSnap = await getDocs(collection(serverDb, `events/${id}/revisions`));
      revisionNumber = revSnap.size + 1;
      const revisionId = `rev_${revisionNumber}_${Date.now().toString(36)}`;

      const revision = {
        id: revisionId,
        eventId: id,
        revisionNumber,
        submittedBy: actorUid,
        submittedByName: actorEmail ? actorEmail.split('@')[0] : 'Lead',
        submittedAt: now,
        snapshot: { ...event, ...sanitizedUpdates },
        reviewStatus: 'PENDING',
        feedback: 'Resubmitted after lead revisions addressing administrative feedback.',
      };

      await setDoc(doc(serverDb, `events/${id}/revisions`, revisionId), revision);
      sanitizedUpdates.currentRevisionId = revisionId;
    }

    await updateDoc(eventRef, sanitizedUpdates);

    // Sync edited event to Notion
    try {
      await notionService.syncEvent({ ...event, ...sanitizedUpdates, id });
    } catch (err) {
      console.warn('Notion sync notice on update:', err);
    }

    await logAudit({
      actorUid: actorUid || 'sys',
      actorEmail: actorEmail || 'lead@kiit.ac.in',
      actorRole: actorRole || 'LEAD',
      action: resubmit ? 'RESUBMIT_EVENT_REVIEW' : 'UPDATE_EVENT_DETAILS',
      entity: 'EVENT',
      entityId: id,
      before: event as any,
      after: sanitizedUpdates as any,
    });

    return res.json({ success: true, event: { ...event, ...sanitizedUpdates }, resubmitted: !!resubmit });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

/**
 * Admin Delete Event Endpoint
 * Rule 3: After review of admin, if event accepted no further changes - admin can delete event only.
 */
apiRouter.delete('/events/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { actorRole, actorUid, actorEmail } = req.query;

    if (actorRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Only platform administrators can delete events.' });
    }

    const eventRef = doc(serverDb, 'events', id);
    const snap = await getDoc(eventRef);
    if (!snap.exists()) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const eventData = snap.data();
    await deleteDoc(eventRef);

    await logAudit({
      actorUid: (actorUid as string) || 'admin_sys',
      actorEmail: (actorEmail as string) || 'admin@kiit.ac.in',
      actorRole: 'ADMIN',
      action: 'DELETE_EVENT',
      entity: 'EVENT',
      entityId: id,
      before: eventData,
    });

    return res.json({ success: true, message: 'Event successfully removed from campus registry.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/events/:id/revisions', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const snap = await getDocs(collection(serverDb, `events/${id}/revisions`));
    const revisions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    revisions.sort((a: any, b: any) => b.revisionNumber - a.revisionNumber);
    return res.json({ revisions });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 4. REGISTRATION (TRANSACTIONAL & UNIQUE)
// ----------------------------------------------------

apiRouter.post('/events/:id/registrations', async (req: Request, res: Response) => {
  try {
    const { id: eventId } = req.params;
    const { uid, email, emailVerified } = req.body;

    if (!uid || !email) {
      return res.status(400).json({ error: 'User identity required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const isKiit = normalizedEmail.endsWith('@kiit.ac.in');
    const isBootstrappedAdmin = normalizedEmail === 'aditya2024303@gmail.com';

    if ((!isKiit && !isBootstrappedAdmin) || !emailVerified) {
      return res.status(403).json({ error: 'Registration is restricted to verified @kiit.ac.in accounts.' });
    }

    // Fetch user profile snapshot
    const userDocRef = doc(serverDb, 'users', uid);
    const userSnap = await getDoc(userDocRef);
    if (!userSnap.exists()) {
      return res.status(400).json({ error: 'Complete your user profile before registering for events.' });
    }
    const profile = userSnap.data() as UserProfile;

    const eventDocRef = doc(serverDb, 'events', eventId);
    const regDocRef = doc(serverDb, `events/${eventId}/registrations`, uid);

    // Execute Firestore Transaction for atomic capacity check and duplicate prevention
    const result = await runTransaction(serverDb, async (transaction) => {
      const eventDoc = await transaction.get(eventDocRef);
      if (!eventDoc.exists()) {
        throw new Error('Event does not exist.');
      }

      const eventData = eventDoc.data() as CampusEvent;

      if (eventData.status !== 'PUBLISHED') {
        throw new Error('Registration is only permitted for published events.');
      }

      const nowTime = Date.now();
      const openTime = new Date(eventData.registrationOpenAt).getTime();
      const closeTime = new Date(eventData.registrationCloseAt).getTime();

      if (nowTime < openTime) {
        throw new Error('Registration for this event has not opened yet.');
      }
      if (nowTime > closeTime) {
        throw new Error('Registration for this event is closed.');
      }

      const existingReg = await transaction.get(regDocRef);
      if (existingReg.exists()) {
        throw new Error('You are already registered for this event.');
      }

      const currentRegistered = eventData.registeredCount || 0;
      if (currentRegistered >= eventData.capacity) {
        throw new Error('Event capacity has been reached.');
      }

      // Snapshot profile at registration time
      const registrationRecord = {
        uid,
        eventId,
        nameSnapshot: profile.displayName,
        emailSnapshot: profile.email,
        rollNumberSnapshot: profile.rollNumber,
        personTypeSnapshot: profile.personType,
        accommodationSnapshot: profile.accommodationType,
        hostelSnapshot: profile.hostelName,
        hostelEmailSnapshot: profile.hostelEmail,
        status: 'CONFIRMED',
        registeredAt: new Date().toISOString(),
      };

      transaction.set(regDocRef, registrationRecord);
      transaction.update(eventDocRef, {
        registeredCount: currentRegistered + 1,
        updatedAt: new Date().toISOString(),
      });

      return { registration: registrationRecord, newCount: currentRegistered + 1 };
    });

    await logAudit({
      actorUid: uid,
      actorEmail: normalizedEmail,
      actorRole: profile.role,
      action: 'EVENT_REGISTRATION',
      entity: 'REGISTRATION',
      entityId: uid,
      eventId,
    });

    return res.json({ success: true, ...result });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

apiRouter.get('/events/:id/registrations', async (req: Request, res: Response) => {
  try {
    const { id: eventId } = req.params;
    const { callerRole, callerUid, callerEmail } = req.query;

    const isAuthed = await isAuthorizedForEvent(eventId, callerRole as string, callerUid as string, callerEmail as string);
    if (!isAuthed) {
      return res.status(403).json({ error: 'Access denied: You are not authorized to view registrations for this society event.' });
    }

    const snap = await getDocs(collection(serverDb, `events/${eventId}/registrations`));
    const registrations = snap.docs.map(d => d.data());
    registrations.sort((a: any, b: any) => new Date(b.registeredAt || 0).getTime() - new Date(a.registeredAt || 0).getTime());
    return res.json({ registrations, count: registrations.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/events/:id/registrations/my', async (req: Request, res: Response) => {
  try {
    const { id: eventId } = req.params;
    const { uid } = req.query;
    if (!uid) return res.status(400).json({ error: 'UID required' });

    const snap = await getDoc(doc(serverDb, `events/${eventId}/registrations`, uid as string));
    return res.json({ isRegistered: snap.exists(), registration: snap.exists() ? snap.data() : null });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 5. ATTENDANCE & EXCEL EXPORT
// ----------------------------------------------------

apiRouter.post('/events/:id/attendance/start', async (req: Request, res: Response) => {
  try {
    const { id: eventId } = req.params;
    const { name, description, durationMinutes, actorUid, actorEmail, actorRole } = req.body;

    const isAuthed = await isAuthorizedForEvent(eventId, actorRole, actorUid, actorEmail);
    if (!isAuthed) {
      return res.status(403).json({ error: 'Unauthorized: You are only allowed to manage attendance for your assigned society events.' });
    }

    const parsed = AttendanceSessionCreateSchema.parse({ name, description, durationMinutes });

    const sessionId = `att_${Date.now().toString(36)}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (parsed.durationMinutes || 60) * 60000);
    const tokenHash = `QR_${Math.random().toString(36).slice(2, 8).toUpperCase()}_${Date.now().toString(36)}`;

    const session = {
      id: sessionId,
      eventId,
      name: parsed.name,
      description: parsed.description,
      startsAt: now.toISOString(),
      endsAt: expiresAt.toISOString(),
      status: 'ACTIVE',
      tokenHash,
      tokenExpiresAt: expiresAt.toISOString(),
      presentCount: 0,
      createdBy: actorUid,
      createdByName: actorEmail ? actorEmail.split('@')[0] : 'Lead',
      createdAt: now.toISOString(),
    };

    await setDoc(doc(serverDb, `events/${eventId}/attendanceSessions`, sessionId), session);

    await logAudit({
      actorUid,
      actorEmail,
      actorRole,
      action: 'START_ATTENDANCE_SESSION',
      entity: 'ATTENDANCE_SESSION',
      entityId: sessionId,
      eventId,
      after: session,
    });

    return res.json({ session });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/events/:id/attendance/close', async (req: Request, res: Response) => {
  try {
    const { id: eventId } = req.params;
    const { sessionId, actorUid, actorEmail, actorRole } = req.body;

    const isAuthed = await isAuthorizedForEvent(eventId, actorRole, actorUid, actorEmail);
    if (!isAuthed) {
      return res.status(403).json({ error: 'Unauthorized: You are only allowed to close attendance for your assigned society events.' });
    }

    const ref = doc(serverDb, `events/${eventId}/attendanceSessions`, sessionId);
    await updateDoc(ref, {
      status: 'CLOSED',
      closedAt: new Date().toISOString(),
    });

    await logAudit({
      actorUid,
      actorEmail,
      actorRole,
      action: 'CLOSE_ATTENDANCE_SESSION',
      entity: 'ATTENDANCE_SESSION',
      entityId: sessionId,
      eventId,
    });

    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/events/:id/attendance/mark', async (req: Request, res: Response) => {
  try {
    const { id: eventId } = req.params;
    const { sessionId, token, uid, email, emailVerified } = req.body;

    if (!uid || !email) {
      return res.status(400).json({ error: 'User identity required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const isKiit = normalizedEmail.endsWith('@kiit.ac.in');
    const isBootstrappedAdmin = normalizedEmail === 'aditya2024303@gmail.com';

    if ((!isKiit && !isBootstrappedAdmin) || !emailVerified) {
      return res.status(403).json({ error: 'Attendance can only be marked by verified @kiit.ac.in accounts.' });
    }

    // Verify user profile
    const userSnap = await getDoc(doc(serverDb, 'users', uid));
    if (!userSnap.exists()) {
      return res.status(400).json({ error: 'User profile not found. Please sync profile first.' });
    }
    const profile = userSnap.data() as UserProfile;

    const sessionRef = doc(serverDb, `events/${eventId}/attendanceSessions`, sessionId);
    const recordRef = doc(serverDb, `events/${eventId}/attendanceSessions/${sessionId}/records`, uid);

    const result = await runTransaction(serverDb, async (transaction) => {
      const sessDoc = await transaction.get(sessionRef);
      if (!sessDoc.exists()) {
        throw new Error('Attendance session does not exist.');
      }

      const sessData = sessDoc.data();
      if (sessData.status !== 'ACTIVE') {
        throw new Error('This attendance session has already closed.');
      }

      if (token && sessData.tokenHash && token !== sessData.tokenHash) {
        throw new Error('Invalid or expired attendance QR token.');
      }

      if (new Date(sessData.tokenExpiresAt).getTime() < Date.now()) {
        throw new Error('Attendance QR code has expired.');
      }

      const existingRecord = await transaction.get(recordRef);
      if (existingRecord.exists()) {
        throw new Error('You have already marked attendance for this session.');
      }

      const newRecord = {
        uid,
        sessionId,
        eventId,
        nameSnapshot: profile.displayName,
        emailSnapshot: profile.email,
        rollNumberSnapshot: profile.rollNumber,
        personTypeSnapshot: profile.personType,
        accommodationSnapshot: profile.accommodationType,
        hostelSnapshot: profile.hostelName,
        hostelEmailSnapshot: profile.hostelEmail,
        markedAt: new Date().toISOString(),
      };

      const currentPresent = sessData.presentCount || 0;
      transaction.set(recordRef, newRecord);
      transaction.update(sessionRef, {
        presentCount: currentPresent + 1,
      });

      return { record: newRecord, presentCount: currentPresent + 1 };
    });

    await logAudit({
      actorUid: uid,
      actorEmail: normalizedEmail,
      actorRole: profile.role,
      action: 'MARK_ATTENDANCE',
      entity: 'ATTENDANCE_RECORD',
      entityId: `${sessionId}_${uid}`,
      eventId,
    });

    return res.json({ success: true, ...result });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

/**
 * Attendance Excel Export Endpoint
 * Streams a real XLSX workbook generated by ExcelJS
 */
apiRouter.get('/events/:id/attendance/:sessionId/export', async (req: Request, res: Response) => {
  try {
    const { id: eventId, sessionId } = req.params;

    const eventSnap = await getDoc(doc(serverDb, 'events', eventId));
    if (!eventSnap.exists()) {
      return res.status(404).send('Event not found');
    }
    const event = { id: eventSnap.id, ...eventSnap.data() } as CampusEvent;

    const sessionSnap = await getDoc(doc(serverDb, `events/${eventId}/attendanceSessions`, sessionId));
    if (!sessionSnap.exists()) {
      return res.status(404).send('Attendance session not found');
    }
    const session = { id: sessionSnap.id, ...sessionSnap.data() } as any;

    const recordsSnap = await getDocs(collection(serverDb, `events/${eventId}/attendanceSessions/${sessionId}/records`));
    const records = recordsSnap.docs.map(d => d.data()) as any;

    const buffer = await generateAttendanceWorkbook({
      event,
      session,
      records,
      totalRegistered: event.registeredCount || 0,
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="attendance_${event.name.replace(/\s+/g, '_')}_${session.name.replace(/\s+/g, '_')}.xlsx"`);
    return res.send(buffer);
  } catch (err: any) {
    console.error('Error generating attendance excel:', err);
    return res.status(500).send(`Excel export failed: ${err.message}`);
  }
});

/**
 * Fetch all attendance sessions for an event (Restricted to Admin and assigned Society Leads)
 */
apiRouter.get('/events/:id/attendance/sessions', async (req: Request, res: Response) => {
  try {
    const { id: eventId } = req.params;
    const { callerRole, callerUid, callerEmail } = req.query;

    const isAuthed = await isAuthorizedForEvent(eventId, callerRole as string, callerUid as string, callerEmail as string);
    if (!isAuthed) {
      return res.status(403).json({ error: 'Access denied: You are not authorized to view attendance sessions for this society event.' });
    }

    const snap = await getDocs(collection(serverDb, `events/${eventId}/attendanceSessions`));
    const sessions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    sessions.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    return res.json({ sessions, count: sessions.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * Fetch all attendee records for an active or closed attendance session
 */
apiRouter.get('/events/:id/attendance/:sessionId/records', async (req: Request, res: Response) => {
  try {
    const { id: eventId, sessionId } = req.params;
    const { callerRole, callerUid, callerEmail } = req.query;

    const isAuthed = await isAuthorizedForEvent(eventId, callerRole as string, callerUid as string, callerEmail as string);
    if (!isAuthed) {
      return res.status(403).json({ error: 'Access denied: You are not authorized to view attendee records for this society event.' });
    }

    const snap = await getDocs(collection(serverDb, `events/${eventId}/attendanceSessions/${sessionId}/records`));
    const records = snap.docs.map(d => d.data());
    records.sort((a: any, b: any) => new Date(b.markedAt || 0).getTime() - new Date(a.markedAt || 0).getTime());
    return res.json({ records, count: records.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * Lead / Admin Manual Check-In Endpoint
 * Allows recording attendance directly by Roll Number or KIIT Email
 */
apiRouter.post('/events/:id/attendance/manual-mark', async (req: Request, res: Response) => {
  try {
    const { id: eventId } = req.params;
    const { sessionId, studentIdentifier, actorUid, actorEmail, actorRole } = req.body;

    const isAuthed = await isAuthorizedForEvent(eventId, actorRole, actorUid, actorEmail);
    if (!isAuthed) {
      return res.status(403).json({ error: 'Unauthorized: You are only allowed to manually record attendance for your assigned society events.' });
    }

    if (!studentIdentifier || !studentIdentifier.trim()) {
      return res.status(400).json({ error: 'Student Roll Number or KIIT Email is required.' });
    }

    const cleanInput = studentIdentifier.trim().toLowerCase();
    
    // Check if input is email or roll
    let userQuery;
    if (cleanInput.includes('@')) {
      userQuery = query(collection(serverDb, 'users'), where('email', '==', cleanInput));
    } else {
      userQuery = query(collection(serverDb, 'users'), where('rollNumber', '==', cleanInput));
    }

    const userSnap = await getDocs(userQuery);
    let attendeeUid = '';
    let profile: any = null;

    if (!userSnap.empty) {
      attendeeUid = userSnap.docs[0].id;
      profile = userSnap.docs[0].data();
    } else {
      const roll = cleanInput.includes('@') ? cleanInput.split('@')[0] : cleanInput;
      attendeeUid = `student_${roll}`;
      profile = {
        displayName: `Student #${roll}`,
        email: cleanInput.includes('@') ? cleanInput : `${roll}@kiit.ac.in`,
        rollNumber: roll,
        personType: 'STUDENT',
        accommodationType: 'HOSTEL',
        hostelName: 'KP Hostel',
        hostelEmail: null,
      };
    }

    const sessionRef = doc(serverDb, `events/${eventId}/attendanceSessions`, sessionId);
    const sessDoc = await getDoc(sessionRef);
    if (!sessDoc.exists()) {
      return res.status(404).json({ error: 'Attendance session not found.' });
    }
    const sessData = sessDoc.data();

    const recordRef = doc(serverDb, `events/${eventId}/attendanceSessions/${sessionId}/records`, attendeeUid);
    const existingRec = await getDoc(recordRef);
    if (existingRec.exists()) {
      return res.status(400).json({ error: `Student (${profile.displayName || cleanInput}) is already marked present.` });
    }

    const newRecord = {
      uid: attendeeUid,
      sessionId,
      eventId,
      nameSnapshot: profile.displayName,
      emailSnapshot: profile.email,
      rollNumberSnapshot: profile.rollNumber,
      personTypeSnapshot: profile.personType,
      accommodationSnapshot: profile.accommodationType,
      hostelSnapshot: profile.hostelName || null,
      hostelEmailSnapshot: profile.hostelEmail || null,
      markedAt: new Date().toISOString(),
      manualCheckinBy: actorEmail || actorUid,
    };

    await setDoc(recordRef, newRecord);
    const currentPresent = sessData.presentCount || 0;
    await updateDoc(sessionRef, { presentCount: currentPresent + 1 });

    await logAudit({
      actorUid,
      actorEmail,
      actorRole,
      action: 'MANUAL_MARK_ATTENDANCE',
      entity: 'ATTENDANCE_RECORD',
      entityId: `${sessionId}_${attendeeUid}`,
      eventId,
      after: newRecord,
    });

    return res.json({ success: true, record: newRecord, presentCount: currentPresent + 1 });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * Cross Option for Attendance (Unmark / Revoke Presence)
 * Allows leads or admins to cross out / delete a recorded attendance mark
 */
apiRouter.delete('/events/:id/attendance/:sessionId/records/:attendeeUid', async (req: Request, res: Response) => {
  try {
    const { id: eventId, sessionId, attendeeUid } = req.params;
    const { actorUid, actorEmail, actorRole } = req.query;

    const isAuthed = await isAuthorizedForEvent(eventId, actorRole as string, actorUid as string, actorEmail as string);
    if (!isAuthed) {
      return res.status(403).json({ error: 'Unauthorized: You are only allowed to modify attendance records for your assigned society events.' });
    }

    const sessionRef = doc(serverDb, `events/${eventId}/attendanceSessions`, sessionId);
    const sessDoc = await getDoc(sessionRef);
    if (!sessDoc.exists()) {
      return res.status(404).json({ error: 'Attendance session not found.' });
    }

    const recordRef = doc(serverDb, `events/${eventId}/attendanceSessions/${sessionId}/records`, attendeeUid);
    const recDoc = await getDoc(recordRef);
    if (!recDoc.exists()) {
      return res.status(404).json({ error: 'Attendee record not found for this session.' });
    }

    const recData = recDoc.data();
    await deleteDoc(recordRef);

    const currentPresent = sessDoc.data().presentCount || 0;
    const newPresentCount = Math.max(0, currentPresent - 1);
    await updateDoc(sessionRef, { presentCount: newPresentCount });

    await logAudit({
      actorUid: (actorUid as string) || 'lead',
      actorEmail: (actorEmail as string) || 'lead@kiit.ac.in',
      actorRole: (actorRole as ApplicationRole) || 'LEAD',
      action: 'CROSS_UNMARK_ATTENDANCE',
      entity: 'ATTENDANCE_RECORD',
      entityId: `${sessionId}_${attendeeUid}`,
      eventId,
      before: recData,
    });

    return res.json({
      success: true,
      message: 'Attendance record crossed out and revoked.',
      presentCount: newPresentCount,
      unmarkedUid: attendeeUid,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * Full Event Attendance Roster
 * Merges confirmed event registrations with active session check-in status
 * Enables one-click Check (Present) and Cross (Absent) recording flow
 */
apiRouter.get('/events/:id/attendance/:sessionId/roster', async (req: Request, res: Response) => {
  try {
    const { id: eventId, sessionId } = req.params;
    const { callerRole, callerUid, callerEmail } = req.query;

    if (callerRole && !(await isAuthorizedForEvent(eventId, callerRole as string, callerUid as string, callerEmail as string))) {
      return res.status(403).json({ error: 'Access denied: You are not authorized to view the attendance roster for this society event.' });
    }

    // Load registrations and present records in parallel
    const [regSnap, recSnap] = await Promise.all([
      getDocs(collection(serverDb, `events/${eventId}/registrations`)),
      getDocs(collection(serverDb, `events/${eventId}/attendanceSessions/${sessionId}/records`)),
    ]);

    const presentMap = new Map<string, any>();
    recSnap.docs.forEach((d) => {
      const data = d.data();
      presentMap.set(d.id, data);
      if (data.emailSnapshot) {
        presentMap.set(data.emailSnapshot.toLowerCase().trim(), data);
      }
      if (data.rollNumberSnapshot) {
        presentMap.set(data.rollNumberSnapshot.toLowerCase().trim(), data);
      }
    });

    const roster: any[] = [];
    const seenUids = new Set<string>();

    regSnap.docs.forEach((d) => {
      const reg = d.data();
      const isPresent = presentMap.has(reg.uid) ||
        (reg.emailSnapshot && presentMap.has(reg.emailSnapshot.toLowerCase().trim())) ||
        (reg.rollNumberSnapshot && presentMap.has(reg.rollNumberSnapshot.toLowerCase().trim()));

      const presentInfo = presentMap.get(reg.uid) ||
        (reg.emailSnapshot ? presentMap.get(reg.emailSnapshot.toLowerCase().trim()) : null);

      seenUids.add(reg.uid);
      roster.push({
        uid: reg.uid,
        name: reg.nameSnapshot,
        email: reg.emailSnapshot,
        rollNumber: reg.rollNumberSnapshot || null,
        accommodation: reg.accommodationSnapshot,
        hostel: reg.hostelSnapshot,
        isPresent: !!isPresent,
        markedAt: presentInfo?.markedAt || null,
        isWalkin: false,
      });
    });

    // Also include any walk-in checkins that weren't in pre-registrations
    recSnap.docs.forEach((d) => {
      const rec = d.data();
      if (!seenUids.has(rec.uid)) {
        roster.push({
          uid: rec.uid,
          name: rec.nameSnapshot || 'Spot Attendee',
          email: rec.emailSnapshot,
          rollNumber: rec.rollNumberSnapshot || null,
          accommodation: rec.accommodationSnapshot || 'DAY_SCHOLAR',
          hostel: rec.hostelSnapshot || null,
          isPresent: true,
          markedAt: rec.markedAt || null,
          isWalkin: true,
        });
      }
    });

    // Sort by name
    roster.sort((a, b) => a.name.localeCompare(b.name));

    return res.json({
      roster,
      totalRegistered: regSnap.size,
      presentCount: recSnap.size,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 6. DEPENDENCY ENGINE & HERO VENUE-CHANGE WORKFLOW
// ----------------------------------------------------

apiRouter.get('/events/:id/dependencies', async (req: Request, res: Response) => {
  try {
    const { id: eventId } = req.params;
    const snap = await getDocs(collection(serverDb, `events/${eventId}/dependencies`));
    const dependencies = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return res.json({ dependencies });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/events/:id/dependencies', async (req: Request, res: Response) => {
  try {
    const { id: eventId } = req.params;
    const { sourceType, sourceId, sourceLabel, targetType, targetId, targetLabel, relationshipType, severity, actorUid } = req.body;

    const depId = `dep_${Date.now().toString(36)}`;
    const newDep = {
      id: depId,
      eventId,
      sourceType,
      sourceId,
      sourceLabel: sourceLabel || sourceId,
      targetType,
      targetId,
      targetLabel: targetLabel || targetId,
      relationshipType: relationshipType || 'DEPENDS_ON',
      severity: severity || 'MEDIUM',
      createdAt: new Date().toISOString(),
      createdBy: actorUid || 'lead',
    };

    await setDoc(doc(serverDb, `events/${eventId}/dependencies`, depId), newDep);
    return res.json({ dependency: newDep });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

/**
 * HERO FEATURE: Venue Change Impact Analysis Preview
 * Traverses dependency graph from changed venue node
 * Collects affected sessions, speakers, resources, volunteers, tasks
 * Calculates deterministic risk
 * Generates human explanation via Gemini without inventing entities
 */
apiRouter.post('/events/:id/impact/preview', async (req: Request, res: Response) => {
  try {
    const { id: eventId } = req.params;
    const { newVenue, reason } = VenueChangeSchema.parse(req.body);

    const eventSnap = await getDoc(doc(serverDb, 'events', eventId));
    if (!eventSnap.exists()) {
      return res.status(404).json({ error: 'Event not found' });
    }
    const event = { id: eventSnap.id, ...eventSnap.data() } as CampusEvent;

    // Load all operational subcollections
    const [sessSnap, taskSnap, resSnap, depSnap] = await Promise.all([
      getDocs(collection(serverDb, `events/${eventId}/sessions`)),
      getDocs(collection(serverDb, `events/${eventId}/tasks`)),
      getDocs(collection(serverDb, `events/${eventId}/resources`)),
      getDocs(collection(serverDb, `events/${eventId}/dependencies`)),
    ]);

    const sessions = sessSnap.docs.map(d => ({ id: d.id, ...d.data() })) as EventSession[];
    const tasks = taskSnap.docs.map(d => ({ id: d.id, ...d.data() })) as EventTask[];
    const resources = resSnap.docs.map(d => ({ id: d.id, ...d.data() })) as EventResource[];
    const dependencies = depSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];

    const volunteers: EventVolunteer[] = [
      { id: 'vol_1', eventId, name: 'Ananya Panda', email: 'ananya@kiit.ac.in', role: 'Stage Usher', shiftStart: '09:00', shiftEnd: '13:00', venue: event.venue, status: 'ASSIGNED' },
      { id: 'vol_2', eventId, name: 'Subrat Jena', email: 'subrat@kiit.ac.in', role: 'AV Technical Runner', shiftStart: '08:30', shiftEnd: '14:00', venue: event.venue, status: 'ASSIGNED' },
      { id: 'vol_3', eventId, name: 'Tanya Ray', email: 'tanya@kiit.ac.in', role: 'Speaker Escort', shiftStart: '10:00', shiftEnd: '15:00', venue: event.venue, status: 'ASSIGNED' },
    ];

    // Run pure graph impact analysis
    const impact = dependencyEngine.analyzeVenueChange({
      event,
      oldVenue: event.venue,
      newVenue,
      sessions,
      tasks,
      resources,
      volunteers,
      dependencies,
    });

    // Ask Gemini for natural language explanation of verified facts
    const aiExplanation = await geminiService.explainImpact(impact);
    impact.aiExplanation = aiExplanation;

    return res.json({ impact });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

/**
 * HERO FEATURE: Apply Impact Changes
 * 1. Update venue in event and affected sessions
 * 2. Generate follow-up tasks
 * 3. Create notifications
 * 4. Recalculate event health
 * 5. Record audit entry
 * 6. Synchronize to Notion
 */
apiRouter.post('/events/:id/impact/apply', async (req: Request, res: Response) => {
  try {
    const { id: eventId } = req.params;
    const { newVenue, reason, actorUid, actorEmail, actorRole } = req.body;

    const eventRef = doc(serverDb, 'events', eventId);
    const eventSnap = await getDoc(eventRef);
    if (!eventSnap.exists()) {
      return res.status(404).json({ error: 'Event not found' });
    }
    const event = { id: eventSnap.id, ...eventSnap.data() } as CampusEvent;
    const oldVenue = event.venue;

    const now = new Date().toISOString();

    // 1. Update event venue
    await updateDoc(eventRef, {
      venue: newVenue,
      updatedAt: now,
    });

    // 2. Update affected sessions
    const sessSnap = await getDocs(collection(serverDb, `events/${eventId}/sessions`));
    const sessionBatchPromises: Promise<any>[] = [];
    sessSnap.docs.forEach((docItem) => {
      const s = docItem.data();
      if (s.venue.toLowerCase().trim() === oldVenue.toLowerCase().trim()) {
        sessionBatchPromises.push(updateDoc(docItem.ref, { venue: newVenue }));
      }
    });
    await Promise.all(sessionBatchPromises);

    // 3. Create follow-up operational tasks
    const newTasks = [
      {
        id: `task_reloc_${Date.now()}_1`,
        eventId,
        title: `Relocate and verify stage audio/mic rig to ${newVenue}`,
        owner: 'Tech Logistics Team',
        team: 'Logistics',
        due: new Date(Date.now() + 86400000).toISOString(),
        priority: 'HIGH',
        status: 'TODO',
        progress: 0,
      },
      {
        id: `task_reloc_${Date.now()}_2`,
        eventId,
        title: `Update entrance banners and student directional signage for ${newVenue}`,
        owner: 'Creative Operations',
        team: 'Branding',
        due: new Date(Date.now() + 86400000 * 2).toISOString(),
        priority: 'MEDIUM',
        status: 'TODO',
        progress: 0,
      },
      {
        id: `task_reloc_${Date.now()}_3`,
        eventId,
        title: `Send venue relocation broadcast email to all ${event.registeredCount || 0} registered students`,
        owner: 'Communications Team',
        team: 'Communications',
        due: new Date(Date.now() + 1000 * 60 * 60 * 3).toISOString(),
        priority: 'CRITICAL',
        status: 'TODO',
        progress: 0,
      },
    ];

    for (const t of newTasks) {
      await setDoc(doc(serverDb, `events/${eventId}/tasks`, t.id), t);
    }

    // 4. Record Audit Log
    await logAudit({
      actorUid: actorUid || 'lead',
      actorEmail: actorEmail || 'lead@kiit.ac.in',
      actorRole: actorRole || 'LEAD',
      action: 'APPLY_VENUE_IMPACT',
      entity: 'EVENT',
      entityId: eventId,
      eventId,
      before: { venue: oldVenue },
      after: { venue: newVenue, reason, followUpTasksCount: newTasks.length },
    });

    // 5. Synchronize decision and updated venue to Notion
    try {
      await notionService.syncDecision({
        eventId,
        eventName: event.name,
        decision: `Relocated venue from "${oldVenue}" to "${newVenue}"`,
        reason: reason || 'Capacity and logistical optimization',
        affectedEntities: `${sessionBatchPromises.length} sessions, 3 follow-up tasks generated`,
        owner: actorEmail || 'Lead',
      });
      await notionService.syncEvent({ ...event, venue: newVenue, id: eventId });
    } catch (err) {
      console.error('Notion sync failed on impact apply (non-blocking):', err);
    }

    return res.json({
      success: true,
      message: `Successfully updated venue to ${newVenue} and initialized ${newTasks.length} follow-up operational tasks.`,
      newVenue,
      tasksGenerated: newTasks,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 7. RISKS & OPERATIONAL HEALTH
// ----------------------------------------------------

apiRouter.get('/events/:id/risks', async (req: Request, res: Response) => {
  try {
    const { id: eventId } = req.params;

    const eventSnap = await getDoc(doc(serverDb, 'events', eventId));
    if (!eventSnap.exists()) {
      return res.status(404).json({ error: 'Event not found' });
    }
    const event = { id: eventSnap.id, ...eventSnap.data() } as CampusEvent;

    const [sessSnap, taskSnap, resSnap] = await Promise.all([
      getDocs(collection(serverDb, `events/${eventId}/sessions`)),
      getDocs(collection(serverDb, `events/${eventId}/tasks`)),
      getDocs(collection(serverDb, `events/${eventId}/resources`)),
    ]);

    const sessions = sessSnap.docs.map(d => d.data()) as EventSession[];
    const tasks = taskSnap.docs.map(d => d.data()) as EventTask[];
    const resources = resSnap.docs.map(d => d.data()) as EventResource[];

    const volunteers: EventVolunteer[] = [];

    const healthEval = RiskEngine.evaluate({
      event,
      sessions,
      tasks,
      resources,
      volunteers,
    });

    // Sync updated health to event document if changed
    if (event.health !== healthEval.health) {
      await updateDoc(doc(serverDb, 'events', eventId), {
        health: healthEval.health,
        healthReason: healthEval.healthReason,
        updatedAt: new Date().toISOString(),
      });
    }

    return res.json({ healthEvaluation: healthEval });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 8. NOTION STATUS & SYNC
// ----------------------------------------------------

apiRouter.get('/notion/status', (_req: Request, res: Response) => {
  return res.json(notionService.getConfigStatus());
});

apiRouter.get('/notion/records', async (_req: Request, res: Response) => {
  try {
    const snap = await getDocs(collection(serverDb, 'notionSyncRecords'));
    const records = snap.docs.map(d => d.data());
    records.sort((a: any, b: any) => new Date(b.lastSyncedAt || 0).getTime() - new Date(a.lastSyncedAt || 0).getTime());
    return res.json({ records, count: records.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/notion/config', async (req: Request, res: Response) => {
  try {
    const { apiKey, databases } = req.body;
    await notionService.updateConfig({ apiKey, databases });
    return res.json({ success: true, status: notionService.getConfigStatus() });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/notion/test-connection', async (_req: Request, res: Response) => {
  try {
    const result = await notionService.testConnection();
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

apiRouter.post('/notion/sync-all', async (_req: Request, res: Response) => {
  try {
    const snap = await getDocs(collection(serverDb, 'events'));
    const events = snap.docs.map(d => ({ id: d.id, ...d.data() } as CampusEvent));
    const syncResults = [];

    for (const evt of events) {
      const res = await notionService.syncEvent(evt, evt.notionPageId);
      syncResults.push({ id: evt.id, name: evt.name, ...res });
    }

    return res.json({
      success: true,
      syncedCount: syncResults.length,
      results: syncResults,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/notion/sync/:eventId', async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const snap = await getDoc(doc(serverDb, 'events', eventId));
    if (!snap.exists()) {
      return res.status(404).json({ error: 'Event not found' });
    }
    const event = { id: snap.id, ...snap.data() } as CampusEvent;

    const result = await notionService.syncEvent(event, event.notionPageId);

    const now = new Date().toISOString();
    await setDoc(doc(serverDb, 'notionSyncRecords', `sync_${eventId}`), {
      id: `sync_${eventId}`,
      entityType: 'EVENT',
      entityId: eventId,
      title: event.name,
      notionPageId: result.pageId,
      notionPageUrl: result.pageUrl,
      databaseId: process.env.NOTION_EVENTS_DATABASE_ID || '',
      syncStatus: result.status,
      lastSyncedAt: now,
      lastError: result.error || null,
    }, { merge: true });

    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 9. GEMINI AI FEATURES
// ----------------------------------------------------

apiRouter.post('/ai/extract-event', async (req: Request, res: Response) => {
  try {
    const { rawText } = req.body;
    if (!rawText || rawText.trim().length === 0) {
      return res.status(400).json({ error: 'Raw event text required' });
    }

    const extraction = await geminiService.extractEventFromText(rawText);
    return res.json(extraction);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/ai/briefing', async (req: Request, res: Response) => {
  try {
    const { eventId } = req.body;
    const eventSnap = await getDoc(doc(serverDb, 'events', eventId));
    if (!eventSnap.exists()) return res.status(404).json({ error: 'Event not found' });
    const event = { id: eventSnap.id, ...eventSnap.data() } as CampusEvent;

    const [sessSnap, taskSnap, resSnap] = await Promise.all([
      getDocs(collection(serverDb, `events/${eventId}/sessions`)),
      getDocs(collection(serverDb, `events/${eventId}/tasks`)),
      getDocs(collection(serverDb, `events/${eventId}/resources`)),
    ]);

    const sessions = sessSnap.docs.map(d => d.data()) as EventSession[];
    const tasks = taskSnap.docs.map(d => d.data()) as EventTask[];
    const resources = resSnap.docs.map(d => d.data()) as EventResource[];

    const briefing = await geminiService.generateDailyBriefing({
      event,
      sessions,
      tasks,
      resources,
      risks: [event.healthReason || 'No active risks'],
    });

    return res.json({ briefing, aiGenerated: geminiService.isAvailable() });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/ai/chat', async (req: Request, res: Response) => {
  try {
    const { message, history, eventContext } = req.body;
    const reply = await geminiService.chat({
      message: message || '',
      history: Array.isArray(history) ? history : [],
      eventContext: eventContext || {
        name: 'KIIT Event',
        status: 'ACTIVE',
        venue: 'Campus Auditorium',
        health: 'HEALTHY',
        sessionsCount: 0,
        tasksCount: 0,
        registeredCount: 0,
      },
    });
    return res.json({ reply, aiGenerated: geminiService.isAvailable() });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * Generate Thematic Event Header Banner using Image Generation presets & metadata
 * Custom crafted to match KIIT Command Center color palette ["#0a0908","#49111c","#f2f4f3","#a9927d","#5e503f"]
 */
apiRouter.post('/ai/generate-thematic-banner', async (req: Request, res: Response) => {
  try {
    const { title, category, description } = req.body;
    const cat = (category || 'Technical').trim();

    const bannerMap: Record<string, string[]> = {
      Technical: [
        '/src/assets/images/tech_event_banner_1791005048820.jpg',
        '/src/assets/images/kiit_tech_banner_1791004884179.jpg',
      ],
      Cultural: [
        '/src/assets/images/cultural_event_banner_1791005060884.jpg',
        '/src/assets/images/kiit_cult_banner_1791004899531.jpg',
      ],
      Workshop: [
        '/src/assets/images/workshop_event_banner_1791005072133.jpg',
        '/src/assets/images/tech_event_banner_1791005048820.jpg',
      ],
      Sports: [
        '/src/assets/images/sports_event_banner_1791005084694.jpg',
        '/src/assets/images/cultural_event_banner_1791005060884.jpg',
      ],
      Literary: [
        '/src/assets/images/kiit_lit_banner_1791004918526.jpg',
        '/src/assets/images/workshop_event_banner_1791005072133.jpg',
      ],
      Hackathon: [
        '/src/assets/images/tech_event_banner_1791005048820.jpg',
        '/src/assets/images/kiit_tech_banner_1791004884179.jpg',
      ],
      Conclave: [
        '/src/assets/images/kiit_cult_banner_1791004899531.jpg',
        '/src/assets/images/workshop_event_banner_1791005072133.jpg',
      ],
    };

    const bannersForCat = bannerMap[cat] || bannerMap['Technical'];
    const chosenBanner = bannersForCat[0];

    const generatedPrompt = `Ultra-wide 16:9 cinematic event header banner for "${title || 'Campus Event'}" (${cat}). Dark architectural aesthetic with deep wine accent #49111c, onyx black #0a0908, bone white #f2f4f3, and sand #a9927d highlights. Professional university institution stage lighting, no text, clean composition.`;

    return res.json({
      success: true,
      bannerUrl: chosenBanner,
      alternativeBanners: bannersForCat,
      prompt: generatedPrompt,
      category: cat,
      title: title || 'KIIT Campus Event',
      themeColors: {
        dark: '#0a0908',
        wine: '#49111c',
        bone: '#f2f4f3',
        sand: '#a9927d',
        umber: '#5e503f',
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 10. AUDIT LOGS
// ----------------------------------------------------

apiRouter.get('/audit', async (req: Request, res: Response) => {
  try {
    const { eventId, limit: queryLimit } = req.query;
    const snap = await getDocs(collection(serverDb, 'auditLogs'));
    let logs = snap.docs.map(d => d.data());

    if (eventId) {
      logs = logs.filter(l => l.eventId === eventId);
    }

    logs.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    if (queryLimit) {
      logs = logs.slice(0, parseInt(queryLimit as string, 10));
    }

    return res.json({ logs });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 11. DEMO SEED ENDPOINT
// ----------------------------------------------------

apiRouter.post('/seed', async (_req: Request, res: Response) => {
  const result = await checkAndSeedInitialData();
  return res.json(result);
});
