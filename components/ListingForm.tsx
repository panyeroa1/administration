import React, { useState } from 'react';
import { Listing } from '../types';
import { db } from '../services/db';
import { X, Upload, Save } from 'lucide-react';

interface ListingFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function ListingForm({ onClose, onSuccess }: ListingFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<Listing>>({
    name: '',
    address: '',
    price: 0,
    type: 'apartment',
    size: 0,
    bedrooms: 0,
    description: '',
    energyClass: 'A',
    petsAllowed: false,
    imageUrls: ['']
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
        const checked = (e.target as HTMLInputElement).checked;
        setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (type === 'number') {
        setFormData(prev => ({ ...prev, [name]: parseFloat(value) }));
    } else {
        setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleImageChange = (index: number, value: string) => {
    const newImages = [...(formData.imageUrls || [])];
    newImages[index] = value;
    setFormData(prev => ({ ...prev, imageUrls: newImages }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const newListing: Listing = {
        id: crypto.randomUUID(),
        ...formData as any,
        ownerId: 'manual', // or current user id
      };

      await db.createListing(newListing);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to create listing:', error);
      alert('Failed to save listing. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 sticky top-0 backdrop-blur-md z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Add New Property</h2>
            <p className="text-sm text-gray-500">Create a new listing in the portfolio</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Listing Title</label>
              <input 
                type="text" 
                name="name" 
                title="Listing Title"
                required 
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black/5"
                placeholder="e.g. Modern Loft in Center"
                value={formData.name}
                onChange={handleChange}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Address</label>
              <input 
                type="text" 
                name="address" 
                title="Address"
                required 
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black/5"
                placeholder="Street 123, City"
                value={formData.address}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Price (€)</label>
              <input 
                type="number" 
                name="price" 
                required 
                min="0"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black/5"
                value={formData.price}
                onChange={handleChange}
              />
            </div>

             <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Property Type</label>
              <select 
                name="type" 
                title="Property Type"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black/5"
                value={formData.type}
                onChange={handleChange}
              >
                <option value="apartment">Apartment</option>
                <option value="house">House</option>
                <option value="studio">Studio</option>
                <option value="loft">Loft</option>
                <option value="penthouse">Penthouse</option>
                <option value="commercial">Commercial</option>
                <option value="kot">Kot (Student)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Size (m²)</label>
              <input 
                type="number" 
                name="size" 
                title="Size"
                required 
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black/5"
                value={formData.size}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Bedrooms</label>
              <input 
                type="number" 
                name="bedrooms" 
                title="Bedrooms"
                required 
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black/5"
                value={formData.bedrooms}
                onChange={handleChange}
              />
            </div>
             <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Energy Class</label>
              <select 
                name="energyClass" 
                title="Energy Class"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black/5"
                value={formData.energyClass}
                onChange={handleChange}
              >
                <option value="A+">A+</option>
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="D">D</option>
                <option value="E">E</option>
                <option value="F">F</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Description</label>
            <textarea 
              name="description" 
              rows={4}
              required
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black/5 resize-none"
              placeholder="Describe the property features..."
              value={formData.description}
              onChange={handleChange}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Main Image URL</label>
            <div className="flex gap-2">
                <input 
                    type="url" 
                    className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black/5"
                    placeholder="https://..."
                    value={formData.imageUrls?.[0] || ''}
                    onChange={(e) => handleImageChange(0, e.target.value)}
                />
            </div>
            {formData.imageUrls?.[0] && (
                <img src={formData.imageUrls[0]} alt="Preview" className="h-32 w-full object-cover rounded-lg mt-2" />
            )}
          </div>

          <div className="flex items-center gap-2">
            <input 
                type="checkbox" 
                id="petsAllowed"
                name="petsAllowed"
                checked={formData.petsAllowed}
                onChange={handleChange}
                className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black"
            />
            <label htmlFor="petsAllowed" className="text-sm font-medium text-gray-700">Pets Allowed</label>
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
                {loading ? 'Saving...' : <><Save className="w-4 h-4" /> Save Property</>}
            </button>
        </div>

        </form>
      </div>
    </div>
  );
}
