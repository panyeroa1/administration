
import { supabase } from '../supabaseClient';
import { Lead, Property, Ticket, User, UserRole, Task, AgentPersona, ApartmentSearchFilters, Listing } from '../types';
import { MOCK_LEADS, MOCK_PROPERTIES, DEFAULT_AGENT_PERSONA, MOCK_LISTINGS } from '../constants';

// MOCK DATA FALLBACKS (In case DB tables don't exist yet)

let localProperties = [...MOCK_PROPERTIES];
let localListings = [...MOCK_LISTINGS];




export const db = {
  // --- USERS ---
  async getUserProfile(userId: string): Promise<User | null> {
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (error || !data) return null;
      return data as User;
    } catch (e) {
      console.log('Using local/auth user');
      return null;
    }
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

  // --- PROPERTIES ---
  async getProperties(): Promise<Property[]> {
    try {
      const { data, error } = await supabase.from('properties').select('*');
      if (error) throw error;
      return data as Property[];
    } catch (e) {
      return localProperties;
    }
  },

  // --- LISTINGS (Landing Page) ---
  async searchListings(filters: ApartmentSearchFilters): Promise<Listing[]> {
      try {
          // Attempt real DB search if 'listings' table exists
          let query = supabase.from('listings').select('*');
          
          if (filters.city) query = query.ilike('address', `%${filters.city}%`);
          if (filters.minPrice) query = query.gte('price', filters.minPrice);
          if (filters.maxPrice) query = query.lte('price', filters.maxPrice);
          if (filters.minSize) query = query.gte('size', filters.minSize);
          if (filters.bedrooms) query = query.gte('bedrooms', filters.bedrooms);
          if (filters.type) query = query.eq('type', filters.type);
          if (filters.petsAllowed !== undefined && filters.petsAllowed !== null) query = query.eq('petsAllowed', filters.petsAllowed);

          const { data, error } = await query;
          if (error) throw error;
          if (data && data.length > 0) return data as Listing[];
          throw new Error("No data or table missing");
      } catch (e) {
          // Local Filter Logic
          console.log("DB: Using local listings filter");
          let results = localListings;
          
          if (filters.city) {
              results = results.filter(l => l.address.toLowerCase().includes(filters.city!.toLowerCase()));
          }
          if (filters.minPrice) results = results.filter(l => l.price >= filters.minPrice!);
          if (filters.maxPrice) results = results.filter(l => l.price <= filters.maxPrice!);
          if (filters.minSize) results = results.filter(l => l.size >= filters.minSize!);
          if (filters.bedrooms) results = results.filter(l => l.bedrooms >= filters.bedrooms!);
          if (filters.type) results = results.filter(l => l.type === filters.type);
          if (filters.petsAllowed !== undefined && filters.petsAllowed !== null) {
               results = results.filter(l => l.petsAllowed === filters.petsAllowed);
          }

          if (filters.sortBy) {
              if (filters.sortBy === 'price_asc') results.sort((a, b) => a.price - b.price);
              if (filters.sortBy === 'price_desc') results.sort((a, b) => b.price - a.price);
              if (filters.sortBy === 'size') results.sort((a, b) => b.size - a.size);
          }

          return results;
      }
  },

  async createReservation(data: any): Promise<boolean> {
      try {
          const { error } = await supabase.from('reservations').insert(data);
          if (error) throw error;
          return true;
      } catch (e) {
          console.log("DB: Reservation saved locally (mock)");
          return true;
      }
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
    const { data, error } = await supabase.from('tickets').select('*').order('created_at', { ascending: false });
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
      const { data, error } = await supabase.from('tasks').select('*').order('due_date', { ascending: true });
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
  }
};
