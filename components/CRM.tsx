
import React, { useState, useEffect } from 'react';
import { Lead, Property, User, Ticket, AgentPersona, Task, CallState, Interaction } from '../types';
import { db } from '../services/db';
import {
  User as UserIcon, Phone, Mail, MapPin, Home, CheckCircle,
  ChevronRight, X, PhoneIncoming,
  PhoneMissed, Voicemail, LayoutDashboard, Calendar as CalendarIcon,
  Inbox as InboxIcon, Briefcase,
  Menu, ChevronLeft, Wrench, Bell, LogOut, Shield,
  Plus, CheckSquare, CalendarDays, MessageSquare
} from 'lucide-react';
import LeadForm from './LeadForm';
import TicketForm from './TicketForm';
import ListingForm from './ListingForm';
import Dialer from './Dialer';
import { buildPropertySlug } from '../utils/listingSlug';
import { createOutboundCall } from '../services/vapiCallService';
// WebCall component removed - tab was deleted

interface CRMProps {
  leads: Lead[];
  properties: Property[];
  onSelectLead: (lead: Lead | null) => void;
  selectedLeadId: string | null;
  onUpdateLead: (lead: Lead) => void;
  currentUser: User;
  onLogout: () => void;
  tasks: Task[];
  onUpdateTask: (task: Task) => void;
  onCreateTask?: (task: Task) => Promise<void>; // Optional to avoid breaking other components if any
  agents: AgentPersona[];
  callState: CallState;
  onCallStart: (phoneNumber: string) => void;
  onCallEnd: () => void;
  inputVolume: number;
  outputVolume: number;
  onToggleRecording: (isRecording: boolean) => void;
  isRecording: boolean;
  selectedAgentId: string;
  onSelectAgent: (agentId: string) => void;
}

type TabType = 'dialer' | 'dashboard' | 'leads' | 'properties' | 'calendar' | 'maintenance' | 'my-home' | 'jobs' | 'schedule' | 'inbox' | 'tasks';

