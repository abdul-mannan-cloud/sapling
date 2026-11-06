import { useState } from 'react';
import type { ConversationSummary } from '../types';

export function ChatSidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onRename,
  onDelete,
}: {
  conversations: ConversationSummary[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
}) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');

  const startRename = (c: ConversationSummary) => {
    setRenamingId(c.id);
    setRenameDraft(c.title ?? '');
  };

  const commitRename = () => {
    if (renamingId && renameDraft.trim()) onRename(renamingId, renameDraft.trim());
    setRenamingId(null);
  };

  return (
    <div className="panel chat-sidebar-panel">
      <button className="new-chat-btn" onClick={onNew}>
        + New chat
      </button>
      {conversations.length === 0 && <div className="empty-state">No chats yet.</div>}
      {conversations.map((c) => (
        <div key={c.id} className={`chat-list-item${c.id === activeId ? ' active' : ''}`} onClick={() => onSelect(c.id)}>
          {renamingId === c.id ? (
            <input
              className="rename-input"
              autoFocus
              value={renameDraft}
              onChange={(e) => setRenameDraft(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename();
                if (e.key === 'Escape') setRenamingId(null);
              }}
              onBlur={commitRename}
            />
          ) : (
            <>
              <div className="chat-list-title">{c.title ?? 'New conversation'}</div>
              <div className="preview">{c.lastMessage ? c.lastMessage.body : 'No messages yet'}</div>
              <div className="chat-list-actions">
                <button
                  className="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    startRename(c);
                  }}
                >
                  Rename
                </button>
                <button
                  className="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Delete this chat? Any pending staff requests it created will stay in the staff queue.')) {
                      onDelete(c.id);
                    }
                  }}
                >
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
