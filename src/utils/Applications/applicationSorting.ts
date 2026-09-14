import type { TableProps } from 'antd';
import type { CareerApplication } from '../../types/application';
import type { ApplicationOrdering } from './applicationTypes';

type Sorter = Parameters<NonNullable<TableProps<CareerApplication>['onChange']>>[2];

// Only the status column is server-sortable; everything else keeps the saved order.
export const orderingFromSorter = (sorter: Sorter): ApplicationOrdering => {
  const activeSorter = Array.isArray(sorter)
    ? sorter.find((item) => item.columnKey === 'status')
    : sorter;
  if (activeSorter?.columnKey !== 'status') return undefined;
  if (activeSorter.order === 'ascend') return 'status';
  if (activeSorter.order === 'descend') return '-status';
  return undefined;
};
