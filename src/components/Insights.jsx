import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchSentimentTrends, fetchAIInsights } from "../api/journalApi";

export default function Insights() {
  const navigate = useNavigate();
  const [trends, setTrends] = useState({ daily: [], weekly: [], monthly: [] });
  const [selectedPeriod, setSelectedPeriod] = useState("daily");
  const [loading, setLoading] = useState(true);
  const [aiInsights, setAIInsights] = useState(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const barsContainerRef = useRef(null);
  const [barsContainerWidth, setBarsContainerWidth] = useState(null);

  useEffect(() => {
    const loadTrends = async () => {
      try {
        setLoading(true);
        const data = await fetchSentimentTrends();
        setTrends(data);
      } catch (error) {
        console.error("Error fetching sentiment trends:", error);
      } finally {
        setLoading(false);
      }
    };
    loadTrends();
  }, []);

  // Fetch AI insights when period changes to weekly or monthly
  useEffect(() => {
    const loadAIInsights = async () => {
      if (selectedPeriod === "daily") {
        setAIInsights(null);
        return;
      }
      
      try {
        setLoadingInsights(true);
        const insights = await fetchAIInsights(selectedPeriod);
        setAIInsights(insights);
      } catch (error) {
        console.error("Error fetching AI insights:", error);
        setAIInsights(null);
      } finally {
        setLoadingInsights(false);
      }
    };
    
    loadAIInsights();
  }, [selectedPeriod]);

  // Measure bars container width to match SVG width
  useLayoutEffect(() => {
    const updateWidth = () => {
      if (barsContainerRef.current) {
        // Use requestAnimationFrame to ensure DOM has updated
        requestAnimationFrame(() => {
          if (barsContainerRef.current) {
            // Use scrollWidth to get the full content width (including overflow)
            const width = barsContainerRef.current.scrollWidth;
            if (width > 0) {
              setBarsContainerWidth(width);
            }
          }
        });
      }
    };
    
    // Initial measurement - use multiple frames to ensure DOM is fully rendered
    setTimeout(updateWidth, 0);
    setTimeout(updateWidth, 50);
    setTimeout(updateWidth, 100);
    
    // Update on window resize with immediate and debounced updates
    let resizeTimeout;
    const handleResize = () => {
      updateWidth(); // Immediate update
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(updateWidth, 150); // Debounced update for final state
    };
    
    window.addEventListener("resize", handleResize);
    // Use ResizeObserver to watch for size changes in the bars container
    let resizeObserver = null;
    if (barsContainerRef.current && window.ResizeObserver) {
      resizeObserver = new ResizeObserver(() => {
        updateWidth();
      });
      resizeObserver.observe(barsContainerRef.current);
    }
    
    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(resizeTimeout);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [selectedPeriod, trends, loading]);

  const getPeriodData = () => {
    switch (selectedPeriod) {
      case "weekly":
        return trends.weekly;
      case "monthly":
        return trends.monthly;
      default:
        return trends.daily;
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    try {
      const [, month, day] = dateStr.split("-");
      return `${month}/${day}`;
    } catch {
      return dateStr;
    }
  };

  const formatWeek = (weekStr) => {
    if (!weekStr) return "";
    try {
      const [year, week] = weekStr.split("-W");
      return `W${week} ${year}`;
    } catch {
      return weekStr;
    }
  };

  const formatMonth = (monthStr) => {
    if (!monthStr) return "";
    try {
      const [year, month] = monthStr.split("-");
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return `${monthNames[parseInt(month) - 1]} ${year}`;
    } catch {
      return monthStr;
    }
  };

  const formatLabel = (item) => {
    if (selectedPeriod === "daily") {
      return formatDate(item.date);
    } else if (selectedPeriod === "weekly") {
      return formatWeek(item.week);
    } else {
      return formatMonth(item.month);
    }
  };

  // Theme to color mapping
  const themeColors = {
    work: "#6366f1",        // Indigo
    career: "#6366f1",      // Indigo
    job: "#6366f1",         // Indigo
    relationship: "#ec4899", // Pink
    relationships: "#ec4899", // Pink
    love: "#ec4899",        // Pink
    family: "#f59e0b",      // Amber
    fitness: "#10b981",     // Green
    exercise: "#10b981",    // Green
    health: "#06b6d4",      // Cyan
    motivation: "#8b5cf6",  // Purple
    stress: "#ef4444",      // Red
    anxious: "#ef4444",     // Red
    anxiety: "#ef4444",     // Red
    school: "#3b82f6",      // Blue
    study: "#3b82f6",       // Blue
    education: "#3b82f6",   // Blue
    travel: "#14b8a6",      // Teal
    hobby: "#f97316",       // Orange
    creative: "#f97316",    // Orange
    music: "#a855f7",       // Purple
    food: "#eab308",        // Yellow
    sleep: "#64748b",       // Slate
    mood: "#f43f5e",        // Rose
    celebration: "#22c55e", // Green
    achievement: "#22c55e", // Green
    sadness: "#6b7280",     // Gray
    grief: "#6b7280",       // Gray
    loss: "#6b7280",        // Gray
  };

  // Get color for a theme (case-insensitive, partial matching)
  const getThemeColor = (theme) => {
    if (!theme) return "#94a3b8"; // Default gray for no theme
    
    const themeLower = theme.toLowerCase().trim();
    
    // Exact match first
    if (themeColors[themeLower]) {
      return themeColors[themeLower];
    }
    
    // Partial match - check if theme contains any key or vice versa
    for (const [key, color] of Object.entries(themeColors)) {
      if (themeLower.includes(key) || key.includes(themeLower)) {
        return color;
      }
    }
    
    // Generate a consistent color based on theme name hash
    let hash = 0;
    for (let i = 0; i < themeLower.length; i++) {
      hash = themeLower.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 65%, 55%)`;
  };

  const periodData = getPeriodData();
  const maxValue = Math.max(...periodData.map(item => item.total), 1);

  // Calculate smoothed average sentiment for line visualization (moving average)
  const calculateSmoothedSentiment = (index, window = 3) => {
    const start = Math.max(0, index - Math.floor(window / 2));
    const end = Math.min(periodData.length - 1, index + Math.floor(window / 2));
    let sum = 0;
    let count = 0;
    
    for (let i = start; i <= end; i++) {
      const sentiment = periodData[i].averageSentiment !== null && periodData[i].averageSentiment !== undefined 
        ? periodData[i].averageSentiment 
        : 0;
      sum += sentiment;
      count++;
    }
    
    return count > 0 ? sum / count : 0;
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
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            marginBottom: "2rem",
            position: "relative",
          }}
        >
          {/* Back button positioned absolutely on the left */}
          <button
            onClick={() => navigate("/calendar")}
            style={{
              position: "absolute",
              left: 0,
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
          {/* Centered title */}
          <h1 style={{ margin: 0, fontSize: "2rem", color: "#333", textAlign: "center" }}>
            Insights
          </h1>
        </div>

        {/* Period Selector */}
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            marginBottom: "2rem",
            backgroundColor: "white",
            padding: "0.5rem",
            borderRadius: "8px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
            width: "fit-content",
          }}
        >
          {["daily", "weekly", "monthly"].map((period) => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              style={{
                padding: "0.5rem 1.5rem",
                fontSize: "0.9rem",
                fontWeight: selectedPeriod === period ? "600" : "400",
                color: selectedPeriod === period ? "#5b6cff" : "#666",
                backgroundColor: selectedPeriod === period ? "#f0f2ff" : "transparent",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                textTransform: "capitalize",
                transition: "all 0.2s",
              }}
            >
              {period}
            </button>
          ))}
        </div>

        {loading ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              padding: "4rem",
              color: "#666",
            }}
          >
            Loading insights...
          </div>
        ) : periodData.length === 0 ? (
          <div
            style={{
              backgroundColor: "white",
              padding: "3rem",
              borderRadius: "12px",
              textAlign: "center",
              boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
            }}
          >
            <p style={{ color: "#666", fontSize: "1.1rem" }}>
              No data available yet. Start journaling to see your sentiment trends!
            </p>
          </div>
        ) : (
          <>
            {/* Sentiment Trends Chart */}
            <div
              style={{
                backgroundColor: "white",
                padding: "2rem",
                borderRadius: "12px",
                boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
                marginBottom: "2rem",
              }}
            >
              <h2
                style={{
                  margin: "0 0 1.5rem 0",
                  fontSize: "1.5rem",
                  color: "#333",
                }}
              >
                Sentiment Trends Over Time
              </h2>

              {/* Chart Container */}
              <div style={{ marginBottom: "3rem", position: "relative", paddingLeft: "50px" }}>
                {/* Y-axis labels - Sentiment scale (to the left of the border) */}
                <div
                  style={{
                    position: "absolute",
                    left: "0px",
                    top: "1rem",
                    bottom: "3rem",
                    width: "45px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    fontSize: "0.7rem",
                    color: "#666",
                    textAlign: "right",
                    pointerEvents: "none",
                    zIndex: 10,
                  }}
                >
                  <span style={{ fontWeight: "600", color: "#10b981" }}>Positive (+1)</span>
                  <span style={{ fontWeight: "500", color: "#666" }}>Neutral (0)</span>
                  <span style={{ fontWeight: "600", color: "#ef4444" }}>Negative (-1)</span>
                </div>
                
                {/* Chart with bars and line overlay */}
                <div
                  style={{
                    position: "relative",
                    height: "350px",
                    padding: "1rem 0 3rem 10px",
                    borderBottom: "2px solid #e0e0e0",
                    borderLeft: "2px solid #e0e0e0",
                    overflow: "hidden", // Prevent SVG from stretching beyond container
                  }}
                >
                  {/* Bars Container - wrapper to ensure consistent width with SVG */}
                  <div
                    style={{
                      position: "absolute",
                      top: "1rem",
                      left: "10px",
                      right: "0px",
                      bottom: "3rem",
                      width: "calc(100% - 10px)",
                      height: "calc(100% - 4rem)",
                      overflowX: "auto",
                      overflowY: "hidden",
                    }}
                  >
                    {/* SVG line overlay - positioned absolutely inside the scrolling container */}
                    {barsContainerWidth && barsContainerWidth > 0 && (
                      <svg
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          height: "100%",
                          width: `${barsContainerWidth}px`,
                          pointerEvents: "none",
                          zIndex: 5,
                          overflow: "visible",
                        }}
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                      >
                        {/* Draw smoothed sentiment trend line using SVG path with curves */}
                        <path
                          d={(() => {
                            // Calculate smoothed values and create path
                            const points = periodData.map((item, index) => {
                              // Use smoothed average for smoother line
                              const smoothedSentiment = calculateSmoothedSentiment(index, 3);
                              
                              // X position: calculate as percentage (0-100) of bars container width
                              // This ensures the line scales correctly when the container width changes
                              // Each bar has a flex width: daily = 35px + 4px gap, weekly/monthly = flexible + 8px gap
                              const gap = selectedPeriod === "daily" ? 4 : 8;
                              const barWidthPx = selectedPeriod === "daily" ? 35 : (barsContainerWidth - (gap * (periodData.length - 1))) / periodData.length;
                              // Calculate center X position in pixels, then convert to percentage of total width
                              const xPx = (index * (barWidthPx + gap)) + (barWidthPx / 2);
                              const x = (xPx / barsContainerWidth) * 100; // Convert to percentage (0-100)
                              
                              // Y position: map sentiment (-1 to 1) to viewBox Y (0-100)
                              // 0 = top (positive +1), 50 = middle (neutral 0), 100 = bottom (negative -1)
                              const y = 50 - (smoothedSentiment * 50); // -1 → 100, 0 → 50, 1 → 0
                              return { x, y };
                            });

                            // Create smooth path using cubic bezier curves
                            if (points.length < 2) return "";

                            let pathData = `M ${points[0].x} ${points[0].y}`;
                            
                            // Calculate control points for smooth cubic bezier curves
                            // Using cardinal spline approach for natural curves
                            const tension = 0.3; // Controls curve tightness (0-1, lower = smoother)
                            
                            for (let i = 1; i < points.length; i++) {
                              const p0 = i > 1 ? points[i - 2] : points[i - 1];
                              const p1 = points[i - 1];
                              const p2 = points[i];
                              const p3 = i < points.length - 1 ? points[i + 1] : points[i];
                              
                              // Calculate control points using cardinal spline formula
                              const dx1 = (p2.x - p0.x) * tension;
                              const dy1 = (p2.y - p0.y) * tension;
                              const dx2 = (p3.x - p1.x) * tension;
                              const dy2 = (p3.y - p1.y) * tension;
                              
                              const cp1x = p1.x + dx1 / 3;
                              const cp1y = p1.y + dy1 / 3;
                              const cp2x = p2.x - dx2 / 3;
                              const cp2y = p2.y - dy2 / 3;
                              
                              pathData += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
                            }

                            return pathData;
                          })()}
                          fill="none"
                          stroke="#5b6cff"
                          strokeWidth="1"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          opacity="0.9"
                          style={{
                            strokeWidth: "2.5px",
                            stroke: "#5b6cff",
                            vectorEffect: "non-scaling-stroke",
                          }}
                        />
                      </svg>
                    )}
                    
                    <div
                      ref={barsContainerRef}
                      style={{
                        display: "flex",
                        gap: selectedPeriod === "daily" ? "4px" : "8px",
                        height: "100%", // Use full height of parent (which matches reference lines container)
                        position: "relative",
                        alignItems: "flex-start",
                        minWidth: "fit-content",
                      }}
                    >
                    {periodData.map((item, index) => {
                      // Calculate average sentiment (-1 to 1 scale, can be fractional like -0.3, 0.5, etc.)
                      // Use 0 (neutral) if averageSentiment is null/undefined
                      const avgSentiment = item.averageSentiment !== null && item.averageSentiment !== undefined ? parseFloat(item.averageSentiment) : 0;
                      
                      // Position bar vertically based on sentiment (supports fractional values)
                      // Y-axis labels are at: Top = Positive (+1), Middle = Neutral (0), Bottom = Negative (-1)
                      // Reference lines container: top: "1rem", bottom: "3rem" (matches chart padding)
                      // Bars container inner div: height: "calc(100% - 4rem)" which matches reference lines container height
                      // Map sentiment (-1 to 1) to top position as percentage of bars container inner height
                      // -1 (negative) should be at bottom → top: 100% - barHeight/2 (bar center at bottom)
                      // 0 (neutral) should be at middle → top: 50% - barHeight/2 (bar center at 50%)
                      // 1 (positive) should be at top → top: 0% (bar center at top)
                      // Formula: centerTopPercent = 50 - (sentiment * 50)
                      // This correctly maps: -1→100% (bottom), 0→50% (middle), 1→0% (top)
                      // For fractional: -0.3 → 65% (center), 0.5 → 25% (center)
                      const centerTopPercent = 50 - (avgSentiment * 50);
                      
                      // Bar height based on entry count (scaled, with min/max limits)
                      // Use percentage for height relative to the bar container inner height
                      const maxHeightPercent = 20; // Max 20% of container height
                      const minHeightPercent = 8;  // Min 8% of container height
                      const barHeightPercent = item.total > 0 
                        ? Math.max(Math.min((item.total / maxValue) * maxHeightPercent, maxHeightPercent), minHeightPercent)
                        : 2; // Smaller for no entries
                      
                      // Calculate top position for bar - position bar center at centerTopPercent
                      // The bar's CENTER should be at centerTopPercent, so top edge = center - half height
                      // Ensure bar doesn't go outside bounds (0% to 100%)
                      const barTopPercent = Math.max(0, Math.min(100 - barHeightPercent, centerTopPercent - (barHeightPercent / 2)));
                      
                      // Get theme color
                      const dominantTheme = item.dominantTheme || null;
                      const themeColor = getThemeColor(dominantTheme);
                      
                      // Determine sentiment label
                      const sentimentLabel = avgSentiment > 0.2 ? "Positive" : avgSentiment < -0.2 ? "Negative" : "Neutral";

                      return (
                        <div
                          key={index}
                          style={{
                            flex: selectedPeriod === "daily" ? "0 0 35px" : "1",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            height: "100%",
                            position: "relative",
                            minWidth: selectedPeriod === "daily" ? "35px" : "25px",
                            maxWidth: selectedPeriod === "daily" ? "35px" : "none",
                          }}
                        >
                          {/* Theme-colored Bar positioned by sentiment */}
                          {item.total > 0 ? (
                            <div
                              style={{
                                width: "70%",
                                height: `${barHeightPercent}%`,
                                backgroundColor: themeColor,
                                borderRadius: "4px",
                                cursor: "pointer",
                                transition: "all 0.2s",
                                opacity: 0.85,
                                boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                                border: `2px solid ${themeColor}`,
                                position: "absolute",
                                top: `${barTopPercent}%`,
                                transform: "translateY(0)", // Remove any transform offset
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.opacity = "1";
                                e.currentTarget.style.transform = "scale(1.15)";
                                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.3)";
                                e.currentTarget.style.zIndex = "100";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.opacity = "0.85";
                                e.currentTarget.style.transform = "scale(1)";
                                e.currentTarget.style.boxShadow = "0 2px 6px rgba(0,0,0,0.15)";
                                e.currentTarget.style.zIndex = "1";
                              }}
                              title={`${formatLabel(item)}\nTotal Entries: ${item.total}\nSentiment: ${sentimentLabel} (${avgSentiment.toFixed(2)})\n${dominantTheme ? `Theme: ${dominantTheme}\nAll Themes: ${item.allThemes?.join(", ") || "none"}` : "Theme: none"}`}
                            />
                          ) : (
                            // Show a faint placeholder bar for days with no entries (neutral position)
                            <div
                              style={{
                                width: "30%",
                                height: "2px",
                                backgroundColor: "#e0e0e0",
                                borderRadius: "2px",
                                position: "absolute",
                                top: "50%",
                                opacity: 0.3,
                              }}
                              title={`${formatLabel(item)}\nNo entries (neutral sentiment)`}
                            />
                          )}
                        </div>
                      );
                    })}
                    </div>
                  </div>

                  {/* Reference lines for sentiment scale */}
                  <div
                    style={{
                      position: "absolute",
                      top: "1rem",
                      left: "10px",
                      right: 0,
                      bottom: "3rem",
                      pointerEvents: "none",
                    }}
                  >
                    {/* Neutral line (middle) */}
                    <div
                      style={{
                        position: "absolute",
                        top: "50%",
                        left: 0,
                        right: 0,
                        height: "1px",
                        backgroundColor: "#e0e0e0",
                        borderTop: "1px dashed #ccc",
                      }}
                    />
                    {/* Positive region indicator */}
                    <div
                      style={{
                        position: "absolute",
                        top: "1rem",
                        left: 0,
                        right: 0,
                        height: "50%",
                        borderBottom: "1px dashed rgba(76, 175, 80, 0.3)",
                        pointerEvents: "none",
                      }}
                    />
                    {/* Negative region indicator */}
                    <div
                      style={{
                        position: "absolute",
                        bottom: "3rem",
                        left: 0,
                        right: 0,
                        height: "50%",
                        borderTop: "1px dashed rgba(244, 67, 54, 0.3)",
                        pointerEvents: "none",
                      }}
                    />
                  </div>
                </div>
                
                {/* X-axis labels - must match bar container spacing exactly */}
                <div
                  style={{
                    display: "flex",
                    gap: selectedPeriod === "daily" ? "4px" : "8px",
                    paddingLeft: "50px",
                    marginTop: "0.5rem",
                    overflowX: "auto",
                  }}
                >
                  {periodData.map((item, index) => (
                    <div
                      key={index}
                      style={{
                        flex: selectedPeriod === "daily" ? "0 0 35px" : "1",
                        fontSize: "0.65rem",
                        color: "#666",
                        textAlign: "center",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        minWidth: selectedPeriod === "daily" ? "35px" : "25px",
                        maxWidth: selectedPeriod === "daily" ? "35px" : "none",
                      }}
                      title={formatLabel(item)}
                    >
                      {formatLabel(item)}
                    </div>
                  ))}
                </div>
              </div>

              {/* Legend and Info */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                  marginTop: "1.5rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.75rem",
                  }}
                >
                  <div style={{ fontSize: "0.95rem", fontWeight: "600", color: "#333", marginBottom: "0.25rem" }}>
                    Bar Colors = Themes
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-start",
                      gap: "1.5rem",
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <div
                        style={{
                          width: "20px",
                          height: "20px",
                          backgroundColor: getThemeColor("work"),
                          borderRadius: "4px",
                        }}
                      />
                      <span style={{ fontSize: "0.85rem", color: "#666" }}>Work/Career</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <div
                        style={{
                          width: "20px",
                          height: "20px",
                          backgroundColor: getThemeColor("relationship"),
                          borderRadius: "4px",
                        }}
                      />
                      <span style={{ fontSize: "0.85rem", color: "#666" }}>Relationships</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <div
                        style={{
                          width: "20px",
                          height: "20px",
                          backgroundColor: getThemeColor("family"),
                          borderRadius: "4px",
                        }}
                      />
                      <span style={{ fontSize: "0.85rem", color: "#666" }}>Family</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <div
                        style={{
                          width: "20px",
                          height: "20px",
                          backgroundColor: getThemeColor("health"),
                          borderRadius: "4px",
                        }}
                      />
                      <span style={{ fontSize: "0.85rem", color: "#666" }}>Health/Fitness</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <div
                        style={{
                          width: "20px",
                          height: "3px",
                          backgroundColor: "#5b6cff",
                          borderRadius: "2px",
                        }}
                      />
                      <span style={{ fontSize: "0.85rem", color: "#666" }}>Sentiment Trend Line</span>
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    padding: "0.75rem 1rem",
                    backgroundColor: "#f0f2ff",
                    borderRadius: "8px",
                    fontSize: "0.85rem",
                    color: "#555",
                  }}
                >
                  <div style={{ fontWeight: "600", marginBottom: "0.5rem" }}>How to read this chart:</div>
                  <div style={{ marginBottom: "0.5rem" }}>
                    <strong>Bar Position (Vertical):</strong> Higher bars = more positive sentiment, lower bars = more negative sentiment. Bars in the middle = neutral sentiment.
                  </div>
                  <div style={{ marginBottom: "0.5rem" }}>
                    <strong>Bar Color:</strong> Represents the dominant theme/category of your entries (work, relationships, family, health, etc.).
                  </div>
                  <div>
                    <strong>Blue Line:</strong> Tracks your average sentiment trend over time. Hover over bars for detailed information.
                  </div>
                </div>
              </div>
            </div>

            {/* AI Insights Section - only show for weekly/monthly */}
            {(selectedPeriod === "weekly" || selectedPeriod === "monthly") && (
              <div
                style={{
                  backgroundColor: "white",
                  padding: "2rem",
                  borderRadius: "12px",
                  boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
                  marginTop: "2rem",
                }}
              >
                <h2
                  style={{
                    margin: "0 0 1.5rem 0",
                    fontSize: "1.5rem",
                    color: "#333",
                    borderBottom: "2px solid #e0e0e0",
                    paddingBottom: "0.75rem",
                  }}
                >
                  Synthesis & Patterns
                </h2>

                {loadingInsights ? (
                  <div
                    style={{
                      padding: "3rem",
                      textAlign: "center",
                      color: "#666",
                      fontSize: "1rem",
                    }}
                  >
                    Analyzing your journal entries...
                  </div>
                ) : aiInsights ? (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "2rem",
                    }}
                  >
                    {/* Period Summary */}
                    {aiInsights.summary && (
                      <div>
                        <h3
                          style={{
                            margin: "0 0 0.75rem 0",
                            fontSize: "1.1rem",
                            color: "#333",
                            fontWeight: "600",
                          }}
                        >
                          {selectedPeriod === "weekly" ? "This Week" : "This Month"}
                        </h3>
                        <p
                          style={{
                            margin: 0,
                            fontSize: "1rem",
                            color: "#555",
                            lineHeight: "1.6",
                          }}
                        >
                          {aiInsights.summary}
                        </p>
                      </div>
                    )}

                    {/* Pattern Insights */}
                    {aiInsights.patterns && aiInsights.patterns.length > 0 && (
                      <div>
                        <h3
                          style={{
                            margin: "0 0 0.75rem 0",
                            fontSize: "1.1rem",
                            color: "#333",
                            fontWeight: "600",
                          }}
                        >
                          Patterns I Noticed
                        </h3>
                        <ul
                          style={{
                            margin: 0,
                            paddingLeft: "1.5rem",
                            fontSize: "1rem",
                            color: "#555",
                            lineHeight: "1.8",
                          }}
                        >
                          {aiInsights.patterns.map((pattern, index) => (
                            <li key={index} style={{ marginBottom: "0.5rem" }}>
                              {pattern}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Reflection Questions */}
                    {aiInsights.reflectionQuestions && aiInsights.reflectionQuestions.length > 0 && (
                      <div>
                        <h3
                          style={{
                            margin: "0 0 0.75rem 0",
                            fontSize: "1.1rem",
                            color: "#333",
                            fontWeight: "600",
                          }}
                        >
                          Reflection Questions
                        </h3>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "0.75rem",
                          }}
                        >
                          {aiInsights.reflectionQuestions.map((question, index) => (
                            <div
                              key={index}
                              style={{
                                padding: "1rem 1.25rem",
                                backgroundColor: "#f8f9ff",
                                borderRadius: "8px",
                                borderLeft: "4px solid #5b6cff",
                                fontSize: "1rem",
                                color: "#555",
                                lineHeight: "1.6",
                              }}
                            >
                              {question}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Progress Comparison */}
                    {aiInsights.progress && (
                      <div>
                        <h3
                          style={{
                            margin: "0 0 0.75rem 0",
                            fontSize: "1.1rem",
                            color: "#333",
                            fontWeight: "600",
                          }}
                        >
                          Progress Comparison
                        </h3>
                        <div
                          style={{
                            display: "flex",
                            gap: "1.5rem",
                            flexWrap: "wrap",
                          }}
                        >
                          <div
                            style={{
                              flex: "1",
                              minWidth: "200px",
                              padding: "1rem",
                              backgroundColor: "#f8f9ff",
                              borderRadius: "8px",
                              border: "1px solid #e0e7ff",
                            }}
                          >
                            <div
                              style={{
                                fontSize: "0.85rem",
                                color: "#666",
                                marginBottom: "0.5rem",
                              }}
                            >
                              {aiInsights.progress.prevPeriod}
                            </div>
                            <div style={{ fontSize: "0.9rem", color: "#555" }}>
                              <div>Entries: {aiInsights.progress.prevStats.total_entries}</div>
                              <div style={{ marginTop: "0.25rem" }}>
                                Positive: {aiInsights.progress.prevStats.positive} | 
                                Neutral: {aiInsights.progress.prevStats.neutral} | 
                                Negative: {aiInsights.progress.prevStats.negative}
                              </div>
                            </div>
                          </div>
                          <div
                            style={{
                              flex: "1",
                              minWidth: "200px",
                              padding: "1rem",
                              backgroundColor: "#f0f2ff",
                              borderRadius: "8px",
                              border: "1px solid #c8d4ff",
                            }}
                          >
                            <div
                              style={{
                                fontSize: "0.85rem",
                                color: "#666",
                                marginBottom: "0.5rem",
                              }}
                            >
                              {aiInsights.progress.period}
                            </div>
                            <div style={{ fontSize: "0.9rem", color: "#555" }}>
                              <div>
                                Entries: {aiInsights.progress.currentStats.total_entries}
                                {aiInsights.progress.entryChange !== 0 && (
                                  <span
                                    style={{
                                      marginLeft: "0.5rem",
                                      color:
                                        aiInsights.progress.entryChange > 0
                                          ? "#10b981"
                                          : "#ef4444",
                                      fontWeight: "600",
                                    }}
                                  >
                                    ({aiInsights.progress.entryChange > 0 ? "+" : ""}
                                    {aiInsights.progress.entryChange})
                                  </span>
                                )}
                              </div>
                              <div style={{ marginTop: "0.25rem" }}>
                                Positive: {aiInsights.progress.currentStats.positive}
                                {aiInsights.progress.sentimentChange.positive !== 0 && (
                                  <span
                                    style={{
                                      marginLeft: "0.25rem",
                                      color:
                                        aiInsights.progress.sentimentChange.positive > 0
                                          ? "#10b981"
                                          : "#ef4444",
                                      fontSize: "0.85rem",
                                    }}
                                  >
                                    ({aiInsights.progress.sentimentChange.positive > 0 ? "+" : ""}
                                    {aiInsights.progress.sentimentChange.positive})
                                  </span>
                                )}
                                {" | "}
                                Neutral: {aiInsights.progress.currentStats.neutral} | 
                                Negative: {aiInsights.progress.currentStats.negative}
                                {aiInsights.progress.sentimentChange.negative !== 0 && (
                                  <span
                                    style={{
                                      marginLeft: "0.25rem",
                                      color:
                                        aiInsights.progress.sentimentChange.negative > 0
                                          ? "#ef4444"
                                          : "#10b981",
                                      fontSize: "0.85rem",
                                    }}
                                  >
                                    ({aiInsights.progress.sentimentChange.negative > 0 ? "+" : ""}
                                    {aiInsights.progress.sentimentChange.negative})
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    style={{
                      padding: "2rem",
                      textAlign: "center",
                      color: "#666",
                      fontSize: "1rem",
                    }}
                  >
                    No insights available yet. Keep journaling to see patterns and reflections!
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
