export async function submitJournalEntry(entry, date, mode = "venting") {
  const res = await fetch("http://localhost:5001/journal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ entry, date, mode }), // ✅ wrap entry, date, and mode in an object
  });
  
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const error = new Error(errorData.error || "Failed to submit entry");
    throw error;
  }
  
  return res.json();
}

export async function fetchEntries() {
  const res = await fetch("http://localhost:5001/entries");
  return res.json();
}

export async function fetchEntryByDate(date) {
  const res = await fetch(`http://localhost:5001/entries?date=${date}`);
  const data = await res.json();
  return data; // Returns entry object or empty object
}

export async function generateGoal(conversation, date) {
  const res = await fetch("http://localhost:5001/goal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ conversation, date }),
  });
  return res.json();
}

export async function deleteEntry(date, mode = null) {
  const url = mode 
    ? `http://localhost:5001/entries/${date}?mode=${mode}`
    : `http://localhost:5001/entries/${date}`;
  const res = await fetch(url, {
    method: "DELETE",
  });
  if (!res.ok) {
    throw new Error("Failed to delete entry");
  }
  return res.json();
}

export async function fetchSentimentTrends() {
  const res = await fetch("http://localhost:5001/insights/sentiment-trends");
  if (!res.ok) {
    throw new Error("Failed to fetch sentiment trends");
  }
  return res.json();
}

export async function fetchAIInsights(period = "weekly", date = null) {
  const url = new URL("http://localhost:5001/insights/ai-summary");
  url.searchParams.append("period", period);
  if (date) {
    url.searchParams.append("date", date);
  }
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("Failed to fetch AI insights");
  }
  return res.json();
}

export async function fetchPrompts(date = null) {
  const url = new URL("http://localhost:5001/prompts");
  if (date) {
    url.searchParams.append("date", date);
  }
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("Failed to fetch prompts");
  }
  return res.json();
}

export async function savePrompts(date, prompts) {
  const res = await fetch("http://localhost:5001/prompts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ date, prompts }),
  });
  if (!res.ok) {
    throw new Error("Failed to save prompts");
  }
  return res.json();
}

export async function getSavedPrompts(date) {
  const url = new URL("http://localhost:5001/prompts/saved");
  url.searchParams.append("date", date);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("Failed to fetch saved prompts");
  }
  return res.json();
}