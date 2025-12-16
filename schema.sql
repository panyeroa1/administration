-- Create Listings Table
CREATE TABLE IF NOT EXISTS public.listings (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    price CONSTANT INTEGER, -- or NUMERIC
    "imageUrls" TEXT[],
    "energyClass" TEXT,
    type TEXT,
    size INTEGER,
    description TEXT,
    bedrooms INTEGER,
    "petsAllowed" BOOLEAN DEFAULT FALSE,
    "ownerId" TEXT
);

-- Create Leads Table
CREATE TABLE IF NOT EXISTS public.leads (
    id TEXT PRIMARY KEY,
    "firstName" TEXT,
    "lastName" TEXT,
    phone TEXT,
    email TEXT,
    status TEXT,
    interest TEXT,
    "lastActivity" TEXT,
    notes TEXT,
    recordings JSONB DEFAULT '[]'
);

-- Create Properties Table
CREATE TABLE IF NOT EXISTS public.properties (
    id TEXT PRIMARY KEY,
    address TEXT,
    price TEXT,
    type TEXT,
    status TEXT,
    image TEXT
);

-- Create Tasks Table
CREATE TABLE IF NOT EXISTS public.tasks (
    id TEXT PRIMARY KEY,
    title TEXT,
    "dueDate" TIMESTAMP with time zone,
    completed BOOLEAN DEFAULT FALSE,
    "leadId" TEXT,
    "leadName" TEXT,
    priority TEXT
);

-- Create Agents Table
CREATE TABLE IF NOT EXISTS public.agents (
    id TEXT PRIMARY KEY,
    name TEXT,
    role TEXT,
    tone TEXT,
    "languageStyle" TEXT,
    objectives TEXT[],
    "systemPrompt" TEXT,
    "voiceId" TEXT,
    "voiceSpeed" NUMERIC,
    model TEXT,
    tools TEXT[],
    "firstSentence" TEXT
);

-- Create Tickets Table
CREATE TABLE IF NOT EXISTS public.tickets (
    id TEXT PRIMARY KEY,
    title TEXT,
    description TEXT,
    status TEXT,
    priority TEXT,
    "propertyId" TEXT,
    "propertyAddress" TEXT,
    "assignedTo" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP with time zone
);

-- Enable Row Level Security (RLS) - Optional but recommended
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Create Policies (Public Read/Write for demo purposes - Lock down in prod)
CREATE POLICY "Public Read Listings" ON public.listings FOR SELECT USING (true);
CREATE POLICY "Public Read Leads" ON public.leads FOR SELECT USING (true);
CREATE POLICY "Public Insert Leads" ON public.leads FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Leads" ON public.leads FOR UPDATE USING (true);
