import {
  CampusEvent,
  DependencyEntityType,
  DependencySeverity,
  EventDependency,
  EventResource,
  EventSession,
  EventTask,
  EventVolunteer,
  ImpactAnalysisResult
} from '../../shared/types.ts';

export interface GraphNode {
  id: string;
  type: DependencyEntityType;
  label: string;
  metadata?: Record<string, unknown>;
}

export interface GraphEdge {
  id: string;
  sourceId: string;
  sourceType: DependencyEntityType;
  targetId: string;
  targetType: DependencyEntityType;
  relationship: string;
  severity: DependencySeverity;
}

export class DependencyEngine {
  private nodes: Map<string, GraphNode> = new Map();
  private adjacencyList: Map<string, GraphEdge[]> = new Map();
  private reverseAdjacencyList: Map<string, GraphEdge[]> = new Map();

  constructor() {
    this.clear();
  }

  public clear(): void {
    this.nodes.clear();
    this.adjacencyList.clear();
    this.reverseAdjacencyList.clear();
  }

  public addNode(node: GraphNode): void {
    this.nodes.set(node.id, node);
    if (!this.adjacencyList.has(node.id)) {
      this.adjacencyList.set(node.id, []);
    }
    if (!this.reverseAdjacencyList.has(node.id)) {
      this.reverseAdjacencyList.set(node.id, []);
    }
  }

  public addEdge(edge: GraphEdge): boolean {
    // Prevent self-dependency
    if (edge.sourceId === edge.targetId) {
      throw new Error(`Self-dependency is invalid for node ${edge.sourceId}`);
    }

    // Check if adding this edge introduces a cycle (DFS check)
    if (this.wouldCauseCycle(edge.sourceId, edge.targetId)) {
      throw new Error(`Adding dependency from ${edge.sourceId} to ${edge.targetId} would create a circular dependency cycle.`);
    }

    const currentEdges = this.adjacencyList.get(edge.sourceId) || [];
    currentEdges.push(edge);
    this.adjacencyList.set(edge.sourceId, currentEdges);

    const reverseEdges = this.reverseAdjacencyList.get(edge.targetId) || [];
    reverseEdges.push(edge);
    this.reverseAdjacencyList.set(edge.targetId, reverseEdges);

    return true;
  }

  private wouldCauseCycle(sourceId: string, targetId: string): boolean {
    // If targetId can already reach sourceId, then adding sourceId -> targetId creates a cycle
    const visited = new Set<string>();
    const stack = [targetId];

    while (stack.length > 0) {
      const current = stack.pop()!;
      if (current === sourceId) return true;
      if (!visited.has(current)) {
        visited.add(current);
        const neighbors = this.adjacencyList.get(current) || [];
        for (const edge of neighbors) {
          stack.push(edge.targetId);
        }
      }
    }
    return false;
  }

  /**
   * Traverse downstream dependents from a start node using BFS
   */
  public getDownstreamDependents(startNodeId: string): GraphNode[] {
    const visited = new Set<string>();
    const queue = [startNodeId];
    const result: GraphNode[] = [];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (!visited.has(currentId)) {
        visited.add(currentId);
        if (currentId !== startNodeId) {
          const node = this.nodes.get(currentId);
          if (node) result.push(node);
        }
        const edges = this.adjacencyList.get(currentId) || [];
        for (const edge of edges) {
          if (!visited.has(edge.targetId)) {
            queue.push(edge.targetId);
          }
        }
      }
    }

