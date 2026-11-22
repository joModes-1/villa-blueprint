import { normalizeText } from './text';

interface ChatGptNode {
  message?: {
    author?: { role?: string };
    create_time?: number | null;
    content?: { parts?: unknown[] };
  } | null;
}

interface ChatGptConversation {
  title?: string;
  mapping: Record<string, ChatGptNode>;
}

interface ClaudeConversation {
  name?: string;
  chat_messages: { sender?: string; text?: string }[];
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function chatGptConversation(c: ChatGptConversation): string {
  const msgs: { t: number; role: string; text: string; i: number }[] = [];
  Object.values(c.mapping).forEach((node, i) => {
    const m = node.message;
    if (!m) return;
    const role = m.author?.role;
    if (role !== 'user' && role !== 'assistant') return;
    const text = (m.content?.parts ?? [])
      .filter((p): p is string => typeof p === 'string')
      .join('\n')
      .trim();
    if (!text) return;
    msgs.push({ t: m.create_time ?? 0, role: role === 'user' ? 'User' : 'Assistant', text, i });
  });
  msgs.sort((a, b) => a.t - b.t || a.i - b.i);
  return [`## Conversation: ${c.title || 'Untitled'}`, ...msgs.map((m) => `${m.role}: ${m.text}`)].join('\n\n');
}

function claudeConversation(c: ClaudeConversation): string {
  const lines = c.chat_messages
    .filter((m) => typeof m.text === 'string' && m.text.trim() !== '')
    .map((m) => `${m.sender === 'human' ? 'User' : 'Assistant'}: ${(m.text as string).trim()}`);
  return [`## Conversation: ${c.name || 'Untitled'}`, ...lines].join('\n\n');
}

/** ChatGPT (`mapping`) and Claude (`chat_messages`) exports; anything else is treated as plain text. */
export function parseChatExport(buf: Buffer | string): { text: string; conversations: number } {
  const raw = typeof buf === 'string' ? buf : buf.toString('utf8');
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { text: normalizeText(raw), conversations: 0 };
  }
  const list = Array.isArray(data) ? data : [data];
  const parts: string[] = [];
  for (const item of list) {
    if (!isObject(item)) continue;
    if (isObject(item.mapping)) parts.push(chatGptConversation(item as unknown as ChatGptConversation));
    else if (Array.isArray(item.chat_messages)) parts.push(claudeConversation(item as unknown as ClaudeConversation));
  }
  if (parts.length === 0) return { text: normalizeText(raw), conversations: 0 };
  return { text: parts.join('\n\n'), conversations: parts.length };
}
