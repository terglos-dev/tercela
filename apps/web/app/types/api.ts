export interface ConversationListItem {
  id: string;
  status: string;
  lastMessageAt: string | null;
  createdAt: string;
  assignedTo: string | null;
  contact: {
    id: string;
    name: string | null;
    phone: string | null;
    channelType: string;
  } | null;
  channel: {
    id: string;
    name: string;
    type: string;
  } | null;
}

export interface UserListItem {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}
