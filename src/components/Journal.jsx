import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import JournalCard from "./JournalCard";
import StreakBadge from "./StreakBadge";
import { submitJournalEntry } from "../api/journalApi";

export default function Journal() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedDate = searchParams.get("date") || new Date().toISOString().split("T")[0];
  
  const [entry, setEntry] = useState("");
  const [existingEntry, setExistingEntry] = useState(null);
  const [mode, setMode] = useState("venting"); // Track current mode
  const [conversation, setConversation] = useState([]); // Track conversation thread
  const [isSaved, setIsSaved] = useState(false); // Track save status for venting mode
  const [goal, setGoal] = useState(null); // Track goal for conversation mode
  const [streakRefresh, setStreakRefresh] = useState(0); // Trigger for refreshing streak
  const entryRef = useRef(entry); // Keep ref to current entry value
  
  // Keep ref in sync with state
  useEffect(() => {
    entryRef.current = entry;
  }, [entry]);

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString + "T00:00:00"); // Add time to avoid timezone issues
    const options = { year: "numeric", month: "long", day: "numeric" };
    return date.toLocaleDateString("en-US", options);
  };

  // Check if selected date is in the future
  const today = new Date().toISOString().split("T")[0];
  const isFutureDate = selectedDate > today;
  const canCreateNewEntry = !isFutureDate || existingEntry !== null;

  // Fetch entry for selected date on load
  useEffect(() => {
    const loadEntry = async () => {
      // Try to fetch conversation entry first (most recent activity)
      const conversationData = await fetch(`http://localhost:5001/entries?date=${selectedDate}&mode=conversation`).then(r => r.json());
      const ventingData = await fetch(`http://localhost:5001/entries?date=${selectedDate}&mode=venting`).then(r => r.json());
      
      // Check if conversation data is valid (has mode and conversation/text)
      const hasValidConversation = conversationData && 
        Object.keys(conversationData).length > 0 && 
        conversationData.mode === "conversation" && 
        conversationData.conversation;
      
      // Check if venting data is valid (has mode and text)
      const hasValidVenting = ventingData && 
        Object.keys(ventingData).length > 0 && 
        ventingData.mode === "venting" && 
        ventingData.text;
      
      // Prioritize conversation entry if it exists and is valid
      const data = hasValidConversation 
        ? conversationData 
        : hasValidVenting 
          ? ventingData 
          : null;
      
      // Check if data is a valid entry (has mode and either conversation or text)
      const isValidEntry = data && (
        (data.mode === "conversation" && data.conversation && Array.isArray(data.conversation)) ||
        (data.mode === "venting" && data.text)
      );
      
      if (isValidEntry) {
        setExistingEntry(data);
        
        // Determine mode based on entry data
        if (data.mode === "conversation" && data.conversation && Array.isArray(data.conversation)) {
          setMode("conversation");
          setConversation(data.conversation);
          setGoal(data.goal || null);
          setEntry("");
          setIsSaved(false);
        } else if (data.mode === "venting" && data.text) {
          setMode("venting");
          setEntry(data.text);
          setConversation([]);
          setGoal(null);
          setIsSaved(false);
        } else {
          // Entry exists but doesn't match expected format - default to venting
          setMode("venting");
          setEntry(data.text || "");
          setConversation([]);
          setGoal(null);
          setIsSaved(false);
        }
      } else {
        // No entry found - default to venting
        setExistingEntry(null);
        setEntry("");
        setConversation([]);
        setGoal(null);
        setMode("venting");
        setIsSaved(false);
      }
    };
    loadEntry();
  }, [selectedDate]);

  const handleModeChange = useCallback((newMode) => {
    setMode(newMode);
    setIsSaved(false);
    
    // Load entry for the new mode if it exists
    const loadEntryForMode = async () => {
      const data = await fetch(`http://localhost:5001/entries?date=${selectedDate}&mode=${newMode}`).then(r => r.json());
      if (data && Object.keys(data).length > 0) {
        if (newMode === "conversation" && data.mode === "conversation" && data.conversation) {
          setConversation(data.conversation || []);
          setGoal(data.goal || null);
          setEntry("");
          setExistingEntry(data);
        } else if (newMode === "venting" && data.mode === "venting" && data.text) {
          setEntry(data.text || "");
          setConversation([]);
          setGoal(null);
          setExistingEntry(data);
        } else {
          // Switching to a mode that doesn't have an entry yet
          setConversation([]);
          setEntry("");
          setGoal(null);
          setExistingEntry(null);
        }
      } else {
        // No entry exists for this mode - clear everything
        setConversation([]);
        setEntry("");
        setGoal(null);
        setExistingEntry(null);
      }
    };
    loadEntryForMode();
  }, [selectedDate]);

  const handleSubmit = useCallback(async (submitMode) => {
    const currentEntry = entryRef.current;
    if (!currentEntry.trim()) return;
    
    // Check if date is in the future (only block if no existing entry)
    const today = new Date().toISOString().split("T")[0];
    const isFuture = selectedDate > today;
    const hasExistingEntry = existingEntry !== null;
    
    if (isFuture && !hasExistingEntry) {
      alert("Cannot create entries for future dates. You can only journal for today or past dates.");
      return;
    }
    
    try {
      const data = await submitJournalEntry(currentEntry, selectedDate, submitMode);
    
    // Refresh streak badge after submission
    setStreakRefresh(prev => prev + 1);
    
    if (submitMode === "conversation") {
      // Conversation mode - update conversation thread
      if (data.conversation) {
        setConversation(data.conversation);
        // Preserve existing goal when updating entry
        setExistingEntry((prev) => ({
          mode: "conversation",
          conversation: data.conversation,
          date: selectedDate,
          goal: prev?.goal || goal || undefined,
        }));
      }
      setEntry(""); // Clear input after sending
      setIsSaved(false);
    } else {
      // Venting mode - show saved indicator
      setIsSaved(true);
      // Update local entry immediately
      const updatedEntry = await fetch(`http://localhost:5001/entries?date=${selectedDate}&mode=venting`).then(r => r.json());
      if (updatedEntry && Object.keys(updatedEntry).length > 0) {
        setExistingEntry(updatedEntry);
        setEntry(updatedEntry.text || "");
      }
      // Hide saved indicator after 3 seconds
      setTimeout(() => {
        setIsSaved(false);
      }, 3000);
    }
    } catch (error) {
      console.error("Error submitting entry:", error);
      if (error.message && error.message.includes("future")) {
        alert("Cannot create entries for future dates. You can only journal for today or past dates.");
      } else {
        alert("Failed to save entry. Please try again.");
      }
    }
  }, [selectedDate, goal, existingEntry]);

  const handleEntryDeleted = useCallback(async (deletedMode) => {
    // Refresh streak badge after deletion
    setStreakRefresh(prev => prev + 1);
    
    // Reload entries for this date to see what's left
    const conversationData = await fetch(`http://localhost:5001/entries?date=${selectedDate}&mode=conversation`).then(r => r.json());
    const ventingData = await fetch(`http://localhost:5001/entries?date=${selectedDate}&mode=venting`).then(r => r.json());
    
    // Check what entries exist
    const hasConversation = conversationData && Object.keys(conversationData).length > 0;
    const hasVenting = ventingData && Object.keys(ventingData).length > 0;
    
    if (deletedMode === "conversation") {
      if (hasVenting) {
        // Switch to venting mode if venting entry exists
        setMode("venting");
        setEntry(ventingData.text || "");
        setConversation([]);
        setExistingEntry(ventingData);
      } else {
        // No entries left - clear everything
        setEntry("");
        setConversation([]);
        setExistingEntry(null);
        setMode("venting");
      }
      setGoal(null);
    } else if (deletedMode === "venting") {
      if (hasConversation) {
        // Switch to conversation mode if conversation exists
        setMode("conversation");
        setConversation(conversationData.conversation || []);
        setGoal(conversationData.goal || null);
        setEntry("");
        setExistingEntry(conversationData);
      } else {
        // No entries left - clear everything
        setEntry("");
        setConversation([]);
        setExistingEntry(null);
        setGoal(null);
        setMode("venting");
      }
    }
    
    setIsSaved(false);
  }, [selectedDate]);

  return (
    <div
      style={{
        width: "100%",
        minHeight: "100vh",
        backgroundColor: "#f6f7fb",
        display: "flex",
        justifyContent: "center",
        fontFamily: "system-ui, sans-serif",
        padding: "2rem",
      }}
    >
      <div style={{ width: "100%", maxWidth: "900px" }}>
        {/* Header with back button, date, and streak badge */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1.5rem",
          }}
        >
          <button
            onClick={() => navigate("/calendar")}
            style={{
              backgroundColor: "transparent",
              border: "1px solid #ddd",
              borderRadius: "8px",
              padding: "0.5rem 1rem",
              fontSize: "0.9rem",
              cursor: "pointer",
              color: "#666",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back to Calendar
          </button>
          <div
            style={{
              fontSize: "1rem",
              color: "#333",
              fontWeight: "500",
            }}
          >
            {formatDate(selectedDate)}
          </div>
          <StreakBadge refreshTrigger={streakRefresh} />
        </div>

        {/* Warning for future dates without existing entries */}
        {isFutureDate && !existingEntry && (
          <div
            style={{
              marginBottom: "1.5rem",
              padding: "1rem 1.5rem",
              backgroundColor: "#fff3cd",
              border: "1px solid #ffc107",
              borderRadius: "8px",
              color: "#856404",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span style={{ fontWeight: "500" }}>
              Cannot create entries for future dates. You can only journal for today or past dates.
            </span>
          </div>
        )}

        {/* Journal Entry Card */}
        <JournalCard
          entry={entry}
          setEntry={setEntry}
          onSubmit={handleSubmit}
          conversation={conversation}
          onModeChange={handleModeChange}
          initialMode={mode}
          isSaved={isSaved}
          date={selectedDate}
          existingGoal={goal}
          canCreateNewEntry={canCreateNewEntry}
          onGoalGenerated={(newGoal) => {
            setGoal(newGoal);
            // Update existing entry with goal
            if (existingEntry && existingEntry.mode === "conversation") {
              setExistingEntry({ ...existingEntry, goal: newGoal });
            }
          }}
          onEntryDeleted={handleEntryDeleted}
        />
      </div>
    </div>
  );
}



