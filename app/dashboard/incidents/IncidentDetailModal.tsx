'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/components/AuthProvider';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { Incident, IncidentComment } from '@/lib/types';

export default function IncidentDetailModal({
  incident,
  onClose,
  onUpdate,
  onDelete,
}: {
  incident: Incident;
  onClose: () => void;
  onUpdate: () => void;
  onDelete: (id: string) => void;
}) {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(incident.title);
  const [description, setDescription] = useState(incident.description);
  const [severity, setSeverity] = useState(incident.severity);
  const [comments, setComments] = useState<IncidentComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);

  const canEdit = user?.role !== 'viewer';
  const canDelete = user?.role === 'admin';

  useEscapeKey(onClose);

  const fetchComments = async () => {
    const res = await fetch(`/api/incidents/${incident.id}/comments`);
    if (res.ok) {
      const data = await res.json();
      setComments(data.comments || []);
    }
  };

  useEffect(() => {
    fetchComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incident.id]);

  const handleUpdate = async () => {
    setLoading(true);
    await fetch(`/api/incidents/${incident.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description, severity }),
    });
    setIsEditing(false);
    setLoading(false);
    onUpdate();
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this incident?')) {
      setLoading(true);
      await fetch(`/api/incidents/${incident.id}`, { method: 'DELETE' });
      setLoading(false);
      onDelete(incident.id);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    
    await fetch(`/api/incidents/${incident.id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: newComment }),
    });
    setNewComment('');
    fetchComments();
  };

  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-xl font-bold">Incident Details</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary text-xl">&times;</button>
        </div>

        {isEditing ? (
          <div className="space-y-4 mb-6">
            <div>
              <label className="label-mono block mb-1">Title</label>
              <input value={title} onChange={e => setTitle(e.target.value)} className="input-field pl-4!" />
            </div>
            <div>
              <label className="label-mono block mb-1">Description</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} className="w-full p-3 bg-bg-input border border-border rounded-lg text-text-primary text-sm outline-none focus:border-accent-cyan resize-none" />
            </div>
            <div>
              <label className="label-mono block mb-1">Severity</label>
              <select value={severity} onChange={e => setSeverity(e.target.value as Incident['severity'])} className="input-field pl-4!">
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={handleUpdate} disabled={loading} className="btn-primary text-xs">Save Changes</button>
              <button onClick={() => setIsEditing(false)} className="btn-outline text-xs">Cancel</button>
            </div>
          </div>
        ) : (
          <div className="mb-6 space-y-4">
            <div>
              <h3 className="text-lg font-bold">{incident.title}</h3>
              <div className="flex gap-2 mt-2">
                <span className={`badge badge-${incident.severity}`}>{incident.severity.toUpperCase()}</span>
                <span className="badge badge-info">{incident.status.toUpperCase()}</span>
                <span className="text-xs text-text-muted font-mono mt-1">ID: #{incident.numericId}</span>
              </div>
            </div>
            <div className="bg-bg-input p-3 rounded-lg border border-border">
              <p className="text-sm whitespace-pre-wrap text-text-secondary">{incident.description || 'No description provided.'}</p>
            </div>
            
            <div className="flex gap-2">
              {canEdit && <button onClick={() => setIsEditing(true)} className="btn-outline text-xs">Edit</button>}
              {canDelete && <button onClick={handleDelete} disabled={loading} className="btn-outline text-xs text-accent-red hover:bg-accent-red/10 hover:border-accent-red">Delete</button>}
            </div>
          </div>
        )}

        <hr className="border-border my-6" />
        
        <div>
          <h3 className="text-md font-bold mb-4">Timeline & Comments</h3>
          <div className="space-y-4 mb-4">
            {comments.map((comment: IncidentComment) => (
              <div key={comment.id} className="bg-bg-input p-3 rounded-lg border border-border">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-accent-cyan">{comment.user.name}</span>
                  <span className="text-xs text-text-muted">{new Date(comment.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-sm text-text-secondary whitespace-pre-wrap">{comment.content}</p>
              </div>
            ))}
            {comments.length === 0 && <p className="text-sm text-text-muted italic">No comments yet.</p>}
          </div>

          <form onSubmit={handleAddComment} className="flex gap-2">
            <input 
              value={newComment} 
              onChange={e => setNewComment(e.target.value)} 
              placeholder="Add a comment..." 
              className="input-field flex-1 pl-4!" 
            />
            <button type="submit" disabled={!newComment.trim()} className="btn-primary text-xs whitespace-nowrap">Post</button>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
}
