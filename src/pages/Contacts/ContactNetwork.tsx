import { useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { Button } from 'antd';
import { AimOutlined, UndoOutlined } from '@ant-design/icons';
import type { ApplicationContact, ContactRelationship } from '../../types';
import { contactInitials, withoutGenericContact } from '../../components/contacts/contactOptions';

// Where along each edge the user parked its label, as a 0-1 ratio keyed by edge.
const LABEL_POSITION_KEY = 'careerhub.contacts.network.labelPositions';
// Nodes the user dragged, keyed by contact id (0 is Me).
const NODE_POSITION_KEY = 'careerhub.contacts.network.nodePositions';

interface Point {
  x: number;
  y: number;
}

interface Props {
  contacts: ApplicationContact[];
  relationships: ContactRelationship[];
  focusId: number | null;
  onSelect: (contact: ApplicationContact) => void;
  onBackToMe: () => void;
}

const SELF_ID = 0;
const SELF_POINT = { x: 530, y: 375 };

const relationshipEnds = (relationship: ContactRelationship) => [
  relationship.source_contact ?? SELF_ID,
  relationship.target_contact,
];

const shortestPath = (relationships: ContactRelationship[], targetId: number) => {
  const adjacency = new Map<number, number[]>();
  for (const relationship of relationships) {
    const [source, target] = relationshipEnds(relationship);
    adjacency.set(source, [...(adjacency.get(source) || []), target]);
    adjacency.set(target, [...(adjacency.get(target) || []), source]);
  }
  const queue = [SELF_ID];
  const previous = new Map<number, number | null>([[SELF_ID, null]]);
  while (queue.length) {
    const current = queue.shift()!;
    if (current === targetId) break;
    for (const neighbor of adjacency.get(current) || []) {
      if (previous.has(neighbor)) continue;
      previous.set(neighbor, current);
      queue.push(neighbor);
    }
  }
  if (!previous.has(targetId)) return [SELF_ID, targetId];
  const path: number[] = [];
  let current: number | null = targetId;
  while (current !== null) {
    path.unshift(current);
    current = previous.get(current) ?? null;
  }
  return path;
};

const radialPoints = (count: number, center: Point, radius: number, offset = -Math.PI / 2) =>
  Array.from({ length: count }, (_, index) => {
    const angle = offset + (Math.PI * 2 * index) / Math.max(count, 1);
    return {
      x: center.x + Math.cos(angle) * radius,
      y: center.y + Math.sin(angle) * radius,
    };
  });

const buildLayers = (
  relationships: ContactRelationship[],
  contactsById: Map<number, ApplicationContact>
) => {
  const anchorOf = new Map<number, number>();
  const everyone = new Set<number>();
  for (const relationship of relationships) {
    const [source, target] = relationshipEnds(relationship);
    for (const id of [source, target]) {
      if (id !== SELF_ID && contactsById.has(id)) everyone.add(id);
    }
    if (source === SELF_ID || target === SELF_ID || source === target) continue;
    if (!contactsById.has(source) || !contactsById.has(target)) continue;
    // First anchor wins; someone shown under two anchors at once has no single position.
    if (!anchorOf.has(source)) anchorOf.set(source, target);
  }

  // Break anchor cycles, otherwise the depth walk below never terminates.
  for (const start of Array.from(anchorOf.keys())) {
    const seen = new Set<number>([start]);
    let current = anchorOf.get(start);
    while (current !== undefined) {
      if (seen.has(current)) {
        anchorOf.delete(current);
        break;
      }
      seen.add(current);
      current = anchorOf.get(current);
    }
  }

  const depth = new Map<number, number>([[SELF_ID, 0]]);
  const depthOf = (id: number): number => {
    const cached = depth.get(id);
    if (cached !== undefined) return cached;
    const anchor = anchorOf.get(id);
    const value = anchor === undefined ? 1 : depthOf(anchor) + 1;
    depth.set(id, value);
    return value;
  };

  const parent = new Map<number, number>();
  for (const id of everyone) {
    depthOf(id);
    parent.set(id, anchorOf.get(id) ?? SELF_ID);
  }

  return { depth, parent };
};

const satellitePoints = (anchor: Point, awayFrom: Point, count: number, radius: number) => {
  const base = Math.atan2(anchor.y - awayFrom.y, anchor.x - awayFrom.x);
  const spread = Math.PI / 1.6;
  return Array.from({ length: count }, (_, index) => {
    const angle = count === 1 ? base : base - spread / 2 + (spread * index) / (count - 1);
    return { x: anchor.x + Math.cos(angle) * radius, y: anchor.y + Math.sin(angle) * radius };
  });
};

// The canvas starts here and grows to follow nodes dragged past the edge, up to the ceiling.
const BASE_WIDTH = 1060;
const BASE_HEIGHT = 800;
const MAX_WIDTH = 2000;
const MAX_HEIGHT = 1800;
// The name and job title render up to 81px below the circle, so leave room for them.
const NODE_MARGIN = 110;

const clampPoint = (point: Point): Point => ({
  x: Math.min(MAX_WIDTH - NODE_MARGIN, Math.max(80, point.x)),
  y: Math.min(MAX_HEIGHT - NODE_MARGIN, Math.max(80, point.y)),
});

const nodeRadius = (id: number) => (id === SELF_ID ? 52 : 42);

// Pull an endpoint back to the rim of its node so the arrowhead is not buried under the circle.
const trimTo = (from: Point, to: Point, pad: number): Point => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  return { x: to.x - (dx / length) * pad, y: to.y - (dy / length) * pad };
};

