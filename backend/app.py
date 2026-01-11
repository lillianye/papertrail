from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import openai
import re
from datetime import datetime, timedelta, date
from zoneinfo import ZoneInfo
import os
from streak.streak import update_streak, get_streak_info, set_milestone, get_pacific_date, get_pacific_date_str

# Pacific timezone
PACIFIC_TZ = ZoneInfo("America/Los_Angeles")

def get_pacific_datetime():
    """Get current datetime in Pacific timezone"""
    return datetime.now(PACIFIC_TZ)

def get_pacific_date_str():
    """Get today's date string (YYYY-MM-DD) in Pacific timezone"""
    return get_pacific_datetime().strftime("%Y-%m-%d")

app = Flask(__name__)
CORS(app)

# Get the directory where this script is located (backend directory)
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(BACKEND_DIR, "data.json")
PROMPTS_FILE = os.path.join(BACKEND_DIR, "prompts.json")

# 🔑 OpenAI API key - Set via environment variable
# Set OPENAI_API_KEY environment variable before running:
# export OPENAI_API_KEY="your-api-key-here"
# Or create a .env file in the backend directory with: OPENAI_API_KEY=your-api-key-here
openai.api_key = os.getenv("OPENAI_API_KEY", "")
if not openai.api_key:
    print("⚠️  WARNING: OPENAI_API_KEY environment variable not set!")
    print("   Set it with: export OPENAI_API_KEY='your-api-key-here'")

# -------------------------
# GPT-3.5 Analysis Function
# -------------------------
def analyze_entry_with_gpt(entry_text):
    """
    Returns a dict like {"themes": ["family", "loss"], "sentiment": "positive"}
    Analyzes both themes and sentiment
    """
    # Analyze themes and sentiment in one call
    response = openai.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "system", "content": "You are an empathetic journaling assistant. Analyze the user's journal entry and identify key themes/topics and overall sentiment. Respond with ONLY this format: Themes: theme1, theme2, theme3 | Sentiment: positive/negative/neutral"},
            {"role": "user", "content": entry_text}
        ],
        max_tokens=80
    )

    text = response.choices[0].message.content.strip()

    themes = []
    sentiment = "neutral"

    # Parse response: "Themes: family, grief, work | Sentiment: negative"
    if "Themes:" in text:
        try:
            themes_str = text.split("Themes:")[1].split("|")[0].strip()
            themes = [t.strip() for t in themes_str.split(",") if t.strip()]
        except Exception:
            pass
    
    if "Sentiment:" in text:
        try:
            sentiment_str = text.split("Sentiment:")[1].strip().lower()
            if "positive" in sentiment_str:
                sentiment = "positive"
            elif "negative" in sentiment_str:
                sentiment = "negative"
            else:
                sentiment = "neutral"
        except Exception:
            pass

    return {"themes": themes, "sentiment": sentiment}

# -------------------------
# GPT-3.5 Prompt Generation
# -------------------------
def generate_prompt_with_gpt(entry):
    """
    Returns a context-aware follow-up question/prompt
    """
    response = openai.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "system", "content": "You are an empathetic journaling assistant. Generate a short, kind, context-aware follow-up prompt for the user based on their entry."},
            {"role": "user", "content": f"Entry: {entry}"}
        ],
        max_tokens=50
    )

    return response.choices[0].message.content.strip()

def generate_conversation_response(conversation_history):
    """
    Generates an AI response based on conversation history
    Returns the AI's response text
    """
    system_message = {"role": "system", "content": "You are an empathetic, thoughtful journaling assistant. Have a genuine, supportive conversation with the user. Be kind, understanding, and ask meaningful questions to help them reflect."}
    
    messages = [system_message] + conversation_history
    
    response = openai.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=messages,
        max_tokens=200
    )

    return response.choices[0].message.content.strip()

def generate_goal_from_conversation(conversation_history):
    """
    Generates a small, friendly goal based on conversation history
    Returns a goal with an actionable suggestion that includes specific timing and duration
    """
    system_message = {
        "role": "system",
        "content": "You are an empathetic, supportive journaling assistant. Based on the conversation with the user, generate one small, friendly, achievable goal. The goal MUST: 1) Acknowledge their feelings/concerns briefly, 2) Be supportive and validating, 3) Include a specific, actionable suggestion that explicitly states WHEN to do it (e.g., 'tomorrow', 'before bed tonight', 'this week'), HOW LONG it will take (specify exact minutes like '2 minutes', '5 minutes', '10 minutes' - never use vague terms like 'a few minutes'), and WHAT exactly to do. The suggestion must be time-bound and specific so the user can't put it off. IMPORTANT: NEVER suggest journaling, writing, or keeping a journal - the user is already using a journaling app. Suggest other helpful actions like breathing exercises, mindfulness, physical activity, self-care activities, connecting with others, or other concrete actions. Vary your wording naturally - don't always start with the same phrase. The goal should include the specific time, action, and duration, but phrase it in a natural, varied way. Example formats: 'Tomorrow, try practicing deep breathing exercises for 2 minutes' or 'You could go for a short 5-minute walk before bed tonight' or 'This week, consider doing 10 minutes of stretching in the morning'. Keep it concise (2-3 sentences total)."
    }
    
    # Format conversation history for GPT
    gpt_messages = [system_message]
    for msg in conversation_history:
        if msg["role"] == "user":
            gpt_messages.append({"role": "user", "content": msg["content"]})
        elif msg["role"] == "ai":
            gpt_messages.append({"role": "assistant", "content": msg["content"]})
    
    response = openai.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=gpt_messages,
        max_tokens=150
    )

    return response.choices[0].message.content.strip()

