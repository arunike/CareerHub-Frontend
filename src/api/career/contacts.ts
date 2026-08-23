import type { ApplicationContact, ContactRelationship, ContactRelationshipKind } from '../../types';
import api from '../client';

export interface ContactQuery {
  application?: number;
  experience?: number;
  search?: string;
  context?: 'APPLICATION' | 'EXPERIENCE';
  relationship?: ContactRelationshipKind;
  direct?: boolean;
}

export const getContacts = (params: ContactQuery = {}) =>
  api.get<ApplicationContact[]>('/career/contacts/', { params });

export const createContact = (data: Record<string, unknown>) =>
  api.post<ApplicationContact>('/career/contacts/', data);

export const updateContact = (id: number, data: Record<string, unknown>) =>
  api.patch<ApplicationContact>(`/career/contacts/${id}/`, data);

export const deleteContact = (id: number, scope?: { application?: number; experience?: number }) =>
  api.delete(`/career/contacts/${id}/`, { params: scope });

export const mergeContacts = (id: number, duplicateId: number) =>
  api.post<ApplicationContact>(`/career/contacts/${id}/merge/`, { duplicate_id: duplicateId });

export const getContactRelationships = (contact?: number) =>
  api.get<ContactRelationship[]>('/career/contact-relationships/', {
    params: contact ? { contact } : undefined,
  });

export const createContactRelationship = (data: Record<string, unknown>) =>
  api.post<ContactRelationship>('/career/contact-relationships/', data);

export const updateContactRelationship = (id: number, data: Record<string, unknown>) =>
  api.patch<ContactRelationship>(`/career/contact-relationships/${id}/`, data);

export const deleteContactRelationship = (id: number) =>
  api.delete(`/career/contact-relationships/${id}/`);
