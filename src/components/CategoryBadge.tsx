import React from 'react';
import type { EventCategory } from '../types';
import {
  Briefcase,
  Calendar,
  User,
  Users,
  BookOpen,
  Target,
  Coffee,
  Phone,
  Video,
  MapPin,
} from 'lucide-react';

interface CategoryBadgeProps {
  category: EventCategory;
  size?: 'sm' | 'md' | 'lg';
}

const ICON_MAP: Record<string, React.ElementType> = {
  briefcase: Briefcase,
  calendar: Calendar,
  user: User,
  users: Users,
  book: BookOpen,
  target: Target,
  coffee: Coffee,
  phone: Phone,
  video: Video,
  'map-pin': MapPin,
};

const CategoryBadge: React.FC<CategoryBadgeProps> = ({ category, size = 'md' }) => {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  const IconComponent = category.icon ? ICON_MAP[category.icon] : null;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${sizeClasses[size]}`}
      style={{
        backgroundColor: `${category.color}15`,
        color: category.color,
        border: `1px solid ${category.color}30`,
      }}
    >
      {IconComponent && <IconComponent className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />}
      {!IconComponent && category.icon && !ICON_MAP[category.icon] && (
        <span>{category.icon}</span>
      )}{' '}
      {/* Fallback for older emoji data if any */}
      <span>{category.name}</span>
    </span>
  );
};

export default CategoryBadge;
