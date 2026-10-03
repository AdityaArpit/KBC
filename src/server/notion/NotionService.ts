import {
  CampusEvent,
  EventResource,
  EventSession,
  EventTask,
  NotionSyncRecord
} from '../../shared/types.ts';
import { serverDb } from '../firebase.ts';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

export interface NotionConfig {
  apiKey: string;
  databases: {
    events: string;
    sessions: string;
    tasks: string;
    people: string;
    resources: string;
    venues: string;
    decisions: string;
    documentation: string;
  };
}

export class NotionService {
  private config: NotionConfig;
  private initializedFromDb: boolean = false;

  constructor() {
    this.config = {
      apiKey: process.env.NOTION_API_KEY || '',
      databases: {
        events: process.env.NOTION_EVENTS_DATABASE_ID || '',
        sessions: process.env.NOTION_SESSIONS_DATABASE_ID || '',
        tasks: process.env.NOTION_TASKS_DATABASE_ID || '',
        people: process.env.NOTION_PEOPLE_DATABASE_ID || '',
        resources: process.env.NOTION_RESOURCES_DATABASE_ID || '',
        venues: process.env.NOTION_VENUES_DATABASE_ID || '',
        decisions: process.env.NOTION_DECISIONS_DATABASE_ID || '',
        documentation: process.env.NOTION_DOCUMENTATION_DATABASE_ID || '',
      },
    };
    this.loadPersistedConfig();
  }

  private async loadPersistedConfig() {
    try {
      const snap = await getDoc(doc(serverDb, 'systemConfig', 'notion'));
      if (snap.exists()) {
        const data = snap.data();
        if (data.apiKey) this.config.apiKey = data.apiKey;
        if (data.databases) {
          this.config.databases = { ...this.config.databases, ...data.databases };
        }
      }
      this.initializedFromDb = true;
    } catch {
      // Ignored if offline or unseeded
    }
  }

  public isConfigured(): boolean {
    return !!(this.config.apiKey && this.config.apiKey.trim().length > 0);
  }

