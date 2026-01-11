import { useState, useEffect, useRef } from "react";
import { generateGoal, deleteEntry, fetchPrompts, savePrompts, getSavedPrompts } from "../api/journalApi";

export default function JournalCard({ entry, setEntry, onSubmit, conversation = [], onModeChange, initialMode = "venting", isSaved = false, date, onGoalGenerated, existingGoal = null, onEntryDeleted, canCreateNewEntry = true }) {
  const [mode, setMode] = useState(initialMode);
  const [goal, setGoal] = useState(existingGoal);
  const [isGeneratingGoal, setIsGeneratingGoal] = useState(false);
  const [prompts, setPrompts] = useState([]);
  const [isGeneratingPrompts, setIsGeneratingPrompts] = useState(false);
  const [showPromptsOverlay, setShowPromptsOverlay] = useState(true);
  const [promptsManuallySet, setPromptsManuallySet] = useState(false); // Track if prompts were manually set
  const textareaRef = useRef(null);

  // Sync mode and goal when props change from parent
  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    if (existingGoal !== null) {
      setGoal(existingGoal);
    }
  }, [existingGoal]);

  // Load saved prompts (only if they were manually generated before) when component mounts or date/mode changes
  useEffect(() => {
    // Don't auto-load if prompts were manually set by button click in this session
    if (promptsManuallySet) {
      return;
    }
    
    // Reset prompts when date or mode changes
    setPrompts([]);
    setPromptsManuallySet(false);
    setShowPromptsOverlay(false);
    
    const loadSavedPrompts = async () => {
      // Only load saved prompts that were manually generated before
      try {
        const savedData = await getSavedPrompts(date);
        if (savedData && savedData.prompts && savedData.prompts.length > 0) {
          // Found saved prompts from previous manual generation - load them
          setPrompts(savedData.prompts);
          setPromptsManuallySet(true); // Mark as manually set so they appear below button
          setShowPromptsOverlay(false);
        }
        // If no saved prompts, don't show anything - user must click "Give me a prompt"
      } catch (error) {
        console.error("Error loading saved prompts:", error);
      }
    };
    
    loadSavedPrompts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, date]); // Only re-run when mode or date changes, not when entry changes

  // Update overlay visibility based on entry text (don't interfere with manually set prompts)
  useEffect(() => {
    if (prompts.length > 0) {
      // Only update overlay visibility, don't clear prompts
      setShowPromptsOverlay(entry.trim().length === 0);
    }
  }, [entry, prompts]);

  const handleModeChange = (newMode) => {
    setMode(newMode);
    if (onModeChange) {
      onModeChange(newMode);
    }
  };

  const handleGeneratePrompts = async () => {
    setIsGeneratingPrompts(true);
    try {
      const data = await fetchPrompts(date);
      console.log("Prompts data received:", data); // Debug log
      if (data && data.prompts && data.prompts.length > 0) {
        // Append new prompts to existing ones instead of replacing
        setPrompts((prevPrompts) => {
          const allPrompts = [...prevPrompts, ...data.prompts];
          // Save all prompts (existing + new) to backend
          savePrompts(date, allPrompts).catch((saveError) => {
            console.error("Error saving prompts:", saveError);
          });
          return allPrompts;
        });
        setPromptsManuallySet(true); // Mark as manually set - this will make prompts show below textarea
        setShowPromptsOverlay(false); // Don't show overlay when manually generated
      } else {
        console.warn("No prompts in response:", data);
        alert("No prompts were generated. Please try again.");
      }
    } catch (error) {
      console.error("Error generating prompts:", error);
      alert(`Failed to generate prompts: ${error.message}. Please check the console for details.`);
    } finally {
      setIsGeneratingPrompts(false);
    }
  };

  const handleGenerateGoal = async () => {
    if (!conversation || conversation.length === 0) return;
    
    setIsGeneratingGoal(true);
    try {
      const data = await generateGoal(conversation, date);
      if (data.goal) {
        setGoal(data.goal);
        if (onGoalGenerated) {
          onGoalGenerated(data.goal);
        }
      }
    } catch (error) {
      console.error("Error generating goal:", error);
    } finally {
      setIsGeneratingGoal(false);
    }
  };

  const handleDeleteEntry = async (deleteMode) => {
    if (!window.confirm(`Are you sure you want to delete this ${deleteMode === "conversation" ? "conversation" : "venting"} entry?`)) {
      return;
    }

    try {
      await deleteEntry(date, deleteMode);
      if (onEntryDeleted) {
        onEntryDeleted(deleteMode);
      }
    } catch (error) {
      console.error("Error deleting entry:", error);
      alert("Failed to delete entry. Please try again.");
    }
  };

  return (
    <div
      style={{
        background: "white",
        padding: "2rem",
        borderRadius: "12px",
        boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
      }}
    >
      <h1 style={{ marginBottom: "0.5rem" }}>Reflect</h1>
      <p style={{ color: "#666", marginBottom: "1.5rem" }}>
        A private space to think through your day.
      </p>

      {/* Mode Tabs */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          marginBottom: "1.5rem",
          borderBottom: "2px solid #e0e0e0",
        }}
      >
        <button
          onClick={() => handleModeChange("venting")}
          style={{
            padding: "0.75rem 1.5rem",
            fontSize: "0.95rem",
            fontWeight: mode === "venting" ? "600" : "400",
            color: mode === "venting" ? "#5b6cff" : "#666",
            backgroundColor: "transparent",
            border: "none",
            borderBottom: mode === "venting" ? "2px solid #5b6cff" : "2px solid transparent",
            cursor: "pointer",
            marginBottom: "-2px",
            transition: "all 0.2s",
          }}
        >
          Venting
        </button>
        <button
          onClick={() => handleModeChange("conversation")}
          style={{
            padding: "0.75rem 1.5rem",
            fontSize: "0.95rem",
            fontWeight: mode === "conversation" ? "600" : "400",
            color: mode === "conversation" ? "#5b6cff" : "#666",
            backgroundColor: "transparent",
            border: "none",
            borderBottom: mode === "conversation" ? "2px solid #5b6cff" : "2px solid transparent",
            cursor: "pointer",
            marginBottom: "-2px",
            transition: "all 0.2s",
          }}
        >
          Conversation
        </button>
      </div>

      {/* Delete button for current mode entry */}
      {((mode === "conversation" && conversation && conversation.length > 0) || 
        (mode === "venting" && entry && entry.trim() !== "")) && (
        <div style={{ marginBottom: "1rem", display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={() => handleDeleteEntry(mode)}
            style={{
              padding: "0.5rem 1rem",
              fontSize: "0.85rem",
              fontWeight: "500",
              backgroundColor: "transparent",
              border: "1px solid #ff6b6b",
              borderRadius: "6px",
              color: "#ff6b6b",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#ffebee";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
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
              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            Delete {mode === "conversation" ? "Conversation" : "Entry"}
          </button>
        </div>
      )}

      {/* Conversation Thread (only in conversation mode) */}
      {mode === "conversation" && conversation && conversation.length > 0 && (
        <>
          <div style={{ marginBottom: "1.5rem" }}>
            {conversation.map((msg, idx) => (
              <div
                key={idx}
                style={{
                  marginBottom: "1rem",
                  padding: "0.75rem",
                  borderRadius: "8px",
                  backgroundColor: msg.role === "user" ? "#f0f2ff" : "#f9f9f9",
                  border: msg.role === "user" ? "1px solid #e0e4ff" : "1px solid #e0e0e0",
                }}
              >
                <div
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: "600",
                    color: "#666",
                    marginBottom: "0.5rem",
                    textTransform: "uppercase",
                  }}
                >
                  {msg.role === "user" ? "You" : "AI"}
                </div>
                <div style={{ color: "#333", whiteSpace: "pre-wrap" }}>
                  {msg.content}
                </div>
              </div>
            ))}
          </div>
          
          {/* Goal Button */}
          <div style={{ marginBottom: "1.5rem", display: "flex", justifyContent: "center" }}>
            <button
              onClick={handleGenerateGoal}
              disabled={isGeneratingGoal}
              style={{
                padding: "0.75rem 1.5rem",
                borderRadius: "8px",
                border: "1px solid #5b6cff",
                backgroundColor: isGeneratingGoal ? "#ccc" : "white",
                color: isGeneratingGoal ? "#666" : "#5b6cff",
                fontSize: "0.95rem",
                fontWeight: "500",
                cursor: isGeneratingGoal ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                if (!isGeneratingGoal) {
                  e.currentTarget.style.backgroundColor = "#f0f2ff";
                }
              }}
              onMouseLeave={(e) => {
                if (!isGeneratingGoal) {
                  e.currentTarget.style.backgroundColor = "white";
                }
              }}
            >
              {isGeneratingGoal ? (
                <>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ animation: "spin 1s linear infinite" }}
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v6l4 2" />
                  </svg>
                  Generating...
                </>
              ) : (
                <>
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
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  Goal
                </>
              )}
            </button>
          </div>

          {/* Goal Display */}
          {goal && (
            <div
              style={{
                marginBottom: "1.5rem",
                padding: "1rem",
                borderRadius: "8px",
                backgroundColor: "#fff8e1",
                border: "1px solid #ffd54f",
              }}
            >
              <div
                style={{
                  fontSize: "0.85rem",
                  fontWeight: "600",
                  color: "#f57c00",
                  marginBottom: "0.5rem",
                  textTransform: "uppercase",
                }}
              >
                Your Goal
              </div>
              <div style={{ color: "#333", whiteSpace: "pre-wrap" }}>
                {goal.split(/(\*[^*]+\*)/g).map((part, idx) => {
                  if (part.startsWith("*") && part.endsWith("*")) {
                    // Remove asterisks and apply italic style
                    const text = part.slice(1, -1);
                    return (
                      <span key={idx} style={{ fontStyle: "italic", fontWeight: "500" }}>
                        {text}
                      </span>
                    );
                  }
                  return <span key={idx}>{part}</span>;
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Text Input Area - Always show in venting mode, or in conversation mode if no conversation or last message is from AI */}
      {(mode === "venting" || 
        (mode === "conversation" && (!conversation || conversation.length === 0 || (conversation.length > 0 && conversation[conversation.length - 1].role === "ai")))) && (
        <>
          <div style={{ position: "relative", marginBottom: "1rem" }}>
            <textarea
              ref={textareaRef}
              rows="6"
              value={entry}
              onChange={(e) => {
                setEntry(e.target.value);
                if (e.target.value.trim().length > 0) {
                  setShowPromptsOverlay(false);
                  setPromptsManuallySet(false); // Reset manual flag when user starts typing
                }
              }}
              onFocus={() => {
                if (entry.trim().length === 0 && prompts.length > 0) {
                  setShowPromptsOverlay(true);
                }
              }}
              onBlur={() => {
                // Keep prompts visible on blur if still empty
                if (entry.trim().length === 0 && prompts.length > 0) {
                  setShowPromptsOverlay(true);
                }
              }}
              placeholder={
                mode === "venting"
                  ? "What's been on your mind today?"
                  : conversation && conversation.length > 0
                  ? "Continue the conversation..."
                  : "Start a conversation..."
              }
              style={{
                width: "100%",
                padding: "0.75rem",
                borderRadius: "8px",
                border: "1px solid #ddd",
                fontSize: "1rem",
                boxSizing: "border-box",
                display: "block",
                resize: "vertical",
                backgroundColor: "white",
                position: "relative",
                zIndex: 2,
              }}
            />
            
            {/* Prompts Overlay - shows when no entry text and prompts exist (for auto-fetched or saved prompts, but not manually generated) */}
            {(() => {
              const shouldShow = showPromptsOverlay && prompts.length > 0 && (!entry || entry.trim().length === 0) && !promptsManuallySet;
              if (prompts.length > 0) {
                console.log("Overlay render check:", { showPromptsOverlay, promptsLength: prompts.length, entryLength: entry?.trim().length, promptsManuallySet, shouldShow });
              }
              return shouldShow;
            })() && (
              <div
                style={{
                  position: "absolute",
                  top: "0.75rem",
                  left: "0.75rem",
                  right: "0.75rem",
                  pointerEvents: "none",
                  zIndex: 1,
                  color: "#999",
                  fontSize: "1rem",
                  lineHeight: "1.5",
                  whiteSpace: "pre-wrap",
                }}
              >
                {prompts.map((prompt, index) => (
                  <div key={index} style={{ marginBottom: index < prompts.length - 1 ? "0.5rem" : "0" }}>
                    {prompt}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Give me a prompt button and prompts display */}
          <div style={{ marginBottom: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: prompts.length > 0 && promptsManuallySet ? "0.75rem" : "0" }}>
              <button
                onClick={handleGeneratePrompts}
                disabled={isGeneratingPrompts}
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: "6px",
                  border: "1px solid #5b6cff",
                  backgroundColor: isGeneratingPrompts ? "#e0e7ff" : "white",
                  color: isGeneratingPrompts ? "#999" : "#5b6cff",
                  fontSize: "0.9rem",
                  fontWeight: "500",
                  cursor: isGeneratingPrompts ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  if (!isGeneratingPrompts) {
                    e.currentTarget.style.backgroundColor = "#f0f2ff";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isGeneratingPrompts) {
                    e.currentTarget.style.backgroundColor = "white";
                  }
                }}
              >
                {isGeneratingPrompts ? (
                  <>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ animation: "spin 1s linear infinite" }}
                    >
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 6v6l4 2" />
                    </svg>
                    Generating...
                  </>
                ) : (
                  <>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    Give me a prompt
                  </>
                )}
              </button>
            </div>
            
            {/* Display prompts below textarea when manually generated */}
            {prompts.length > 0 && promptsManuallySet && (
              <div
                style={{
                  padding: "0.75rem 1rem",
                  backgroundColor: "#f8f9ff",
                  borderRadius: "8px",
                  borderLeft: "4px solid #5b6cff",
                  fontSize: "0.95rem",
                  color: "#555",
                  lineHeight: "1.6",
                }}
              >
                {prompts.map((prompt, index) => (
                  <div key={index} style={{ marginBottom: index < prompts.length - 1 ? "0.5rem" : "0" }}>
                    {prompt}
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => onSubmit(mode)}
            disabled={!canCreateNewEntry}
            style={{
              width: "100%",
              padding: "0.75rem",
              borderRadius: "8px",
              border: "none",
              backgroundColor: canCreateNewEntry ? "#5b6cff" : "#ccc",
              color: "white",
              fontSize: "1rem",
              cursor: canCreateNewEntry ? "pointer" : "not-allowed",
              opacity: canCreateNewEntry ? 1 : 0.6,
            }}
          >
            {mode === "conversation" ? "Send" : "Save Entry"}
          </button>
        </>
      )}

      {/* Saved indicator for venting mode */}
      {mode === "venting" && isSaved && (
        <div
          style={{
            marginTop: "0.75rem",
            padding: "0.75rem 1rem",
            backgroundColor: "#e8f5e9",
            borderRadius: "8px",
            color: "#2e7d32",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            fontWeight: "500",
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 6L9 17l-5-5" />
          </svg>
          Saved
        </div>
      )}
    </div>
  );
}
