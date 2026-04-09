import { apiGet, apiPost } from "@/lib/api";
import type { Notification, PaginatedResult } from "@/types";

export const notificationsService = {
  list(page = 1, limit = 20) {
    return apiGet<PaginatedResult<Notification>>(
      `/notifications?page=${page}&limit=${limit}`
    );
  },
  unreadCount() {
    return apiGet<{ count: number }>("/notifications/unread-count");
  },
  markRead(id: string) {
    return apiPost<{ message: string }>(`/notifications/${id}/read`);
  },
  markAllRead() {
    return apiPost<{ message: string }>("/notifications/read-all");
  },
};
