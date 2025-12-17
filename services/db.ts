import { supabase } from '../supabaseClient';
import { Lead, Property, Ticket, User, Task, AgentPersona, ApartmentSearchFilters, Listing, Interaction } from '../types';

// MOCK DATA FALLBACKS REMOVED - STRICTLY USING DB

export const db = {
  // --- USERS ---
  async getUserProfile(userId: string): Promise<User | null> {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (error || !data) {
        console.error('DB: Fetch User Profile Error', error);
        return null; 
      }
      return data as User;
  },

  async createUserProfile(user: User) {
    const { error } = await supabase.from('profiles').upsert(user);
    if (error) {
        console.error('DB: Profile creation failed', error);
        throw error;
    }
  },

  // --- LEADS ---
  async getLeads(): Promise<Lead[]> {
    const { data, error } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
    if (error) {
        console.error('DB: Fetch Leads Error', error);
        return [];
    }
    return data as Lead[];
  },

  async getLeadById(leadId: string): Promise<Lead | null> {
    const { data, error } = await supabase.from('leads').select('*').eq('id', leadId).single();
    if (error || !data) {
      if (error) {
        console.error('DB: Fetch Lead Error', error);
      }
      return null;
    }
    return data as Lead;
  },

  async updateLead(lead: Lead) {
      const { error } = await supabase.from('leads').upsert(lead);
      if (error) {
          console.error('DB: Update Lead Error', error);
          throw error;
      }
  },

  async createLead(lead: Lead) {
      const { error } = await supabase.from('leads').insert(lead);
      if (error) {
          console.error('DB: Create Lead Error', error);
          throw error;
      }
  },

  async appendLeadNotes(leadId: string, note: string, lastActivity?: string) {
      const lead = await this.getLeadById(leadId);
      if (!lead) return;

      const updatedNotes = lead.notes ? `${lead.notes}\n\n${note}` : note;
      const payload: Partial<Lead> = { notes: updatedNotes };
      if (lastActivity) {
        payload.lastActivity = lastActivity;
      }

      const { error } = await supabase.from('leads').update(payload).eq('id', leadId);
      if (error) {
          console.error('DB: Append Lead Notes Error', error);
          throw error;
      }
  },

  // --- PROPERTIES ---
  async getProperties(): Promise<Property[]> {
      const { data, error } = await supabase.from('properties').select('*');
      if (error) {
          console.error('DB: Fetch Properties Error', error);
          return [];
      }
      return data as Property[];
  },

  // --- LISTINGS (Landing Page) ---
  async createListing(listing: Listing): Promise<void> {
      const { error } = await supabase.from('listings').insert(listing);
      if (error) {
          console.error('DB: Create Listing Error', error);
          throw error;
      }
      // Also sync to 'properties' for the CRM view if needed, or assume they are separate. 
      // For now, let's create a property entry too so it shows up in CRM.
      const propertyCtx: Property = {
          id: listing.id,
          address: listing.address,
          price: `€ ${listing.price}`,
          type: listing.type,
          status: 'Active',
          image: listing.imageUrls?.[0] || ''
      };
      await supabase.from('properties').insert(propertyCtx);
  },

  async searchListings(filters: ApartmentSearchFilters): Promise<Listing[]> {
      // Attempt real DB search
      let query = supabase.from('listings').select('*');
      
      if (filters.city) query = query.ilike('address', `%${filters.city}%`);
      if (filters.minPrice) query = query.gte('price', filters.minPrice);
      if (filters.maxPrice) query = query.lte('price', filters.maxPrice);
      if (filters.minSize) query = query.gte('size', filters.minSize);
      if (filters.bedrooms) query = query.gte('bedrooms', filters.bedrooms);
      if (filters.type) query = query.eq('type', filters.type);
      if (filters.petsAllowed !== undefined && filters.petsAllowed !== null) query = query.eq('petsAllowed', filters.petsAllowed);

      const { data, error } = await query;
      if (error) {
          console.error('DB: Fetch Listings Error', error);
          return [];
      }
      return (data || []) as Listing[];
  },

  async saveLeadFromVoice(leadData: Partial<Lead>): Promise<void> {
      const newLead: Lead = {
          id: `voice-${Date.now()}`,
          firstName: leadData.firstName || 'Voice',
          lastName: leadData.lastName || 'User',
          phone: leadData.phone || 'Unknown',
          email: leadData.email || 'unknown@example.com',
          status: 'New',
          interest: leadData.interest || 'Renting',
          lastActivity: 'Voice Search Interaction',
          notes: leadData.notes || 'Generated from Homie voice search',
          recordings: []
      };
      await this.createLead(newLead);
  },

  // --- TICKETS ---
  async getTickets(): Promise<Ticket[]> {
    const { data, error } = await supabase.from('tickets').select('*').order('createdAt', { ascending: false });
    if (error) {
        console.error('DB: Fetch Tickets Error', error);
        return [];
    }
    return data as Ticket[];
  },

  async updateTicket(ticket: Ticket) {
     const { error } = await supabase.from('tickets').upsert(ticket);
     if(error) {
         console.error('DB: Update Ticket Error', error);
         throw error;
     }
  },

  async createTicket(ticket: Ticket) {
      const { error } = await supabase.from('tickets').insert(ticket);
      if(error) {
          console.error('DB: Create Ticket Error', error);
          throw error;
      }
  },

  // --- TASKS ---
  async getTasks(): Promise<Task[]> {
      const { data, error } = await supabase.from('tasks').select('*').order('dueDate', { ascending: true });
      if(error) {
          console.error('DB: Fetch Tasks Error', error);
          return [];
      }
      return data as Task[];
  },

  async createTask(task: Task) {
      const { error } = await supabase.from('tasks').insert(task);
      if(error) {
          console.error('DB: Create Task Error', error);
          throw error;
      }
  },

  async updateTask(task: Task) {
      const { error } = await supabase.from('tasks').upsert(task);
      if(error) {
          console.error('DB: Update Task Error', error);
          throw error;
      }
  },

  // --- AGENTS ---
  async getAgents(): Promise<AgentPersona[]> {
    const { data, error } = await supabase.from('agents').select('*');
    if (error) {
        console.error('DB: Fetch Agents Error', error);
        return []; 
    }
    return data as AgentPersona[];
  },

  async createAgent(agent: AgentPersona) {
      const { error } = await supabase.from('agents').upsert(agent);
      if (error) {
          console.error('DB: Agent save failed', error);
          throw error;
      }
  },

  // --- INTERACTIONS ---
  async createInteraction(interaction: any) {
      const { error } = await supabase.from('interactions').insert(interaction);
      if (error) {
          console.error('DB: Create Interaction Error', error);
          // Don't throw, just log, so we don't break the UI flow
      }
  },

  async getInteractions(): Promise<Interaction[]> {
      const { data, error } = await supabase.from('interactions').select('*').order('timestamp', { ascending: false });
      if (error) {
          console.error('DB: Fetch Interactions Error', error);
          return [];
      }
      return data as Interaction[];
  }
};
