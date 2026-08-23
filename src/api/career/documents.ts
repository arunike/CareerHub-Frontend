import api from '../client';

export const getDocuments = (params?: {
  page?: number;
  page_size?: number;
  search?: string;
  document_type?: string;
  application?: number;
  year?: number | 'all';
  [key: string]: unknown;
}) => api.get('/career/documents/', { params });

export const deleteAllDocuments = () => api.delete('/career/documents/delete_all/');

export const exportDocuments = (format: string = 'csv') =>
  api.get('/career/documents/export/', { params: { fmt: format }, responseType: 'blob' });

export const createDocument = (formData: FormData) =>
  api.post('/career/documents/', formData, { headers: { 'Content-Type': undefined } });

export const patchDocument = (id: number, data: Record<string, unknown>) =>
  api.patch(`/career/documents/${id}/`, data);

export const deleteDocument = (id: number) => api.delete(`/career/documents/${id}/`);

export const getDocumentVersions = (id: number) => api.get(`/career/documents/${id}/versions/`);

export const createDocumentVersion = (id: number, formData: FormData) =>
  api.post(`/career/documents/${id}/add_version/`, formData, {
    headers: { 'Content-Type': undefined },
  });

export const downloadDocument = (id: number) =>
  api.get(`/career/documents/${id}/download/`, { responseType: 'blob' });