const ContactNetwork = ({ contacts, relationships, focusId, onSelect, onBackToMe }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const contactsById = useMemo(
    () => new Map(contacts.map((contact) => [contact.id, contact])),
    [contacts]
  );

  const layout = useMemo(() => {
    if (!focusId) {
      const { depth, parent } = buildLayers(relationships, contactsById);
      const atDepth = (value: number) =>
        Array.from(depth.entries())
          .filter(([id, level]) => id !== SELF_ID && level === value)
          .map(([id]) => id);

      const direct = atDepth(1).slice(0, 14);
      const shown = new Set<number>(direct);
      const points = new Map<number, Point>([[SELF_ID, SELF_POINT]]);

      if (direct.length <= 12) {
        radialPoints(direct.length, SELF_POINT, 285).forEach((point, index) =>
          points.set(direct[index], point)
        );
      } else {
        const inner = direct.slice(0, 8);
        const outer = direct.slice(8);
        radialPoints(inner.length, SELF_POINT, 215).forEach((point, index) =>
          points.set(inner[index], point)
        );
        radialPoints(outer.length, SELF_POINT, 365, -Math.PI / 2 + 0.24).forEach((point, index) =>
          points.set(outer[index], point)
        );
      }

      // Deeper rings orbit the node they hang off, so everyone under one manager fans out there.
      const maxDepth = Math.max(0, ...depth.values());
      for (let level = 2; level <= maxDepth; level += 1) {
        const byParent = new Map<number, number[]>();
        for (const id of atDepth(level)) {
          const anchor = parent.get(id);
          if (anchor === undefined || !points.has(anchor)) continue;
          byParent.set(anchor, [...(byParent.get(anchor) || []), id]);
        }
        for (const [anchor, children] of byParent) {
          const anchorPoint = points.get(anchor)!;
          satellitePoints(anchorPoint, SELF_POINT, children.length, 235).forEach((point, index) => {
            points.set(children[index], clampPoint(point));
            shown.add(children[index]);
          });
        }
      }

      const placeable = Array.from(depth.keys()).filter((id) => id !== SELF_ID).length;
      return {
        visibleIds: new Set([SELF_ID, ...shown]),
        positions: points,
        pathIds: new Set([SELF_ID]),
        hiddenCount: Math.max(0, placeable - shown.size),
      };
    }

    const path = shortestPath(relationships, focusId);
    const neighbors = Array.from(
      new Set(
        relationships.flatMap((relationship) => {
          const [source, target] = relationshipEnds(relationship);
          if (source === focusId) return [target];
          if (target === focusId) return [source];
          return [];
        })
      )
    )
      .filter((id) => id === SELF_ID || contactsById.has(id))
      .filter((id) => !path.includes(id))
      .slice(0, 18);
    const points = new Map<number, Point>([[SELF_ID, SELF_POINT]]);
    const focusPoint = { x: 760, y: 375 };
    path.slice(1).forEach((id, index) => {
      const progress = (index + 1) / Math.max(path.length - 1, 1);
      points.set(id, {
        x: SELF_POINT.x + (focusPoint.x - SELF_POINT.x) * progress,
        y: SELF_POINT.y,
      });
    });
    radialPoints(neighbors.length, focusPoint, 225, -Math.PI / 2).forEach((point, index) =>
      points.set(neighbors[index], point)
    );
    return {
      visibleIds: new Set([...path, ...neighbors]),
      positions: points,
      pathIds: new Set(path),
      hiddenCount: 0,
    };
  }, [contactsById, focusId, relationships]);

  const { visibleIds, pathIds, hiddenCount } = layout;

  const [nodeOffsets, setNodeOffsets] = useState<Record<string, Point>>(() => {
    try {
      return JSON.parse(window.localStorage.getItem(NODE_POSITION_KEY) || '{}');
    } catch {
      return {};
    }
  });

  useEffect(() => {
    window.localStorage.setItem(NODE_POSITION_KEY, JSON.stringify(nodeOffsets));
  }, [nodeOffsets]);

  // Focusing someone lays the graph out completely differently, so a drag is remembered
  // against the view it happened in rather than leaking across views.
  const viewKey = focusId ? String(focusId) : 'me';
  const nodeKey = (id: number) => `${viewKey}:${id}`;

  // A node the user dragged wins over wherever the layout would have put it.
  const positions = useMemo(() => {
    const merged = new Map(layout.positions);
    for (const id of merged.keys()) {
      const dragged = nodeOffsets[`${viewKey}:${id}`];
      if (dragged) merged.set(id, dragged);
    }
    return merged;
  }, [layout.positions, nodeOffsets, viewKey]);

  const edges = useMemo(() => {
    const groups = new Map<string, ContactRelationship[]>();
    for (const relationship of relationships) {
      const [source, target] = relationshipEnds(relationship);
      if (!visibleIds.has(source) || !visibleIds.has(target)) continue;
      const key = source < target ? `${source}:${target}` : `${target}:${source}`;
      groups.set(key, [...(groups.get(key) || []), relationship]);
    }

    return Array.from(groups)
      .map(([key, group]) => {
        const [source, target] = relationshipEnds(group[0]);
        const start = positions.get(source);
        const end = positions.get(target);
        if (!start || !end) return null;
        return {
          key,
          text: Array.from(new Set(withoutGenericContact(group).map((item) => item.label))).join(
            ' · '
          ),
          isPath: pathIds.has(source) && pathIds.has(target),
          pointsAtTarget: group.some((item) => relationshipEnds(item)[0] === source),
          pointsAtSource: group.some((item) => relationshipEnds(item)[0] === target),
          from: trimTo(end, start, nodeRadius(source) + 4),
          to: trimTo(start, end, nodeRadius(target) + 4),
        };
      })
      .filter((edge): edge is NonNullable<typeof edge> => edge !== null);
  }, [pathIds, positions, relationships, visibleIds]);

  const [labelPositions, setLabelPositions] = useState<Record<string, number>>(() => {
    try {
      return JSON.parse(window.localStorage.getItem(LABEL_POSITION_KEY) || '{}');
    } catch {
      return {};
    }
  });
  const draggingKey = useRef<string | null>(null);

  useEffect(() => {
    window.localStorage.setItem(LABEL_POSITION_KEY, JSON.stringify(labelPositions));
  }, [labelPositions]);

  const draggingNode = useRef<number | null>(null);
  // Set once a drag actually moves, so releasing a drag does not also open the drawer.
  const dragMoved = useRef(false);

  const svgPointOf = (event: ReactPointerEvent<SVGSVGElement>): Point | null => {
    const matrix = svgRef.current?.getScreenCTM();
    if (!matrix) return null;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    return { x: point.x, y: point.y };
  };

  // Labels slide along their own line; nodes move freely.
  const handleDrag = (event: ReactPointerEvent<SVGSVGElement>) => {
    const nodeId = draggingNode.current;
    const key = draggingKey.current;
    if (nodeId === null && !key) return;
    const point = svgPointOf(event);
    if (!point) return;
    dragMoved.current = true;

    if (nodeId !== null) {
      setNodeOffsets((prev) => ({ ...prev, [nodeKey(nodeId)]: clampPoint(point) }));
      return;
    }
    const edge = edges.find((item) => item.key === key);
    if (!edge) return;
    const dx = edge.to.x - edge.from.x;
    const dy = edge.to.y - edge.from.y;
    const lengthSquared = dx * dx + dy * dy || 1;
    const ratio = ((point.x - edge.from.x) * dx + (point.y - edge.from.y) * dy) / lengthSquared;
    setLabelPositions((prev) => ({ ...prev, [key!]: Math.min(0.88, Math.max(0.12, ratio)) }));
  };

  const endDrag = () => {
    draggingNode.current = null;
    draggingKey.current = null;
  };

  const startNodeDrag = (id: number) => (event: ReactPointerEvent<SVGGElement>) => {
    event.stopPropagation();
    draggingNode.current = id;
    dragMoved.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  // A drag ends in a click on the same node, so swallow that one click.
  const clickAfterDrag = (action: () => void) => () => {
    if (dragMoved.current) {
      dragMoved.current = false;
      return;
    }
    action();
  };

  const selfPoint = positions.get(SELF_ID) ?? SELF_POINT;

  const canvas = useMemo(() => {
    const points = Array.from(positions.values());
    const furthestX = Math.max(0, ...points.map((point) => point.x));
    const furthestY = Math.max(0, ...points.map((point) => point.y));
    return {
      width: Math.min(MAX_WIDTH, Math.max(BASE_WIDTH, Math.ceil(furthestX + NODE_MARGIN))),
      height: Math.min(MAX_HEIGHT, Math.max(BASE_HEIGHT, Math.ceil(furthestY + NODE_MARGIN))),
    };
  }, [positions]);

  // Once the canvas has grown past its base size, hold it at 1:1 and let the container
  // scroll, rather than scaling everything back down to fit the width.
  const svgStyle = canvas.width > BASE_WIDTH ? { minWidth: canvas.width } : undefined;

  const draggedHere = Object.keys(nodeOffsets).filter((key) => key.startsWith(`${viewKey}:`));
  const hasCustomLayout = draggedHere.length > 0 || Object.keys(labelPositions).length > 0;

  // Only clears the view you are looking at, so resetting a focused graph leaves Me alone.
  const resetLayout = () => {
    setNodeOffsets((prev) =>
      Object.fromEntries(Object.entries(prev).filter(([key]) => !key.startsWith(`${viewKey}:`)))
    );
    setLabelPositions({});
  };

  const visibleContacts = Array.from(visibleIds)
    .filter((id) => id !== SELF_ID)
    .map((id) => contactsById.get(id))
    .filter((contact): contact is ApplicationContact => Boolean(contact));

  // Centres the view on whoever is in focus. Deliberately keyed on focusId alone: `positions`
  // changes on every drag frame, and re-running this mid-drag would scroll against the pointer.
  useEffect(() => {
    const container = containerRef.current;
    const svg = svgRef.current;
    if (!container || !svg) return;
    const target = layout.positions.get(focusId ?? SELF_ID) ?? SELF_POINT;
    const scale = svg.clientWidth / canvas.width;
    if (container.scrollWidth > container.clientWidth) {
      container.scrollTo({
        left: Math.max(0, target.x * scale - container.clientWidth / 2),
        behavior: 'smooth',
      });
    }
    if (container.scrollHeight > container.clientHeight) {
      container.scrollTo({
        top: Math.max(0, target.y * scale - container.clientHeight / 2),
        behavior: 'smooth',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId]);

  return (
    // Controls live outside the scroller so they stay put while the canvas scrolls.
    <div className="relative">
      <div className="absolute left-4 top-4 z-[2] flex flex-wrap items-center gap-2">
        {focusId && (
          <Button icon={<AimOutlined />} onClick={onBackToMe}>
            Back to me
          </Button>
        )}
        {hasCustomLayout && (
          <Button size="small" icon={<UndoOutlined />} onClick={resetLayout}>
            Reset layout
          </Button>
        )}
      </div>
      <p className="pointer-events-none absolute right-4 top-4 z-[2] text-xs text-slate-400">
        Drag people or labels to rearrange
      </p>
      <div
        ref={containerRef}
        className="max-h-[80vh] min-h-[560px] overflow-auto rounded-2xl border border-slate-200 bg-slate-50/60"
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${canvas.width} ${canvas.height}`}
          className="h-auto w-full min-w-[900px] touch-pan-x touch-pan-y lg:min-w-0"
          style={svgStyle}
          aria-label="Contact relationship network"
          onPointerMove={handleDrag}
          onPointerUp={endDrag}
          onPointerLeave={endDrag}
        >
          <defs>
            <filter id="node-shadow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow
                dx="0"
                dy="5"
                stdDeviation="8"
                floodColor="#0f172a"
                floodOpacity="0.1"
              />
            </filter>
            {[
              ['edge-arrow', '#cbd5e1'],
              ['edge-arrow-path', '#2563eb'],
            ].map(([id, color]) => (
              <marker
                key={id}
                id={id}
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
              </marker>
            ))}
          </defs>

          {edges.map((edge) => {
            const marker = `url(#${edge.isPath ? 'edge-arrow-path' : 'edge-arrow'})`;
            return (
              <line
                key={edge.key}
                x1={edge.from.x}
                y1={edge.from.y}
                x2={edge.to.x}
                y2={edge.to.y}
                stroke={edge.isPath ? '#2563eb' : '#cbd5e1'}
                strokeWidth={edge.isPath ? 2.5 : 1.5}
                markerEnd={edge.pointsAtTarget ? marker : undefined}
                markerStart={edge.pointsAtSource ? marker : undefined}
              />
            );
          })}

          <g
            role="button"
            tabIndex={0}
            aria-label="Return to my network"
            onPointerDown={startNodeDrag(SELF_ID)}
            onClick={clickAfterDrag(onBackToMe)}
            onKeyDown={(event) => event.key === 'Enter' && onBackToMe()}
            className="cursor-grab touch-none outline-none active:cursor-grabbing"
          >
            <circle
              cx={selfPoint.x}
              cy={selfPoint.y}
              r="52"
              fill="#0f172a"
              filter="url(#node-shadow)"
            />
            <text
              x={selfPoint.x}
              y={selfPoint.y + 5}
              textAnchor="middle"
              fontSize="16"
              fontWeight="700"
              fill="#fff"
            >
              Me
            </text>
            <text
              x={selfPoint.x}
              y={selfPoint.y + 78}
              textAnchor="middle"
              fontSize="13"
              fontWeight="600"
              fill="#334155"
            >
              My network
            </text>
          </g>

          {visibleContacts.map((contact) => {
            const point = positions.get(contact.id);
            if (!point) return null;
            const isFocused = contact.id === focusId;
            return (
              <g
                key={contact.id}
                role="button"
                tabIndex={0}
                aria-label={`Open ${contact.name}`}
                onPointerDown={startNodeDrag(contact.id)}
                onClick={clickAfterDrag(() => onSelect(contact))}
                onKeyDown={(event) => event.key === 'Enter' && onSelect(contact)}
                className="cursor-grab touch-none outline-none active:cursor-grabbing"
              >
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={isFocused ? 47 : 42}
                  fill={isFocused ? '#dbeafe' : '#ffffff'}
                  stroke={isFocused ? '#2563eb' : '#cbd5e1'}
                  strokeWidth={isFocused ? 3 : 2}
                  filter="url(#node-shadow)"
                />
                <text
                  x={point.x}
                  y={point.y + 5}
                  textAnchor="middle"
                  fontSize="15"
                  fontWeight="700"
                  fill="#334155"
                >
                  {contactInitials(contact.name)}
                </text>
                <text
                  x={point.x}
                  y={point.y + 64}
                  textAnchor="middle"
                  fontSize="13"
                  fontWeight="600"
                  fill="#0f172a"
                >
                  {contact.name.length > 20 ? `${contact.name.slice(0, 18)}…` : contact.name}
                </text>
                {(contact.job_title || contact.company) && (
                  <text
                    x={point.x}
                    y={point.y + 81}
                    textAnchor="middle"
                    fontSize="11"
                    fill="#64748b"
                  >
                    {(contact.job_title || contact.company || '').slice(0, 24)}
                  </text>
                )}
              </g>
            );
          })}

          {edges.map((edge) => {
            if (!edge.text) return null;
            const ratio = labelPositions[edge.key] ?? 0.5;
            const anchor = {
              x: edge.from.x + (edge.to.x - edge.from.x) * ratio,
              y: edge.from.y + (edge.to.y - edge.from.y) * ratio,
            };
            const width = Math.min(190, edge.text.length * 6.4 + 20);
            return (
              <g
                key={edge.key}
                className="cursor-grab touch-none active:cursor-grabbing"
                onPointerDown={(event) => {
                  event.stopPropagation();
                  draggingKey.current = edge.key;
                  event.currentTarget.setPointerCapture(event.pointerId);
                }}
              >
                <title>{`${edge.text} — drag to move along the line`}</title>
                <rect
                  x={anchor.x - width / 2}
                  y={anchor.y - 11}
                  width={width}
                  height={22}
                  rx={11}
                  fill="#ffffff"
                  stroke="#e2e8f0"
                />
                <text
                  x={anchor.x}
                  y={anchor.y + 4}
                  textAnchor="middle"
                  fontSize="11"
                  fill="#64748b"
                  className="select-none"
                >
                  {edge.text.length > 28 ? `${edge.text.slice(0, 27)}…` : edge.text}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {visibleContacts.length === 0 && (
        <div className="pointer-events-none absolute inset-x-4 bottom-12 z-[2] text-center">
          <p className="text-sm font-medium text-slate-600">No one is connected yet</p>
          <p className="mt-1 text-xs text-slate-400">
            Add a relationship to place someone in your network.
          </p>
        </div>
      )}
      {hiddenCount > 0 && (
        <p className="absolute bottom-4 right-4 z-[2] rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-500">
          {hiddenCount} more available in List view
        </p>
      )}
    </div>
  );
};

export default ContactNetwork;
