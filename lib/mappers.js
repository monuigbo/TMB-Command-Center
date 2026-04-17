// Converts between app camelCase format and Supabase snake_case columns

// ---- LEADS ----
export function leadToRow(lead, userId) {
  return {
    id: lead.id,
    user_id: userId,
    first_name: lead.firstName || "",
    last_name: lead.lastName || "",
    company_name: lead.companyName || "",
    phone: lead.phone || "",
    email: lead.email || "",
    address1: lead.address1 || "",
    city: lead.city || "",
    state: lead.state || "",
    postal_code: lead.postalCode || "",
    source: lead.source || "",
    tags: lead.tags || [],
    industry: lead.industry || "",
    temperature: lead.temperature || "",
    pipeline: lead.pipeline || "sales",
    stage: lead.stage || "New Lead",
    monetary_value: lead.monetaryValue || "",
    notes: lead.notes || "",
    commitments: lead.commitments || [],
    created_at: lead.createdAt || new Date().toISOString(),
    last_contact_at: lead.lastContactAt || null,
    history: lead.history || [],
    ghl_contact_id: lead.ghlContactId || null,
    ghl_sync_status: lead.ghlSyncStatus || "not_synced",
    ghl_last_synced: lead.ghlLastSynced || null,
    ghl_location_id: lead.ghlLocationId || null,
  };
}

export function rowToLead(row) {
  return {
    id: row.id,
    firstName: row.first_name || "",
    lastName: row.last_name || "",
    companyName: row.company_name || "",
    phone: row.phone || "",
    email: row.email || "",
    address1: row.address1 || "",
    city: row.city || "",
    state: row.state || "",
    postalCode: row.postal_code || "",
    source: row.source || "",
    tags: row.tags || [],
    industry: row.industry || "",
    temperature: row.temperature || "",
    pipeline: row.pipeline || "sales",
    stage: row.stage || "New Lead",
    monetaryValue: row.monetary_value || "",
    notes: row.notes || "",
    commitments: row.commitments || [],
    createdAt: row.created_at,
    lastContactAt: row.last_contact_at,
    history: row.history || [],
    ghlSyncStatus: row.ghl_sync_status || "not_synced",
    ghlContactId: row.ghl_contact_id || null,
    ghlLastSynced: row.ghl_last_synced || null,
    ghlLocationId: row.ghl_location_id || null,
  };
}

// ---- TASKS ----
export function taskToRow(task, userId) {
  return {
    id: task.id,
    user_id: userId,
    text: task.text || "",
    done: !!task.done,
    priority: task.priority || "medium",
    linked_lead: task.linkedLead || "",
    created_at: task.createdAt || new Date().toISOString(),
  };
}

export function rowToTask(row) {
  return {
    id: row.id,
    text: row.text || "",
    done: !!row.done,
    priority: row.priority || "medium",
    linkedLead: row.linked_lead || "",
    createdAt: row.created_at,
  };
}

// ---- PROSPECTING LOG ----
export function prospectToRow(entry, userId) {
  return {
    id: entry.id,
    user_id: userId,
    date: entry.date,
    type: entry.type,
    timestamp: entry.timestamp || new Date().toISOString(),
    list_id: entry.listId || null,
    contact_id: entry.contactId || null,
    outcome: entry.outcome || null,
    notes: entry.notes || "",
  };
}

export function rowToProspect(row) {
  return {
    id: row.id,
    date: row.date,
    type: row.type,
    timestamp: row.timestamp,
    listId: row.list_id || undefined,
    contactId: row.contact_id || undefined,
    outcome: row.outcome || undefined,
    notes: row.notes || "",
  };
}

// ---- CALL LISTS (stored as "Prospect Lists" in UI — same DB table) ----
export function callListToRow(list, userId) {
  return {
    id: list.id,
    user_id: userId,
    name: list.name || "",
    industry: list.industry || "",
    // v1 new fields (additive — nullable in DB)
    niche: list.niche || null,
    emoji: list.emoji || null,
    notes: list.notes || null,
    last_cursor: list.lastCursor || null,
    archived_at: list.archivedAt || null,
    created_at: list.createdAt || new Date().toISOString(),
    contacts: list.contacts || [],
  };
}

export function rowToCallList(row) {
  return {
    id: row.id,
    name: row.name || "",
    industry: row.industry || "",
    niche: row.niche || "",
    emoji: row.emoji || "",
    notes: row.notes || "",
    lastCursor: row.last_cursor || null,
    archivedAt: row.archived_at || null,
    createdAt: row.created_at,
    contacts: row.contacts || [],
  };
}

// ---- AI CONVERSATIONS ----
export function convoToRow(convo, userId) {
  return {
    id: convo.id,
    user_id: userId,
    timestamp: convo.timestamp || new Date().toISOString(),
    date: convo.date,
    user_message: convo.userMessage || "",
    ai_response: convo.aiResponse || "",
    extracted_data: convo.extractedData || {},
  };
}

export function rowToConvo(row) {
  return {
    id: row.id,
    timestamp: row.timestamp,
    date: row.date,
    userMessage: row.user_message || "",
    aiResponse: row.ai_response || "",
    extractedData: row.extracted_data || {},
  };
}

// ---- SETTINGS ----
export function settingsToRow(settings, userId) {
  return {
    user_id: userId,
    daily_target: settings.dailyTarget || 5,
  };
}

export function rowToSettings(row) {
  return {
    dailyTarget: row.daily_target || 5,
  };
}
