
import React, { useState, useEffect, useRef } from 'react';
import { Phone, PhoneOff, Delete, Bot, X } from 'lucide-react';
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
  activeLeadPhone,
  agents,
  selectedAgentId,
  onSelectAgent
}) => {
  const [dialNumber, setDialNumber] = useState(activeLeadPhone || '');
  const [activeDigit, setActiveDigit] = useState<string | null>(null);
  const [showAgentSelector, setShowAgentSelector] = useState(false);

  useEffect(() => {
    if (activeLeadPhone) {
        setDialNumber(activeLeadPhone);
    }
  }, [activeLeadPhone]);

  // --- Long Press Logic ---
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);

  const handlePressStart = (key: string) => {
      setActiveDigit(key);
      if (key !== '0') return;

      isLongPressRef.current = false;
      longPressTimerRef.current = setTimeout(() => {
          isLongPressRef.current = true;
          setDialNumber(prev => prev + '+');
          if (navigator.vibrate) navigator.vibrate(50);
          setActiveDigit('+'); // Visual feedback
      }, 500); 
  };

  const handlePressEnd = () => {
      setActiveDigit(null);
      if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
      }
  };

  const handlePadClick = (key: string) => {
      // If long press '0' triggered, don't add '0' again
      if (key === '0' && isLongPressRef.current) {
          isLongPressRef.current = false;
          return;
      }
      setDialNumber(prev => prev + key);
  };

  const toggleCall = () => {
      if (callState === CallState.IDLE) {
          if (!dialNumber.trim()) return;
          onCallStart(dialNumber);
      } else {
          onCallEnd();
      }
  };

  const digits = [
    { key: '1', sub: '' }, { key: '2', sub: 'ABC' }, { key: '3', sub: 'DEF' },
    { key: '4', sub: 'GHI' }, { key: '5', sub: 'JKL' }, { key: '6', sub: 'MNO' },
    { key: '7', sub: 'PQRS' }, { key: '8', sub: 'TUV' }, { key: '9', sub: 'WXYZ' },
    { key: '*', sub: '' }, { key: '0', sub: '+' }, { key: '#', sub: '' }
  ];

  const selectedAgent = agents.find(a => a.id === selectedAgentId) || agents[0];

  return (
    <div className="flex flex-col h-full bg-slate-50 text-slate-900 rounded-[3rem] overflow-hidden shadow-2xl border-[8px] border-slate-900 relative ring-4 ring-slate-300 box-content">
      
      {/* Dynamic Island / Status */}
      <div className="absolute top-0 left-0 right-0 h-12 flex justify-center items-start pt-3 z-50 pointer-events-none">
         <div className="bg-black rounded-full px-5 py-2 flex items-center justify-center gap-3 min-w-[100px] h-[30px] transition-all">
             {callState === CallState.ACTIVE ? (
                 <div className="flex gap-1 items-end h-3">
                     <div className="w-1 bg-green-500 animate-pulse h-3 rounded-full"></div>
                     <div className="w-1 bg-green-500 animate-pulse h-2 rounded-full animation-delay-75"></div>
                     <div className="w-1 bg-green-500 animate-pulse h-4 rounded-full animation-delay-150"></div>
                 </div>
             ) : (
                 <div className="w-2 h-2 bg-slate-800 rounded-full"></div>
             )}
         </div>
      </div>

      {/* Screen Content */}
      <div className="flex-1 flex flex-col relative z-10 px-6 pt-12 pb-8">
        
        {/* Agent Badge (Tap to Change) */}
        <div className="flex justify-center mb-8">
            <button 
                onClick={() => setShowAgentSelector(true)}
                title="Change Agent"
                className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-slate-100 active:scale-95 transition-transform"
            >
                <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                    <Bot size={14}/>
                </div>
                <span className="text-xs font-semibold text-slate-600">
                    {selectedAgent?.name || 'Eburon AI Agent'}
                </span>
            </button>
        </div>

        {/* Display */}
        <div className="flex-1 flex flex-col justify-center items-center mb-8 space-y-2">
            <div className="text-4xl font-light text-slate-900 tracking-wider h-12">
                {dialNumber || <span className="text-slate-300">Enter Number</span>}
            </div>
            {callState === CallState.ACTIVE && (
                <div className="text-sm font-medium text-green-600 animate-pulse">
                    Connected to {selectedAgent?.name}...
                </div>
            )}
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-x-6 gap-y-4 mb-8 max-w-[280px] mx-auto">
            {digits.map(({ key, sub }) => (
                <button
                    key={key}
                    onMouseDown={() => handlePressStart(key)}
                    onMouseUp={handlePressEnd}
                    onMouseLeave={handlePressEnd}
                    onTouchStart={() => handlePressStart(key)}
                    onTouchEnd={handlePressEnd}
                    onClick={() => handlePadClick(key)}
                    className={`
                        w-16 h-16 rounded-full flex flex-col items-center justify-center transition-all duration-150 select-none
                        ${activeDigit === key ? 'bg-slate-200 scale-95' : 'bg-white hover:bg-slate-50 shadow-sm'}
                    `}
                >
                    <span className="text-2xl font-medium text-slate-800 leading-none">{key}</span>
                    {sub && <span className="text-[9px] font-bold text-slate-400 tracking-widest mt-0.5">{sub}</span>}
                </button>
            ))}
        </div>

        {/* Actions */}
        <div className="flex justify-center gap-8 items-center mt-auto">
            {callState === CallState.IDLE && dialNumber.length > 0 && (
                 <button 
                    onClick={() => setDialNumber(prev => prev.slice(0, -1))}
                    title="Delete last digit"
                    className="w-16 flex justify-center text-slate-400 hover:text-slate-600 transition-colors"
                >
                    <Delete size={24} />
                 </button>
            )}
            
            <button
                onClick={toggleCall}
                title={callState === CallState.ACTIVE ? 'End Call' : 'Start Call'}
                className={`
                    w-16 h-16 rounded-full flex items-center justify-center text-white shadow-lg transform transition-all active:scale-90
                    ${callState === CallState.ACTIVE ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}
                `}
            >
                {callState === CallState.ACTIVE ? <PhoneOff size={28} /> : <Phone size={28} fill="currentColor" />}
            </button>

            {/* Spacer to center call button if no delete button */}
            {callState === CallState.IDLE && dialNumber.length === 0 && <div className="w-16"/>}
            
            {/* For symmetry when delete button is present */}
             {callState === CallState.IDLE && dialNumber.length > 0 && <div className="w-16"/>}
        </div>

      </div>

      {/* Agent Selector Overlay */}
      {showAgentSelector && (
          <div className="absolute inset-0 z-[60] bg-white/95 backdrop-blur-sm p-6 flex flex-col animate-in fade-in zoom-in-95">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                    <h3 className="font-bold text-lg text-slate-800">Select Assistant</h3>
                    <button 
                        onClick={() => setShowAgentSelector(false)}
                        title="Close agent selector"
                        className="p-2 hover:bg-slate-100 rounded-full text-slate-500"
                    >
                        <X size={20} />
                    </button>
                </div>
               <div className="space-y-2">
                   {agents.map(agent => (
                       <button
                         key={agent.id}
                         title={`Select agent ${agent.name}`}
                         onClick={() => {
                            onSelectAgent(agent.id || 'default');
                            setShowAgentSelector(false);
                        }} className={`w-full p-4 rounded-xl text-left border ${selectedAgentId === agent.id ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-100'}`}
                       >
                           <div className="font-bold text-slate-800">{agent.name}</div>
                           <div className="text-xs text-slate-500">{agent.role}</div>
                       </button>
                   ))}
               </div>
          </div>
      )}

      {/* Home Indicator */}
      <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-slate-900 rounded-full opacity-20 pointer-events-none"></div>
    </div>
  );
};

export default Dialer;
