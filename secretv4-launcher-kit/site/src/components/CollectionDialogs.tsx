import { useState } from 'react';
import { Check, Plus } from 'lucide-react';
import { Modal } from '@/components/Modal';
import {
  MAX_COLLECTIONS,
  MAX_NAME,
  createCollection,
  toggleInCollection,
  useCollections,
} from '@/lib/collections';

const field = {
  background: 'var(--bg-tertiary)',
  border: '1px solid var(--border)',
  color: 'var(--text)',
} as const;

const primary = { background: 'var(--accent)', border: '1px solid var(--accent)', color: 'var(--bg)' } as const;
const plain = { background: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-dim)' } as const;

/** Pick which collections a game is in, or make a new one for it */
export function AddToCollectionModal({ gameId, gameTitle, onClose }: { gameId: number; gameTitle: string; onClose: () => void }) {
  const collections = useCollections();
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');

  const create = () => {
    if (!name.trim()) return;
    if (createCollection(name, gameId) === null) {
      setMessage(collections.length >= MAX_COLLECTIONS ? `You can have up to ${MAX_COLLECTIONS} collections.` : 'Give it a name first.');
      return;
    }
    setName('');
    setMessage('');
  };

  return (
    <Modal title="Add to collection" onClose={onClose} maxWidth="max-w-md">
      <p className="text-xs mb-3 truncate" style={{ color: 'var(--text-dim)' }}>
        {gameTitle}
      </p>
      {collections.length > 0 && (
        <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
          {collections.map((c) => {
            const has = c.games.includes(gameId);
            return (
              <button
                key={c.id}
                onClick={() => {
                  if (!toggleInCollection(c.id, gameId)) setMessage('That collection is full.');
                }}
                className="w-full flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm text-left"
                style={has ? { ...field, borderColor: 'var(--accent)' } : field}
              >
                <span className="truncate">{c.name}</span>
                <span className="flex items-center gap-2 flex-shrink-0 text-xs" style={{ color: 'var(--text-dim)' }}>
                  {c.games.length}
                  {has && <Check size={14} style={{ color: 'var(--accent)' }} />}
                </span>
              </button>
            );
          })}
        </div>
      )}
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, MAX_NAME))}
          onKeyDown={(e) => e.key === 'Enter' && create()}
          placeholder="New collection name"
          className="flex-1 min-w-0 rounded-lg px-3 py-2 text-sm outline-none"
          style={field}
        />
        <button onClick={create} className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium" style={primary}>
          <Plus size={14} /> Create
        </button>
      </div>
      {message && (
        <p className="text-xs mt-2" style={{ color: '#ff6b6b' }}>
          {message}
        </p>
      )}
      <div className="flex justify-end mt-4">
        <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm" style={plain}>
          Done
        </button>
      </div>
    </Modal>
  );
}

/** Used for both "New collection" and "Rename" */
export function NameModal({
  title,
  initial,
  confirmLabel,
  onSave,
  onClose,
}: {
  title: string;
  initial: string;
  confirmLabel: string;
  onSave: (name: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial);
  const save = () => {
    if (!name.trim()) return;
    onSave(name);
    onClose();
  };
  return (
    <Modal title={title} onClose={onClose} maxWidth="max-w-sm">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value.slice(0, MAX_NAME))}
        onKeyDown={(e) => e.key === 'Enter' && save()}
        placeholder="Collection name"
        className="w-full rounded-lg px-3 py-2 text-sm outline-none mb-4"
        style={field}
      />
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm" style={plain}>
          Cancel
        </button>
        <button onClick={save} className="rounded-lg px-4 py-2 text-sm font-medium" style={primary}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

export function ConfirmModal({
  title,
  message,
  confirmLabel,
  onConfirm,
  onClose,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal title={title} onClose={onClose} maxWidth="max-w-sm">
      <p className="text-sm mb-4" style={{ color: 'var(--text-dim)' }}>
        {message}
      </p>
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm" style={plain}>
          Cancel
        </button>
        <button
          onClick={() => {
            onConfirm();
            onClose();
          }}
          className="rounded-lg px-4 py-2 text-sm font-medium"
          style={{ background: '#ff3b3b', border: '1px solid #ff3b3b', color: '#fff' }}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