    return result;
  }

  /**
   * Traverse upstream prerequisites for a given node
   */
  public getPrerequisites(nodeId: string): GraphNode[] {
    const visited = new Set<string>();
    const queue = [nodeId];
    const result: GraphNode[] = [];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (!visited.has(currentId)) {
        visited.add(currentId);
        if (currentId !== nodeId) {
          const node = this.nodes.get(currentId);
          if (node) result.push(node);
        }
        const reverseEdges = this.reverseAdjacencyList.get(currentId) || [];
        for (const edge of reverseEdges) {
          if (!visited.has(edge.sourceId)) {
            queue.push(edge.sourceId);
          }
        }
      }
    }
    return result;
  }

  /**
   * Run full venue change impact analysis
   */
  public analyzeVenueChange(params: {
    event: CampusEvent;
    oldVenue: string;
    newVenue: string;
    sessions: EventSession[];
    tasks: EventTask[];
    resources: EventResource[];
    volunteers: EventVolunteer[];
    dependencies: EventDependency[];
  }): ImpactAnalysisResult {
    const { event, oldVenue, newVenue, sessions, tasks, resources, volunteers, dependencies } = params;

    // Build the graph
    this.clear();

    const venueNodeId = `venue_${oldVenue.replace(/\s+/g, '_').toLowerCase()}`;
    this.addNode({
      id: venueNodeId,
      type: 'VENUE',
      label: oldVenue,
    });

    // Add session nodes
    sessions.forEach((s) => {
      this.addNode({
        id: s.id,
        type: 'SESSION',
        label: s.title,
        metadata: { ...s },
      });

      // Link venue -> session if session is at this venue
      if (s.venue.toLowerCase().trim() === oldVenue.toLowerCase().trim()) {
        try {
          this.addEdge({
            id: `edge_venue_${s.id}`,
            sourceId: venueNodeId,
            sourceType: 'VENUE',
            targetId: s.id,
            targetType: 'SESSION',
            relationship: 'HOSTED_AT',
            severity: 'HIGH',
          });
        } catch {
          // ignore duplicate
        }
      }
    });

    // Add task nodes
    tasks.forEach((t) => {
      this.addNode({
        id: t.id,
        type: 'TASK',
        label: t.title,
        metadata: { ...t },
      });

      if (t.sessionId && this.nodes.has(t.sessionId)) {
        try {
          this.addEdge({
            id: `edge_session_${t.id}`,
            sourceId: t.sessionId,
            sourceType: 'SESSION',
            targetId: t.id,
            targetType: 'TASK',
            relationship: 'REQUIRES',
            severity: t.priority === 'CRITICAL' || t.priority === 'HIGH' ? 'HIGH' : 'MEDIUM',
          });
        } catch {
          // ignore duplicate
        }
      }
    });

    // Add resource nodes
    resources.forEach((r) => {
      this.addNode({
        id: r.id,
        type: 'RESOURCE',
        label: r.name,
        metadata: { ...r },
      });

      if (r.assignedSessionId && this.nodes.has(r.assignedSessionId)) {
        try {
          this.addEdge({
            id: `edge_res_${r.id}`,
            sourceId: r.assignedSessionId,
            sourceType: 'SESSION',
            targetId: r.id,
            targetType: 'RESOURCE',
            relationship: 'ALLOCATED_TO',
            severity: 'MEDIUM',
          });
        } catch {
          // ignore
        }
      }
    });

    // Add custom dependencies
    dependencies.forEach((d) => {
      if (this.nodes.has(d.sourceId) && this.nodes.has(d.targetId)) {
        try {
          this.addEdge({
            id: d.id,
            sourceId: d.sourceId,
            sourceType: d.sourceType,
            targetId: d.targetId,
            targetType: d.targetType,
            relationship: d.relationshipType,
            severity: d.severity,
          });
        } catch {
          // Skip if cycle detected in existing record
        }
      }
    });

    // Traversal from venue node
    const downstream = this.getDownstreamDependents(venueNodeId);

    // Identify impacted sessions
    const affectedSessions = sessions
      .filter((s) => s.venue.toLowerCase().trim() === oldVenue.toLowerCase().trim() || downstream.some((d) => d.id === s.id))
      .map((s) => ({
        id: s.id,
        title: s.title,
        currentVenue: s.venue,
        time: `${new Date(s.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(s.endAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      }));

    // Identify impacted speakers
    const affectedSpeakers: Array<{ name: string; sessionTitle: string }> = [];
    affectedSessions.forEach((affSess) => {
      const orig = sessions.find((s) => s.id === affSess.id);
      if (orig && orig.speaker && orig.speaker !== 'TBD') {
        affectedSpeakers.push({
          name: orig.speaker,
          sessionTitle: orig.title,
        });
      }
    });

    // Identify impacted resources
    const affectedResources = resources
      .filter((r) => r.location.toLowerCase().includes(oldVenue.toLowerCase()) || downstream.some((d) => d.id === r.id))
      .map((r) => ({
        id: r.id,
        name: r.name,
        quantity: r.quantity,
        issue: `Relocation and power/AV recalibration required at ${newVenue}`,
      }));

    // Identify impacted volunteers
    const affectedVolunteers = volunteers
      .filter((v) => v.venue.toLowerCase().includes(oldVenue.toLowerCase()))
      .map((v) => ({
        id: v.id,
        name: v.name,
        role: v.role,
        shift: `${v.shiftStart} - ${v.shiftEnd}`,
      }));

    // Identify impacted tasks
    const affectedTasks = tasks
      .filter((t) => downstream.some((d) => d.id === t.id) || t.title.toLowerCase().includes('venue') || t.title.toLowerCase().includes('hall') || t.title.toLowerCase().includes('auditorium'))
      .map((t) => ({
        id: t.id,
        title: t.title,
        owner: t.owner,
        due: t.due,
        priority: t.priority,
      }));

    // Add communication actions
    const requiredCommunicationActions: string[] = [
      `Broadcast venue relocation announcement from "${oldVenue}" to "${newVenue}" to ${event.registeredCount || 0} registered students.`,
      `Notify ${affectedSpeakers.length} speaker(s) about the new stage location and AV check timings.`,
      `Re-brief ${affectedVolunteers.length} volunteer(s) on crowd ingress/egress routes at ${newVenue}.`,
      `Submit revised space requisition form to Campus Estate Office for ${newVenue}.`,
    ];

    // Calculate deterministic risk
    const riskReasons: string[] = [];
    let calculatedRisk: DependencySeverity = 'LOW';

    if (affectedSessions.length > 0) {
      riskReasons.push(`${affectedSessions.length} session(s) require stage schedule realignment.`);
      calculatedRisk = 'MEDIUM';
    }

    if (affectedResources.length >= 2 || affectedSpeakers.length > 0) {
      riskReasons.push(`Key speaker logistics and ${affectedResources.length} hardware resource setups affected.`);
      calculatedRisk = 'HIGH';
    }

    const eventStartDate = new Date(event.startAt).getTime();
    const hoursToEvent = (eventStartDate - Date.now()) / (1000 * 60 * 60);

    if (hoursToEvent < 48 && hoursToEvent > 0) {
      riskReasons.push(`Event starts in less than 48 hours (${Math.round(hoursToEvent)}h remaining); critical operational buffer window.`);
      calculatedRisk = 'CRITICAL';
    }

    return {
      venueChangedFrom: oldVenue,
      venueChangedTo: newVenue,
      affectedSessions,
      affectedSpeakers,
      affectedResources,
      affectedVolunteers,
      affectedTasks,
      requiredCommunicationActions,
      calculatedRisk,
      riskReasons,
    };
  }

  public getFullGraph(): { nodes: GraphNode[]; edges: GraphEdge[] } {
    const nodes = Array.from(this.nodes.values());
    const edges: GraphEdge[] = [];
    this.adjacencyList.forEach((edgeList) => {
      edges.push(...edgeList);
    });
    return { nodes, edges };
  }
}