const CRM: React.FC<CRMProps> = ({ 
    leads, properties, onSelectLead, selectedLeadId, onUpdateLead, currentUser, onLogout,
    tasks, onUpdateTask, onCreateTask, agents,
    callState, onCallStart, onCallEnd, inputVolume, outputVolume, onToggleRecording, isRecording, selectedAgentId, onSelectAgent
}) => {
  const propertyManagerAssistantId = '42c708e0-2e4d-4684-95d7-ebe9442d9cb9';
  const siteBaseUrl = import.meta.env.VITE_SITE_URL || window.location.origin;
  const [tab, setTab] = useState<TabType>('dashboard');
  const [noteInput, setNoteInput] = useState('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [showListingForm, setShowListingForm] = useState(false);
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [renterPhone, setRenterPhone] = useState('');
  const [isSendingToAdmin, setIsSendingToAdmin] = useState(false);
  const [filterTicketStatus, setFilterTicketStatus] = useState<'ALL' | 'OPEN' | 'SCHEDULED' | 'COMPLETED'>('ALL');
  
  // Calendar State
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    // Reset to dashboard when user changes to prevent dead tabs
    setTab('dashboard');
  }, [currentUser.role]);

  useEffect(() => {
    const loadData = async () => {
        const [t, i] = await Promise.all([db.getTickets(), db.getInteractions()]);
        setTickets(t);
        setInteractions(i);
    };
    loadData();
  }, [currentUser]);

  const activeLead = leads.find(l => l.id === selectedLeadId);
  const notifications = interactions.slice(0, 5);
  const unreadCount = notifications.length;
  const pendingTasks = tasks.filter(t => !t.completed).length;
  const openTickets = tickets.filter(t => t.status === 'OPEN').length;
  const scheduledTickets = tickets.filter(t => t.status === 'SCHEDULED').length;
  const leadStructuredOutputs = activeLead
    ? interactions
        .filter((interaction) => interaction.type === 'VOICE_CALL' && interaction.leadId === activeLead.id)
        .map((interaction) => {
          const structuredData = interaction.metadata?.structuredData;
          if (!structuredData) return null;
          if (typeof structuredData === 'object' && Object.keys(structuredData).length === 0) return null;
          return { interaction, structuredData };
        })
        .filter(Boolean) as { interaction: Interaction; structuredData: any }[]
    : [];

  const getLeadName = (leadId?: string) => {
    if (!leadId) return 'Unknown lead';
    const lead = leads.find(l => l.id === leadId);
    return lead ? `${lead.firstName} ${lead.lastName}` : 'Unknown lead';
  };

  const formatInteractionTitle = (interaction: Interaction) => {
    const leadName = getLeadName(interaction.leadId);
    return `${interaction.type} · ${interaction.direction} · ${leadName}`;
  };

  const handleSaveNote = () => {
    if (!noteInput.trim() || !activeLead) return;
    const timestamp = new Date().toLocaleString();
    const newNoteEntry = `[${timestamp}] Call Note: ${noteInput.trim()}`;
    const updatedNotes = activeLead.notes ? `${activeLead.notes}\n\n${newNoteEntry}` : newNoteEntry;
    const updatedLead = { ...activeLead, notes: updatedNotes };
    onUpdateLead(updatedLead);
    setNoteInput('');
  };

  const getStatusIcon = (outcome: string) => {
      switch(outcome) {
          case 'connected': return <PhoneIncoming className="w-4 h-4 text-slate-500" />;
          case 'missed': return <PhoneMissed className="w-4 h-4 text-red-500" />;
          case 'voicemail': return <Voicemail className="w-4 h-4 text-amber-500" />;
          case 'follow_up': return <CalendarDays className="w-4 h-4 text-white 500" />;
          default: return <Phone className="w-4 h-4 text-slate-400" />;
      }
  };

  // --- Button Handlers ---
  const handleCreateTicket = () => {
      setShowTicketForm(true);
  };

  const handleAddTask = async () => {
      const title = window.prompt("Enter task title:");
      if (!title || !onCreateTask) return;
      
      const newTask: Task = {
          id: crypto.randomUUID(),
          title,
          completed: false,
          dueDate: new Date().toISOString().split('T')[0],
          priority: 'MEDIUM'
      };
      
      try {
        await onCreateTask(newTask);
        // Alert removed as requested/implied (UI update is immediate)
      } catch (e) {
        console.error(e);
        alert("Failed to create task");
      }
  };

  const handleAddProperty = () => {
      setShowListingForm(true);
  };

  const refreshTickets = async () => {
      const t = await db.getTickets();
      setTickets(t);
  };

  const handleSendToAdmin = async () => {
      const phone = renterPhone.trim();
      if (!phone) {
        alert('Please enter a phone number so our admin can call you.');
        return;
      }
      try {
        setIsSendingToAdmin(true);
        const existingLead = leads.find((lead) => lead.email === currentUser.email) || null;
        let leadId = existingLead?.id;

        if (!leadId) {
          const [firstName, ...rest] = currentUser.name.split(' ');
          const newLead: Lead = {
            id: crypto.randomUUID(),
            firstName: firstName || 'Resident',
            lastName: rest.join(' ') || 'Tenant',
            phone,
            email: currentUser.email,
            status: 'New',
            interest: 'Management',
            lastActivity: 'Tenant requested admin callback',
            notes: 'Tenant requested a call-back from property management.',
            recordings: []
          };
          await db.createLead(newLead);
          leadId = newLead.id;
        } else {
          await db.appendLeadNotes(leadId, 'Tenant requested a call-back from property management.', 'Tenant requested admin callback');
        }

        await db.createInteraction({
          type: 'VOICE_CALL',
          direction: 'OUTBOUND',
          leadId,
          content: 'Tenant requested admin call-back.',
          metadata: { phone }
        });

        await createOutboundCall(phone, propertyManagerAssistantId);
        setRenterPhone('');
        alert('Thanks! Our property manager will call you shortly.');
      } catch (error) {
        console.error(error);
        alert('Failed to request a call. Please try again.');
      } finally {
        setIsSendingToAdmin(false);
      }
  };


  const NavItem = ({ id, label, icon: Icon, badge }: { id: TabType, label: string, icon: any, badge?: string }) => (
    <button 
        onClick={() => setTab(id)}
        aria-label={label}
        className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 text-sm font-medium transition-all duration-200 relative group overflow-hidden ${
          tab === id ? 'bg-black 50 text-white 700' : 'text-slate-600 hover:bg-slate-50'
        } ${isSidebarCollapsed ? 'justify-center' : ''}`}
        title={isSidebarCollapsed ? label : undefined}
    >
        <Icon className={`w-5 h-5 flex-shrink-0 transition-transform ${tab === id && isSidebarCollapsed ? 'scale-110' : ''}`} /> 
        <span className={`flex-1 whitespace-nowrap transition-all duration-300 ${isSidebarCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100 w-auto'}`}>
          {label}
        </span>
        {badge && !isSidebarCollapsed && (
          <span className="bg-black 100 text-white 600 text-[10px] font-bold py-0.5 px-2 rounded-full min-w-[20px] text-center">
            {badge}
          </span>
        )}
    </button>
  );

  const SectionHeader = ({ label }: { label: string }) => (
    <div className={`px-4 mt-6 mb-2 transition-all duration-300 ${isSidebarCollapsed ? 'opacity-0 h-0 mt-0 overflow-hidden' : 'opacity-100 h-auto'}`}>
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</div>
    </div>
  );

  // --- TAB VIEWS ---

  const DialerView = () => {
      const selectedAgent = agents.find(agent => agent.id === selectedAgentId) || agents[0];
      const labelClassName = 'text-[10px] font-bold text-slate-500 uppercase tracking-wider';

      return (
          <div className="animate-in fade-in duration-500">
              <div className="flex items-center justify-between mb-6">
                  <div>
                      <h2 className="text-2xl font-bold text-slate-800">Dialer</h2>
                      <p className="text-sm text-slate-500">Agent profile data loaded from the database.</p>
                  </div>
              </div>
              <div className="flex flex-col xl:flex-row gap-8 items-start">
                  <div className="flex-1 min-w-0">
                      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
                          {selectedAgent ? (
                              <div className="space-y-6">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div className="space-y-1">
                                          <div className={labelClassName}>Agent Name</div>
                                          <div className="text-sm text-slate-800 font-semibold">{selectedAgent.name}</div>
                                      </div>
                                      <div className="space-y-1">
                                          <div className={labelClassName}>Agent ID</div>
                                          <div className="text-sm text-slate-600">{selectedAgent.id || '—'}</div>
                                      </div>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div className="space-y-1">
                                          <div className={labelClassName}>Role</div>
                                          <div className="text-sm text-slate-800">{selectedAgent.role}</div>
                                      </div>
                                      <div className="space-y-1">
                                          <div className={labelClassName}>Tone</div>
                                          <div className="text-sm text-slate-800">{selectedAgent.tone}</div>
                                      </div>
                                  </div>

                                  <div className="space-y-1">
                                      <div className={labelClassName}>Language Style</div>
                                      <div className="text-sm text-slate-800">{selectedAgent.languageStyle}</div>
                                  </div>

                                  <div className="space-y-1">
                                      <div className={labelClassName}>Objectives</div>
                                      <div className="flex flex-wrap gap-2">
                                          {(selectedAgent.objectives || []).length > 0 ? (
                                              selectedAgent.objectives.map((objective) => (
                                                  <span key={objective} className="text-xs font-medium bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
                                                      {objective}
                                                  </span>
                                              ))
                                          ) : (
                                              <span className="text-xs text-slate-400">No objectives set</span>
                                          )}
                                      </div>
                                  </div>

                              </div>
                          ) : (
                              <div className="text-sm text-slate-500">
                                  No agent profile found in the database. Add an agent record to `agents` to configure the dialer.
                              </div>
                          )}
                      </div>
                  </div>
                  <div className="w-full xl:w-[420px] flex justify-center">
                      <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 w-full flex justify-center">
                          <div className="w-[360px] h-[720px]">
                              <Dialer
                                  callState={callState}
                                  onCallStart={onCallStart}
                                  onCallEnd={onCallEnd}
                                  activeLeadName={activeLead ? `${activeLead.firstName} ${activeLead.lastName}` : undefined}
                                  activeLeadPhone={activeLead?.phone}
                                  inputVolume={inputVolume}
                                  outputVolume={outputVolume}
                                  onToggleRecording={onToggleRecording}
                                  isRecording={isRecording}
                                  leads={leads}
                                  onLeadSelected={(lead) => onSelectLead(lead)}
                                  agents={agents}
                                  selectedAgentId={selectedAgentId}
                                  onSelectAgent={onSelectAgent}
                              />
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      );
  };

  const DashboardView = () => (
      <div className="animate-in fade-in duration-500">
          <h2 className="text-2xl font-bold text-slate-800 mb-6">Welcome back, {currentUser.name.split(' ')[0]}</h2>
          {(() => {
              const stats = [
                  { label: 'Leads', val: leads.length, icon: UserIcon, color: 'bg-slate-700' },
                  { label: 'Properties', val: properties.length, icon: Home, color: 'bg-slate-600' },
                  { label: 'Open Tickets', val: openTickets, icon: Wrench, color: 'bg-amber-500' },
                  { label: 'Pending Tasks', val: pendingTasks, icon: CheckSquare, color: 'bg-slate-500' }
              ];
              const recentInteractions = interactions.slice(0, 4);

              return (
                  <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {stats.map((stat, i) => (
                  <div key={i} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-start justify-between hover:shadow-md transition-shadow">
                      <div>
                          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">{stat.label}</p>
                          <h3 className="text-2xl font-bold text-slate-900">{stat.val}</h3>
                          <span className="text-xs font-medium text-slate-500 flex items-center mt-1">
                              from live data
                          </span>
                      </div>
                      <div className={`${stat.color} p-3 rounded-xl text-white shadow-lg shadow-indigo-100`}>
                          <stat.icon className="w-5 h-5" />
                      </div>
                  </div>
              ))}
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-slate-800">Recent Activity</h3>
                  <span className="text-xs text-slate-400">Interactions</span>
              </div>
              {recentInteractions.length > 0 ? (
                  <div className="space-y-3">
                      {recentInteractions.map(interaction => (
                          <div key={interaction.id} className="flex items-start gap-3 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0">
                              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 text-xs font-bold">
                                  {interaction.type?.slice(0, 1)}
                              </div>
                              <div className="flex-1">
                                  <p className="text-sm font-semibold text-slate-800">{formatInteractionTitle(interaction)}</p>
                                  <p className="text-xs text-slate-500 line-clamp-2">{interaction.content}</p>
                              </div>
                              <span className="text-xs text-slate-400">
                                  {interaction.timestamp ? new Date(interaction.timestamp).toLocaleDateString() : ''}
                              </span>
                          </div>
                      ))}
                  </div>
              ) : (
                  <div className="text-sm text-slate-500">No recent interactions yet.</div>
              )}
          </div>
                  </>
              );
          })()}
      </div>
  );

  const InboxView = () => {
      const inboxItems = interactions.filter((interaction) => interaction.type === 'EMAIL' || interaction.type === 'SMS');
      const [activeInteractionId, setActiveInteractionId] = useState<string | null>(inboxItems[0]?.id || null);
      const activeInteraction = inboxItems.find(item => item.id === activeInteractionId) || null;
      useEffect(() => {
          if (!activeInteractionId && inboxItems[0]?.id) {
              setActiveInteractionId(inboxItems[0].id);
          }
      }, [activeInteractionId, inboxItems]);

      return (
          <div className="animate-in fade-in duration-500 h-full flex flex-col">
              <div className="flex justify-between items-center mb-6">
                  <div>
                       <h2 className="text-2xl font-bold text-slate-800">Inbox</h2>
                       <p className="text-slate-500 text-sm">Email and SMS interactions</p>
                  </div>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex-1 overflow-hidden flex">
                  <div className="w-full md:w-1/3 border-r border-slate-100 flex flex-col">
                       <div className="p-4 border-b border-slate-100">
                           <input type="text" placeholder="Search messages..." className="w-full px-4 py-2 bg-slate-50 rounded-lg text-sm outline-none focus:ring-2 focus:ring-slate-900 500/50"/>
                       </div>
                       <div className="overflow-y-auto flex-1">
                           {inboxItems.length > 0 ? inboxItems.map((message) => (
                               <button
                                   key={message.id}
                                   onClick={() => setActiveInteractionId(message.id || null)}
                                   className={`w-full text-left p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors ${activeInteractionId === message.id ? 'bg-slate-50' : ''}`}
                               >
                                   <div className="flex justify-between items-start mb-1">
                                       <div className="flex items-center gap-2">
                                            {message.type === 'SMS' ? (
                                                <div className="w-5 h-5 bg-slate-500 rounded-full flex items-center justify-center text-white"><MessageSquare className="w-3 h-3"/></div>
                                            ) : (
                                                <div className="w-5 h-5 bg-slate-500 rounded-full flex items-center justify-center text-white"><Mail className="w-3 h-3"/></div>
                                            )}
                                            <span className="text-sm font-bold text-slate-900">{getLeadName(message.leadId)}</span>
                                       </div>
                                       <span className="text-xs text-slate-400">
                                          {message.timestamp ? new Date(message.timestamp).toLocaleDateString() : ''}
                                       </span>
                                   </div>
                                   <div className="text-sm font-medium text-slate-700">{message.direction}</div>
                                   <div className="text-xs text-slate-500 truncate">{message.content}</div>
                               </button>
                           )) : (
                               <div className="p-6 text-sm text-slate-500">No email or SMS interactions yet.</div>
                           )}
                       </div>
                  </div>
                  <div className="hidden md:flex flex-1 flex-col p-8 bg-slate-50/30">
                      {activeInteraction ? (
                          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 h-full">
                              <div className="flex items-center justify-between mb-4">
                                  <div>
                                      <h3 className="text-lg font-bold text-slate-800">{getLeadName(activeInteraction.leadId)}</h3>
                                      <p className="text-xs text-slate-500">{activeInteraction.type} · {activeInteraction.direction}</p>
                                  </div>
                                  <span className="text-xs text-slate-400">
                                      {activeInteraction.timestamp ? new Date(activeInteraction.timestamp).toLocaleString() : ''}
                                  </span>
                              </div>
                              <div className="text-sm text-slate-700 whitespace-pre-wrap">{activeInteraction.content}</div>
                          </div>
                      ) : (
                          <div className="flex flex-1 flex-col items-center justify-center text-slate-400">
                              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                                  <InboxIcon className="w-8 h-8 text-slate-300"/>
                              </div>
                              <p className="text-sm font-medium">Select a message to view conversation</p>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      );
  };

  // ExternalAdminView removed - tab was deleted

  const MaintenanceView = () => (
      <div className="animate-in fade-in duration-500 h-full flex flex-col">
          <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">Maintenance Tickets</h2>
                <p className="text-slate-500 text-sm">Track repairs and requests</p>
              </div>
              <button onClick={handleCreateTicket} className="bg-black 600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-black 700 flex items-center gap-2">
                  <Plus className="w-4 h-4"/> New Ticket
              </button>
          </div>
          {currentUser.role === 'RENTER' && (
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm mb-6">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div>
                          <h3 className="text-lg font-bold text-slate-800">Send To Admin</h3>
                          <p className="text-sm text-slate-500">Need a call from property management? Leave your number.</p>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                          <input
                              type="tel"
                              value={renterPhone}
                              onChange={(e) => setRenterPhone(e.target.value)}
                              placeholder="Your phone number"
                              className="w-full sm:w-64 px-4 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-slate-900/10 outline-none"
                              aria-label="Your phone number"
                          />
                          <button
                              onClick={handleSendToAdmin}
                              disabled={isSendingToAdmin}
                              className="bg-black 600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-black 700 disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                              {isSendingToAdmin ? 'Sending...' : 'Send To Admin'}
                          </button>
                      </div>
                  </div>
              </div>
          )}
          {/* ... existing implementation ... */}
           <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              {(['ALL', 'OPEN', 'SCHEDULED', 'COMPLETED'] as const).map(status => (
                  <button 
                    key={status}
                    onClick={() => setFilterTicketStatus(status)}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition-colors ${
                        filterTicketStatus === status ? 'bg-black 600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                      {status}
                  </button>
              ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pb-10">
              {tickets.filter(t => filterTicketStatus === 'ALL' || t.status === filterTicketStatus).map(ticket => (
                  <div key={ticket.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-3">
                          <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                              ticket.priority === 'HIGH' ? 'bg-red-100 text-red-700' : 
                              ticket.priority === 'MEDIUM' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'
                          }`}>
                              {ticket.priority} Priority
                          </span>
                          <span className="text-xs text-slate-400">{new Date(ticket.createdAt).toLocaleDateString()}</span>
                      </div>
                      <h3 className="font-bold text-slate-900 mb-1">{ticket.title}</h3>
                      <p className="text-xs text-slate-500 mb-4 line-clamp-2">{ticket.description}</p>
                      
                      <div className="flex items-center gap-2 text-xs text-slate-600 mb-4 bg-slate-50 p-2 rounded-lg">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span className="truncate">{ticket.propertyAddress}</span>
                      </div>

                      <div className="flex justify-between items-center pt-3 border-t border-slate-50">
                          <div className={`flex items-center gap-1.5 text-xs font-bold ${
                              ticket.status === 'COMPLETED' ? 'text-slate-600' : 'text-white 600'
                          }`}>
                              {ticket.status}
                          </div>
                          <button className="text-slate-400 hover:text-white 600 text-xs font-medium">Details &rarr;</button>
                      </div>
                  </div>
              ))}
          </div>
      </div>
  );


  const CalendarView = () => {
    // ... reused logic ...
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay(); 
    const emptySlots = Array.from({ length: firstDayOfMonth });
    const daySlots = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const isToday = (d: number) => { const today = new Date(); return d === today.getDate() && month === today.getMonth() && year === today.getFullYear(); };

    return (
      <div className="animate-in fade-in duration-500 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-full flex flex-col">
          <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-800">{monthNames[month]} {year}</h2>
              <div className="flex gap-2">
                  <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} aria-label="Previous month" className="p-2 border rounded-lg hover:bg-slate-50"><ChevronLeft className="w-4 h-4"/></button>
                  <button onClick={() => setCurrentDate(new Date())} aria-label="Today" className="px-3 py-1 text-xs font-bold border rounded-lg hover:bg-slate-50">Today</button>
                  <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} aria-label="Next month" className="p-2 border rounded-lg hover:bg-slate-50"><ChevronRight className="w-4 h-4"/></button>
              </div>
          </div>
          <div className="grid grid-cols-7 gap-px bg-slate-200 border border-slate-200 rounded-lg overflow-hidden flex-1">
               {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                  <div key={d} className="bg-slate-50 p-2 text-center text-xs font-bold text-slate-500 uppercase flex items-center justify-center">{d}</div>
               ))}
               {emptySlots.map((_, i) => (<div key={`empty-${i}`} className="bg-white p-2 min-h-[80px]"></div>))}
               {daySlots.map((day) => {
                  const dateStr = new Date(year, month, day).toDateString();
                  const dayTasks = tasks.filter(t => !t.completed && new Date(t.dueDate).toDateString() === dateStr);
                  return (
                      <div key={day} className={`bg-white p-2 min-h-[80px] hover:bg-slate-50 transition-colors relative flex flex-col gap-1 ${isToday(day) ? 'bg-black 50/30' : ''}`}>
                          <span className={`text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full ${isToday(day) ? 'bg-black 600 text-white' : 'text-slate-700'}`}>{day}</span>
                          <div className="flex flex-col gap-1 overflow-y-auto max-h-[60px] no-scrollbar">
                              {dayTasks.map(t => (
                                  <div key={t.id} className="text-[10px] bg-black 100 text-white 700 px-1.5 py-0.5 rounded truncate border border-black 200" title={t.title}>{t.title}</div>
                              ))}
                          </div>
                      </div>
                  );
               })}
          </div>
      </div>
    );
  };

  const TasksView = () => (
      <div className="animate-in fade-in duration-500 h-full flex flex-col">
          <div className="flex justify-between items-center mb-6">
              <div>
                   <h2 className="text-2xl font-bold text-slate-800">Tasks</h2>
                   <p className="text-slate-500 text-sm">Follow-ups and to-dos</p>
              </div>
              <button onClick={handleAddTask} className="bg-black 600 text-white px-4 py-2 rounded-lg text-sm font-medium flex gap-2 items-center hover:bg-black 700">
                  <Plus className="w-4 h-4" /> New Task
              </button>
          </div>
          <div className="grid grid-cols-1 gap-4 overflow-y-auto pb-20">
              {tasks.map(task => (
                  <div key={task.id} className={`p-4 rounded-xl border transition-all ${task.completed ? 'bg-slate-50 border-slate-100 opacity-60' : 'bg-white border-slate-200 hover:shadow-md'}`}>
                      <div className="flex items-start gap-4">
                          <button 
                            onClick={() => onUpdateTask({...task, completed: !task.completed})}
                            className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors mt-0.5 ${
                                task.completed ? 'bg-black 600 border-black 600 text-white' : 'border-slate-300 hover:border-black 500'
                            }`}
                          >
                              {task.completed && <CheckCircle className="w-4 h-4" />}
                          </button>
                          <div className="flex-1">
                              <h3 className={`font-bold ${task.completed ? 'text-slate-500 line-through' : 'text-slate-800'}`}>{task.title}</h3>
                              <div className="flex flex-wrap items-center gap-3 mt-2">
                                  <div className="flex items-center gap-1.5 text-xs text-slate-500"><CalendarIcon className="w-3.5 h-3.5" />{new Date(task.dueDate).toLocaleDateString()}</div>
                                  {task.leadName && (<div className="flex items-center gap-1.5 text-xs text-white 600 bg-black 50 px-2 py-1 rounded font-medium"><UserIcon className="w-3 h-3" />{task.leadName}</div>)}
                                  <div className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${task.priority === 'HIGH' ? 'bg-red-100 text-red-600' : task.priority === 'MEDIUM' ? 'bg-amber-100 text-amber-600' : 'bg-slate-50 text-slate-600'}`}>{task.priority}</div>
                              </div>
                          </div>
                      </div>
                  </div>
              ))}
          </div>
      </div>
  );

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* CRM Header */}
      <header className="bg-white border-b border-slate-200 px-4 md:px-6 py-3 flex items-center justify-between shrink-0 z-30 h-16 shadow-sm relative">
        <div className={`flex items-center gap-3 md:gap-4 transition-all duration-300 ${isSidebarCollapsed ? 'w-[60px]' : 'w-[240px]'}`}>
             <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} aria-label="Toggle sidebar" className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors hidden lg:block"><Menu className="w-5 h-5" /></button>
            <div className={`flex items-center gap-2 overflow-hidden transition-opacity duration-300 ${isSidebarCollapsed ? 'lg:opacity-0 lg:w-0' : 'opacity-100'}`}>
                <div className="w-8 h-8 bg-slate-600 rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-slate-200 shrink-0">E</div>
                <h1 className="text-xl font-bold text-slate-800 tracking-tight whitespace-nowrap">Eburon</h1>
            </div>
        </div>
        
        <div className="flex items-center gap-4 flex-1 justify-end">
             {/* Notification Bell */}
             <div className="relative">
                 <button onClick={() => setShowNotifications(!showNotifications)} aria-label="View notifications" className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors relative">
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (<span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>)}
                 </button>
                 {showNotifications && (
                    <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                        <div className="px-4 py-3 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center"><h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Notifications</h4></div>
                        <div className="max-h-64 overflow-y-auto">
                            {notifications.length > 0 ? notifications.map((interaction) => (
                                <div key={interaction.id} className="px-4 py-3 border-b border-slate-50">
                                    <p className="text-sm font-semibold">{formatInteractionTitle(interaction)}</p>
                                    <p className="text-xs text-slate-500 line-clamp-2">{interaction.content}</p>
                                    <p className="text-[10px] text-slate-400 mt-1">
                                        {interaction.timestamp ? new Date(interaction.timestamp).toLocaleString() : ''}
                                    </p>
                                </div>
                            )) : <div className="p-4 text-center text-xs">No notifications</div>}
                        </div>
                    </div>
                 )}
             </div>

             <div className="flex items-center gap-2 hover:bg-slate-50 p-1.5 rounded-full pr-3 border border-transparent hover:border-slate-200 transition-all">
                <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden border border-slate-300">
                    <img src={currentUser.avatar || `https://ui-avatars.com/api/?name=${currentUser.name}`} alt="User" />
                </div>
                <div className="hidden md:block text-left">
                    <div className="text-sm font-medium text-slate-700 leading-none">{currentUser.name}</div>
                    <div className="text-[10px] text-slate-500 font-medium mt-0.5">{currentUser.role}</div>
                </div>
             </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden bg-slate-50/50 relative">
        {/* Sidebar Nav */}
        <nav 
            className={`bg-white border-r border-slate-200 flex flex-col pt-4 overflow-y-auto no-scrollbar hidden lg:flex shrink-0 transition-all duration-300 ease-in-out text-slate-600 ${isSidebarCollapsed ? 'w-[80px]' : 'w-[260px]'}`}
        >
             {currentUser.role === 'BROKER' && (
                <>
                    <div className="px-3"><NavItem id="dialer" label="Dialer" icon={Phone} /></div>
                    <div className="px-3"><NavItem id="dashboard" label="Dashboard" icon={LayoutDashboard} /></div>
                    <div className="px-3"><NavItem id="inbox" label="Inbox" icon={InboxIcon} /></div>
                    <SectionHeader label="Business" />
                    <div className="px-3 space-y-0.5">
                        <NavItem id="leads" label="Leads" icon={UserIcon} badge={leads.length.toString()} />
                        <NavItem id="properties" label="Properties" icon={Home} />
                        <NavItem id="tasks" label="Tasks" icon={CheckSquare} badge={pendingTasks > 0 ? pendingTasks.toString() : undefined} />
                        <NavItem id="calendar" label="Calendar" icon={CalendarIcon} />
                        <NavItem id="maintenance" label="Maintenance" icon={Wrench} badge={openTickets > 0 ? openTickets.toString() : undefined} />
                    </div>
                </>
             )}
             
             {currentUser.role === 'OWNER' && (
                <>
                    <div className="px-3"><NavItem id="dashboard" label="Dashboard" icon={LayoutDashboard} /></div>
                    <div className="px-3 space-y-0.5 mt-2">
                        <NavItem id="properties" label="My Properties" icon={Home} />
                        <NavItem id="maintenance" label="Requests" icon={CheckCircle} badge={openTickets > 0 ? openTickets.toString() : undefined} />
                    </div>
                </>
             )}

             {currentUser.role === 'RENTER' && (
                 <>
                    <div className="px-3"><NavItem id="dashboard" label="Dashboard" icon={LayoutDashboard} /></div>
                    <div className="px-3 space-y-0.5 mt-2">
                        <NavItem id="my-home" label="My Home" icon={Home} />
                        <NavItem id="maintenance" label="Report Issue" icon={Wrench} />
                    </div>
                 </>
             )}

             {currentUser.role === 'CONTRACTOR' && (
                 <>
                    <div className="px-3"><NavItem id="dashboard" label="Dashboard" icon={LayoutDashboard} /></div>
                    <div className="px-3 space-y-0.5 mt-2">
                        <NavItem id="jobs" label="Jobs" icon={Briefcase} badge={scheduledTickets > 0 ? scheduledTickets.toString() : undefined} />
                        <NavItem id="schedule" label="Schedule" icon={CalendarIcon} />
                    </div>
                 </>
             )}
            
            {/* Sidebar Footer */}
            <div className="mt-auto p-4 border-t border-slate-200 space-y-3">
                 <button
                    onClick={onLogout}
                    className={`w-full flex items-center gap-2 text-sm text-red-600 hover:bg-red-50 rounded-lg px-3 py-2 transition-colors ${isSidebarCollapsed ? 'justify-center' : ''}`}
                    title={isSidebarCollapsed ? 'Sign out' : undefined}
                 >
                    <LogOut className="w-4 h-4" />
                    {!isSidebarCollapsed && <span className="font-medium">Sign out</span>}
                 </button>
                 <div className={`bg-slate-50 rounded-xl p-4 text-slate-500 transition-all duration-300 ${isSidebarCollapsed ? 'p-2' : 'p-4'}`}>
                     <div className="flex items-center gap-3 justify-center">
                         <Shield className="w-5 h-5 text-slate-500"/>
                         {!isSidebarCollapsed && <div className="text-xs font-medium">Eburon Secure</div>}
                     </div>
                </div>
            </div>
        </nav>

        {/* Content View Container */}
        <div className="flex-1 flex overflow-hidden bg-slate-50/50 relative">
            
            {/* List / Main View */}
            <div className={`flex-1 min-w-0 overflow-y-auto no-scrollbar p-4 md:p-8 transition-all duration-300 ${activeLead && currentUser.role === 'BROKER' && tab === 'leads' ? 'hidden lg:block' : 'block'}`}>
                <div className="max-w-7xl mx-auto h-full">
                    {tab === 'dashboard' && <DashboardView />}
                    {tab === 'dialer' && <DialerView />}
                    {tab === 'inbox' && <InboxView />}
                    {tab === 'tasks' && <TasksView />}
                    {(tab === 'calendar' || tab === 'schedule') && <CalendarView />}
                    {(tab === 'maintenance' || tab === 'jobs') && <MaintenanceView />}

                    {/* Leads Table for Broker (reused logic) */}
                    {tab === 'leads' && currentUser.role === 'BROKER' && (
                        <>
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-800">Leads</h2>
                                    <p className="text-slate-500 text-sm mt-1">Manage and track your potential clients</p>
                                </div>
                                <button 
                                    onClick={() => setShowLeadForm(true)}
                                    className="bg-black 600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-black 700 shadow-sm transition-colors flex items-center gap-2"
                                >
                                    <UserIcon className="w-4 h-4" />
                                    Add Lead
                                </button>
                            </div>
                            {showLeadForm && (
                                <LeadForm 
                                    onClose={() => setShowLeadForm(false)} 
                                    onSuccess={() => setShowLeadForm(false)} 
                                />
                            )}
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold border-b border-slate-100">
                                        <tr>
                                            <th className="px-6 py-4">Name</th>
                                            <th className="px-6 py-4 hidden md:table-cell">Interest</th>
                                            <th className="px-6 py-4 hidden sm:table-cell">Status</th>
                                            <th className="px-6 py-4"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {leads.map((lead) => (
                                            <tr 
                                                key={lead.id} 
                                                onClick={() => onSelectLead(lead)}
                                                className={`hover:bg-slate-50 cursor-pointer transition-colors ${selectedLeadId === lead.id ? 'bg-black 50/60' : ''}`}
                                            >
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0">
                                                            {lead.firstName[0]}{lead.lastName[0]}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="font-semibold text-slate-900 truncate">{lead.firstName} {lead.lastName}</div>
                                                            <div className="text-xs text-slate-500 truncate">{lead.phone}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 hidden md:table-cell whitespace-nowrap">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-slate-50 text-slate-700 border-slate-100">
                                                        {lead.interest}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 hidden sm:table-cell whitespace-nowrap">
                                                    <span className="text-slate-600 font-medium text-sm">{lead.status}</span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <ChevronRight className="w-4 h-4 text-slate-400" />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                    
                     {/* Properties Grid (reused logic) */}
                    {(tab === 'properties' || tab === 'my-home') && (
                        <>
                             <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold text-slate-800">Properties</h2>
                                {currentUser.role === 'BROKER' && <button onClick={handleAddProperty} className="bg-black 600 text-white px-4 py-2 rounded-lg text-sm font-medium">+ Add Property</button>}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {properties.map(prop => (
                                    <div key={prop.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition-all duration-300">
                                        <div className="h-48 bg-slate-200 relative">
                                            <img src={prop.image} alt="Property" className="w-full h-full object-cover" />
                                            <div className="absolute top-3 right-3 bg-white px-2 py-1 rounded text-xs font-bold">{prop.status}</div>
                                        </div>
                                        <div className="p-5">
                                            <div className="text-xl font-bold text-slate-900 mb-1">{prop.price}</div>
                                            <div className="text-slate-600 text-sm mb-4">{prop.address}</div>
                                            <a
                                                href={`${siteBaseUrl}/?listing=${encodeURIComponent(buildPropertySlug(prop))}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 hover:text-slate-900"
                                            >
                                                View on site
                                                <ChevronRight className="w-3 h-3" />
                                            </a>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Detail Pane (Broker Only) */}
            {activeLead && currentUser.role === 'BROKER' && tab === 'leads' && (
                <div className="w-full lg:w-[380px] shrink-0 bg-white border-l border-slate-200 shadow-2xl overflow-y-auto z-20 lg:relative absolute inset-0 lg:inset-auto animate-in slide-in-from-right duration-300 flex flex-col">
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Lead Details</h3>
                        <button onClick={() => onSelectLead(null)} aria-label="Close lead details" className="p-1 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5 text-slate-500" /></button>
                    </div>
                    <div className="p-6">
                         <div className="flex items-center gap-4 mb-6">
                             <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl flex items-center justify-center text-2xl font-bold text-white shadow-lg shadow-indigo-200">
                                {activeLead.firstName[0]}{activeLead.lastName[0]}
                             </div>
                             <div>
                                <h2 className="text-xl font-bold text-slate-900">{activeLead.firstName} {activeLead.lastName}</h2>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${activeLead.status === 'New' ? 'bg-slate-50 text-slate-700 border-slate-100' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                    {activeLead.status}
                                </span>
                             </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-8">
                            <a href={`tel:${activeLead.phone}`} className="flex flex-col items-center justify-center p-3 bg-black 50 hover:bg-black 100 border border-black 100 rounded-xl transition-colors group cursor-pointer">
                                <div className="w-8 h-8 bg-black 200 text-white 700 rounded-full flex items-center justify-center mb-2 group-hover:bg-white group-hover:scale-110 transition-all shadow-sm">
                                    <Phone className="w-4 h-4 fill-current" />
                                </div>
                                <span className="text-xs font-bold text-white 900">Call Mobile</span>
                                <span className="text-[10px] text-white 600 font-medium truncate max-w-full">{activeLead.phone}</span>
                            </a>
                            
                            <a href={`mailto:${activeLead.email}`} className="flex flex-col items-center justify-center p-3 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-xl transition-colors group cursor-pointer">
                                <div className="w-8 h-8 bg-slate-200 text-slate-600 rounded-full flex items-center justify-center mb-2 group-hover:bg-white group-hover:scale-110 transition-all shadow-sm">
                                    <Mail className="w-4 h-4" />
                                </div>
                                <span className="text-xs font-bold text-slate-900">Send Email</span>
                                <span className="text-[10px] text-slate-500 font-medium truncate max-w-full">{activeLead.email}</span>
                            </a>
                        </div>

                         <div className="mb-6">
                             <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">History</h4>
                             {activeLead.recordings.map(rec => (
                                 <div key={rec.id} className="bg-slate-50 p-3 rounded-lg mb-2 flex justify-between items-center">
                                     <div className="flex items-center gap-2">
                                        {getStatusIcon(rec.outcome)}
                                        <span className="text-sm font-medium">{new Date(rec.timestamp).toLocaleDateString()}</span>
                                     </div>
                                     <span className="text-xs font-mono">{rec.duration}s</span>
                                 </div>
                             ))}
                             {activeLead.recordings.length === 0 && <p className="text-xs text-slate-400 italic">No calls yet.</p>}
                         </div>
                         <div className="mb-6">
                             <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Call Insights</h4>
                             {leadStructuredOutputs.length > 0 ? (
                                 <div className="space-y-3">
                                     {leadStructuredOutputs.map(({ interaction, structuredData }) => (
                                         <div key={interaction.id || interaction.timestamp} className="bg-slate-50 p-3 rounded-lg">
                                             <div className="flex items-center justify-between mb-2">
                                                 <div className="text-xs font-semibold text-slate-700">Structured Output</div>
                                                 <div className="text-[10px] text-slate-400">
                                                     {interaction.timestamp ? new Date(interaction.timestamp).toLocaleString() : ''}
                                                 </div>
                                             </div>
                                             <div className="text-xs text-slate-600 mb-2">{interaction.content}</div>
                                             <div className="text-[11px] text-slate-600 whitespace-pre-wrap bg-white border border-slate-200 rounded-lg p-2 max-h-52 overflow-y-auto">
                                                 {typeof structuredData === 'string'
                                                     ? structuredData
                                                     : JSON.stringify(structuredData, null, 2)}
                                             </div>
                                         </div>
                                     ))}
                                 </div>
                             ) : (
                                 <p className="text-xs text-slate-400 italic">No structured outputs yet.</p>
                             )}
                         </div>
                         <div>
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Notes</h4>
                            <div className="bg-slate-50 p-3 rounded-lg text-sm text-slate-600 mb-3 max-h-40 overflow-y-auto whitespace-pre-wrap">
                                {activeLead.notes || 'No notes available.'}
                            </div>
                            <textarea 
                                value={noteInput} 
                                onChange={e => setNoteInput(e.target.value)} 
                                className="w-full p-3 border border-slate-200 rounded-lg text-sm bg-white min-h-[100px] outline-none focus:ring-2 focus:ring-slate-900 500/20"
                                placeholder="Add a new note..."
                            />
                            <button onClick={handleSaveNote} className="mt-2 w-full bg-black 600 text-white py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-black 700 transition-colors">Save Note</button>
                         </div>
                    </div>
                </div>
            )}

            {showTicketForm && (
                <TicketForm
                  currentUser={currentUser}
                  onClose={() => setShowTicketForm(false)}
                  onSuccess={() => {
                      refreshTickets();
                      setShowTicketForm(false);
                  }}
                />
            )}

            {showListingForm && (
                <ListingForm
                  onClose={() => setShowListingForm(false)}
                  onSuccess={() => setShowListingForm(false)}
                />
            )}

        </div>
      </div>
    </div>
  );
};

export default CRM;