# -------------------------
# Flask Endpoints
# -------------------------
@app.route("/journal", methods=["POST"])
def journal():
    # Use get_data() instead of request.data to avoid Flask debughelpers error
    try:
        raw_data = request.get_data(as_text=True)
        print("RAW REQUEST DATA:", raw_data)
    except Exception as e:
        print("Could not get raw request data:", e)
    print("PARSED JSON:", request.json)

    text = request.json["entry"]
    date = request.json.get("date", get_pacific_date_str())
    mode = request.json.get("mode", "venting")

    # Validate date - cannot create entries for future dates
    today = get_pacific_date()
    try:
        entry_date = datetime.strptime(date, "%Y-%m-%d").date()
    except ValueError:
        return jsonify({"error": "Invalid date format"}), 400
    
    # Check if entry already exists for this date and mode
    entry_exists = False
    if os.path.exists(DATA_FILE) and os.path.getsize(DATA_FILE) > 0:
        with open(DATA_FILE, "r") as f:
            try:
                existing_data = json.load(f)
                entry_exists = any(
                    e.get("date") == date and e.get("mode") == mode 
                    for e in existing_data
                )
            except json.JSONDecodeError:
                pass
    
    # If creating a NEW entry (not editing existing), block future dates
    if not entry_exists and entry_date > today:
        return jsonify({
            "error": "Cannot create entries for future dates. You can only journal for today or past dates."
        }), 400

    # Ensure data.json exists and is valid
    if not os.path.exists(DATA_FILE) or os.path.getsize(DATA_FILE) == 0:
        data = []
    else:
        with open(DATA_FILE, "r") as f:
            try:
                data = json.load(f)
            except json.JSONDecodeError:
                data = []

    if mode == "conversation":
        # Find existing conversation entry for this date
        entry_index = None
        for i, entry in enumerate(data):
            if entry.get("date") == date and entry.get("mode") == "conversation":
                entry_index = i
                break
        
        # Get existing conversation or create new one
        if entry_index is not None:
            conversation = data[entry_index].get("conversation", [])
        else:
            conversation = []
        
        # Add user message
        conversation.append({"role": "user", "content": text})
        
        # Generate AI response using conversation history
        # Format conversation history for GPT (user/assistant roles)
        gpt_messages = []
        for msg in conversation:
            if msg["role"] == "user":
                gpt_messages.append({"role": "user", "content": msg["content"]})
            elif msg["role"] == "ai":
                gpt_messages.append({"role": "assistant", "content": msg["content"]})
        
        ai_response = generate_conversation_response(gpt_messages)
        conversation.append({"role": "ai", "content": ai_response})
        
        # Analyze all user messages in conversation for themes and sentiment
        all_user_messages = [msg["content"] for msg in conversation if msg["role"] == "user"]
        combined_text = " ".join(all_user_messages)
        analysis = analyze_entry_with_gpt(combined_text) if combined_text.strip() else {"themes": [], "sentiment": "neutral"}
        
        # Update or create entry
        entry_data = {
            "date": date,
            "mode": "conversation",
            "conversation": conversation,
            "themes": analysis.get("themes", []),
            "sentiment": analysis.get("sentiment", "neutral")
        }
        
        if entry_index is not None:
            data[entry_index] = entry_data
        else:
            data.append(entry_data)
        
        # Write to file and ensure it's flushed to disk
        with open(DATA_FILE, "w") as f:
            json.dump(data, f, indent=2)
            f.flush()
            os.fsync(f.fileno())  # Force write to disk
        
        # Update streak
        streak_data = update_streak(date)
        
        return jsonify({
            "ai_response": ai_response,
            "conversation": conversation,
            "streak": streak_data.get("current_streak", 0)
        })
    
    else:
        # Venting mode - no AI generation, just save the entry
        # Check if venting entry for this date already exists, if so replace it
        entry_index = None
        for i, entry in enumerate(data):
            if entry.get("date") == date and entry.get("mode") == "venting":
                entry_index = i
                break
        
        # Analyze entry for themes and sentiment
        analysis = analyze_entry_with_gpt(text) if text.strip() else {"themes": [], "sentiment": "neutral"}
        
        entry_data = {
            "date": date,
            "mode": "venting",
            "text": text,
            "themes": analysis.get("themes", []),
            "sentiment": analysis.get("sentiment", "neutral")
        }
        
        if entry_index is not None:
            data[entry_index] = entry_data
        else:
            data.append(entry_data)
        
        # Write to file and ensure it's flushed to disk
        with open(DATA_FILE, "w") as f:
            json.dump(data, f, indent=2)
            f.flush()
            os.fsync(f.fileno())  # Force write to disk

        # Update streak
        streak_data = update_streak(date)

        return jsonify({
            "saved": True,
            "streak": streak_data.get("current_streak", 0)
        })

