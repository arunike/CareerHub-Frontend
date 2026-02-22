import api from './client';

export const detectConflicts = () => api.post('/events/detect_conflicts/');
export const getUnresolvedConflicts = () => api.get('/conflicts/unresolved/');
export const resolveConflict = (id: number) => api.post(`/conflicts/${id}/resolve/`);
