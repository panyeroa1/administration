
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Phone } from 'lucide-react';
import ListingCard from './ListingCard';
import ListingDetails from './ListingDetails';
import LeadCaptureModal from './LeadCaptureModal';
import { db } from '../services/db';
import { geminiClient } from '../services/geminiService';
import { ApartmentSearchFilters, Listing, User } from '../types';
import { Type } from '@google/genai';
import { buildListingSlug, listingMatchesSlug } from '../utils/listingSlug';

// --- Tool Definitions ---
const listPropertiesTool = {
  name: 'listProperties',
  description: 'List available properties with optional filters.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      city: { type: Type.STRING, description: 'City name (e.g. Ghent, Antwerp, Brussels, Leuven)' },
      minPrice: { type: Type.NUMBER, description: 'Minimum price in Euros' },
      maxPrice: { type: Type.NUMBER, description: 'Maximum price in Euros' },
      minSize: { type: Type.NUMBER, description: 'Minimum size in square meters' },
      maxSize: { type: Type.NUMBER, description: 'Maximum size in square meters' },
      bedrooms: { type: Type.NUMBER, description: 'Number of bedrooms' },
      petsAllowed: { type: Type.BOOLEAN, description: 'Whether pets are required' },
      type: { type: Type.STRING, enum: ['apartment', 'house', 'studio', 'villa', 'loft', 'kot', 'penthouse', 'duplex'], description: 'Type of property' },
      sortBy: { type: Type.STRING, enum: ['price_asc', 'price_desc', 'size', 'default', 'energy_asc', 'energy_desc'] },
      limit: { type: Type.NUMBER, description: 'Maximum number of listings to return' }
    },
  },
};

const findOffListPropertiesTool = {
  name: 'findOffListProperties',
  description: 'Search for off-list properties based on client criteria.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      city: { type: Type.STRING },
      minPrice: { type: Type.NUMBER },
      maxPrice: { type: Type.NUMBER },
      minSize: { type: Type.NUMBER },
      bedrooms: { type: Type.NUMBER },
      type: { type: Type.STRING },
      notes: { type: Type.STRING }
    },
  },
};

const scheduleViewingTool = {
  name: 'scheduleViewing',
  description: 'Schedule a viewing with the client.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      listingId: { type: Type.STRING },
      address: { type: Type.STRING },
      date: { type: Type.STRING, description: 'Preferred date (YYYY-MM-DD)' },
      time: { type: Type.STRING, description: 'Preferred time' },
      name: { type: Type.STRING },
      phone: { type: Type.STRING },
      email: { type: Type.STRING },
      notes: { type: Type.STRING }
    },
  },
};

const saveLeadTool = {
  name: 'saveLeadInfo',
  description: 'Save user contact info or interest when they explicitly provide name, number, or express strong interest.',
  parameters: {
      type: Type.OBJECT,
      properties: {
          firstName: { type: Type.STRING, description: "User's first name" },
          lastName: { type: Type.STRING, description: "User's last name" },
          phone: { type: Type.STRING, description: "User's phone number" },
          interest: { type: Type.STRING, enum: ['Buying', 'Renting', 'Selling', 'Management'], description: "User's primary interest" },
          notes: { type: Type.STRING, description: "Any specific notes about their request" }
      }
  }
};

