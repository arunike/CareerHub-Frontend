import type React from 'react';
import { contactInitials } from '../../components/contacts/contactOptions';
import { SELF_ID } from './ContactNetwork';

type Props = {
  focusId: any;
  labelPositions: any;
  onBackToMe: any;
  onSelect: any;
  selfPoint: any;
  canvas: any;
  clickAfterDrag: (action: () => void) => () => void;
  draggingKey: any;
  edges: any;
  endDrag: () => void;
  handleDrag: (event: React.PointerEvent<SVGSVGElement>) => void;
  positions: any;
  startNodeDrag: (id: number) => (event: React.PointerEvent<SVGGElement>) => void;
  svgRef: any;
  svgStyle: any;
  visibleContacts: any;
};

const ContactNetworkGraph = ({
  canvas,
  clickAfterDrag,
  draggingKey,
  edges,
  endDrag,
  handleDrag,
  positions,
  startNodeDrag,
  svgRef,
  svgStyle,
  visibleContacts,
  labelPositions,
  onBackToMe,
  onSelect,
  selfPoint,
  focusId,
}: Props) => (
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
        <feDropShadow dx="0" dy="5" stdDeviation="8" floodColor="#0f172a" floodOpacity="0.1" />
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

    {edges.map((edge: any) => {
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
      <circle cx={selfPoint.x} cy={selfPoint.y} r="52" fill="#0f172a" filter="url(#node-shadow)" />
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

    {visibleContacts.map((contact: any) => {
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
            <text x={point.x} y={point.y + 81} textAnchor="middle" fontSize="11" fill="#64748b">
              {(contact.job_title || contact.company || '').slice(0, 24)}
            </text>
          )}
        </g>
      );
    })}

    {edges.map((edge: any) => {
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
);

export default ContactNetworkGraph;