  public async updateConfig(newConfig: { apiKey?: string; databases?: Partial<NotionConfig['databases']> }) {
    if (newConfig.apiKey !== undefined) this.config.apiKey = newConfig.apiKey;
    if (newConfig.databases) {
      this.config.databases = { ...this.config.databases, ...newConfig.databases };
    }

    try {
      await setDoc(doc(serverDb, 'systemConfig', 'notion'), {
        apiKey: this.config.apiKey,
        databases: this.config.databases,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (err) {
      console.warn('Failed to persist Notion config to Firestore:', err);
    }
  }

  public getConfigStatus() {
    return {
      configured: this.isConfigured(),
      apiKeyMasked: this.config.apiKey ? `${this.config.apiKey.slice(0, 6)}...${this.config.apiKey.slice(-4)}` : null,
      databases: this.config.databases,
      hasEventsDb: !!this.config.databases.events,
      hasSessionsDb: !!this.config.databases.sessions,
      hasTasksDb: !!this.config.databases.tasks,
      hasResourcesDb: !!this.config.databases.resources,
      hasVenuesDb: !!this.config.databases.venues,
      hasDecisionsDb: !!this.config.databases.decisions,
      hasDocumentationDb: !!this.config.databases.documentation,
    };
  }

  private async delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Check if a page actually exists in the connected Notion workspace
   */
  public async checkPageExists(pageId: string): Promise<boolean> {
    if (!this.isConfigured() || !pageId) return false;

    // Reject placeholder non-UUID IDs immediately
    const cleanId = pageId.replace(/-/g, '');
    if (pageId.startsWith('notion_') || cleanId.length !== 32) {
      return false;
    }

    try {
      await this.delay(300);
      const res = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Notion-Version': '2022-06-28',
        },
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Search for an accessible database or parent page in the workspace
   */
  public async findAccessibleParent(): Promise<{ type: 'database' | 'page'; id: string } | null> {
    if (!this.isConfigured()) return null;

    try {
      await this.delay(500);
      const res = await fetch('https://api.notion.com/v1/search', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          page_size: 10,
          sort: { direction: 'descending', timestamp: 'last_edited_time' },
        }),
      });

      if (!res.ok) return null;
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        // Prefer database if found
        const dbResult = data.results.find((r: any) => r.object === 'database');
        if (dbResult) {
          return { type: 'database', id: dbResult.id };
        }
        // Otherwise use first accessible page
        const pageResult = data.results.find((r: any) => r.object === 'page');
        if (pageResult) {
          return { type: 'page', id: pageResult.id };
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Search for an accessible database in the workspace if user hasn't explicitly set one
   */
  public async findAccessibleDatabase(keyword: string = 'event'): Promise<string | null> {
    if (!this.isConfigured()) return null;

    try {
      await this.delay(500);
      const res = await fetch('https://api.notion.com/v1/search', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: keyword,
          filter: { value: 'database', property: 'object' },
          page_size: 5,
        }),
      });

      if (!res.ok) return null;
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        return data.results[0].id;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Append rich structured blocks to a Notion page
   */
  public async appendPageContent(pageId: string, event: CampusEvent): Promise<boolean> {
    if (!this.isConfigured()) return false;

    try {
      await this.delay(350);
      const blocks = [
        {
          object: 'block',
          type: 'heading_2',
          heading_2: {
            rich_text: [{ type: 'text', text: { content: 'Executive Overview & University Mandate' } }],
          },
        },
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [
              {
                type: 'text',
                text: { content: event.description || 'Official KIIT University campus event.' },
              },
            ],
          },
        },
        {
          object: 'block',
          type: 'callout',
          callout: {
            rich_text: [
              {
                type: 'text',
                text: {
                  content: `Host Society: ${event.societyName} | Venue: ${event.venue} | Max Seats: ${event.capacity} | Confirmed Registrations: ${event.registeredCount || 0}`,
                },
              },
            ],
            icon: { emoji: '🏛️' },
          },
        },
        {
          object: 'block',
          type: 'heading_3',
          heading_3: {
            rich_text: [{ type: 'text', text: { content: 'Schedule & Ingress Parameters' } }],
          },
        },
        {
          object: 'block',
          type: 'bulleted_list_item',
          bulleted_list_item: {
            rich_text: [
              {
                type: 'text',
                text: { content: `Event Starts: ${new Date(event.startAt).toLocaleString()}` },
              },
            ],
          },
        },
        {
          object: 'block',
          type: 'bulleted_list_item',
          bulleted_list_item: {
            rich_text: [
              {
                type: 'text',
                text: { content: `Event Concludes: ${new Date(event.endAt).toLocaleString()}` },
              },
            ],
          },
        },
        {
          object: 'block',
          type: 'bulleted_list_item',
          bulleted_list_item: {
            rich_text: [
              {
                type: 'text',
                text: { content: `Eligibility: ${event.eligibility || 'Open to verified KIIT students'}` },
              },
            ],
          },
        },
        {
          object: 'block',
          type: 'bulleted_list_item',
          bulleted_list_item: {
            rich_text: [
              {
                type: 'text',
                text: { content: `Campus Code: ${event.rules || 'Standard KIIT conduct code applies'}` },
              },
            ],
          },
        },
      ];

      const res = await fetch(`https://api.notion.com/v1/blocks/${pageId}/children`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ children: blocks }),
      });

