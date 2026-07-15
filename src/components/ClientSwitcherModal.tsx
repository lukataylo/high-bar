import { useState } from "react";
import type { ClientProfile } from "../lib/clientProfiles";

interface Props {
  profiles: ClientProfile[];
  activeId: string;
  onSwitch: (id: string) => void;
  onCreate: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export function ClientSwitcherModal({ profiles, activeId, onSwitch, onCreate, onRename, onDelete, onClose }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");

  function startEdit(p: ClientProfile) {
    setEditingId(p.id);
    setEditValue(p.name);
    setConfirmDeleteId(null);
  }

  function commitEdit() {
    if (editingId) onRename(editingId, editValue);
    setEditingId(null);
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="modal-eyebrow">Clients</div>
            <div className="modal-title">
              {profiles.length} saved {profiles.length === 1 ? "profile" : "profiles"}
            </div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="client-list">
          {profiles.map((p) => (
            <div className={`client-row${p.id === activeId ? " active" : ""}`} key={p.id}>
              {editingId === p.id ? (
                <input
                  className="client-name-input"
                  value={editValue}
                  autoFocus
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitEdit();
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  onBlur={commitEdit}
                />
              ) : (
                <button className="client-name" onClick={() => onSwitch(p.id)}>
                  {p.id === activeId && <span className="client-dot" />}
                  {p.name}
                  <small>{p.state.swipes.length} saves</small>
                </button>
              )}

              <button className="client-icon-btn" onClick={() => startEdit(p)} aria-label={`Rename ${p.name}`}>
                ✎
              </button>

              {confirmDeleteId === p.id ? (
                <button
                  className="client-icon-btn danger"
                  onClick={() => {
                    onDelete(p.id);
                    setConfirmDeleteId(null);
                  }}
                >
                  confirm
                </button>
              ) : (
                profiles.length > 1 && (
                  <button
                    className="client-icon-btn"
                    onClick={() => setConfirmDeleteId(p.id)}
                    aria-label={`Delete ${p.name}`}
                  >
                    🗑
                  </button>
                )
              )}
            </div>
          ))}
        </div>

        <div className="client-add">
          <input
            className="client-name-input"
            placeholder="New client name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter" || !newName.trim()) return;
              onCreate(newName);
              setNewName("");
            }}
          />
          <button
            className="modal-btn primary"
            disabled={!newName.trim()}
            onClick={() => {
              if (!newName.trim()) return;
              onCreate(newName);
              setNewName("");
            }}
          >
            + Add
          </button>
        </div>

        <p className="modal-foot">
          Each client keeps its own taste model and swipe history, saved on this device.
        </p>
      </div>
    </div>
  );
}
