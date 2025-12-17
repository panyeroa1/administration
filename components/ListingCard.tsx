import React, { useState } from 'react';
import { Listing } from '../types';
import { db } from '../services/db';
import { createOutboundCall } from '../services/vapiCallService';

interface ListingCardProps {
  listing: Listing;
  onClick?: (listing: Listing) => void;
}

const ListingCard: React.FC<ListingCardProps> = ({ listing, onClick }) => {
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const brokerAssistantId = '6282dc43-b1a8-47e4-8493-279b3e2a12eb';
  const propertyManagerAssistantId = '42c708e0-2e4d-4684-95d7-ebe9442d9cb9';
  const [leadStatus, setLeadStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [leadError, setLeadError] = useState<string | null>(null);
  const [leadForm, setLeadForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    status: 'New',
    interest: 'Buying',
    notes: ''
  });

  // Stable rating generation based on ID
  const idSeed = listing.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const rating = (4 + (idSeed % 10) / 10).toFixed(2);

  const handleLeadChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setLeadForm(prev => ({ ...prev, [name]: value }));
  };

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLeadStatus('saving');
    setLeadError(null);

    const userNotes = leadForm.notes.trim();
    const baseNotes = `Requested callback for ${listing.name} (${listing.address}).`;
    const combinedNotes = userNotes ? `${baseNotes}\n\n${userNotes}` : baseNotes;
    const assistantId = leadForm.interest === 'Management'
      ? propertyManagerAssistantId
      : brokerAssistantId;
    const newLead = {
      id: `listing-${listing.id}-${Date.now()}`,
      firstName: leadForm.firstName.trim(),
      lastName: leadForm.lastName.trim(),
      phone: leadForm.phone.trim(),
      email: leadForm.email.trim(),
      status: leadForm.status as 'New' | 'Contacted' | 'Qualified' | 'Lost',
      interest: leadForm.interest as 'Buying' | 'Renting' | 'Selling' | 'Management',
      lastActivity: `Listing inquiry: ${listing.name}`,
      notes: combinedNotes,
      recordings: []
    };

    try {
      await db.createLead(newLead);
      await createOutboundCall(newLead.phone, assistantId);
      setLeadStatus('saved');
      setLeadForm({ firstName: '', lastName: '', email: '', phone: '', status: 'New', interest: 'Buying', notes: '' });
    } catch (error: any) {
      setLeadStatus('error');
      setLeadError(error?.message || 'Failed to submit your request.');
    }
  };

  return (
    <div 
      onClick={() => onClick && onClick(listing)}
      className="group cursor-pointer flex flex-col gap-2 w-full"
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-slate-200">
         {/* Skeleton */}
        <div className={`absolute inset-0 bg-slate-200 animate-pulse z-0 ${isImageLoaded ? 'hidden' : 'block'}`} />
        
        <img 
          src={listing.imageUrls[0]} 
          alt={listing.name} 
          loading="lazy"
          onLoad={() => setIsImageLoaded(true)}
          className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 ${isImageLoaded ? 'opacity-100' : 'opacity-0'}`}
        />

        {/* Heart Icon */}
        <button aria-label="View Details" onClick={(e) => { e.stopPropagation(); onClick && onClick(listing); }} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 stroke-white stroke-2 fill-black/50">
            <path d="m11.645 20.91-.007-.003-.022-.012a15.247 15.247 0 0 1-.383-.218 25.18 25.18 0 0 1-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0 1 12 5.052 5.5 5.5 0 0 1 16.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 0 1-4.244 3.17 15.247 15.247 0 0 1-.383.219l-.022.012-.007.004-.003.001a.752.752 0 0 1-.704 0l-.003-.001Z" />
          </svg>
        </button>
        
        {/* Energy Class Badge */}
        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-2 py-1 rounded-md text-[10px] md:text-xs font-bold text-slate-900 shadow-sm z-10 flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={`w-3 h-3 ${listing.energyClass.startsWith('A') ? 'text-green-600' : 'text-orange-500'}`}>
              <path fillRule="evenodd" d="M14.615 1.595a.75.75 0 0 1 .359.852L12.982 9.75h7.268a.75.75 0 0 1 .548 1.262l-10.5 11.25a.75.75 0 0 1-1.272-.71l1.992-7.302H3.75a.75.75 0 0 1-.548-1.262l10.5-11.25a.75.75 0 0 1 .913-.143Z" clipRule="evenodd" />
            </svg>
            EPC {listing.energyClass}
        </div>
      </div>

      <div className="flex flex-col gap-0.5">
        <div className="flex justify-between items-start">
            <h3 className="font-semibold text-slate-900 truncate text-sm md:text-[15px]">{listing.address.split(',')[0]}</h3>
            <div className="flex items-center gap-1 text-xs md:text-sm font-light text-slate-800">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 text-slate-900">
                    <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
                </svg>
                {rating}
            </div>
        </div>
        
        <p className="text-sm md:text-[15px] text-slate-500 font-light truncate">Hosted by Eburon</p>
        
        {/* Detail Row (Bedrooms & Size) */}
        <p className="text-sm md:text-[15px] text-slate-600 font-normal truncate flex items-center gap-2">
            <span>{listing.bedrooms} beds</span>
            <span className="text-slate-300">•</span>
            <span>{listing.size} m²</span>
        </p>
        
        <div className="mt-1 flex items-baseline gap-1">
             <span className="font-semibold text-slate-900 text-sm md:text-[15px]">€{listing.price}</span>
             <span className="text-slate-500 font-light text-sm md:text-[15px]">month</span>
        </div>
      </div>

      <div
        className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="font-semibold text-slate-800 mb-2">Request a call</div>
        <form onSubmit={handleLeadSubmit} className="grid grid-cols-1 gap-2">
          <input
            name="firstName"
            placeholder="First Name"
            required
            value={leadForm.firstName}
            onChange={handleLeadChange}
            className="w-full px-2.5 py-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 focus:ring-2 focus:ring-slate-900/10"
            aria-label="First name"
          />
          <input
            name="lastName"
            placeholder="Last Name"
            required
            value={leadForm.lastName}
            onChange={handleLeadChange}
            className="w-full px-2.5 py-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 focus:ring-2 focus:ring-slate-900/10"
            aria-label="Last name"
          />
          <input
            name="email"
            type="email"
            placeholder="email@example.com"
            required
            value={leadForm.email}
            onChange={handleLeadChange}
            className="w-full px-2.5 py-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 focus:ring-2 focus:ring-slate-900/10"
            aria-label="Email"
          />
          <input
            name="phone"
            type="tel"
            placeholder="+32 ..."
            required
            value={leadForm.phone}
            onChange={handleLeadChange}
            className="w-full px-2.5 py-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 focus:ring-2 focus:ring-slate-900/10"
            aria-label="Phone number"
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              name="status"
              value={leadForm.status}
              onChange={handleLeadChange}
              className="w-full px-2.5 py-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 focus:ring-2 focus:ring-slate-900/10"
              aria-label="Status"
            >
              <option value="New">New</option>
              <option value="Contacted">Contacted</option>
              <option value="Qualified">Qualified</option>
              <option value="Lost">Lost</option>
            </select>
            <select
              name="interest"
              value={leadForm.interest}
              onChange={handleLeadChange}
              className="w-full px-2.5 py-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 focus:ring-2 focus:ring-slate-900/10"
              aria-label="Interest"
            >
              <option value="Buying">Buying</option>
              <option value="Renting">Renting</option>
              <option value="Selling">Selling</option>
              <option value="Management">Management</option>
            </select>
          </div>
          <textarea
            name="notes"
            rows={3}
            placeholder="Additional details..."
            value={leadForm.notes}
            onChange={handleLeadChange}
            className="w-full px-2.5 py-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 focus:ring-2 focus:ring-slate-900/10 resize-none"
            aria-label="Notes"
          />
          <button
            type="submit"
            disabled={leadStatus === 'saving'}
            className="w-full bg-slate-900 text-white font-semibold py-2 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-70"
          >
            {leadStatus === 'saving' ? 'Submitting...' : 'Request call'}
          </button>
          {leadStatus === 'saved' && (
            <div className="text-[11px] text-green-700 bg-green-50 border border-green-200 rounded-lg px-2 py-1">
              Lead saved. We will call you shortly.
            </div>
          )}
          {leadStatus === 'error' && (
            <div className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-2 py-1">
              {leadError || 'Something went wrong.'}
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default ListingCard;
