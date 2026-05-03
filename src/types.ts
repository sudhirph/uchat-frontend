export type User = {
  id: number;
  email: string;
  preferred_language: string;
};

export type ChatMessage = {
  id: number;
  sender_id: number;
  receiver_id: number;
  original_text: string;
  translated_text: string;
  created_at: string;
};