@app.route("/prompts", methods=["POST"])
def save_prompts():
    """Save prompts for a specific date"""
    try:
        request_data = request.get_json()
        date = request_data.get("date")
        prompts = request_data.get("prompts", [])
        
        if not date:
            return jsonify({"error": "Date is required"}), 400
        
        # Load existing prompts file or create new one
        prompts_file = PROMPTS_FILE
        if os.path.exists(prompts_file) and os.path.getsize(prompts_file) > 0:
            with open(prompts_file, "r") as f:
                try:
                    all_prompts = json.load(f)
                except json.JSONDecodeError:
                    all_prompts = {}
        else:
            all_prompts = {}
        
        # Save prompts for this date
        all_prompts[date] = prompts
        
        with open(prompts_file, "w") as f:
            json.dump(all_prompts, f, indent=2)
        
        return jsonify({"saved": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/prompts/saved", methods=["GET"])
def get_saved_prompts_only():
    """Get ONLY saved prompts for a specific date (does not generate new prompts)"""
    date_str = request.args.get("date")
    
    if not date_str:
        return jsonify({"prompts": []})
    
    prompts_file = PROMPTS_FILE
    if os.path.exists(prompts_file) and os.path.getsize(prompts_file) > 0:
        with open(prompts_file, "r") as f:
            try:
                all_prompts = json.load(f)
                saved_prompts = all_prompts.get(date_str, [])
                if saved_prompts and len(saved_prompts) > 0:
                    return jsonify({"prompts": saved_prompts})
            except json.JSONDecodeError:
                pass
    
    # No saved prompts found - return empty array
    return jsonify({"prompts": []})


@app.route("/entries", methods=["GET"])
def get_entries():
    date = request.args.get("date")
    mode = request.args.get("mode")  # Optional mode filter
    
    if not os.path.exists(DATA_FILE) or os.path.getsize(DATA_FILE) == 0:
        data = []
    else:
        with open(DATA_FILE, "r") as f:
            try:
                data = json.load(f)
            except json.JSONDecodeError:
                data = []
    
    if date:
        # Return all entries for specific date (can have both venting and conversation)
        entries = [e for e in data if e.get("date") == date]
        
        # If mode is specified, filter by mode
        if mode:
            entries = [e for e in entries if e.get("mode") == mode]
        
        # If mode was specified, return that specific entry
        if mode:
            result = entries[0] if entries else {}
            # Also include saved prompts if they exist
            prompts_file = PROMPTS_FILE
            if os.path.exists(prompts_file) and os.path.getsize(prompts_file) > 0:
                with open(prompts_file, "r") as f:
                    try:
                        all_prompts = json.load(f)
                        if date in all_prompts:
                            result["saved_prompts"] = all_prompts[date]
                    except json.JSONDecodeError:
                        pass
            return jsonify(result)
        
        # If no mode specified, prioritize conversation if exists, otherwise return first entry
        if entries:
            # Prefer conversation mode if exists, otherwise return first
            conversation_entry = next((e for e in entries if e.get("mode") == "conversation"), None)
            if conversation_entry:
                return jsonify(conversation_entry)
            return jsonify(entries[0])
        return jsonify({})
    else:
        # Return all entries (filter out entries without dates for consistency)
        entries_with_dates = [e for e in data if "date" in e]
        return jsonify(entries_with_dates)

@app.route("/entries/date/<date>", methods=["GET"])
def get_entry_by_date(date):
    if not os.path.exists(DATA_FILE) or os.path.getsize(DATA_FILE) == 0:
        return jsonify({})
    
    with open(DATA_FILE, "r") as f:
        try:
            data = json.load(f)
        except json.JSONDecodeError:
            return jsonify({})
    
    entry = next((e for e in data if e.get("date") == date), None)
    return jsonify(entry if entry else {})

@app.route("/goal", methods=["POST"])
def generate_goal():
    """
    Generate a goal based on conversation history
    """
    request_data = request.json
    conversation = request_data.get("conversation", [])
    date = request_data.get("date")
    
    if not conversation or len(conversation) == 0:
        return jsonify({"error": "No conversation history provided"}), 400
    
    # Generate goal from conversation
    goal = generate_goal_from_conversation(conversation)
    
    # Optionally save goal to entry
    if date:
        if not os.path.exists(DATA_FILE) or os.path.getsize(DATA_FILE) == 0:
            data = []
        else:
            with open(DATA_FILE, "r") as f:
                try:
                    data = json.load(f)
                except json.JSONDecodeError:
                    data = []
        
        # Find conversation entry for this date and add goal
        for i, entry in enumerate(data):
            if entry.get("date") == date and entry.get("mode") == "conversation":
                data[i]["goal"] = goal
                with open(DATA_FILE, "w") as f:
                    json.dump(data, f, indent=2)
                    f.flush()
                    os.fsync(f.fileno())  # Force write to disk
                break
    
    return jsonify({"goal": goal})

@app.route("/entries/<date>", methods=["DELETE"])
def delete_entry(date):
    """
    Delete entry/entries for a specific date
    Query param 'mode' can be 'venting' or 'conversation' to delete specific mode
    If no mode specified, deletes all entries for that date
    Recalculates streak after deletion
    """
    mode = request.args.get("mode")
    
    if not os.path.exists(DATA_FILE) or os.path.getsize(DATA_FILE) == 0:
        return jsonify({"error": "No entries found"}), 404
    
    with open(DATA_FILE, "r") as f:
        try:
            data = json.load(f)
        except json.JSONDecodeError:
            return jsonify({"error": "Invalid data file"}), 500
    
    # Find entries to delete
    original_length = len(data)
    
    if mode:
        # Delete specific mode entry for this date
        data = [e for e in data if not (e.get("date") == date and e.get("mode") == mode)]
    else:
        # Delete all entries for this date
        data = [e for e in data if e.get("date") != date]
    
    # Check if anything was deleted
    if len(data) == original_length:
        return jsonify({"error": "Entry not found"}), 404
    
    # Save updated data and ensure it's flushed to disk
    with open(DATA_FILE, "w") as f:
        json.dump(data, f, indent=2)
        f.flush()
        os.fsync(f.fileno())  # Force write to disk
    
    # Recalculate streak after deletion (since dates may have been removed)
    streak_data = update_streak(date)
    
    return jsonify({
        "success": True,
        "message": "Entry deleted successfully",
        "streak": streak_data.get("current_streak", 0)
    })

@app.route("/streak", methods=["GET"])
def get_streak():
    """
    Get current streak information
    Recalculates from all entries to ensure accuracy
    """
    streak_info = get_streak_info()
    # Include today's date in the response so frontend can use it (Pacific time)
    streak_info["server_date"] = get_pacific_date_str()
    return jsonify(streak_info)

@app.route("/streak/milestone", methods=["POST"])
def update_milestone():
    """
    Set or update streak milestone goal
    Expects JSON: {"milestone": <number>} or {"milestone": null} to clear
    """
    request_data = request.json
    milestone = request_data.get("milestone")
    
    # Validate milestone
    if milestone is not None:
        try:
            milestone = int(milestone)
            if milestone <= 0:
                return jsonify({"error": "Milestone must be a positive number"}), 400
        except (ValueError, TypeError):
            return jsonify({"error": "Milestone must be a valid number"}), 400
    
    streak_data = set_milestone(milestone)
    streak_info = get_streak_info()
    
    return jsonify(streak_info)

@app.route("/insights/sentiment-trends", methods=["GET"])
def get_sentiment_trends():
    """
    Get sentiment trends over time for visualization
    Returns data grouped by date with sentiment distribution
    """
    if not os.path.exists(DATA_FILE) or os.path.getsize(DATA_FILE) == 0:
        return jsonify({
            "daily": [],
            "weekly": [],
            "monthly": []
        })
    
    with open(DATA_FILE, "r") as f:
        try:
            data = json.load(f)
        except json.JSONDecodeError:
            return jsonify({
                "daily": [],
                "weekly": [],
                "monthly": []
            })
    
    # Filter entries with dates and sentiment
    entries = [e for e in data if e.get("date") and e.get("sentiment")]
    
    if not entries:
        return jsonify({
            "daily": [],
            "weekly": [],
            "monthly": []
        })
    
    # Daily sentiment trends - last 30 days
    daily_data = {}
    sentiment_values = {"positive": 1, "neutral": 0, "negative": -1}
    
    # Sort entries by date
    entries.sort(key=lambda x: x.get("date", ""))
    
    # Get last 30 days (Pacific time)
    today = get_pacific_date()
    for i in range(30):
        target_date = today - timedelta(days=i)
        date_str = target_date.strftime("%Y-%m-%d")
        daily_data[date_str] = {
            "positive": 0, "neutral": 0, "negative": 0, "count": 0,
            "themes": {}  # Track theme counts
        }
    
    # Count sentiments and themes by date
    for entry in entries:
        entry_date_str = entry.get("date")
        sentiment = entry.get("sentiment", "neutral")
        
        if entry_date_str in daily_data and sentiment in ["positive", "neutral", "negative"]:
            daily_data[entry_date_str][sentiment] += 1
            daily_data[entry_date_str]["count"] += 1
            
            # Track themes
            if entry.get("themes") and isinstance(entry.get("themes"), list):
                for theme in entry["themes"]:
                    theme_lower = theme.lower().strip()
                    if theme_lower:
                        daily_data[entry_date_str]["themes"][theme_lower] = daily_data[entry_date_str]["themes"].get(theme_lower, 0) + 1
    
    # Convert to array format for charting (last 30 days, newest first)
    daily_array = []
    for i in range(30):
        target_date = today - timedelta(days=29 - i)
        date_str = target_date.strftime("%Y-%m-%d")
        day_data = daily_data.get(date_str, {"positive": 0, "neutral": 0, "negative": 0, "count": 0, "themes": {}})
        
        # Calculate average sentiment value for the day
        # Use 0 (neutral) for days with no entries to keep line continuous
        if day_data["count"] > 0:
            avg_sentiment = (
                day_data["positive"] * 1 + 
                day_data["neutral"] * 0 + 
                day_data["negative"] * -1
            ) / day_data["count"]
        else:
            avg_sentiment = 0  # Neutral for days with no entries
        
        # Get dominant theme for this day
        dominant_theme = None
        if day_data.get("themes") and len(day_data["themes"]) > 0:
            dominant_theme = max(day_data["themes"].items(), key=lambda x: x[1])[0]
        
        daily_array.append({
            "date": date_str,
            "positive": day_data["positive"],
            "neutral": day_data["neutral"],
            "negative": day_data["negative"],
            "total": day_data["count"],
            "averageSentiment": avg_sentiment,
            "dominantTheme": dominant_theme,
            "allThemes": list(day_data.get("themes", {}).keys())
        })
    
    # Weekly aggregation (last 12 weeks)
    weekly_data = {}
    for entry in entries:
        try:
            entry_date = datetime.strptime(entry.get("date"), "%Y-%m-%d").date()
            # Get ISO week
            year, week, _ = entry_date.isocalendar()
            week_key = f"{year}-W{week:02d}"
            
            if week_key not in weekly_data:
                weekly_data[week_key] = {"positive": 0, "neutral": 0, "negative": 0, "count": 0, "themes": {}}
            
            sentiment = entry.get("sentiment", "neutral")
            if sentiment in ["positive", "neutral", "negative"]:
                weekly_data[week_key][sentiment] += 1
                weekly_data[week_key]["count"] += 1
                
                # Track themes
                if entry.get("themes") and isinstance(entry.get("themes"), list):
                    for theme in entry["themes"]:
                        theme_lower = theme.lower().strip()
                        if theme_lower:
                            weekly_data[week_key]["themes"][theme_lower] = weekly_data[week_key]["themes"].get(theme_lower, 0) + 1
        except (ValueError, TypeError):
            continue
    
    # Convert weekly data to array (last 12 weeks)
    weekly_array = []
    current_year, current_week, _ = today.isocalendar()
    
    for i in range(12):
        week_num = current_week - i
        year = current_year
        if week_num <= 0:
            week_num += 52
            year -= 1
        
        week_key = f"{year}-W{week_num:02d}"
        week_data = weekly_data.get(week_key, {"positive": 0, "neutral": 0, "negative": 0, "count": 0, "themes": {}})
        
        if week_data["count"] > 0:
            avg_sentiment = (
                week_data["positive"] * 1 + 
                week_data["neutral"] * 0 + 
                week_data["negative"] * -1
            ) / week_data["count"]
        else:
            avg_sentiment = 0  # Neutral for weeks with no entries
        
        # Get dominant theme for this week
        dominant_theme = None
        if week_data.get("themes") and len(week_data["themes"]) > 0:
            dominant_theme = max(week_data["themes"].items(), key=lambda x: x[1])[0]
        
        weekly_array.insert(0, {
            "week": week_key,
            "positive": week_data["positive"],
            "neutral": week_data["neutral"],
            "negative": week_data["negative"],
            "total": week_data["count"],
            "averageSentiment": avg_sentiment,
            "dominantTheme": dominant_theme,
            "allThemes": list(week_data.get("themes", {}).keys())
        })
    
    # Monthly aggregation (last 12 months)
    monthly_data = {}
    for entry in entries:
        try:
            entry_date = datetime.strptime(entry.get("date"), "%Y-%m-%d").date()
            month_key = f"{entry_date.year}-{entry_date.month:02d}"
            
            if month_key not in monthly_data:
                monthly_data[month_key] = {"positive": 0, "neutral": 0, "negative": 0, "count": 0, "themes": {}}
            
            sentiment = entry.get("sentiment", "neutral")
            if sentiment in ["positive", "neutral", "negative"]:
                monthly_data[month_key][sentiment] += 1
                monthly_data[month_key]["count"] += 1
                
                # Track themes
                if entry.get("themes") and isinstance(entry.get("themes"), list):
                    for theme in entry["themes"]:
                        theme_lower = theme.lower().strip()
                        if theme_lower:
                            monthly_data[month_key]["themes"][theme_lower] = monthly_data[month_key]["themes"].get(theme_lower, 0) + 1
        except (ValueError, TypeError):
            continue
    
    # Convert monthly data to array (last 12 months)
    monthly_array = []
    first_day_current = today.replace(day=1)
    for i in range(12):
        # Calculate first day of the month i months ago
        if i == 0:
            month_date = first_day_current
        else:
            # Calculate target month and year
            target_month = first_day_current.month - i
            target_year = first_day_current.year
            
            while target_month <= 0:
                target_month += 12
                target_year -= 1
            
            # Create date for first day of target month
            month_date = date(target_year, target_month, 1)
        
        month_key = f"{month_date.year}-{month_date.month:02d}"
        
        month_data = monthly_data.get(month_key, {"positive": 0, "neutral": 0, "negative": 0, "count": 0, "themes": {}})
        
        if month_data["count"] > 0:
            avg_sentiment = (
                month_data["positive"] * 1 + 
                month_data["neutral"] * 0 + 
                month_data["negative"] * -1
            ) / month_data["count"]
        else:
            avg_sentiment = 0  # Neutral for months with no entries
        
        # Get dominant theme for this month
        dominant_theme = None
        if month_data.get("themes") and len(month_data["themes"]) > 0:
            dominant_theme = max(month_data["themes"].items(), key=lambda x: x[1])[0]
        
        monthly_array.insert(0, {
            "month": month_key,
            "positive": month_data["positive"],
            "neutral": month_data["neutral"],
            "negative": month_data["negative"],
            "total": month_data["count"],
            "averageSentiment": avg_sentiment,
            "dominantTheme": dominant_theme,
            "allThemes": list(month_data.get("themes", {}).keys())
        })
    
    return jsonify({
        "daily": daily_array,
        "weekly": weekly_array,
        "monthly": monthly_array
    })

@app.route("/insights/ai-summary", methods=["GET"])
def get_ai_insights():
    """
    Generate AI-powered insights including:
    - Period summary (weekly/monthly)
    - Pattern insights (e.g., "You tend to write about work stress on Mondays")
    - Reflection questions
    - Progress comparison with previous period
    """
    period = request.args.get("period", "weekly")  # weekly or monthly
    target_date = request.args.get("date")  # Optional: specific date to analyze from (defaults to today)
    
    if not os.path.exists(DATA_FILE) or os.path.getsize(DATA_FILE) == 0:
        return jsonify({
            "summary": "You haven't started journaling yet. Start writing to see insights!",
            "patterns": [],
            "reflectionQuestions": [],
            "progress": None
        })
    
    with open(DATA_FILE, "r") as f:
        try:
            all_entries = json.load(f)
        except json.JSONDecodeError:
            all_entries = []
    
    if not all_entries:
        return jsonify({
            "summary": "You haven't started journaling yet. Start writing to see insights!",
            "patterns": [],
            "reflectionQuestions": [],
            "progress": None
        })
    
    # Parse target date or use today
    if target_date:
        try:
            base_date = datetime.strptime(target_date, "%Y-%m-%d").date()
        except ValueError:
            base_date = get_pacific_date()
    else:
        base_date = get_pacific_date()
    
    # Filter entries for the target period
    period_entries = []
    if period == "weekly":
        # Get current week (ISO week)
        year, week, _ = base_date.isocalendar()
        for entry in all_entries:
            try:
                entry_date = datetime.strptime(entry.get("date"), "%Y-%m-%d").date()
                entry_year, entry_week, _ = entry_date.isocalendar()
                if entry_year == year and entry_week == week:
                    period_entries.append(entry)
            except (ValueError, TypeError):
                continue
        
        # Get previous week for comparison (subtract 7 days to get same weekday of previous week)
        prev_week_date = base_date - timedelta(days=7)
        prev_year, prev_week, _ = prev_week_date.isocalendar()
        prev_period_entries = []
        for entry in all_entries:
            try:
                entry_date = datetime.strptime(entry.get("date"), "%Y-%m-%d").date()
                entry_year, entry_week, _ = entry_date.isocalendar()
                if entry_year == prev_year and entry_week == prev_week:
                    prev_period_entries.append(entry)
            except (ValueError, TypeError):
                continue
        
        period_label = f"Week {week}, {year}"
        prev_period_label = f"Week {prev_week}, {prev_year}"
        
    else:  # monthly
        # Get current month
        month_start = base_date.replace(day=1)
        for entry in all_entries:
            try:
                entry_date = datetime.strptime(entry.get("date"), "%Y-%m-%d").date()
                if entry_date.year == month_start.year and entry_date.month == month_start.month:
                    period_entries.append(entry)
            except (ValueError, TypeError):
                continue
        
        # Get previous month for comparison
        if month_start.month == 1:
            prev_month_start = date(month_start.year - 1, 12, 1)
        else:
            prev_month_start = date(month_start.year, month_start.month - 1, 1)
        
        prev_period_entries = []
        for entry in all_entries:
            try:
                entry_date = datetime.strptime(entry.get("date"), "%Y-%m-%d").date()
                if entry_date.year == prev_month_start.year and entry_date.month == prev_month_start.month:
                    prev_period_entries.append(entry)
            except (ValueError, TypeError):
                continue
        
        month_names = ["January", "February", "March", "April", "May", "June",
                      "July", "August", "September", "October", "November", "December"]
        period_label = f"{month_names[month_start.month - 1]} {month_start.year}"
        prev_period_label = f"{month_names[prev_month_start.month - 1]} {prev_month_start.year}"
    
    if not period_entries:
        return jsonify({
            "summary": f"No entries found for {period_label}. Start journaling to see insights!",
            "patterns": [],
            "reflectionQuestions": [],
            "progress": None
        })
    
    # Prepare entry data for GPT analysis
    entries_text = []
    entries_by_day = {}
    for entry in period_entries:
        date_str = entry.get("date")
        day_name = datetime.strptime(date_str, "%Y-%m-%d").strftime("%A") if date_str else "Unknown"
        
        if entry.get("mode") == "venting":
            text = entry.get("text", "")
        elif entry.get("mode") == "conversation":
            # Combine all user messages from conversation
            conv = entry.get("conversation", [])
            text = " ".join([msg.get("content", "") for msg in conv if msg.get("role") == "user"])
        else:
            text = ""
        
        if text:
            entries_text.append(f"[{date_str} ({day_name})]: {text}")
            if day_name not in entries_by_day:
                entries_by_day[day_name] = []
            entries_by_day[day_name].append({
                "date": date_str,
                "text": text,
                "themes": entry.get("themes", []),
                "sentiment": entry.get("sentiment", "neutral")
            })
    
    all_text = "\n\n".join(entries_text)
    
    # Calculate statistics for progress comparison
    current_stats = {
        "total_entries": len(period_entries),
        "positive": sum(1 for e in period_entries if e.get("sentiment") == "positive"),
        "neutral": sum(1 for e in period_entries if e.get("sentiment") == "neutral"),
        "negative": sum(1 for e in period_entries if e.get("sentiment") == "negative"),
    }
    
    prev_stats = {
        "total_entries": len(prev_period_entries),
        "positive": sum(1 for e in prev_period_entries if e.get("sentiment") == "positive"),
        "neutral": sum(1 for e in prev_period_entries if e.get("sentiment") == "neutral"),
        "negative": sum(1 for e in prev_period_entries if e.get("sentiment") == "negative"),
    }
    
    # Generate AI insights using GPT
    system_message = f"""You are an empathetic journaling assistant analyzing a user's journal entries for {period_label}. 
Based on the entries provided, you MUST respond with ONLY valid JSON (no other text) with these exact keys:
- "summary": A brief 2-3 sentence string synthesizing what the user focused on (themes, emotions, events). Be supportive and non-judgmental.
- "patterns": An array of strings with specific pattern observations (e.g., "You tend to write about work stress on Mondays" or "Your mood improves on weekends"). Be specific about days/patterns if they appear. Return empty array [] if no clear patterns exist.
- "reflectionQuestions": An array of 2-3 thoughtful string questions to help the user gain deeper insight (e.g., "Looking back at this {period}, what would you tell yourself at the beginning?")

Example response format:
{{"summary": "This week you processed work stress, celebrated family moments, and focused on self-care goals.", "patterns": ["You tend to write about work stress on Mondays"], "reflectionQuestions": ["Looking back at this week, what would you tell yourself at the beginning?"]}}

Be concise, specific, and supportive. Never make up patterns that don't exist. Return ONLY the JSON object, no additional text."""
    
    try:
        response = openai.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": f"Journal entries for {period_label}:\n\n{all_text}"}
            ],
            max_tokens=400,
        )
        
        response_text = response.choices[0].message.content.strip()
        
        # Try to extract JSON from response (might have markdown code blocks)
        if "```json" in response_text:
            response_text = response_text.split("```json")[1].split("```")[0].strip()
        elif "```" in response_text:
            response_text = response_text.split("```")[1].split("```")[0].strip()
        
        # Try to parse as JSON
        try:
            ai_response = json.loads(response_text)
            summary = ai_response.get("summary", f"Here's what stood out in {period_label}.")
            patterns = ai_response.get("patterns", [])
            if not isinstance(patterns, list):
                patterns = []
            reflection_questions = ai_response.get("reflectionQuestions", [])
            if not isinstance(reflection_questions, list):
                reflection_questions = []
        except json.JSONDecodeError:
            # If not JSON, treat entire response as summary
            print(f"Failed to parse JSON response: {response_text}")
            summary = response_text if response_text else f"You wrote {current_stats['total_entries']} entries in {period_label}."
            patterns = []
            reflection_questions = []
        
    except Exception as e:
        print(f"Error generating AI insights: {e}")
        # Fallback summary
        summary = f"You wrote {current_stats['total_entries']} entries in {period_label}."
        patterns = []
        reflection_questions = []
    
    # Calculate progress comparison
    progress = None
    if prev_stats["total_entries"] > 0:
        entry_change = current_stats["total_entries"] - prev_stats["total_entries"]
        sentiment_change = {
            "positive": current_stats["positive"] - prev_stats["positive"],
            "negative": current_stats["negative"] - prev_stats["negative"],
        }
        progress = {
            "period": period_label,
            "prevPeriod": prev_period_label,
            "entryChange": entry_change,
            "sentimentChange": sentiment_change,
            "currentStats": current_stats,
            "prevStats": prev_stats
        }
    
    return jsonify({
        "summary": summary,
        "patterns": patterns,
        "reflectionQuestions": reflection_questions,
        "progress": progress
    })