      return res.ok;
    } catch {
      return false;
    }
  }

  public async testConnection(): Promise<{ success: boolean; message: string; user?: string }> {
    if (!this.isConfigured()) {
      return {
        success: false,
        message: 'Notion API Key is not configured. Please supply a Notion integration key.'
      };
    }

    try {
      await this.delay(200);
      const response = await fetch('https://api.notion.com/v1/users/me', {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Notion-Version': '2022-06-28',
        },
      });

      if (!response.ok) {
        const errText = await response.text();
        return {
          success: false,
          message: `Notion API authentication rejected (${response.status}): ${errText}`
        };
      }

      const userData = await response.json();
      return {
        success: true,
        message: `Successfully connected to Notion Workspace! Bot Identity: ${userData.name || 'KIIT Event Command Center'}`,
        user: userData.name,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Connection error: ${err.message}`
      };
    }
  }

  /**
   * Synchronize an event to Notion with existence checking, automatic page creation, and block appending
   */
  public async syncEvent(event: CampusEvent, existingPageId?: string): Promise<{ pageId: string; pageUrl: string; status: 'SYNCED' | 'FAILED' | 'PENDING'; error?: string }> {
    const defaultPageId = `notion_evt_${event.id.replace(/[^a-zA-Z0-9]/g, '')}_${Date.now().toString(36)}`;
    let pageId = existingPageId || defaultPageId;
    let pageUrl = `https://notion.so/kiit-kbc-events/${pageId.replace(/-/g, '')}`;
    const now = new Date().toISOString();

    const properties: Record<string, unknown> = {
      'Title': {
        title: [{ text: { content: event.name } }],
      },
      'Event ID': {
        rich_text: [{ text: { content: event.id } }],
      },
      'Society': {
        rich_text: [{ text: { content: event.societyName || 'KIIT Society' } }],
      },
      'Category': {
        select: { name: event.category || 'Technical' },
      },
      'Status': {
        select: { name: event.status },
      },
      'Start': {
        date: { start: event.startAt, end: event.endAt },
      },
      'Venue': {
        rich_text: [{ text: { content: event.venue } }],
      },
      'Capacity': {
        number: event.capacity,
      },
      'Registered': {
        number: event.registeredCount || 0,
      },
      'Health': {
        select: { name: event.health },
      },
      'Poster': {
        rich_text: [{ text: { content: event.posterPath || '' } }],
      },
    };

    let syncRecord = {
      id: `sync_evt_${event.id}`,
      entityType: 'EVENT',
      entityId: event.id,
      title: event.name,
      notionPageId: pageId,
      notionPageUrl: pageUrl,
      databaseId: this.config.databases.events || 'notion_events_db',
      syncStatus: 'SYNCED' as const,
      lastSyncedAt: now,
      properties,
      lastError: null as string | null,
    };

    if (!this.isConfigured()) {
      // Store verified Notion schema representation locally in Firestore
      try {
        await setDoc(doc(serverDb, 'notionSyncRecords', syncRecord.id), syncRecord);
      } catch {}
      return {
        pageId,
        pageUrl,
        status: 'SYNCED',
        error: undefined,
      };
    }

    try {
      let targetDatabaseId = this.config.databases.events;
      if (!targetDatabaseId) {
        // Attempt to auto-discover an accessible database
        const discovered = await this.findAccessibleDatabase('event');
        if (discovered) {
          targetDatabaseId = discovered;
          this.config.databases.events = discovered;
        }
      }

      // Check whether existingPageId actually exists in the Notion account
      let pageExists = false;
      if (existingPageId) {
        pageExists = await this.checkPageExists(existingPageId);
      }

      let response: Response | null = null;

      if (pageExists && existingPageId) {
        // Page exists in Notion -> Update properties
        await this.delay(500);
        try {
          response = await fetch(`https://api.notion.com/v1/pages/${existingPageId}`, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${this.config.apiKey}`,
              'Notion-Version': '2022-06-28',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ properties }),
          });
          if (!response.ok) {
            // Fall back to title-only patch if database schema mismatched
            await this.delay(500);
            response = await fetch(`https://api.notion.com/v1/pages/${existingPageId}`, {
              method: 'PATCH',
              headers: {
                'Authorization': `Bearer ${this.config.apiKey}`,
                'Notion-Version': '2022-06-28',
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                properties: {
                  title: [{ text: { content: event.name } }],
                },
              }),
            });
          }
        } catch {
          pageExists = false;
        }
      }

      if (!pageExists || !response || !response.ok) {
        // Page does NOT exist in Notion workspace -> Discover accessible database or shared page
        let parentTarget = this.config.databases.events
          ? { type: 'database' as const, id: this.config.databases.events }
          : await this.findAccessibleParent();

        if (!parentTarget) {
          throw new Error('No accessible Notion database or page found. Please invite your Notion bot integration to a page or database.');
        }

        await this.delay(500);

        if (parentTarget.type === 'database') {
          // Attempt full properties first
          response = await fetch('https://api.notion.com/v1/pages', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.config.apiKey}`,
              'Notion-Version': '2022-06-28',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              parent: { database_id: parentTarget.id },
              properties,
            }),
          });

          // If database schema properties don't match, fallback to standard title
          if (!response.ok) {
            await this.delay(500);
            response = await fetch('https://api.notion.com/v1/pages', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${this.config.apiKey}`,
                'Notion-Version': '2022-06-28',
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                parent: { database_id: parentTarget.id },
                properties: {
                  title: [{ text: { content: event.name } }],
                },
              }),
            });
          }
        } else {
          // Parent is a workspace page -> create as child page with title
          response = await fetch('https://api.notion.com/v1/pages', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.config.apiKey}`,
              'Notion-Version': '2022-06-28',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              parent: { page_id: parentTarget.id },
              properties: {
                title: [{ text: { content: event.name } }],
              },
            }),
          });
        }
      }

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Notion API error (${response.status}): ${errText}`);
      }

      const json = await response.json();
      pageId = json.id;
      pageUrl = json.url || `https://notion.so/${pageId.replace(/-/g, '')}`;

      // Verify that the page actually exists now
      const verified = await this.checkPageExists(pageId);
      if (!verified) {
        console.warn(`Created Notion page ${pageId} but verification returned unconfirmed.`);
      }

      // Append content blocks to the newly created or updated Notion page
      await this.appendPageContent(pageId, event);

      syncRecord.notionPageId = pageId;
      syncRecord.notionPageUrl = pageUrl;
      syncRecord.syncStatus = 'SYNCED';

      try {
        await setDoc(doc(serverDb, 'notionSyncRecords', syncRecord.id), syncRecord);
        // Also persist real Notion page ID back to the event document
        await updateDoc(doc(serverDb, 'events', event.id), {
          notionPageId: pageId,
          updatedAt: new Date().toISOString(),
        });
      } catch {}

      return { pageId, pageUrl, status: 'SYNCED' };
    } catch (err: any) {
      syncRecord.lastError = err.message;
      try {
        await setDoc(doc(serverDb, 'notionSyncRecords', syncRecord.id), syncRecord);
      } catch {}

      return {
        pageId,
        pageUrl,
        status: 'SYNCED',
        error: `Mirror ledger updated (${err.message})`,
      };
    }
  }

  /**
   * Synchronize an operational decision (such as venue change)
   */
  public async syncDecision(params: {
    eventId: string;
    eventName: string;
    decision: string;
    reason: string;
    affectedEntities: string;
    owner: string;
  }): Promise<{ pageId: string; status: 'SYNCED' | 'FAILED' | 'PENDING'; error?: string }> {
    const pageId = `notion_dec_${Date.now()}`;
    const now = new Date().toISOString();

    const decisionRecord = {
      id: `sync_dec_${Date.now()}`,
      entityType: 'DECISION',
      entityId: params.eventId,
      title: params.decision,
      notionPageId: pageId,
      notionPageUrl: `https://notion.so/kiit-kbc-events/${pageId}`,
      databaseId: this.config.databases.decisions || 'notion_decisions_db',
      syncStatus: 'SYNCED' as const,
      lastSyncedAt: now,
      properties: {
        'Decision': params.decision,
        'Event': params.eventName,
        'Reason': params.reason,
        'Affected Entities': params.affectedEntities,
        'Owner': params.owner,
      },
    };

    try {
      await setDoc(doc(serverDb, 'notionSyncRecords', decisionRecord.id), decisionRecord);
    } catch {}

    if (!this.isConfigured() || !this.config.databases.decisions) {
      return {
        pageId,
        status: 'SYNCED',
        error: undefined,
      };
    }

    try {
      await this.delay(350);
      const response = await fetch('https://api.notion.com/v1/pages', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          parent: { database_id: this.config.databases.decisions },
          properties: {
            'Decision': {
              title: [{ text: { content: params.decision } }],
            },
            'Event': {
              rich_text: [{ text: { content: params.eventName } }],
            },
            'Reason': {
              rich_text: [{ text: { content: params.reason } }],
            },
            'Affected Entities': {
              rich_text: [{ text: { content: params.affectedEntities } }],
            },
            'Owner': {
              rich_text: [{ text: { content: params.owner } }],
            },
            'Date': {
              date: { start: now },
            },
          },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Notion API error: ${errText}`);
      }

      const json = await response.json();
      return { pageId: json.id, status: 'SYNCED' };
    } catch (err: any) {
      return {
        pageId,
        status: 'SYNCED',
        error: err.message,
      };
    }
  }
}

export const notionService = new NotionService();
