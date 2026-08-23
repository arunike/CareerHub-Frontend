import type { CareerApplication } from '../../types/application';
import type React from 'react';
import { Table, type TableProps } from 'antd';
import { APPLICATION_PAGE_SIZE } from './applicationTypes';

type Props = {
  applicationsTotal: number;
  columns: TableProps<CareerApplication>['columns'];
  onChange: TableProps<CareerApplication>['onChange'];
  currentPage: number;
  filteredData: CareerApplication[];
  loading: boolean;
  selectedRowKeys: React.Key[];
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  setSelectedRowKeys: React.Dispatch<React.SetStateAction<React.Key[]>>;
};

const ApplicationTable = ({
  applicationsTotal,
  columns,
  onChange,
  currentPage,
  filteredData,
  loading,
  selectedRowKeys,
  setCurrentPage,
  setSelectedRowKeys,
}: Props) => (
  <div className="enterprise-table-shell">
    <Table
      rowSelection={{
        selectedRowKeys,
        onChange: setSelectedRowKeys,
      }}
      loading={loading}
      columns={columns}
      dataSource={filteredData}
      rowKey="id"
      onChange={onChange}
      pagination={{
        current: currentPage,
        pageSize: APPLICATION_PAGE_SIZE,
        total: applicationsTotal,
        onChange: (page) => setCurrentPage(page),
        showSizeChanger: false,
      }}
      scroll={{ x: 900 }}
    />
  </div>
);

export default ApplicationTable;