const PROPERTY_TYPES = [
    { id: 'apartment', label: 'Apartment', icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z" /></svg> },
    { id: 'house', label: 'House', icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg> },
    { id: 'studio', label: 'Studio', icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" /></svg> },
    { id: 'villa', label: 'Villa', icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 9l4.5-1.636M18.75 3l-1.5.545m0 6.205 3 1m1.5.5-1.5-.5M6.75 7.364V3h-3v18m3-13.636 10.5-3.819" /></svg> },
    { id: 'loft', label: 'Loft', icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" /></svg> },
    { id: 'kot', label: 'Kot', icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" /></svg> },
    { id: 'penthouse', label: 'Penthouse', icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z" /></svg> },
    { id: 'duplex', label: 'Duplex', icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 9l4.5-1.636M18.75 3l-1.5.545m0 6.205 3 1m1.5.5-1.5-.5M6.75 7.364V3h-3v18m3-13.636 10.5-3.819" /></svg> },
];

interface LandingPageProps {
    onLoginClick: () => void;
    currentUser: User | null;
}

const LandingPage: React.FC<LandingPageProps> = ({ onLoginClick, currentUser }) => {
  const [listings, setListings] = useState<Listing[]>([]);
  const [isLoadingListings, setIsLoadingListings] = useState(false);
  const [filters, setFilters] = useState<ApartmentSearchFilters>({ sortBy: 'default' });
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [leadModalListing, setLeadModalListing] = useState<Listing | null>(null);
  const [headerSearch, setHeaderSearch] = useState('');
  
  // Voice Agent State
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [isRinging, setIsRinging] = useState(false);
  const [volume, setVolume] = useState(0);
  const [orbPosition, setOrbPosition] = useState({ x: window.innerWidth - 100, y: window.innerHeight - 150 });
  const [assistantReply, setAssistantReply] = useState('Tap to call +1 (844) 484 9501');

  const isDragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const filtersRef = useRef(filters);
  const seededListingsRef = useRef(false);
  const callUsNumber = '+1 (844) 484 9450';
  const ringTimeoutRef = useRef<number | null>(null);
  const ringAudioRef = useRef<HTMLAudioElement | null>(null);

  // Sync filtersRef for tool calls
  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  // Initial Load
  useEffect(() => {
    (async () => {
      await ensureMinimumListings();
      loadListings(filters);
    })();
  }, []);

  // Hook up Gemini Client
  useEffect(() => {
    geminiClient.onVolumeChange = (inp) => {
        setVolume(prev => prev * 0.8 + inp * 0.2);
    };

    geminiClient.onClose = () => {
        if (ringTimeoutRef.current) {
            window.clearTimeout(ringTimeoutRef.current);
            ringTimeoutRef.current = null;
        }
        if (ringAudioRef.current) {
            ringAudioRef.current.pause();
            ringAudioRef.current.currentTime = 0;
            ringAudioRef.current = null;
        }
        setIsLiveActive(false);
        setIsRinging(false);
        setAssistantReply('Tap to call +1 (844) 484 9501');
        setVolume(0);
    };

    geminiClient.onToolCall = async (toolCalls) => {
        const responses = [];
        for (const fc of toolCalls) {
            if (fc.name === 'listProperties') {
                const args = fc.args as ApartmentSearchFilters & { limit?: number };
                const { limit, ...filterArgs } = args;
                const newFilters = { ...filtersRef.current, ...filterArgs };
                setFilters(newFilters);
                const results = await loadListings(newFilters);
                const maxResults = limit ? Math.max(1, Math.min(limit, 6)) : 6;
                const summary = results.slice(0, maxResults).map((listing) => ({
                    id: listing.id,
                    name: listing.name,
                    address: listing.address,
                    price: listing.price,
                    bedrooms: listing.bedrooms,
                    size: listing.size
                }));
                responses.push({
                    id: fc.id,
                    name: fc.name,
                    response: { result: summary }
                });
                setAssistantReply(`Found ${results.length} places.`);
            } else if (fc.name === 'findOffListProperties') {
                responses.push({
                    id: fc.id,
                    name: fc.name,
                    response: { result: 'No off-list matches found in the demo data. I can follow up with options shortly.' }
                });
                setAssistantReply('I will check off-list options for you.');
            } else if (fc.name === 'scheduleViewing') {
                const args = fc.args as { date?: string; time?: string; address?: string };
                const details = [args.address, args.date, args.time].filter(Boolean).join(' - ');
                responses.push({
                    id: fc.id,
                    name: fc.name,
                    response: { result: `Viewing request received${details ? ` (${details})` : ''}.` }
                });
                setAssistantReply('Viewing request received. I will confirm shortly.');
            } else if (fc.name === 'saveLeadInfo') {
                const args = fc.args as any; // Type as any first for flexibility, but could be specific Record<string, any>
                await db.saveLeadFromVoice(args);
                responses.push({
                    id: fc.id,
                    name: fc.name,
                    response: { result: `Lead saved successfully.` }
                });
                setAssistantReply("I've saved your info!");
            }
        }
        return responses;
    };

    return () => {
        if (ringTimeoutRef.current) {
            window.clearTimeout(ringTimeoutRef.current);
            ringTimeoutRef.current = null;
        }
        if (ringAudioRef.current) {
            ringAudioRef.current.pause();
            ringAudioRef.current.currentTime = 0;
            ringAudioRef.current = null;
        }
        geminiClient.disconnect();
    };
  }, []);

  const ensureMinimumListings = async () => {
    if (seededListingsRef.current) return;
    seededListingsRef.current = true;
    const existing = await db.searchListings({ sortBy: 'default' });
    if (existing.length >= 50) return;

    const cities = ['Ghent', 'Antwerp', 'Brussels', 'Leuven', 'Bruges', 'Mechelen', 'Hasselt', 'Namur'];
    const streets = ['Korenlei', 'Meir', 'Kouter', 'Parklaan', 'Louise Avenue', 'Zuidstraat', 'Sint-Pieters', 'Stationstraat'];
    const names = ['Canal View', 'Parkside', 'Skyline', 'Garden Loft', 'City Nest', 'Riverlight', 'Maison', 'Courtyard'];
    const types: Listing['type'][] = ['apartment', 'house', 'studio', 'villa', 'loft', 'kot', 'penthouse', 'duplex'];
    const energyClasses = ['A+', 'A', 'B', 'C', 'D'];

    const needed = 50 - existing.length;
    const seeds = Array.from({ length: needed }, (_, i) => {
      const idx = existing.length + i + 1;
      const city = cities[idx % cities.length];
      const street = streets[idx % streets.length];
      const type = types[idx % types.length];
      const bedrooms = (idx % 4) + 1;
      const size = 35 + (idx % 12) * 10;
      const price = 600 + (idx % 15) * 100;
      const energyClass = energyClasses[idx % energyClasses.length];
      const id = `seed-${idx}-${Date.now()}`;
      return {
        id,
        name: `${names[idx % names.length]} ${type} ${idx}`,
        address: `${street} ${idx}, ${city}`,
        price,
        imageUrls: [
          `https://picsum.photos/seed/eburon-${idx}/800/600`,
          `https://picsum.photos/seed/eburon-${idx}-b/800/600`
        ],
        energyClass,
        type,
        size,
        description: 'Bright, well-maintained home with easy access to transit and local shops.',
        bedrooms,
        petsAllowed: idx % 2 === 0,
        created_at: new Date().toISOString()
      } as Listing;
    });

    await Promise.all(seeds.map((listing) => db.createListing(listing)));
  };

  const loadListings = async (currentFilters: ApartmentSearchFilters) => {
    setIsLoadingListings(true);
    try {
        const results = await db.searchListings(currentFilters);
        setListings(results);
        const listingParam = new URLSearchParams(window.location.search).get('listing');
        if (listingParam) {
            const match = results.find(listing => listingMatchesSlug(listing, listingParam));
            if (match) setSelectedListing(match);
        }
        return results;
    } finally {
        setIsLoadingListings(false);
    }
  };

  const updateListingUrl = (listing: Listing | null) => {
      const url = new URL(window.location.href);
      if (listing) {
          url.searchParams.set('listing', buildListingSlug(listing));
      } else {
          url.searchParams.delete('listing');
      }
      window.history.replaceState({}, '', url.toString());
  };

  const handleFilterChange = (updates: Partial<ApartmentSearchFilters>) => {
      const newFilters = { ...filters, ...updates };
      setFilters(newFilters);
      loadListings(newFilters);
  };

  const handleHeaderSearchSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const query = headerSearch.trim();
      handleFilterChange({ city: query || null });
  };

  const handleHeaderSearchClear = () => {
      setHeaderSearch('');
      handleFilterChange({ city: null });
  };

  const stopRinging = () => {
      if (ringTimeoutRef.current) {
          window.clearTimeout(ringTimeoutRef.current);
          ringTimeoutRef.current = null;
      }
      if (ringAudioRef.current) {
          ringAudioRef.current.pause();
          ringAudioRef.current.currentTime = 0;
          ringAudioRef.current = null;
      }
      setIsRinging(false);
  };

  const connectLiveAudio = async () => {
      try {
          setIsLiveActive(true);
          setAssistantReply('Connected. Beatrice is listening.');

          const systemPrompt = `
[Identity]
You are Beatrice, a real estate broker in Belgium specializing in personalized service and off-list property searches. Your role is to seamlessly assist clients in finding both listed and unlisted properties, offering expert guidance every step of the way.

[Style]
Maintain a professional yet approachable tone, demonstrating expertise while being attentive and empathetic. Use natural pauses and fillers like "um" for a human touch, and ensure confidence and reassurance are conveyed in your speech.

[Response Guidelines]
Focus on clear, concise communication, avoiding unnecessary technical terms unless they need explaining. Ensure your responses are structured simply and include pauses to make the conversation feel natural. Balance providing information with active listening.

[Task & Goals]
1. Begin with a friendly greeting to make the caller feel at ease.
2. Listen attentively to the client's requests, confirming their needs and interest in both listed and non-listed properties.
3. Use probing questions to understand the client's expectations, such as location preferences and budget.
4. Discuss and explore options beyond the available online listings using your industry network and insights.
5. Leverage tools like 'listProperties' for current listings and 'findOffListProperties' for unlisted options, if applicable.
6. Proceed to arrange viewings with 'scheduleViewing' or propose alternative searches if initial options are not suitable.

[Error Handling / Fallback]
Politely ask clarifying questions when necessary, and reassure the client if technical issues arise. Use phrases like "Let's look for other options" or "I'll ensure we find something that meets your needs" to maintain client confidence even if standard solutions aren't available.
          `;

          await geminiClient.connect(systemPrompt, [listPropertiesTool, findOffListPropertiesTool, scheduleViewingTool, saveLeadTool]);
      } catch (e) {
          console.error(e);
          setIsLiveActive(false);
          setAssistantReply('Error connecting.');
      }
  };

  const startRinging = () => {
      if (isRinging || isLiveActive) return;
      setIsRinging(true);
      setAssistantReply('Calling +1 (844) 484 9501');

      const ringAudio = new Audio('https://botsrhere.online/deontic/callerpro/ring.mp3');
      ringAudio.loop = true;
      ringAudioRef.current = ringAudio;
      ringAudio.play().catch((e) => {
          console.error('Ring audio play failed', e);
      });

      ringTimeoutRef.current = window.setTimeout(() => {
          stopRinging();
          connectLiveAudio();
      }, 9000);
  };

  const toggleVoice = async () => {
      if (isRinging) {
          stopRinging();
          setAssistantReply('Tap to call +1 (844) 484 9501');
          return;
      }

      if (isLiveActive) {
          geminiClient.disconnect();
          setIsLiveActive(false);
          setAssistantReply('Tap to call +1 (844) 484 9501');
          return;
      }

      startRinging();
  };

    // --- Drag Handlers ---
  const handlePointerDown = (e: React.PointerEvent) => {
      isDragging.current = false;
      e.currentTarget.setPointerCapture(e.pointerId);
      dragOffset.current = {
          x: e.clientX - orbPosition.x,
          y: e.clientY - orbPosition.y
      };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
      if (e.buttons === 0) return; // Only track when pressed
      const newX = e.clientX - dragOffset.current.x;
      const newY = e.clientY - dragOffset.current.y;
      
      if (Math.abs(newX - orbPosition.x) > 5 || Math.abs(newY - orbPosition.y) > 5) {
          isDragging.current = true;
      }
      setOrbPosition({ x: newX, y: newY });
  };
  
  const handleOrbTap = () => {
      if (!isDragging.current) {
          toggleVoice();
      }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans relative">
      
      {/* Top Bar (Public) */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100 px-6 py-4 flex justify-between items-center transition-all shadow-sm">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.location.reload()}>
            <div className="bg-rose-500 p-2 rounded-full text-white">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                </svg>
            </div>
            <h1 className="text-xl font-bold text-rose-500 tracking-tight hidden sm:block">Eburon<span className="text-slate-900"> Estate</span></h1>
        </div>

        <form
            onSubmit={handleHeaderSearchSubmit}
            className="hidden md:flex items-center border border-gray-300 rounded-full shadow-sm hover:shadow-md transition-shadow px-4 py-2 gap-3 bg-white"
        >
             <input
                type="text"
                value={headerSearch}
                onChange={(e) => setHeaderSearch(e.target.value)}
                placeholder="Search city or address"
                aria-label="Search city or address"
                className="text-sm font-medium text-slate-900 w-64 bg-transparent outline-none"
             />
             {headerSearch && (
                <button
                    type="button"
                    onClick={handleHeaderSearchClear}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-700"
                >
                    Clear
                </button>
             )}
             <button type="submit" className="bg-rose-500 rounded-full p-2 text-white">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3 h-3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
             </button>
        </form>

        <div className="flex items-center gap-4">
            <button 
                onClick={onLoginClick}
                className="text-sm font-semibold text-slate-600 hover:bg-slate-50 px-4 py-2 rounded-full transition-colors"
            >
                {currentUser ? 'Go to Admin' : 'Log in'}
            </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow flex flex-col pt-8 pb-32 md:pb-10 relative max-w-[1800px] mx-auto w-full mb-16 md:mb-0">
            {/* Filters Row */}
            <div className="flex gap-4 overflow-x-auto px-6 mb-6 pb-2 scrollbar-hide items-center">
                {PROPERTY_TYPES.map((pt) => {
                    const isActive = filters.type === pt.id;
                    return (
                            <button 
                            key={pt.id}
                            onClick={() => handleFilterChange({ type: isActive ? null : pt.id })}
                            className={`
                                whitespace-nowrap px-4 py-3 rounded-xl border flex flex-col items-center gap-2 min-w-[70px] transition-all
                                ${isActive 
                                    ? 'border-black bg-slate-50 opacity-100 shadow-sm' 
                                    : 'border-transparent opacity-60 hover:opacity-100 hover:bg-white'
                                }
                            `}
                            >
                                <div className={isActive ? 'text-black' : 'text-slate-500'}>
                                {pt.icon}
                                </div>
                                <span className={`text-xs font-medium ${isActive ? 'text-black font-bold' : 'text-slate-500'}`}>
                                {pt.label}
                                </span>
                            </button>
                    );
                })}
                
                <div className="border-l border-gray-300 mx-2 h-8"></div>
                
                {/* Pets Allowed Toggle */}
                <button 
                    onClick={() => handleFilterChange({ petsAllowed: !filters.petsAllowed })}
                    className={`
                        whitespace-nowrap px-4 py-2 rounded-full border text-sm font-medium transition-colors flex items-center gap-2
                        ${filters.petsAllowed 
                            ? 'border-black bg-slate-900 text-white' 
                            : 'border-gray-300 bg-white text-slate-700 hover:border-black'
                        }
                    `}
                >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 0 1-6.364 0M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Z" />
                    </svg>
                    Pets Allowed
                </button>

                <select
                    aria-label="Sort by"
                    value={filters.sortBy || 'default'}
                    onChange={(e) => handleFilterChange({ sortBy: e.target.value as ApartmentSearchFilters['sortBy'] })}
                    className="text-sm font-medium text-slate-700 bg-transparent py-2 rounded-lg transition-colors border-none outline-none cursor-pointer hover:text-rose-600 ml-auto"
                >
                    <option value="default">Sort By</option>
                    <option value="price_asc">Price: Low to High</option>
                    <option value="price_desc">Price: High to Low</option>
                    <option value="size">Size: Large to Small</option>
                    <option value="energy_asc">Energy: Efficient First</option>
                    <option value="energy_desc">Energy: Least Efficient</option>
                </select>
            </div>

            {/* Listings Grid */}
            <div className="px-6 w-full">
                {isLoadingListings ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-6 md:gap-x-6 md:gap-y-10">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                            <div key={i} className="flex flex-col gap-3 animate-pulse">
                                <div className="aspect-square bg-slate-200 rounded-xl w-full"></div>
                                <div className="h-4 bg-slate-200 rounded w-2/3"></div>
                                <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                            </div>
                        ))}
                    </div>
                ) : listings.length === 0 ? (
                    <div className="text-center text-slate-400 py-12">
                        <p className="text-lg">No homes found in this area.</p>
                        <p className="text-sm">Try changing your search filters.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-6 md:gap-x-6 md:gap-y-10">
                        {listings.map(listing => (
                            <ListingCard 
                                key={listing.id} 
                                listing={listing} 
                                callUsNumber={callUsNumber}
                                onRequestCall={(l) => setLeadModalListing(l)}
                                onClick={(l) => {
                                    setSelectedListing(l);
                                    updateListingUrl(l);
                                }}
                            />
                        ))}
                    </div>
                )}
            </div>
      </main>

      {/* Floating Call Button */}
      <div 
          className="fixed z-50 touch-none cursor-grab active:cursor-grabbing group"
          style={{ 
              left: orbPosition.x, 
              top: orbPosition.y,
              transform: 'translate(-50%, -50%)'
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handleOrbTap}
      >
          {/* Tooltip */}
          <div className={`absolute bottom-full mb-3 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs px-3 py-1.5 rounded-lg whitespace-nowrap shadow-xl opacity-90 pointer-events-none transition-all ${isLiveActive || isRinging ? 'scale-100 opacity-100' : 'scale-90 opacity-0 group-hover:scale-100 group-hover:opacity-100'}`}>
                 {assistantReply}
                 <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900"></div>
             </div>

          <div className="relative flex items-center justify-center w-14 h-14">
              {isLiveActive && (
                  <div className="absolute inset-[-6px] rounded-full border-2 border-emerald-400/70 border-dashed animate-spin"></div>
              )}
              <div
                  className={`relative flex items-center justify-center w-full h-full rounded-full bg-gradient-to-br from-emerald-400 to-emerald-700 text-white shadow-2xl transition-transform duration-100 ease-out ${!isLiveActive ? 'hover:scale-105' : ''}`}
                  style={{
                      transform: isLiveActive ? `scale(${1 + volume * 0.4})` : 'scale(1)'
                  }}
              >
                  <Phone className="w-6 h-6" />
              </div>
          </div>
      </div>

      {selectedListing && (
          <ListingDetails 
              listing={selectedListing} 
              currentUser={currentUser}
              onLoginRequest={onLoginClick}
              onRequestCall={(l) => setLeadModalListing(l)}
              callUsNumber={callUsNumber}
              onClose={() => {
                  setSelectedListing(null);
                  updateListingUrl(null);
              }} 
          />
      )}
      {leadModalListing && (
          <LeadCaptureModal
              listing={leadModalListing}
              onClose={() => setLeadModalListing(null)}
          />
      )}
    </div>
  );
};

export default LandingPage;
