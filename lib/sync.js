import {
  leadToRow, rowToLead,
  taskToRow, rowToTask,
  prospectToRow, rowToProspect,
  callListToRow, rowToCallList,
  convoToRow, rowToConvo,
  settingsToRow, rowToSettings,
} from "./mappers";

const DEFAULT_STATE = {
  leads: [],
  tasks: [],
  prospectingLog: [],
  aiConversations: [],
  callLists: [],
  settings: { dailyTarget: 5 },
};

// Load all data from Supabase in parallel
export async function loadFromSupabase(supabase, userId) {
  const [leads, tasks, prospecting, callLists, convos, settings] = await Promise.all([
    supabase.from("leads").select("*").eq("user_id", userId),
    supabase.from("tasks").select("*").eq("user_id", userId),
    supabase.from("prospecting_log").select("*").eq("user_id", userId).order("timestamp", { ascending: true }),
    supabase.from("call_lists").select("*").eq("user_id", userId),
    supabase.from("ai_conversations").select("*").eq("user_id", userId).order("timestamp", { ascending: true }),
    supabase.from("settings").select("*").eq("user_id", userId).single(),
  ]);

  const hasData =
    (leads.data && leads.data.length > 0) ||
    (tasks.data && tasks.data.length > 0) ||
    (prospecting.data && prospecting.data.length > 0) ||
    (callLists.data && callLists.data.length > 0) ||
    (convos.data && convos.data.length > 0) ||
    (settings.data !== null && !settings.error);

  if (!hasData) return { state: null, hasData: false };

  return {
    hasData: true,
    state: {
      leads: (leads.data || []).map(rowToLead),
      tasks: (tasks.data || []).map(rowToTask),
      prospectingLog: (prospecting.data || []).map(rowToProspect),
      callLists: (callLists.data || []).map(rowToCallList),
      aiConversations: (convos.data || []).map(rowToConvo),
      settings: settings.data ? rowToSettings(settings.data) : DEFAULT_STATE.settings,
    },
  };
}

// Generate a simple unique ID (matches uid() in page.js)
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// Migrate localStorage data to Supabase (one-time)
export async function migrateToSupabase(supabase, userId, localState) {
  const errors = [];

  // Ensure prospecting log entries have IDs
  const prospectingWithIds = localState.prospectingLog.map((entry) => ({
    ...entry,
    id: entry.id || uid(),
  }));

  // Upsert leads
  if (localState.leads.length > 0) {
    const { error } = await supabase
      .from("leads")
      .upsert(localState.leads.map((l) => leadToRow(l, userId)));
    if (error) errors.push("leads: " + error.message);
  }

  // Upsert tasks
  if (localState.tasks.length > 0) {
    const { error } = await supabase
      .from("tasks")
      .upsert(localState.tasks.map((t) => taskToRow(t, userId)));
    if (error) errors.push("tasks: " + error.message);
  }

  // Upsert prospecting log
  if (prospectingWithIds.length > 0) {
    const { error } = await supabase
      .from("prospecting_log")
      .upsert(prospectingWithIds.map((p) => prospectToRow(p, userId)));
    if (error) errors.push("prospecting_log: " + error.message);
  }

  // Upsert call lists
  if (localState.callLists.length > 0) {
    const { error } = await supabase
      .from("call_lists")
      .upsert(localState.callLists.map((cl) => callListToRow(cl, userId)));
    if (error) errors.push("call_lists: " + error.message);
  }

  // Upsert AI conversations
  if (localState.aiConversations.length > 0) {
    const { error } = await supabase
      .from("ai_conversations")
      .upsert(localState.aiConversations.map((c) => convoToRow(c, userId)));
    if (error) errors.push("ai_conversations: " + error.message);
  }

  // Upsert settings
  const { error: settingsErr } = await supabase
    .from("settings")
    .upsert(settingsToRow(localState.settings || DEFAULT_STATE.settings, userId));
  if (settingsErr) errors.push("settings: " + settingsErr.message);

  if (errors.length > 0) {
    console.error("Migration errors:", errors);
    return { ok: false, errors };
  }

  localStorage.setItem("tmb_migrated", "true");
  return { ok: true, errors: [] };
}

