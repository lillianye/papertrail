import { useState, useEffect, useRef } from "react";

export default function StreakBadge({ refreshTrigger }) {
  const [streakData, setStreakData] = useState({
    current_streak: 0,
    longest_streak: 0,
    total_days: 0,
    has_entry_today: false,
    milestone: null,
    milestone_progress: null,
    days_remaining: null
  });
  const [isHovered, setIsHovered] = useState(false);
  const [isEditingMilestone, setIsEditingMilestone] = useState(false);
  const [milestoneInput, setMilestoneInput] = useState("");
  const [showCelebration, setShowCelebration] = useState(false);
  const previousStreakRef = useRef(0);
  const celebratedMilestonesRef = useRef(new Set());

  useEffect(() => {
    const fetchStreak = async () => {
      try {
        const response = await fetch("http://localhost:5001/streak");
        const data = await response.json();
        const previousStreak = previousStreakRef.current;
        previousStreakRef.current = data.current_streak;
        
        setStreakData(data);
        if (data.milestone) {
          setMilestoneInput(data.milestone.toString());
          
          // Check if milestone was just reached
          const milestone = data.milestone;
          const currentStreak = data.current_streak;
          const milestoneKey = `${milestone}`;
          
          // If current streak >= milestone and previous was less than milestone
          if (currentStreak >= milestone && previousStreak < milestone) {
            // Only celebrate if we haven't already celebrated this milestone
            if (!celebratedMilestonesRef.current.has(milestoneKey)) {
              celebratedMilestonesRef.current.add(milestoneKey);
              setShowCelebration(true);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching streak:", error);
      }
    };

    fetchStreak();
    // Refresh every minute to update streak status
    const interval = setInterval(fetchStreak, 60000);
    
    return () => clearInterval(interval);
  }, [refreshTrigger]);

  const handleSetMilestone = async () => {
    const milestone = milestoneInput.trim() === "" ? null : parseInt(milestoneInput);
    
    try {
      const response = await fetch("http://localhost:5001/streak/milestone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ milestone })
      });
      const data = await response.json();
      setStreakData(data);
      setIsEditingMilestone(false);
      if (data.milestone) {
        setMilestoneInput(data.milestone.toString());
      } else {
        setMilestoneInput("");
      }
    } catch (error) {
      console.error("Error setting milestone:", error);
    }
  };

  const handleCancelMilestone = () => {
    setIsEditingMilestone(false);
    setMilestoneInput(streakData.milestone ? streakData.milestone.toString() : "");
  };

  const handleSetNewGoal = () => {
    setShowCelebration(false);
    setIsEditingMilestone(true);
    setMilestoneInput("");
    // Also open the hover overlay if it's not already open
    setIsHovered(true);
  };

  const handleCloseCelebration = () => {
    setShowCelebration(false);
  };

  const getStreakEmoji = (streak, hasEntryToday) => {
    // If user hasn't journaled today, show unlit flame
    if (!hasEntryToday && streak > 0) {
      return "❄️"; // Cold/unlit flame
    }
    if (streak === 0) return "❄️"; // No streak = unlit
    // Always show single flame when streak is active and user has journaled today
    return "🔥";
  };

  const getStreakColor = (streak) => {
    if (streak === 0) return "#888";
    if (streak < 7) return "#ff6b6b";
    if (streak < 30) return "#ffa500";
    if (streak < 100) return "#ffd700";
    return "#ff6b35";
  };

  return (
    <>
      {/* Celebration Popup */}
      {showCelebration && streakData.milestone && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
            animation: "fadeIn 0.3s ease",
          }}
          onClick={handleCloseCelebration}
        >
          <div
            style={{
              backgroundColor: "#fff",
              borderRadius: "16px",
              padding: "2rem",
              maxWidth: "400px",
              width: "90%",
              boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
              textAlign: "center",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>🎉</div>
            <h2
              style={{
                fontSize: "1.75rem",
                fontWeight: "800",
                color: "#333",
                margin: "0 0 0.5rem 0",
              }}
            >
              Congratulations!
            </h2>
            <p
              style={{
                fontSize: "1.1rem",
                color: "#666",
                margin: "0 0 1.5rem 0",
                lineHeight: "1.5",
              }}
            >
              You've reached your goal of <strong>{streakData.milestone} days</strong>!
              <br />
              Keep up the amazing work! 🔥
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <button
                onClick={handleSetNewGoal}
                style={{
                  padding: "0.75rem 1.5rem",
                  fontSize: "1rem",
                  fontWeight: "600",
                  backgroundColor: "#5b6cff",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  transition: "background-color 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#4a5ce8";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#5b6cff";
                }}
              >
                Set New Goal
              </button>
              <button
                onClick={handleCloseCelebration}
                style={{
                  padding: "0.75rem 1.5rem",
                  fontSize: "1rem",
                  fontWeight: "600",
                  backgroundColor: "#f0f0f0",
                  color: "#666",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  transition: "background-color 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#e0e0e0";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#f0f0f0";
                }}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        style={{
          position: "relative",
          display: "inline-block",
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
      {/* Main widget - always visible */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          padding: "0.5rem 1rem",
          backgroundColor: "#fff",
          borderRadius: "8px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          border: `2px solid ${getStreakColor(streakData.current_streak)}`,
          cursor: "pointer",
          transition: "all 0.2s ease",
          position: "relative",
        }}
      >
      {/* Fire Emoji - unlit if no entry today */}
      <div
        style={{
          fontSize: "1.5rem",
          lineHeight: "1",
          opacity: streakData.has_entry_today || streakData.current_streak === 0 ? 1 : 0.5,
        }}
      >
        {getStreakEmoji(streakData.current_streak, streakData.has_entry_today)}
      </div>
      
      {/* Streak Number */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: "0.1rem",
        }}
      >
        <div
          style={{
            fontSize: "1.5rem",
            fontWeight: "800",
            color: getStreakColor(streakData.current_streak),
            lineHeight: "1",
          }}
        >
          {streakData.current_streak}
        </div>
        <div
          style={{
            fontSize: "0.75rem",
            fontWeight: "600",
            color: "#666",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          Day Streak
        </div>
      </div>

      {/* Warning if no entry today - positioned in top right corner */}
      {!streakData.has_entry_today && streakData.current_streak > 0 && (
        <div
          style={{
            position: "absolute",
            top: "-4px",
            right: "-4px",
            fontSize: "0.9rem",
            color: "#ffc107",
            backgroundColor: "#fff",
            borderRadius: "50%",
            width: "20px",
            height: "20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          }}
          title="No entry today - your streak is at risk!"
        >
          ⚠️
        </div>
      )}

      </div>

      {/* Overlay content - appears on hover as overlay (doesn't push content down) */}
      {isHovered && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            marginTop: "0.5rem",
            padding: "0.75rem 1rem",
            backgroundColor: "#fff",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            border: `2px solid ${getStreakColor(streakData.current_streak)}`,
            zIndex: 1000,
            minWidth: "200px",
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Compact Stats */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.3rem",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <span style={{ fontSize: "0.8rem", fontWeight: "600", color: "#666" }}>
                Best: {streakData.longest_streak}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <span style={{ fontSize: "0.8rem", fontWeight: "600", color: "#666" }}>
                Total: {streakData.total_days}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <span style={{ fontSize: "0.8rem", fontWeight: "600", color: "#666" }}>
                Current: {streakData.current_streak}
              </span>
            </div>
            
            {/* Milestone section */}
            {streakData.milestone && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.2rem",
                  marginTop: "0.3rem",
                  paddingTop: "0.3rem",
                  borderTop: "1px solid #e0e0e0",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontSize: "0.75rem", color: "#666", fontWeight: "700" }}>
                    Goal: {streakData.milestone} days
                  </span>
                  <span style={{ fontSize: "0.75rem", color: "#ff6b6b", fontWeight: "600" }}>
                    {streakData.days_remaining} left
                  </span>
                </div>
                {/* Progress bar */}
                <div
                  style={{
                    width: "100%",
                    height: "4px",
                    backgroundColor: "#e0e0e0",
                    borderRadius: "2px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${Math.min(streakData.milestone_progress || 0, 100)}%`,
                      height: "100%",
                      backgroundColor: getStreakColor(streakData.current_streak),
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>
                <span style={{ fontSize: "0.7rem", color: "#888", fontWeight: "500" }}>
                  {Math.round(streakData.milestone_progress || 0)}% complete
                </span>
              </div>
            )}
            
            {/* Set/Edit milestone button */}
            {!isEditingMilestone ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem", marginTop: "0.2rem" }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditingMilestone(true);
                    setMilestoneInput(streakData.milestone ? streakData.milestone.toString() : "");
                  }}
                  style={{
                    padding: "0.2rem 0.5rem",
                    fontSize: "0.7rem",
                    fontWeight: "600",
                    backgroundColor: "#f0f0f0",
                    border: "1px solid #ddd",
                    borderRadius: "4px",
                    cursor: "pointer",
                    color: "#666",
                  }}
                >
                  {streakData.milestone ? "Edit Goal" : "Set Goal"}
                </button>
                {streakData.milestone && (
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        const response = await fetch("http://localhost:5001/streak/milestone", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ milestone: null })
                        });
                        const data = await response.json();
                        setStreakData(data);
                        setMilestoneInput("");
                      } catch (error) {
                        console.error("Error clearing milestone:", error);
                      }
                    }}
                    style={{
                      padding: "0.2rem 0.5rem",
                      fontSize: "0.7rem",
                      fontWeight: "600",
                      backgroundColor: "transparent",
                      border: "1px solid #ff6b6b",
                      borderRadius: "4px",
                      cursor: "pointer",
                      color: "#ff6b6b",
                    }}
                  >
                    Clear Goal
                  </button>
                )}
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.3rem",
                  marginTop: "0.2rem",
                }}
              >
                <input
                  type="number"
                  value={milestoneInput}
                  onChange={(e) => setMilestoneInput(e.target.value)}
                  placeholder="Days"
                  min="1"
                  style={{
                    padding: "0.2rem 0.4rem",
                    fontSize: "0.65rem",
                    border: "1px solid #ddd",
                    borderRadius: "4px",
                    width: "60px",
                  }}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSetMilestone();
                    } else if (e.key === "Escape") {
                      handleCancelMilestone();
                    }
                  }}
                />
                <div style={{ display: "flex", gap: "0.3rem" }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSetMilestone();
                    }}
                    style={{
                      padding: "0.2rem 0.4rem",
                      fontSize: "0.6rem",
                      backgroundColor: "#5b6cff",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                    }}
                  >
                    Save
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCancelMilestone();
                    }}
                    style={{
                      padding: "0.2rem 0.4rem",
                      fontSize: "0.6rem",
                      backgroundColor: "#f0f0f0",
                      color: "#666",
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
    </>
  );
}
