import {
  CampusEvent,
  EventResource,
  EventSession,
  EventTask,
  NotionSyncRecord
} from '../../shared/types.ts';

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
  }

  public isConfigured(): boolean {
    return !!(this.config.apiKey && this.config.apiKey.trim().length > 0);
  }

  public getConfigStatus() {
    return {
      configured: this.isConfigured(),
      hasEventsDb: !!this.config.databases.events,
      hasSessionsDb: !!this.config.databases.sessions,
      hasTasksDb: !!this.config.databases.tasks,
      hasResourcesDb: !!this.config.databases.resources,
      hasVenuesDb: !!this.config.databases.venues,
      hasDecisionsDb: !!this.config.databases.decisions,
      hasDocumentationDb: !!this.config.databases.documentation,
    };
  }

  /**
   * Synchronize an event to Notion
   */
  public async syncEvent(event: CampusEvent, existingPageId?: string): Promise<{ pageId: string; status: 'SYNCED' | 'FAILED' | 'PENDING'; error?: string }> {
    if (!this.isConfigured() || !this.config.databases.events) {
      return {
        pageId: existingPageId || `notion_placeholder_${event.id}`,
        status: 'PENDING',
        error: 'Notion API key or Events Database ID not configured in server environment. Ready for sync once provided.',
      };
    }

    try {
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
        'Health': {
          select: { name: event.health },
        },
      };

      const url = existingPageId
        ? `https://api.notion.com/v1/pages/${existingPageId}`
        : 'https://api.notion.com/v1/pages';

      const method = existingPageId ? 'PATCH' : 'POST';
      const body = existingPageId
        ? { properties }
        : {
            parent: { database_id: this.config.databases.events },
            properties,
          };

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Notion API error: ${response.status} - ${errText}`);
      }

      const json = await response.json();
      return { pageId: json.id, status: 'SYNCED' };
    } catch (err: any) {
      return {
        pageId: existingPageId || `failed_${event.id}`,
        status: 'FAILED',
        error: err.message,
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
    if (!this.isConfigured() || !this.config.databases.decisions) {
      return {
        pageId: `notion_decision_${Date.now()}`,
        status: 'PENDING',
        error: 'Notion Decisions Database not configured in server environment.',
      };
    }

    try {
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
              date: { start: new Date().toISOString() },
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
        pageId: `failed_dec_${Date.now()}`,
        status: 'FAILED',
        error: err.message,
      };
    }
  }
}
