# KBC EVENT COMMAND CENTER
**KBC-NOTION-03 — Intelligent Team Operations & Event Command Center**  
*KIIT Campus Event Operations & Nervous System*

---

## 🏛️ System Architecture Overview

KBC Event Command Center is an end-to-end full-stack campus event operations platform designed for KIIT University. It enforces strict separation between public event discovery, student participation, and privileged operational command.

### Key Pillars:
1. **Public Discovery Surface:** Anyone can browse published campus events, view active societies, and check the calendar without authentication.
2. **Verified Identity & Profile:** Authentication uses Firebase Authentication with Google Provider. Authenticated access is restricted strictly to verified `@kiit.ac.in` accounts. Student roll numbers are automatically derived from the email local part (read-only), with private accommodation details (`HOSTEL` / `DAY_SCHOLAR`).
3. **Multi-Role Governance:**
   - `USER`: Default role for all verified KIIT accounts. Can register for events and mark attendance.
   - `LEAD`: Assigned by Admin to specific societies. Can manage multiple societies, draft proposals, and orchestrate command center operations.
   - `ADMIN`: Single platform administrator configured via server-side secrets (`ADMIN_EMAIL` and `ADMIN_PASSWORD`), responsible for approving events, managing societies, and reviewing audit trails.
4. **Controlled Publication Workflow:** Events begin as `DRAFT`, transition to `PENDING_REVIEW`, and only become publicly visible upon administrative `APPROVED` (`PUBLISHED`). If `CHANGES_REQUESTED`, feedback is recorded and revisions are preserved.
5. **Generalized Dependency Engine (Hero Feature):**
   - Models dependencies as a directed graph (`VENUE`, `SESSION`, `SPEAKER`, `RESOURCE`, `VOLUNTEER`, `TASK`).
   - Traverses downstream and upstream impacts using BFS/DFS with cycle detection.
   - **Hero Scenario:** Simulates and previews venue relocation impacts (affected sessions, speakers, resources, tasks, volunteers, communications), calculates deterministic risk, triggers Gemini narrative explanation, updates records, generates follow-up tasks, records audit logs, and synchronizes with Notion.
6. **Live Attendance & ExcelJS Export:**
   - Time-bounded sessions with short-lived QR codes.
   - Real-time present counts.
   - Genuine Excel (.xlsx) export using ExcelJS with Sheet 1 (`Attendance`) and Sheet 2 (`Summary`).
7. **Notion Knowledge Layer:**
   - Server-side integration with Notion API.
   - Idempotent synchronization for events, sessions, tasks, and decisions.
8. **Gemini AI Intelligence:**
   - Feature 1: Event Information Extraction (messy announcements to structured JSON drafts).
   - Feature 2: Operational Impact Explanation (summarizes verified facts without hallucination).
   - Feature 3: Daily Operational Briefing.
   - Feature 4: Interactive Command Center Operations Copilot.

---

## 🚀 4-Minute Demo Script

1. **Public Discovery (0:00 - 0:30):**
   - Open home page. Browse live ongoing events, upcoming summits, and societies without logging in.
2. **KIIT Student Sign-In & Profile (0:30 - 1:05):**
   - Click "KIIT Sign-In". Sign in with a verified `@kiit.ac.in` Google account.
   - View profile: roll number is automatically derived and read-only.
   - Register for "KIIT Tech Convergence 2026" and watch the capacity bar update transactionally.
3. **Lead Command Center & Hero Demo (1:05 - 2:30):**
   - Switch to Lead Center (`/lead`). Open "KIIT Tech Convergence 2026".
   - View live dashboard: sessions, tasks, resources, and dependencies.
   - Click **"Change Venue & Analyze Impact"** (Hero Feature).
   - Change venue from `Main Auditorium` to `Seminar Hall, Campus 6`.
   - Run Impact Analysis: witness the dependency engine identify affected sessions, speakers, AV resources, and tasks with HIGH operational risk.
   - Review Gemini's operational explanation.
   - Click **"Apply Changes & Trigger Operations"**: updates Firestore, creates 3 follow-up tasks, notifies attendees, and syncs Notion.
4. **Attendance & Excel Export (2:30 - 3:30):**
   - Click **"Start Attendance"** to launch an ingress check-in window.
   - Display live QR code. Click "Mark My Attendance Now" to simulate student check-in.
   - Live present count updates instantly via Firestore realtime listeners.
   - Click **"Export Excel"** to download the official XLSX attendance spreadsheet.
5. **Admin Review & Governance (3:30 - 4:00):**
   - Log into `/admin/login` using `admin@kiit.ac.in` and `AdminSecret2026!`.
   - Review pending submissions (e.g. K-Fest Cultural Night).
   - Test "Request Changes" or "Approve & Publish".
   - Inspect the immutable audit log.

---

## 🛠️ Verification & Tests

To execute the test suite verifying all 11 system invariants:
```bash
npm test
```
To run compilation and type check:
```bash
npm run build
npm run lint
```
