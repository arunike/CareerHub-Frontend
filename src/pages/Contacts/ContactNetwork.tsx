import { useEffect, useMemo, useRef } from 'react';
import { Button } from 'antd';
import { AimOutlined } from '@ant-design/icons';
import type { ApplicationContact, ContactRelationship } from '../../types';
import { contactInitials } from '../../components/contacts/contactOptions';

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
const SELF_POINT = { x: 500, y: 320 };

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

const ContactNetwork = ({ contacts, relationships, focusId, onSelect, onBackToMe }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const contactsById = useMemo(
    () => new Map(contacts.map((contact) => [contact.id, contact])),
    [contacts]
  );

  const { visibleIds, positions, pathIds, hiddenCount } = useMemo(() => {
    const directIds = Array.from(
      new Set(
        relationships
          .filter((relationship) => relationship.source_contact === null)
          .map((relationship) => relationship.target_contact)
          .filter((id) => contactsById.has(id))
      )
    );

    if (!focusId) {
      const limited = directIds.slice(0, 30);
      const points = new Map<number, Point>([[SELF_ID, SELF_POINT]]);
      if (limited.length <= 12) {
        radialPoints(limited.length, SELF_POINT, 225).forEach((point, index) =>
          points.set(limited[index], point)
        );
      } else {
        const inner = limited.slice(0, 10);
        const outer = limited.slice(10);
        radialPoints(inner.length, SELF_POINT, 165).forEach((point, index) =>
          points.set(inner[index], point)
        );
        radialPoints(outer.length, SELF_POINT, 270, -Math.PI / 2 + 0.12).forEach((point, index) =>
          points.set(outer[index], point)
        );
      }
      return {
        visibleIds: new Set([SELF_ID, ...limited]),
        positions: points,
        pathIds: new Set([SELF_ID]),
        hiddenCount: Math.max(0, directIds.length - limited.length),
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
    const focusPoint = { x: 720, y: 320 };
    path.slice(1).forEach((id, index) => {
      const progress = (index + 1) / Math.max(path.length - 1, 1);
      points.set(id, {
        x: SELF_POINT.x + (focusPoint.x - SELF_POINT.x) * progress,
        y: SELF_POINT.y,
      });
    });
    radialPoints(neighbors.length, focusPoint, 175, -Math.PI / 2).forEach((point, index) =>
      points.set(neighbors[index], point)
    );
    return {
      visibleIds: new Set([...path, ...neighbors]),
      positions: points,
      pathIds: new Set(path),
      hiddenCount: 0,
    };
  }, [contactsById, focusId, relationships]);

  const visibleRelationships = relationships.filter((relationship) => {
    const [source, target] = relationshipEnds(relationship);
    return visibleIds.has(source) && visibleIds.has(target);
  });
  const groupedRelationships = Array.from(
    visibleRelationships.reduce((groups, relationship) => {
      const [source, target] = relationshipEnds(relationship);
      const key = source < target ? `${source}:${target}` : `${target}:${source}`;
      groups.set(key, [...(groups.get(key) || []), relationship]);
      return groups;
    }, new Map<string, ContactRelationship[]>())
  );

  const visibleContacts = Array.from(visibleIds)
    .filter((id) => id !== SELF_ID)
    .map((id) => contactsById.get(id))
    .filter((contact): contact is ApplicationContact => Boolean(contact));

  useEffect(() => {
    const container = containerRef.current;
    const svg = svgRef.current;
    if (!container || !svg || container.scrollWidth <= container.clientWidth) return;
    const targetX = focusId ? positions.get(focusId)?.x || SELF_POINT.x : SELF_POINT.x;
    const scaledX = (targetX / 1000) * svg.clientWidth;
    container.scrollTo({
      left: Math.max(0, scaledX - container.clientWidth / 2),
      behavior: 'smooth',
    });
  }, [focusId, positions]);

  return (
    <div
      ref={containerRef}
      className="relative min-h-[520px] overflow-x-auto overflow-y-hidden rounded-2xl border border-slate-200 bg-slate-50/60"
    >
      {focusId && (
        <div className="absolute left-4 top-4 z-[1]">
          <Button icon={<AimOutlined />} onClick={onBackToMe}>
            Back to me
          </Button>
        </div>
      )}
      <svg
        ref={svgRef}
        viewBox="0 0 1000 640"
        className="h-auto min-h-[520px] w-full min-w-[900px] touch-pan-x touch-pan-y lg:min-w-0"
        aria-label="Contact relationship network"
      >
        <defs>
          <filter id="node-shadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="5" stdDeviation="8" floodColor="#0f172a" floodOpacity="0.1" />
          </filter>
        </defs>

        {groupedRelationships.map(([key, group]) => {
          const [source, target] = relationshipEnds(group[0]);
          const start = positions.get(source);
          const end = positions.get(target);
          if (!start || !end) return null;
          const labels = Array.from(new Set(group.map((relationship) => relationship.label)));
          const midpoint = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
          const isPath = pathIds.has(source) && pathIds.has(target);
          return (
            <g key={key}>
              <line
                x1={start.x}
                y1={start.y}
                x2={end.x}
                y2={end.y}
                stroke={isPath ? '#2563eb' : '#cbd5e1'}
                strokeWidth={isPath ? 2.5 : 1.5}
              />
              <rect
                x={midpoint.x - Math.min(78, labels.join(' · ').length * 3.4 + 10)}
                y={midpoint.y - 11}
                width={Math.min(156, labels.join(' · ').length * 6.8 + 20)}
                height={22}
                rx={11}
                fill="#ffffff"
                stroke="#e2e8f0"
              />
              <text
                x={midpoint.x}
                y={midpoint.y + 4}
                textAnchor="middle"
                fontSize="11"
                fill="#64748b"
              >
                {labels.join(' · ').slice(0, 24)}
              </text>
            </g>
          );
        })}

        <g
          role="button"
          tabIndex={0}
          aria-label="Return to my network"
          onClick={onBackToMe}
          onKeyDown={(event) => event.key === 'Enter' && onBackToMe()}
          className="cursor-pointer outline-none"
        >
          <circle
            cx={SELF_POINT.x}
            cy={SELF_POINT.y}
            r="52"
            fill="#0f172a"
            filter="url(#node-shadow)"
          />
          <text
            x={SELF_POINT.x}
            y={SELF_POINT.y + 5}
            textAnchor="middle"
            fontSize="16"
            fontWeight="700"
            fill="#fff"
          >
            Me
          </text>
          <text
            x={SELF_POINT.x}
            y={SELF_POINT.y + 78}
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
              onClick={() => onSelect(contact)}
              onKeyDown={(event) => event.key === 'Enter' && onSelect(contact)}
              className="cursor-pointer outline-none"
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
                <text x={point.x} y={point.y + 81} textAnchor="middle" fontSize="11" fill="#64748b">
                  {(contact.job_title || contact.company || '').slice(0, 24)}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {visibleContacts.length === 0 && (
        <div className="pointer-events-none absolute inset-x-4 bottom-12 text-center">
          <p className="text-sm font-medium text-slate-600">No one is connected yet</p>
          <p className="mt-1 text-xs text-slate-400">
            Add a relationship to place someone in your network.
          </p>
        </div>
      )}
      {hiddenCount > 0 && (
        <p className="absolute bottom-4 right-4 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-500">
          {hiddenCount} more available in List view
        </p>
      )}
    </div>
  );
};

export default ContactNetwork;