@app.route("/prompts", methods=["GET"])
def get_prompts():
    """
    Generate new context-aware writing prompts for journal entries.
    Always generates new prompts (does not return saved prompts).
    Returns 1-2 personalized prompts based on past entries and themes.
    """
    date_str = request.args.get("date")
    # Note: This endpoint always generates new prompts, saved prompts are handled by /prompts/saved
    
    if not os.path.exists(DATA_FILE) or os.path.getsize(DATA_FILE) == 0:
        # No entries yet - return general prompts
        return jsonify({
            "prompts": [
                "What's one thing you're grateful for today?",
                "What challenged you today?"
            ]
        })
    
    with open(DATA_FILE, "r") as f:
        try:
            all_entries = json.load(f)
        except json.JSONDecodeError:
            all_entries = []
    
    if not all_entries:
        return jsonify({
            "prompts": [
                "What's one thing you're grateful for today?",
                "What challenged you today?"
            ]
        })
    
    # Get recent entries (last 30 days) to analyze themes and patterns (Pacific time)
    today = get_pacific_date()
    recent_entries = []
    for entry in all_entries:
        try:
            entry_date = datetime.strptime(entry.get("date"), "%Y-%m-%d").date()
            if (today - entry_date).days <= 30:
                recent_entries.append(entry)
        except (ValueError, TypeError):
            continue
    
    # Extract themes from recent entries
    theme_counts = {}
    all_themes = []
    for entry in recent_entries:
        themes = entry.get("themes", [])
        if themes:
            all_themes.extend(themes)
            for theme in themes:
                theme_lower = theme.lower().strip()
                if theme_lower:
                    theme_counts[theme_lower] = theme_counts.get(theme_lower, 0) + 1
    
    # Get top themes (most frequent)
    top_themes = sorted(theme_counts.items(), key=lambda x: x[1], reverse=True)[:5]
    top_theme_names = [theme[0] for theme in top_themes]
    
    # Get day of week for context-aware prompts
    day_name = None
    if date_str:
        try:
            target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
            day_name = target_date.strftime("%A")
        except ValueError:
            pass
    
    # Build context for GPT
    context_info = []
    if top_theme_names:
        context_info.append(f"Recent themes: {', '.join(top_theme_names[:3])}")
    if day_name:
        context_info.append(f"Day: {day_name}")
    if len(recent_entries) > 0:
        context_info.append(f"Journaling frequency: {len(recent_entries)} entries in last 30 days")
    
    context_str = ". ".join(context_info) if context_info else "User is starting to journal."
    
    # Generate prompts using GPT
    system_message = """You are a helpful journaling assistant. Generate 1-2 brief, personalized writing prompts to help the user start journaling.
The prompts should be:
- Short and actionable (one question or phrase)
- Context-aware based on their past themes and patterns
- Encouraging and non-intrusive
- Relevant to daily reflection

Examples:
- "What's one thing you're grateful for today?"
- "How did work affect your energy today?" (if work is a frequent theme)
- "What challenged you today?"
- "What's one moment from today you want to remember?"

Return ONLY a JSON array of 1-2 prompt strings. Format: ["prompt1", "prompt2"]
If you can only think of one good prompt, return just one."""
    
    try:
        user_message = f"Context: {context_str}\n\nGenerate 1-2 personalized journal prompts."
        response = openai.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": user_message}
            ],
            max_tokens=150,
        )
        
        response_text = response.choices[0].message.content.strip()
        
        # Try to extract JSON array from response
        if "```json" in response_text:
            response_text = response_text.split("```json")[1].split("```")[0].strip()
        elif "```" in response_text:
            response_text = response_text.split("```")[1].split("```")[0].strip()
        
        # Try to parse as JSON array
        try:
            prompts_array = json.loads(response_text)
            if isinstance(prompts_array, list) and len(prompts_array) > 0:
                # Ensure we have 1-2 prompts
                prompts = prompts_array[:2] if len(prompts_array) >= 2 else prompts_array
                return jsonify({"prompts": prompts})
        except json.JSONDecodeError:
            # Try to extract array-like structure
            # Look for array pattern: ["text1", "text2"] or ["text1"]
            matches = re.findall(r'"([^"]+)"', response_text)
            if matches:
                prompts = matches[:2]
                return jsonify({"prompts": prompts})
        
        # Fallback to default prompts
        return jsonify({
            "prompts": [
                "What's one thing you're grateful for today?",
                "What challenged you today?"
            ]
        })
        
    except Exception as e:
        print(f"Error generating prompts: {e}")
        # Fallback to default prompts
        return jsonify({
            "prompts": [
                "What's one thing you're grateful for today?",
                "What challenged you today?"
            ]
        })

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)
