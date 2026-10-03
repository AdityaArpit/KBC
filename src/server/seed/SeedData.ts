import {
  collection,
  doc,
  getDocs,
  setDoc,
  writeBatch
} from 'firebase/firestore';
import { serverDb } from '../firebase.ts';

export async function checkAndSeedInitialData(): Promise<{ seeded: boolean; message: string }> {
  try {
    const societiesSnap = await getDocs(collection(serverDb, 'societies'));
    if (!societiesSnap.empty) {
      return { seeded: false, message: 'Database already contains data. Seed skipped.' };
    }

    console.log('Seeding initial KIIT campus operational data into Firestore...');
    const now = new Date();
    const batch = writeBatch(serverDb);

    // 1. Societies
    const societies = [
      {
        id: 'soc_ksac',
        name: 'KIIT Student Activity Centre (KSAC)',
        category: 'Apex Body',
        description: 'The central student governance and activity organization overseeing all official campus festivals and technical-cultural bodies at KIIT.',
        logoPath: 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&w=300&q=80',
        leadUids: ['user_lead_rahul', 'user_lead_priya'],
        leadNames: ['Rahul Sharma', 'Priya Mohanty'],
        isActive: true,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      },
      {
        id: 'soc_krs',
        name: 'KIIT Robotics Society (KRS)',
        category: 'Technical',
        description: 'Premier robotics, embedded systems, and autonomous robotics research collective at School of Technology.',
        logoPath: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=300&q=80',
        leadUids: ['user_lead_rahul'],
        leadNames: ['Rahul Sharma'],
        isActive: true,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      },
      {
        id: 'soc_gdsc',
        name: 'Google DSC KIIT',
        category: 'Technical',
        description: 'University chapter empowering student developers with cloud technologies, web platforms, and open-source intelligence.',
        logoPath: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=300&q=80',
        leadUids: ['user_lead_priya'],
        leadNames: ['Priya Mohanty'],
        isActive: true,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      },
      {
        id: 'soc_kronicle',
        name: 'Kronicle - The Literary Society',
        category: 'Literary',
        description: 'Fostering public debate, creative writing, parliamentary debates, and student journalism across KIIT campuses.',
        logoPath: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=300&q=80',
        leadUids: [],
        leadNames: [],
        isActive: true,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      },
    ];

    societies.forEach((s) => {
      const ref = doc(serverDb, 'societies', s.id);
      batch.set(ref, s);
    });

    // 2. Events
    const futureDate1 = new Date(now.getTime() + 86400000 * 3);
    const futureDate1End = new Date(futureDate1.getTime() + 1000 * 60 * 60 * 8);

    const ongoingStart = new Date(now.getTime() - 1000 * 60 * 60 * 2);
    const ongoingEnd = new Date(now.getTime() + 1000 * 60 * 60 * 6);

    const pendingReviewStart = new Date(now.getTime() + 86400000 * 10);
    const pendingReviewEnd = new Date(pendingReviewStart.getTime() + 1000 * 60 * 60 * 6);

    const pastStart = new Date(now.getTime() - 86400000 * 20);
    const pastEnd = new Date(pastStart.getTime() + 1000 * 60 * 60 * 7);

    const events = [
      {
        id: 'evt_tech_convergence',
        societyId: 'soc_ksac',
        societyName: 'KIIT Student Activity Centre (KSAC)',
        name: 'KIIT Tech Convergence 2026',
        description: 'Flagship university-wide technology summit bringing together distributed systems architects, cloud developers, and student engineers for keynotes, workshops, and competitive development.',
        category: 'Technical',
        logoPath: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=300&q=80',
        posterPath: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80',
        startAt: futureDate1.toISOString(),
        endAt: futureDate1End.toISOString(),
        duration: '8 hours',
        venue: 'Main Auditorium',
        capacity: 350,
        registeredCount: 42,
        registrationOpenAt: new Date(now.getTime() - 86400000 * 2).toISOString(),
        registrationCloseAt: new Date(futureDate1.getTime() - 1000 * 60 * 60 * 12).toISOString(),
        eligibility: 'All registered KIIT Undergraduate and Postgraduate students.',
        rules: 'Valid KIIT identity card mandatory. Registration barcode check at Campus 6 gate.',
        contactDetails: 'convenor.tech@kiit.ac.in | +91 674 2725113',
        status: 'PUBLISHED',
        leadUids: ['user_lead_rahul'],
        leadNames: ['Rahul Sharma'],
        currentRevisionId: 'rev_1',
        health: 'HEALTHY',
        healthReason: 'All primary venues booked and equipment allocations confirmed.',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        publishedAt: now.toISOString(),
      },
      {
        id: 'evt_hackathon_live',
        societyId: 'soc_gdsc',
        societyName: 'Google DSC KIIT',
        name: 'KIIT Hackathon 3.0: Cloud & AI Sprint',
        description: 'Live 24-hour hackathon focused on serverless compute, AI agent workflows, and community welfare solutions.',
        category: 'Technical',
        logoPath: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=300&q=80',
        posterPath: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80',
        startAt: ongoingStart.toISOString(),
        endAt: ongoingEnd.toISOString(),
        duration: '24 hours',
        venue: 'Campus 15 Lab Complex',
        capacity: 200,
        registeredCount: 180,
        registrationOpenAt: new Date(now.getTime() - 86400000 * 7).toISOString(),
        registrationCloseAt: new Date(now.getTime() - 1000 * 60 * 60 * 4).toISOString(),
        eligibility: 'Teams of 2 to 4 KIIT students.',
        rules: 'Hardware prototypes and software repos must be initialized after kickoff.',
        contactDetails: 'dsc@kiit.ac.in',
        status: 'PUBLISHED',
        leadUids: ['user_lead_priya'],
        leadNames: ['Priya Mohanty'],
        currentRevisionId: 'rev_2',
        health: 'HEALTHY',
        healthReason: 'Live event in progress; network status stable.',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        publishedAt: now.toISOString(),
      },
      {
        id: 'evt_kfest_review',
        societyId: 'soc_ksac',
        societyName: 'KIIT Student Activity Centre (KSAC)',
        name: 'K-Fest Cultural Night & Theatre Gala',
        description: 'Annual cultural festival featuring dramatic arts, inter-hostel musical ensembles, and acoustic performances.',
        category: 'Cultural',
        logoPath: 'https://images.unsplash.com/photo-1469488865564-c2de10f69f96?auto=format&fit=crop&w=300&q=80',
        posterPath: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80',
        startAt: pendingReviewStart.toISOString(),
        endAt: pendingReviewEnd.toISOString(),
        duration: '6 hours',
        venue: 'Open Air Amphitheatre, Campus 3',
        capacity: 800,
        registeredCount: 0,
        registrationOpenAt: new Date(now.getTime() + 86400000 * 2).toISOString(),
        registrationCloseAt: new Date(pendingReviewStart.getTime() - 86400000).toISOString(),
        eligibility: 'KIIT fraternity and registered university students.',
        rules: 'Adherence to campus curfew guidelines. Strictly no external contraband.',
        contactDetails: 'kfest@kiit.ac.in',
        status: 'PENDING_REVIEW', // Ready for admin review demo!
        leadUids: ['user_lead_rahul'],
        leadNames: ['Rahul Sharma'],
        currentRevisionId: 'rev_kfest_1',
        health: 'HEALTHY',
        healthReason: 'Submission awaiting administrator governance review.',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      },
      {
        id: 'evt_mun_past',
        societyId: 'soc_kronicle',
        societyName: 'Kronicle - The Literary Society',
        name: 'KIIT International Model United Nations (Archived)',
        description: 'Simulated United Nations committee sessions exploring international humanitarian law and environmental governance.',
        category: 'Literary',
        logoPath: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=300&q=80',
        posterPath: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=1200&q=80',
        startAt: pastStart.toISOString(),
        endAt: pastEnd.toISOString(),
        duration: '2 Days',
        venue: 'Convention Centre, Campus 6',
        capacity: 500,
        registeredCount: 460,
        registrationOpenAt: new Date(pastStart.getTime() - 86400000 * 14).toISOString(),
        registrationCloseAt: new Date(pastStart.getTime() - 86400000 * 2).toISOString(),
        eligibility: 'Open to all KIIT batches.',
        rules: 'Formal Western or Indian attire mandatory.',
        contactDetails: 'mun@kiit.ac.in',
        status: 'COMPLETED',
        leadUids: [],
        currentRevisionId: 'rev_mun_1',
        health: 'HEALTHY',
        healthReason: 'Event concluded successfully.',
        createdAt: pastStart.toISOString(),
        updatedAt: pastEnd.toISOString(),
        publishedAt: pastStart.toISOString(),
      },
    ];

    events.forEach((e) => {
      const ref = doc(serverDb, 'events', e.id);
      batch.set(ref, e);
    });

    await batch.commit();

    // 3. Subcollections for Hero Event: 'evt_tech_convergence'
    const heroId = 'evt_tech_convergence';

    // Revision history for kfest and hero
    await setDoc(doc(serverDb, `events/${heroId}/revisions`, 'rev_1'), {
      id: 'rev_1',
      eventId: heroId,
      revisionNumber: 1,
      submittedBy: 'user_lead_rahul',
      submittedByName: 'Rahul Sharma',
      submittedAt: now.toISOString(),
      snapshot: events[0],
      reviewStatus: 'APPROVED',
      reviewedBy: 'admin_sys',
      reviewedByName: 'KIIT Administrator',
      reviewedAt: now.toISOString(),
      feedback: 'Approved with verified venue allocation.',
    });

    await setDoc(doc(serverDb, 'events/evt_kfest_review/revisions', 'rev_kfest_1'), {
      id: 'rev_kfest_1',
      eventId: 'evt_kfest_review',
      revisionNumber: 1,
      submittedBy: 'user_lead_rahul',
      submittedByName: 'Rahul Sharma',
      submittedAt: now.toISOString(),
      snapshot: events[2],
      reviewStatus: 'PENDING',
    });

    // Sessions for hero event
    const sessions = [
      {
        id: 'sess_keynote',
        eventId: heroId,
        title: 'Opening Keynote: Next-Gen Autonomous Systems',
        speaker: 'Dr. S. K. Patra',
        speakerConfirmed: true,
        venue: 'Main Auditorium',
        startAt: new Date(futureDate1.getTime() + 1000 * 60 * 60 * 1).toISOString(),
        endAt: new Date(futureDate1.getTime() + 1000 * 60 * 60 * 2.5).toISOString(),
        status: 'SCHEDULED',
        description: 'University inauguration and keynote address by leading AI researcher.',
      },
      {
        id: 'sess_cloud_arch',
        eventId: heroId,
        title: 'Deep Dive: Distributed Event Platforms & Resilience',
        speaker: 'Aman Verma (Alumni, Cloud Architect)',
        speakerConfirmed: true,
        venue: 'Main Auditorium',
        startAt: new Date(futureDate1.getTime() + 1000 * 60 * 60 * 3).toISOString(),
        endAt: new Date(futureDate1.getTime() + 1000 * 60 * 60 * 5).toISOString(),
        status: 'SCHEDULED',
        description: 'Hands-on architectural walkthrough of mission-critical event infrastructure.',
      },
    ];

    for (const sess of sessions) {
      await setDoc(doc(serverDb, `events/${heroId}/sessions`, sess.id), sess);
    }

    // Tasks for hero event
    const tasks = [
      {
        id: 'task_av_rig',
        eventId: heroId,
        title: 'Stage Audio/Visual & Lighting Rig Inspection',
        owner: 'Tech Logistics Team',
        team: 'Logistics',
        due: new Date(futureDate1.getTime() - 1000 * 60 * 60 * 4).toISOString(),
        priority: 'CRITICAL',
        status: 'IN_PROGRESS',
        progress: 60,
        sessionId: 'sess_keynote',
      },
      {
        id: 'task_signage',
        eventId: heroId,
        title: 'Campus Ingress Signage & Gate 6 Directional Standees',
        owner: 'Creative Operations',
        team: 'Branding',
        due: new Date(futureDate1.getTime() - 1000 * 60 * 60 * 6).toISOString(),
        priority: 'MEDIUM',
        status: 'TODO',
        progress: 20,
      },
      {
        id: 'task_badge_print',
        eventId: heroId,
        title: 'Attendee Badge & QR Scanner Configuration',
        owner: 'Registration Desk',
        team: 'Operations',
        due: new Date(futureDate1.getTime() - 1000 * 60 * 60 * 2).toISOString(),
        priority: 'HIGH',
        status: 'TODO',
        progress: 0,
      },
      {
        id: 'task_speaker_reception',
        eventId: heroId,
        title: 'Guest Speaker Reception & Escort Protocol',
        owner: 'Hospitality Team',
        team: 'Hospitality',
        due: new Date(futureDate1.getTime() + 1000 * 60 * 30).toISOString(),
        priority: 'HIGH',
        status: 'TODO',
        progress: 0,
        sessionId: 'sess_keynote',
      },
    ];

    for (const task of tasks) {
      await setDoc(doc(serverDb, `events/${heroId}/tasks`, task.id), task);
    }

    // Resources for hero event
    const resources = [
      {
        id: 'res_wireless_mics',
        eventId: heroId,
        name: 'Wireless UHF Lavalier & Handheld Mics',
        type: 'AV Equipment',
        quantity: 4,
        status: 'ALLOCATED',
        location: 'Main Auditorium Control Booth',
        assignedSessionId: 'sess_keynote',
      },
      {
        id: 'res_4k_projector',
        eventId: heroId,
        name: 'High-Lumen Laser 4K Dual Stage Projector',
        type: 'Display',
        quantity: 2,
        status: 'ALLOCATED',
        location: 'Main Auditorium Ceiling Mount',
        assignedSessionId: 'sess_keynote',
      },
      {
        id: 'res_qr_scanners',
        eventId: heroId,
        name: 'Handheld QR Attendance Scanners',
        type: 'Hardware',
        quantity: 6,
        status: 'CONFIRMED',
        location: 'Main Gate Registration Kiosk',
      },
    ];

    for (const res of resources) {
      await setDoc(doc(serverDb, `events/${heroId}/resources`, res.id), res);
    }

    // Dependencies for hero event (The Dependency Graph!)
    const dependencies = [
      {
        id: 'dep_venue_keynote',
        eventId: heroId,
        sourceType: 'VENUE',
        sourceId: 'venue_main_auditorium',
        sourceLabel: 'Main Auditorium',
        targetType: 'SESSION',
        targetId: 'sess_keynote',
        targetLabel: 'Opening Keynote',
        relationshipType: 'HOSTED_AT',
        severity: 'HIGH',
        createdAt: now.toISOString(),
        createdBy: 'user_lead_rahul',
      },
      {
        id: 'dep_venue_cloud_arch',
        eventId: heroId,
        sourceType: 'VENUE',
        sourceId: 'venue_main_auditorium',
        sourceLabel: 'Main Auditorium',
        targetType: 'SESSION',
        targetId: 'sess_cloud_arch',
        targetLabel: 'Deep Dive: Distributed Event Platforms',
        relationshipType: 'HOSTED_AT',
        severity: 'HIGH',
        createdAt: now.toISOString(),
        createdBy: 'user_lead_rahul',
      },
      {
        id: 'dep_sess_av',
        eventId: heroId,
        sourceType: 'SESSION',
        sourceId: 'sess_keynote',
        sourceLabel: 'Opening Keynote',
        targetType: 'TASK',
        targetId: 'task_av_rig',
        targetLabel: 'Stage Audio/Visual & Lighting Rig Inspection',
        relationshipType: 'REQUIRES',
        severity: 'HIGH',
        createdAt: now.toISOString(),
        createdBy: 'user_lead_rahul',
      },
      {
        id: 'dep_sess_res',
        eventId: heroId,
        sourceType: 'SESSION',
        sourceId: 'sess_keynote',
        sourceLabel: 'Opening Keynote',
        targetType: 'RESOURCE',
        targetId: 'res_4k_projector',
        targetLabel: 'High-Lumen Laser 4K Dual Stage Projector',
        relationshipType: 'ALLOCATED_TO',
        severity: 'MEDIUM',
        createdAt: now.toISOString(),
        createdBy: 'user_lead_rahul',
      },
    ];

    for (const dep of dependencies) {
      await setDoc(doc(serverDb, `events/${heroId}/dependencies`, dep.id), dep);
    }

    // Active attendance session for ongoing event
    const liveEventId = 'evt_hackathon_live';
    const attSessionId = 'att_hack_checkin';
    await setDoc(doc(serverDb, `events/${liveEventId}/attendanceSessions`, attSessionId), {
      id: attSessionId,
      eventId: liveEventId,
      name: 'Hackathon Kickoff Verification & Attendance',
      description: 'Mandatory morning check-in for team badge issuance.',
      startsAt: ongoingStart.toISOString(),
      endsAt: ongoingEnd.toISOString(),
      status: 'ACTIVE',
      tokenHash: 'LIVE_CAMPUS_TOKEN_8921',
      tokenExpiresAt: ongoingEnd.toISOString(),
      presentCount: 38,
      createdBy: 'user_lead_priya',
      createdByName: 'Priya Mohanty',
      createdAt: ongoingStart.toISOString(),
    });

    console.log('Successfully seeded initial KIIT campus operational records.');
    return { seeded: true, message: 'Seeded initial operational database records successfully.' };
  } catch (err: any) {
    console.error('Error seeding initial data:', err);
    return { seeded: false, message: `Seed error: ${err.message}` };
  }
}
