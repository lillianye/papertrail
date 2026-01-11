import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { fetchEntries } from "../api/journalApi";
import StreakBadge from "./StreakBadge";
import { getPacificDateString } from "../utils/dateUtils";

export default function Calendar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [entries, setEntries] = useState([]);

  const currentYear = new Date().getFullYear();
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Fetch all entries to check which dates have entries
  // Refresh when location changes (e.g., navigating back from journal page)
  useEffect(() => {
    const loadEntries = async () => {
      const data = await fetchEntries();
      setEntries(data || []);
    };
    loadEntries();
  }, [location.pathname]);

  // Format date as YYYY-MM-DD
  const formatDate = (year, month, day) => {
    const monthStr = String(month + 1).padStart(2, "0");
    const dayStr = String(day).padStart(2, "0");
    return `${year}-${monthStr}-${dayStr}`;
  };

  // Check if a date has an entry
  const hasEntry = (dateString) => {
    return entries.some(entry => entry.date === dateString);
  };

  // Get entry for a specific date
  const getEntryForDate = (dateString) => {
    return entries.find(entry => entry.date === dateString);
  };

  // Theme to icon/emoji mapping
  const themeIcons = {
    work: "💼",
    career: "💼",
    job: "💼",
    stress: "⚡",
    anxious: "😰",
    anxiety: "😰",
    family: "👨‍👩‍👧‍👦",
    friends: "👥",
    relationship: "💑",
    health: "🏥",
    exercise: "🏃",
    fitness: "🏃",
    school: "📚",
    study: "📚",
    education: "📚",
    travel: "✈️",
    vacation: "✈️",
    hobby: "🎨",
    creative: "🎨",
    music: "🎵",
    food: "🍔",
    sleep: "😴",
    mood: "😊",
    happy: "😊",
    sad: "😢",
    love: "❤️",
    celebration: "🎉",
    achievement: "🏆"
  };

  // Get icon for a theme (case-insensitive)
  const getThemeIcon = (theme) => {
    const themeLower = theme.toLowerCase();
    for (const [key, icon] of Object.entries(themeIcons)) {
      if (themeLower.includes(key) || key.includes(themeLower)) {
        return icon;
      }
    }
    return "📝"; // Default icon
  };

  // Calculate dominant themes and sentiment for a month
  const getMonthInsights = (monthIndex) => {
    const monthEntries = entries.filter(entry => {
      if (!entry.date) return false;
      const entryDate = new Date(entry.date + "T00:00:00");
      return entryDate.getMonth() === monthIndex && entryDate.getFullYear() === currentYear;
    });

    if (monthEntries.length === 0) return { themes: [], sentiment: "neutral", themeCounts: {} };

    // Count themes
    const themeCounts = {};
    const sentimentCounts = { positive: 0, negative: 0, neutral: 0 };

    monthEntries.forEach(entry => {
      // Count themes
      if (entry.themes && Array.isArray(entry.themes)) {
        entry.themes.forEach(theme => {
          themeCounts[theme] = (themeCounts[theme] || 0) + 1;
        });
      }
      
      // Count sentiment
      if (entry.sentiment) {
        sentimentCounts[entry.sentiment] = (sentimentCounts[entry.sentiment] || 0) + 1;
      }
    });

    // Get top 2 themes
    const sortedThemes = Object.entries(themeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([theme]) => theme);

    // Determine dominant sentiment
    const dominantSentiment = 
      sentimentCounts.positive >= sentimentCounts.negative && sentimentCounts.positive >= sentimentCounts.neutral ? "positive" :
      sentimentCounts.negative >= sentimentCounts.neutral ? "negative" : "neutral";

    return {
      themes: sortedThemes,
      sentiment: dominantSentiment,
      themeCounts
    };
  };

  // Get sentiment color
  const getSentimentColor = (sentiment) => {
    switch (sentiment) {
      case "positive":
        return "#e8f5e9"; // Light green
      case "negative":
        return "#ffebee"; // Light red
      default:
        return "#e3f2fd"; // Light blue (neutral)
    }
  };

  // Get sentiment border color
  const getSentimentBorderColor = (sentiment) => {
    switch (sentiment) {
      case "positive":
        return "#4caf50"; // Green
      case "negative":
        return "#f44336"; // Red
      default:
        return "#2196f3"; // Blue (neutral)
    }
  };

  // Get the first day of the month (0 = Sunday, 1 = Monday, etc.)
  const getFirstDayOfMonth = (year, month) => {
    return new Date(year, month, 1).getDay();
  };

  // Get number of days in a month
  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  // Handle date click
  const handleDateClick = (dateString) => {
    navigate(`/journal?date=${dateString}`);
  };

  // Render calendar for a single month
  const renderMonth = (year, monthIndex) => {
    const firstDay = getFirstDayOfMonth(year, monthIndex);
    const daysInMonth = getDaysInMonth(year, monthIndex);
    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(
        <div
          key={`empty-${i}`}
          style={{
            aspectRatio: "1",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "1px solid #e0e0e0",
            backgroundColor: "#f9f9f9",
          }}
        />
      );
    }

    // Add cells for each day of the month (Pacific time)
    const today = getPacificDateString();
    for (let day = 1; day <= daysInMonth; day++) {
      const dateString = formatDate(year, monthIndex, day);
      const dateHasEntry = hasEntry(dateString);
      const entry = dateHasEntry ? getEntryForDate(dateString) : null;
      const isToday = dateString === today;
      const isFuture = dateString > today;
      
      // Get sentiment color for this entry
      const entrySentiment = entry?.sentiment || "neutral";
      const sentimentBgColor = dateHasEntry ? getSentimentColor(entrySentiment) : "#fff";
      const sentimentBorderColor = dateHasEntry ? getSentimentBorderColor(entrySentiment) : "#e0e0e0";
      
      // Get primary theme icon for this entry
      const primaryTheme = entry?.themes?.[0];
      const themeIcon = primaryTheme ? getThemeIcon(primaryTheme) : null;

      days.push(
        <div
          key={day}
          onClick={() => {
            // Only allow clicking on past/today dates, or dates with existing entries
            if (!isFuture || dateHasEntry) {
              handleDateClick(dateString);
            }
          }}
          style={{
            aspectRatio: "1",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.75rem",
            color: isFuture && !dateHasEntry ? "#ccc" : "#333",
            border: `1px solid ${sentimentBorderColor}`,
            backgroundColor: isFuture && !dateHasEntry ? "#f9f9f9" : sentimentBgColor,
            cursor: isFuture && !dateHasEntry ? "not-allowed" : "pointer",
            transition: "background-color 0.2s, border-color 0.2s",
            position: "relative",
            fontWeight: isToday ? "600" : "normal",
            padding: "2px",
            opacity: isFuture && !dateHasEntry ? 0.5 : 1,
          }}
          onMouseEnter={(e) => {
            if (isFuture && !dateHasEntry) {
              e.currentTarget.style.backgroundColor = "#f9f9f9";
            } else if (!dateHasEntry) {
              e.currentTarget.style.backgroundColor = "#f5f5f5";
            } else {
              // Darken the sentiment color on hover
              const hoverColor = entrySentiment === "positive" ? "#c8e6c9" :
                                entrySentiment === "negative" ? "#ffcdd2" : "#bbdefb";
              e.currentTarget.style.backgroundColor = hoverColor;
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = isFuture && !dateHasEntry ? "#f9f9f9" : sentimentBgColor;
          }}
          title={isFuture && !dateHasEntry ? "Cannot create entries for future dates" : ""}
        >
          <div>{day}</div>
          {themeIcon && (
            <div
              style={{
                fontSize: "0.6rem",
                marginTop: "1px",
              }}
              title={primaryTheme}
            >
              {themeIcon}
            </div>
          )}
          {isToday && (
            <div
              style={{
                position: "absolute",
                bottom: "2px",
                left: "50%",
                transform: "translateX(-50%)",
                width: "4px",
                height: "4px",
                borderRadius: "50%",
                backgroundColor: "#5b6cff",
              }}
            />
          )}
        </div>
      );
    }

    return days;
  };

  return (
    <div
      style={{
        width: "100%",
        minHeight: "100vh",
        backgroundColor: "#f6f7fb",
        display: "flex",
        flexDirection: "column",
        fontFamily: "system-ui, sans-serif",
        padding: "2rem",
      }}
    >
      <div style={{ width: "100%", maxWidth: "1400px", margin: "0 auto" }}>
        {/* Header with title, streak badge, and new entry button */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "2rem",
          }}
        >
          <h1 style={{ margin: 0, fontSize: "2rem", color: "#333" }}>
            {currentYear} Calendar
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <button
              onClick={() => navigate("/insights")}
              style={{
                backgroundColor: "#fff",
                color: "#5b6cff",
                border: "2px solid #5b6cff",
                borderRadius: "8px",
                padding: "0.75rem 1.5rem",
                fontSize: "1rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                boxShadow: "0 2px 8px rgba(91, 108, 255, 0.2)",
                transition: "transform 0.2s, box-shadow 0.2s, background-color 0.2s",
                fontWeight: "500",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.05)";
                e.currentTarget.style.backgroundColor = "#f0f2ff";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(91, 108, 255, 0.3)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.backgroundColor = "#fff";
                e.currentTarget.style.boxShadow = "0 2px 8px rgba(91, 108, 255, 0.2)";
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
                <path d="M3 3v18h18" />
                <path d="M18 17V9" />
                <path d="M13 17V5" />
                <path d="M8 17v-3" />
              </svg>
              Insights
            </button>
            <StreakBadge refreshTrigger={location.pathname} />
            <button
              onClick={() => navigate("/journal")}
              style={{
                backgroundColor: "#5b6cff",
                color: "white",
                border: "none",
                borderRadius: "8px",
                padding: "0.75rem 1.5rem",
                fontSize: "1rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                boxShadow: "0 4px 12px rgba(91, 108, 255, 0.3)",
                transition: "transform 0.2s, box-shadow 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.05)";
                e.currentTarget.style.boxShadow = "0 6px 16px rgba(91, 108, 255, 0.4)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(91, 108, 255, 0.3)";
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
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              New Entry
            </button>
          </div>
        </div>

        {/* Calendar grid for all months */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
            gap: "2rem",
          }}
        >
          {months.map((month, monthIndex) => {
            const monthInsights = getMonthInsights(monthIndex);
            const monthHasEntries = entries.some(e => {
              if (!e.date) return false;
              const entryDate = new Date(e.date + "T00:00:00");
              return entryDate.getMonth() === monthIndex && entryDate.getFullYear() === currentYear;
            });
            
            return (
              <div
                key={month}
                style={{
                  background: monthHasEntries ? getSentimentColor(monthInsights.sentiment) : "white",
                  padding: "1.5rem",
                  borderRadius: "12px",
                  boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
                  border: monthHasEntries ? `2px solid ${getSentimentBorderColor(monthInsights.sentiment)}` : "1px solid #e0e0e0",
                  transition: "all 0.3s ease",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "1rem",
                  }}
                >
                  <h2
                    style={{
                      margin: 0,
                      fontSize: "1.25rem",
                      color: "#333",
                      textAlign: "center",
                      flex: 1,
                    }}
                  >
                    {month}
                  </h2>
                  {monthInsights.themes.length > 0 && (
                    <div
                      style={{
                        display: "flex",
                        gap: "0.25rem",
                        alignItems: "center",
                        marginLeft: "0.5rem",
                      }}
                    >
                      {monthInsights.themes.slice(0, 2).map((theme, idx) => (
                        <div
                          key={idx}
                          style={{
                            fontSize: "1rem",
                            padding: "0.25rem 0.5rem",
                            backgroundColor: "rgba(255, 255, 255, 0.7)",
                            borderRadius: "12px",
                            border: `1px solid ${getSentimentBorderColor(monthInsights.sentiment)}`,
                            display: "flex",
                            alignItems: "center",
                            gap: "0.25rem",
                          }}
                          title={theme}
                        >
                          <span>{getThemeIcon(theme)}</span>
                          <span style={{ fontSize: "0.65rem", color: "#555" }}>{theme}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              {/* Days of week header */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(7, 1fr)",
                  marginBottom: "0.5rem",
                }}
              >
                {daysOfWeek.map((day) => (
                  <div
                    key={day}
                    style={{
                      textAlign: "center",
                      fontSize: "0.7rem",
                      fontWeight: "600",
                      color: "#666",
                      paddingBottom: "0.5rem",
                    }}
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar days grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(7, 1fr)",
                  border: "1px solid #e0e0e0",
                  borderRadius: "8px",
                  overflow: "hidden",
                }}
              >
                {renderMonth(currentYear, monthIndex)}
              </div>
            </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}



