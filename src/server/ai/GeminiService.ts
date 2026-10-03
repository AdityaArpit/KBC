import { GoogleGenAI } from '@google/genai';
import { AIExtractedEventSchema } from '../../shared/schemas.ts';
import { CampusEvent, EventSession, EventTask, EventResource, ImpactAnalysisResult } from '../../shared/types.ts';

export class GeminiService {
  private ai: GoogleGenAI | null = null;
  private hasKey: boolean = false;

  constructor() {
    const key = process.env.GEMINI_API_KEY;
    if (key && key.trim().length > 0 && key !== 'MY_GEMINI_API_KEY') {
      try {
        this.ai = new GoogleGenAI({ apiKey: key });
        this.hasKey = true;
      } catch (err) {
        console.error('Failed to initialize Gemini AI client:', err);
      }
    }
  }

  public isAvailable(): boolean {
    return this.hasKey && this.ai !== null;
  }

  /**
   * Feature 1: Extract structured event proposal from messy unformatted text
   */
  public async extractEventFromText(rawText: string): Promise<{ data: any; rawJson: string; aiGenerated: boolean }> {
    if (!this.ai) {
      // Deterministic fallback if API key is not configured
      return {
        data: {
          name: 'Extracted Event: ' + rawText.slice(0, 40).replace(/\n/g, ' '),
          description: rawText,
          category: 'Technical',
          startAt: new Date(Date.now() + 86400000 * 5).toISOString(),
          endAt: new Date(Date.now() + 86400000 * 5 + 10800000).toISOString(),
          duration: '3 hours',
          venue: 'Campus 6 Auditorium',
          capacity: 150,
          eligibility: 'Open to all KIIT students',
          rules: 'Valid KIIT ID required. Adhere to campus dress code.',
          contactDetails: 'events@kiit.ac.in',
          suggestedSessions: [{ title: 'Inaugural Keynote', speaker: 'Faculty Coordinator', duration: '45 mins' }],
          suggestedResources: [{ name: 'Microphones & Projector', type: 'AV', quantity: 2 }],
        },
        rawJson: '{}',
        aiGenerated: false,
      };
    }

    try {
      const prompt = `You are a precision campus event parser for KIIT University.
Extract structured event proposal details from the user's messy text below.
Return ONLY valid JSON matching this schema:
{
  "name": string,
  "description": string,
  "category": "Technical" | "Cultural" | "Literary" | "Sports" | "Workshop",
  "startAt": ISO 8601 string,
  "endAt": ISO 8601 string,
  "duration": string,
  "venue": string,
  "capacity": integer number,
  "eligibility": string,
  "rules": string,
  "contactDetails": string,
  "suggestedSessions": [{"title": string, "speaker": string, "duration": string}],
  "suggestedResources": [{"name": string, "type": string, "quantity": integer}]
}

Raw Input Text:
"""
${rawText}
"""`;

      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      });

      const text = response.text || '{}';
      const parsed = JSON.parse(text);
      const validated = AIExtractedEventSchema.parse(parsed);

