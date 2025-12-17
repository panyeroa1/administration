import React, { useRef, useState } from 'react';
import { Listing } from '../types';
import { db } from '../services/db';
import { X, Upload, Save } from 'lucide-react';

interface ListingFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function ListingForm({ onClose, onSuccess }: ListingFormProps) {
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
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
    imageUrls: []
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

  const handleFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const imageFiles = fileArray.filter((file) => file.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      setImageError('Please upload image files only.');
      return;
    }

    setImageError(null);

    try {
      const dataUrls = await Promise.all(
        imageFiles.map(
          (file) =>
            new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = () => reject(new Error('Failed to read image.'));
              reader.readAsDataURL(file);
            })
        )
      );

      setFormData((prev) => ({
        ...prev,
        imageUrls: [...(prev.imageUrls || []), ...dataUrls]
      }));
    } catch (error) {
      console.error('Failed to read image files:', error);
      setImageError('Failed to read one or more images.');
    }
  };

  const handleRemoveImage = (index: number) => {
    setFormData((prev) => {
      const nextImages = [...(prev.imageUrls || [])];
      nextImages.splice(index, 1);
      return { ...prev, imageUrls: nextImages };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.imageUrls || formData.imageUrls.length === 0) {
      setImageError('Please add at least one image.');
      return;
    }

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
            <label className="text-sm font-medium text-gray-700">Listing Images</label>
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                isDragging ? 'border-black bg-gray-50' : 'border-gray-200'
              }`}
              onDragEnter={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDragging(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files) {
                  handleFiles(e.dataTransfer.files);
                }
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) {
                    handleFiles(e.target.files);
                    e.target.value = '';
                  }
                }}
              />
              <div className="flex flex-col items-center gap-2 text-gray-600">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                  <Upload className="w-5 h-5" />
                </div>
                <div className="text-sm font-medium">Drag and drop images here</div>
                <div className="text-xs text-gray-500">or</div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 text-xs font-medium text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50"
                >
                  Browse files
                </button>
              </div>
            </div>
            {imageError && <p className="text-xs text-red-600">{imageError}</p>}
            {formData.imageUrls && formData.imageUrls.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {formData.imageUrls.map((url, index) => (
                  <div key={`${url}-${index}`} className="relative group h-24 rounded-lg overflow-hidden border border-gray-200">
                    <img src={url} alt={`Listing ${index + 1}`} className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(index)}
                      className="absolute top-2 right-2 bg-black/70 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="Remove image"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
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
