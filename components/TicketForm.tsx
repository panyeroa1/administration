import React, { useState } from 'react';
import { Ticket } from '../types';
import { db } from '../services/db';
import { X, Save } from 'lucide-react';

interface TicketFormProps {
  onClose: () => void;
  onSuccess: () => void;
  currentUser: { id: string; name: string };
}

export default function TicketForm({ onClose, onSuccess, currentUser }: TicketFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<Ticket>>({
    title: '',
    description: '',
    priority: 'MEDIUM',
    propertyAddress: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const newTicket: Ticket = {
        id: crypto.randomUUID(),
        ...formData as any,
        status: 'OPEN',
        createdAt: new Date().toISOString(),
        createdBy: currentUser.id,
        propertyId: 'manual', // or selector
      };

      await db.createTicket(newTicket);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to create ticket:', error);
      alert('Failed to save ticket. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-xl">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Create Ticket</h2>
            <p className="text-sm text-gray-500">Submit a new maintenance request or issue</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors" title="Close">
            <X className="w-5 h-5 text-gray-500" />
            <span className="sr-only">Close</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Issue Title</label>
            <input 
              type="text" 
              name="title" 
              title="Issue Title"
              required 
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black/5"
              placeholder="e.g. Leaking faucet"
              value={formData.title}
              onChange={handleChange}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Description</label>
            <textarea 
              name="description" 
              title="Description"
              required
              rows={3}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black/5 resize-none"
              placeholder="Describe the issue in detail..."
              value={formData.description}
              onChange={handleChange}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Property Address (Optional)</label>
             <input 
              type="text" 
              name="propertyAddress" 
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black/5"
              placeholder="Enter address..."
              value={formData.propertyAddress}
              onChange={handleChange}
            />
          </div>

          <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Priority</label>
              <select 
                name="priority" 
                title="Priority"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black/5"
                value={formData.priority}
                onChange={handleChange}
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>

        <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
            <button 
                type="button" 
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
            >
                Cancel
            </button>
            <button 
                type="submit" 
                disabled={loading}
                className="px-6 py-2 text-sm font-medium text-white bg-black hover:bg-gray-800 rounded-lg transition-colors flex items-center gap-2"
            >
                {loading ? 'Saving...' : <><Save className="w-4 h-4" /> Submit Ticket</>}
            </button>
        </div>

        </form>
      </div>
    </div>
  );
}
