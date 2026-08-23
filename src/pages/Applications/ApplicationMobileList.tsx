import type { ReactNode } from 'react';
import type React from 'react';
import type { ApplicationStage } from './applicationTypes';
import { Pagination } from 'antd';
import type { EmploymentType } from '../../types';
import type { CareerApplication } from '../../types/application';
import MobileApplicationCard from './MobileApplicationCard';
import { APPLICATION_PAGE_SIZE } from './applicationTypes';

type Props = {
  appStages: ApplicationStage[];
  applicationEmptyState: ReactNode;
  applicationsTotal: number;
  currentPage: number;
  empTypes: EmploymentType[];
  filteredData: CareerApplication[];
  loading: boolean;
  paginatedData: CareerApplication[];
  selectedRowKeys: React.Key[];
  setCoverLetterApp: React.Dispatch<React.SetStateAction<CareerApplication | null>>;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  toggleSelectedApplication: (id: number, checked: boolean) => void;
  openDetailDrawer: (app: CareerApplication) => void;
  openEditDrawer: (app: CareerApplication) => void;
  handleDuplicateApplication: (app: CareerApplication) => void;
  toggleLock: (app: CareerApplication) => void;
  requestDeleteApplication: (app: CareerApplication) => void;
};

const ApplicationMobileList = ({
  appStages,
  applicationEmptyState,
  applicationsTotal,
  currentPage,
  empTypes,
  filteredData,
  loading,
  paginatedData,
  selectedRowKeys,
  setCoverLetterApp,
  setCurrentPage,
  toggleSelectedApplication,
  openDetailDrawer,
  openEditDrawer,
  handleDuplicateApplication,
  toggleLock,
  requestDeleteApplication,
}: Props) => (
  <div className="space-y-3">
    {loading ? (
      Array.from({ length: 3 }).map((_, idx) => (
        <div key={idx} className="enterprise-card space-y-3 px-4 py-5">
          <div className="shimmer-bg h-4 w-5/12 rounded-full" />
          <div className="shimmer-bg h-3 w-9/12 rounded-full" />
          <div className="grid grid-cols-2 gap-2 pt-2">
            <div className="shimmer-bg h-10 rounded-xl" />
            <div className="shimmer-bg h-10 rounded-xl" />
          </div>
        </div>
      ))
    ) : filteredData.length === 0 ? (
      applicationEmptyState
    ) : (
      <>
        {paginatedData.map((record) => {
          const isSelected = selectedRowKeys.includes(record.id);
          return (
            <MobileApplicationCard
              key={record.id}
              application={record}
              applicationStages={appStages}
              employmentTypes={empTypes}
              selected={isSelected}
              onSelectionChange={(selected) => toggleSelectedApplication(record.id, selected)}
              onViewDetails={() => openDetailDrawer(record)}
              onGenerateLetter={() => setCoverLetterApp(record)}
              onEdit={() => openEditDrawer(record)}
              onDuplicate={record.is_locked ? undefined : () => handleDuplicateApplication(record)}
              onToggleLock={() => toggleLock(record)}
              onDelete={() => requestDeleteApplication(record)}
            />
          );
        })}
        {applicationsTotal > APPLICATION_PAGE_SIZE && (
          <div className="flex justify-end mt-4 pb-2 px-1">
            <Pagination
              current={currentPage}
              pageSize={APPLICATION_PAGE_SIZE}
              total={applicationsTotal}
              onChange={(page) => setCurrentPage(page)}
              showSizeChanger={false}
              size="small"
            />
          </div>
        )}
      </>
    )}
  </div>
);

export default ApplicationMobileList;