// Diff-based sync: only upsert what changed, delete what was removed
export async function saveToSupabase(supabase, userId, state, prevState) {
  if (!prevState) {
    // First sync after load — push everything
    await fullSync(supabase, userId, state);
    return;
  }

  const ops = [];

  // Leads
  if (state.leads !== prevState.leads) {
    const changed = state.leads.filter((l) => {
      const prev = prevState.leads.find((p) => p.id === l.id);
      return !prev || prev !== l;
    });
    if (changed.length > 0) {
      ops.push(supabase.from("leads").upsert(changed.map((l) => leadToRow(l, userId))));
    }
    const deleted = prevState.leads.filter((p) => !state.leads.some((l) => l.id === p.id));
    if (deleted.length > 0) {
      ops.push(supabase.from("leads").delete().in("id", deleted.map((d) => d.id)));
    }
  }

  // Tasks
  if (state.tasks !== prevState.tasks) {
    const changed = state.tasks.filter((t) => {
      const prev = prevState.tasks.find((p) => p.id === t.id);
      return !prev || prev !== t;
    });
    if (changed.length > 0) {
      ops.push(supabase.from("tasks").upsert(changed.map((t) => taskToRow(t, userId))));
    }
    const deleted = prevState.tasks.filter((p) => !state.tasks.some((t) => t.id === p.id));
    if (deleted.length > 0) {
      ops.push(supabase.from("tasks").delete().in("id", deleted.map((d) => d.id)));
    }
  }

  // Prospecting log (append-only, no deletes)
  if (state.prospectingLog !== prevState.prospectingLog) {
    const newEntries = state.prospectingLog.filter(
      (e) => e.id && !prevState.prospectingLog.some((p) => p.id === e.id)
    );
    if (newEntries.length > 0) {
      ops.push(supabase.from("prospecting_log").upsert(newEntries.map((e) => prospectToRow(e, userId))));
    }
  }

  // Call lists
  if (state.callLists !== prevState.callLists) {
    const changed = state.callLists.filter((cl) => {
      const prev = prevState.callLists.find((p) => p.id === cl.id);
      return !prev || prev !== cl;
    });
    if (changed.length > 0) {
      ops.push(supabase.from("call_lists").upsert(changed.map((cl) => callListToRow(cl, userId))));
    }
    const deleted = prevState.callLists.filter((p) => !state.callLists.some((cl) => cl.id === p.id));
    if (deleted.length > 0) {
      ops.push(supabase.from("call_lists").delete().in("id", deleted.map((d) => d.id)));
    }
  }

  // AI conversations (append-only)
  if (state.aiConversations !== prevState.aiConversations) {
    const newConvos = state.aiConversations.filter(
      (c) => !prevState.aiConversations.some((p) => p.id === c.id)
    );
    if (newConvos.length > 0) {
      ops.push(supabase.from("ai_conversations").upsert(newConvos.map((c) => convoToRow(c, userId))));
    }
  }

  // Settings
  if (state.settings !== prevState.settings) {
    ops.push(supabase.from("settings").upsert(settingsToRow(state.settings, userId)));
  }

  if (ops.length > 0) {
    await Promise.all(ops);
  }
}

// Full sync — used on first save after loading from Supabase
async function fullSync(supabase, userId, state) {
  const ops = [];

  if (state.leads.length > 0) {
    ops.push(supabase.from("leads").upsert(state.leads.map((l) => leadToRow(l, userId))));
  }
  if (state.tasks.length > 0) {
    ops.push(supabase.from("tasks").upsert(state.tasks.map((t) => taskToRow(t, userId))));
  }
  const prosWithIds = state.prospectingLog.filter((e) => e.id);
  if (prosWithIds.length > 0) {
    ops.push(supabase.from("prospecting_log").upsert(prosWithIds.map((e) => prospectToRow(e, userId))));
  }
  if (state.callLists.length > 0) {
    ops.push(supabase.from("call_lists").upsert(state.callLists.map((cl) => callListToRow(cl, userId))));
  }
  if (state.aiConversations.length > 0) {
    ops.push(supabase.from("ai_conversations").upsert(state.aiConversations.map((c) => convoToRow(c, userId))));
  }
  ops.push(supabase.from("settings").upsert(settingsToRow(state.settings, userId)));

  await Promise.all(ops);
}

// Returns a debounced sync function (1s trailing)
export function createDebouncedSync(supabase, userId, delay = 1000) {
  let timer = null;
  return (state, prevState) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(async () => {
      try {
        await saveToSupabase(supabase, userId, state, prevState);
      } catch (err) {
        console.error("Supabase sync error:", err);
      }
    }, delay);
  };
}
