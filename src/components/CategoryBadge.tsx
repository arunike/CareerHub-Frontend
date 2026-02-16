import React from 'react';
import type { EventCategory } from '../types';
import {
  SolutionOutlined,
  CalendarOutlined,
  UserOutlined,
  TeamOutlined,
  BookOutlined,
  AimOutlined,
  CoffeeOutlined,
  PhoneOutlined,
  VideoCameraOutlined,
  EnvironmentOutlined,
  BankOutlined,
  CarOutlined,
  RocketOutlined,
  HomeOutlined,
  ShopOutlined,
  HeartOutlined,
  ExperimentOutlined,
  ThunderboltOutlined,
  TrophyOutlined,
  StarOutlined,
  SmileOutlined,
  TagOutlined,
} from '@ant-design/icons';

interface CategoryBadgeProps {
  category: EventCategory;
  size?: 'sm' | 'md' | 'lg';
}

export const ICON_MAP: Record<string, React.ElementType> = {
  briefcase: SolutionOutlined,
  calendar: CalendarOutlined,
  user: UserOutlined,
  users: TeamOutlined,
  book: BookOutlined,
  target: AimOutlined,
  coffee: CoffeeOutlined,
  phone: PhoneOutlined,
  video: VideoCameraOutlined,
  'map-pin': EnvironmentOutlined,
  bank: BankOutlined,
  car: CarOutlined,
  rocket: RocketOutlined,
  home: HomeOutlined,
  shop: ShopOutlined,
  heart: HeartOutlined,
  experiment: ExperimentOutlined,
  thunderbolt: ThunderboltOutlined,
  trophy: TrophyOutlined,
  star: StarOutlined,
  smile: SmileOutlined,
  tag: TagOutlined,
};

export const CATEGORY_ICONS = Object.keys(ICON_MAP);

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
      <span>{category.name}</span>
    </span>
  );
};

export default CategoryBadge;