      return {
        data: validated,
        rawJson: text,
        aiGenerated: true,
      };
    } catch (err) {
      console.error('Gemini extraction error, falling back:', err);
      return {
        data: {
          name: 'Campus Event Proposal',
          description: rawText,
          category: 'Technical',
          startAt: new Date(Date.now() + 86400000 * 5).toISOString(),
          endAt: new Date(Date.now() + 86400000 * 5 + 10800000).toISOString(),
          duration: '3 hours',
          venue: 'Campus 6 Auditorium',
          capacity: 150,
          eligibility: 'Open to all KIIT students',
          rules: 'Valid KIIT ID required. Adhere to campus dress code.',
          contactDetails: 'events@kiit.ac.in',
          suggestedSessions: [],
          suggestedResources: [],
        },
        rawJson: '{}',
        aiGenerated: false,
      };
    }
  }

  /**
   * Feature 2: Explain verified dependency engine impact
   * Critical Guardrail: AI MUST NOT invent entities. It only explains the verified output.
   */
  public async explainImpact(verifiedImpact: ImpactAnalysisResult): Promise<string> {
    const fallback = `Changing venue from ${verifiedImpact.venueChangedFrom} to ${verifiedImpact.venueChangedTo} directly impacts ${verifiedImpact.affectedSessions.length} session(s), ${verifiedImpact.affectedSpeakers.length} speaker(s), ${verifiedImpact.affectedResources.length} resource allocation(s), and ${verifiedImpact.affectedTasks.length} operational task(s). Overall operational risk rating is ${verifiedImpact.calculatedRisk}. Immediate priority actions include notifying registered attendees and updating volunteer stage assignments.`;

    if (!this.ai) {
      return fallback;
    }

    try {
      const prompt = `You are the KBC Event Command Center AI Assistant.
A venue change has been computed by our deterministic dependency graph engine.
Explain this operational impact clearly to the student lead and administrator.

STRICT INSTRUCTION:
DO NOT invent any new entities, people, tasks, or numbers.
Only summarize and explain the EXACT verified facts provided below.

Verified Engine Facts:
- Old Venue: ${verifiedImpact.venueChangedFrom}
- New Venue: ${verifiedImpact.venueChangedTo}
- Calculated Risk: ${verifiedImpact.calculatedRisk}
- Risk Reasons: ${verifiedImpact.riskReasons.join('; ')}
- Affected Sessions (${verifiedImpact.affectedSessions.length}): ${verifiedImpact.affectedSessions.map(s => `${s.title} (${s.time})`).join(', ')}
- Affected Speakers (${verifiedImpact.affectedSpeakers.length}): ${verifiedImpact.affectedSpeakers.map(s => `${s.name} for ${s.sessionTitle}`).join(', ')}
- Affected Resources (${verifiedImpact.affectedResources.length}): ${verifiedImpact.affectedResources.map(r => `${r.name} (${r.quantity})`).join(', ')}
- Affected Volunteers (${verifiedImpact.affectedVolunteers.length}): ${verifiedImpact.affectedVolunteers.map(v => `${v.name} (${v.role})`).join(', ')}
- Affected Tasks (${verifiedImpact.affectedTasks.length}): ${verifiedImpact.affectedTasks.map(t => `${t.title} [Owner: ${t.owner}, Priority: ${t.priority}]`).join(', ')}
- Required Communications: ${verifiedImpact.requiredCommunicationActions.join('; ')}

Output a concise, 3-paragraph executive operational briefing with sections:
1. Executive Summary & Risk Rating
2. Critical Operational Ripple Effects
3. Recommended Immediate Action Items`;

      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          temperature: 0.2,
        },
      });

      return response.text || fallback;
    } catch (err) {
      console.error('Gemini impact explanation error, using deterministic fallback:', err);
      return fallback;
    }
  }

  /**
   * Feature 3: Daily Operational Briefing
   */
  public async generateDailyBriefing(params: {
    event: CampusEvent;
    sessions: EventSession[];
    tasks: EventTask[];
    resources: EventResource[];
    risks: string[];
  }): Promise<string> {
    const { event, sessions, tasks, risks } = params;
    const fallback = `Operational Briefing for ${event.name}: Status is ${event.status} with health ${event.health}. There are ${tasks.length} total tasks with ${tasks.filter(t => t.status === 'COMPLETED').length} completed and ${tasks.filter(t => t.status === 'BLOCKED').length} blocked. ${sessions.length} sessions are scheduled at ${event.venue}.`;

    if (!this.ai) {
      return fallback;
    }

    try {
      const prompt = `You are the KIIT Campus Event Command Center AI.
Provide an operational briefing for today based on the following verified facts:
- Event: ${event.name} (${event.status})
- Health: ${event.health} (${event.healthReason || 'N/A'})
- Venue: ${event.venue}
- Capacity: ${event.capacity} | Registered: ${event.registeredCount || 0}
- Sessions: ${sessions.map(s => `${s.title} (${s.venue}, ${s.speaker || 'No speaker'})`).join('; ')}
- Tasks: ${tasks.map(t => `${t.title} [Status: ${t.status}, Due: ${t.due}, Owner: ${t.owner}]`).join('; ')}
- Identified Risks: ${risks.join('; ') || 'None'}

Provide an alert-oriented, structured briefing with:
- Status Check
- Immediate Priorities Today
- Blockers & Risks to Escalate`;

      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { temperature: 0.2 },
      });

      return response.text || fallback;
    } catch (err) {
      return fallback;
    }
  }

  /**
   * Feature 4: Interactive Operations Chatbot
   */
  public async chat(params: {
    message: string;
    history: Array<{ role: 'user' | 'model'; parts: [{ text: string }] }>;
    eventContext: {
      name: string;
      status: string;
      venue: string;
      health: string;
      sessionsCount: number;
      tasksCount: number;
      registeredCount: number;
    };
  }): Promise<string> {
    if (!this.ai) {
      return `[Command Center AI] Currently operating in offline mode. Event "${params.eventContext.name}" is ${params.eventContext.status} with ${params.eventContext.registeredCount} registrations at ${params.eventContext.venue}.`;
    }

    try {
      const systemInstruction = `You are KBC Event Assistant, the intelligent team operations copilot for KIIT campus events.
Current Event Context:
- Name: ${params.eventContext.name}
- Status: ${params.eventContext.status}
- Venue: ${params.eventContext.venue}
- Health: ${params.eventContext.health}
- Sessions: ${params.eventContext.sessionsCount}
- Tasks: ${params.eventContext.tasksCount}
- Registered Attendees: ${params.eventContext.registeredCount}

Answer the user's operational query concisely, accurately, and politely. Never fabricate operational events, participants, or administrative permissions.`;

      const contents = [
        ...params.history,
        { role: 'user' as const, parts: [{ text: params.message }] },
      ];

      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents,
        config: {
          systemInstruction,
          temperature: 0.3,
        },
      });

      return response.text || 'I processed your request, but could not produce a response.';
    } catch (err: any) {
      return `Error generating response: ${err.message}`;
    }
  }
}
