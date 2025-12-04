
import React, { useState, useEffect, useRef } from 'react';
import { Phone, Mic, MicOff, PhoneOff, Disc, Delete, Search, User, X, Check, Bot } from 'lucide-react';
import { CallState, Lead, AgentPersona } from '../types';

interface DialerProps {
  callState: CallState;
  onCallStart: (phoneNumber: string) => void;
  onCallEnd: () => void;
  activeLeadName?: string;
  activeLeadPhone?: string;
  inputVolume: number;
  outputVolume: number;
  onToggleRecording: (isRecording: boolean) => void;
  isRecording: boolean;
  leads: Lead[];
  onLeadSelected: (lead: Lead) => void;
  agents: AgentPersona[];
  selectedAgentId: string;
  onSelectAgent: (agentId: string) => void;
}

const Dialer: React.FC<DialerProps> = ({
  callState,
  onCallStart,
  onCallEnd,
  activeLeadName,
  activeLeadPhone,
  inputVolume,
  outputVolume,
  onToggleRecording,
  isRecording,
  leads,
  onLeadSelected,
  agents,
  selectedAgentId,
  onSelectAgent
}) => {
  const [dialNumber, setDialNumber] = useState(activeLeadPhone || '');
  const [isMuted, setIsMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showAgentSelector, setShowAgentSelector] = useState(false);

  // Refs for Long Press Logic (0 -> +)
  const longPressTimerRef = useRef<any>(null);
  const isLongPressRef = useRef(false);

  useEffect(() => {
    if (activeLeadPhone) {
        setDialNumber(activeLeadPhone);
    }
  }, [activeLeadPhone]);

  useEffect(() => {
    let interval: any;
    if (callState === CallState.ACTIVE) {
      interval = setInterval(() => setDuration(d => d + 1), 1000);
    } else {
      setDuration(0);
    }
    return () => clearInterval(interval);
  }, [callState]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handlePadClick = (num: string) => {
    if (callState === CallState.IDLE) {
      setDialNumber(prev => prev + num);
    }
  };

  const handleDelete = () => {
    setDialNumber(prev => prev.slice(0, -1));
  };

  const handleSearchSelect = (lead: Lead) => {
      onLeadSelected(lead);
      setDialNumber(lead.phone);
      setSearchTerm('');
      setShowSearch(false);
  };

  // --- Long Press Logic for '0' ---
  const handlePressStart = (key: string) => {
    if (key !== '0') return;
    isLongPressRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      if (callState === CallState.IDLE) {
         setDialNumber(prev => prev + '+');
         // Haptic feedback if available
         if (navigator.vibrate) navigator.vibrate(50);
      }
    }, 500); // 500ms threshold
  };

  const handlePressEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handlePadButtonAction = (key: string) => {
      // If it was a long press on 0, the '+' is already added by the timer.
      // We must prevent the default click from adding '0'.
      if (key === '0' && isLongPressRef.current) {
          isLongPressRef.current = false; // Reset
          return;
      }
      handlePadClick(key);
  };

  const filteredLeads = leads.filter(l => 
      l.firstName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      l.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.phone.includes(searchTerm)
  );

  const activeVisualizerHeight = Math.min(100, outputVolume * 200);
  const inputVisualizerHeight = Math.min(100, inputVolume * 200);

  const selectedAgent = agents.find(a => a.id === selectedAgentId) || agents[0];

  return (
    <div className="flex flex-col h-full bg-white text-slate-900 rounded-[3rem] overflow-hidden shadow-2xl border-[8px] border-slate-900 relative ring-4 ring-slate-300 box-content">
      {/* Dynamic Island / Header */}
      <div className="absolute top-0 left-0 right-0 h-12 flex justify-center items-start pt-3 z-50 pointer-events-none">
        <div className="bg-black rounded-full px-5 py-2 flex items-center justify-center gap-3 transition-all duration-300 ease-in-out min-w-[100px] h-[30px]">
             {callState === CallState.ACTIVE && (
                 <div className="flex gap-1 items-end h-3">
                     <div className="w-1 bg-slate-500 animate-pulse h-3 rounded-full"></div>
                     <div className="w-1 bg-slate-500 animate-pulse h-2 rounded-full animation-delay-75"></div>
                     <div className="w-1 bg-slate-500 animate-pulse h-4 rounded-full animation-delay-150"></div>
                 </div>
             )}
             {callState === CallState.RINGING && (
                 <div className="flex gap-1 items-center h-3">
                     <Phone className="w-3 h-3 text-white animate-pulse" fill="currentColor"/>
                 </div>
             )}
             {isRecording && <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>}
        </div>
      </div>

      {/* Agent Selector Overlay */}
      {showAgentSelector && (
          <div className="absolute inset-0 z-[60] bg-white/95 backdrop-blur-sm p-6 flex flex-col animate-in fade-in zoom-in-95">
              <div className="flex justify-between items-center mb-6 mt-10">
                  <h3 className="font-bold text-slate-800">Select Calling Agent</h3>
                  <button onClick={() => setShowAgentSelector(false)} aria-label="Close agent selector" className="p-2 bg-slate-100 rounded-full"><X className="w-5 h-5 text-slate-600"/></button>
              </div>
              <div className="overflow-y-auto flex-1 space-y-2 no-scrollbar">
                  {agents.map(agent => (
                      <button
                        key={agent.id}
                        onClick={() => {
                            onSelectAgent(agent.id || 'default');
                            setShowAgentSelector(false);
                        }}
                        className={`w-full p-4 rounded-xl text-left border transition-all ${
                            selectedAgentId === agent.id 
                            ? 'bg-slate-50 border-slate-500 shadow-sm' 
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                          <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${selectedAgentId === agent.id ? 'bg-slate-200 text-slate-800' : 'bg-slate-100 text-slate-500'}`}>
                                  <Bot className="w-5 h-5"/>
                              </div>
                              <div>
                                  <div className="font-bold text-sm text-slate-800">{agent.name}</div>
                                  <div className="text-xs text-slate-500">{agent.role}</div>
                              </div>
                          </div>
                      </button>
                  ))}
              </div>
          </div>
      )}

      {/* Screen Content - Embedded Eburon App */}
      <div className="flex-1 flex flex-col relative overflow-hidden z-10 bg-white">
        
        {/* Status Bar Dummy */}
        <div className="w-full flex justify-between items-center text-[10px] font-bold text-slate-900 px-4 py-2 bg-slate-50 shrink-0">
             <span>9:41</span>
             <div className="flex gap-1">
                 <div className="w-4 h-2.5 bg-slate-900 rounded-[2px] opacity-20"></div>
                 <div className="w-4 h-2.5 bg-slate-900 rounded-[2px] opacity-20"></div>
                 <div className="w-4 h-2.5 bg-slate-900 rounded-[2px]"></div>
             </div>
        </div>

        {/* Embedded Eburon App */}
        <iframe 
          src="https://app.eburon.ai/"
          className="flex-1 w-full border-0"
          title="Eburon App"
          allow="camera; microphone; clipboard-read; clipboard-write; geolocation"
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-downloads"
        />
        
        {/* Home Indicator */}
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-slate-900 rounded-full opacity-20"></div>
      </div>
    </div>
  );
};

export default Dialer;
