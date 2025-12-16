import React, { useState } from 'react';
import { Lead } from '../types';
import { db } from '../services/db';
import { X, Save } from 'lucide-react';

interface LeadFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function LeadForm({ onClose, onSuccess }: LeadFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<Lead>>({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    status: 'New',
    interest: 'Buying',
    notes: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const newLead: Lead = {
        id: crypto.randomUUID(),
        ...formData as any,
        lastActivity: 'Added Manually',
        recordings: []
      };

      await db.createLead(newLead);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to create lead:', error);
      alert('Failed to save lead. Please try again.');
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
            <h2 className="text-xl font-bold text-gray-900">Add New Lead</h2>
            <p className="text-sm text-gray-500">Enter lead details manually</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors" title="Close">
            <X className="w-5 h-5 text-gray-500" />
            <span className="sr-only">Close</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">First Name</label>
              <input 
                type="text" 
                name="firstName" 
                title="First Name"
                required 
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black/5"
                value={formData.firstName}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Last Name</label>
              <input 
                type="text" 
                name="lastName" 
                title="Last Name"
                required 
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black/5"
                value={formData.lastName}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Phone</label>
            <input 
              type="tel" 
              name="phone" 
              title="Phone"
              required 
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black/5"
              placeholder="+32 ..."
              value={formData.phone}
              onChange={handleChange}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Email</label>
            <input 
              type="email" 
              name="email" 
              required 
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black/5"
              placeholder="email@example.com"
              value={formData.email}
              onChange={handleChange}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Status</label>
              <select 
                name="status" 
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black/5"
                value={formData.status}
                onChange={handleChange}
              >
                <option value="New">New</option>
                <option value="Contacted">Contacted</option>
                <option value="Qualified">Qualified</option>
                <option value="Lost">Lost</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Interest</label>
              <select 
                name="interest" 
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black/5"
                value={formData.interest}
                onChange={handleChange}
              >
                <option value="Buying">Buying</option>
                <option value="Renting">Renting</option>
                <option value="Selling">Selling</option>
                <option value="Management">Management</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Notes</label>
            <textarea 
              name="notes" 
              rows={3}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black/5 resize-none"
              placeholder="Additional details..."
              value={formData.notes}
              onChange={handleChange}
            />
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
                {loading ? 'Saving...' : <><Save className="w-4 h-4" /> Save Lead</>}
            </button>
        </div>

        </form>
      </div>
    </div>
  );
}
