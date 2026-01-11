"""
Streak tracking module for journaling app
Handles calculation and persistence of journaling streaks
"""

import json
import os
from datetime import datetime
from zoneinfo import ZoneInfo

# Pacific timezone
PACIFIC_TZ = ZoneInfo("America/Los_Angeles")

def get_pacific_date():
    """Get today's date in Pacific timezone"""
    return datetime.now(PACIFIC_TZ).date()

def get_pacific_date_str():
    """Get today's date string (YYYY-MM-DD) in Pacific timezone"""
    return datetime.now(PACIFIC_TZ).strftime("%Y-%m-%d")


def get_streak_data():
    """Load streak data from streak.json or return default"""
    if not os.path.exists("streak.json"):
        return {
            "current_streak": 0,
            "longest_streak": 0,
            "last_journal_date": None,
            "total_days": 0,
            "milestone": None
        }
    
    with open("streak.json", "r") as f:
        try:
            data = json.load(f)
            # Ensure milestone field exists for backward compatibility
            if "milestone" not in data:
                data["milestone"] = None
            return data
        except json.JSONDecodeError:
            return {
                "current_streak": 0,
                "longest_streak": 0,
                "last_journal_date": None,
                "total_days": 0,
                "milestone": None
            }


def save_streak_data(streak_data):
    """Save streak data to streak.json"""
    with open("streak.json", "w") as f:
        json.dump(streak_data, f, indent=2)


def calculate_streak_from_entries():
    """
    Recalculate streak from all entries in data.json
    This ensures accuracy by looking at actual journal dates
    Returns streak data
    """
    if not os.path.exists("data.json") or os.path.getsize("data.json") == 0:
        return {
            "current_streak": 0,
            "longest_streak": 0,
            "last_journal_date": None,
            "total_days": 0
        }
    
    with open("data.json", "r") as f:
        try:
            data = json.load(f)
        except json.JSONDecodeError:
            return {
                "current_streak": 0,
                "longest_streak": 0,
                "last_journal_date": None,
                "total_days": 0
            }
    
    # Get all unique dates from entries
    journal_dates = set()
    for entry in data:
        if entry.get("date"):
            journal_dates.add(entry["date"])
    
    if not journal_dates:
        return {
            "current_streak": 0,
            "longest_streak": 0,
            "last_journal_date": None,
            "total_days": 0
        }
    
    # Convert to date objects and sort
    date_objects = []
    for date_str in journal_dates:
        try:
            date_objects.append(datetime.strptime(date_str, "%Y-%m-%d").date())
        except ValueError:
            continue
    
    if not date_objects:
        return {
            "current_streak": 0,
            "longest_streak": 0,
            "last_journal_date": None,
            "total_days": 0
        }
    
    date_objects.sort()
    
    # Calculate longest streak
    longest_streak = 1
    current_run = 1
    
    for i in range(1, len(date_objects)):
        days_diff = (date_objects[i] - date_objects[i-1]).days
        if days_diff == 1:
            # Consecutive day
            current_run += 1
            if current_run > longest_streak:
                longest_streak = current_run
        else:
            # Gap found
            current_run = 1
    
    # Calculate current streak (from most recent date backwards)
    today = datetime.now().date()
    current_streak = 0
    last_date_str = None
    
    # Start from most recent date and work backwards
    most_recent_date = date_objects[-1]
    days_since_recent = (today - most_recent_date).days
    
    # Streak continues if:
    # - Entry was today (days_since_recent == 0)
    # - Entry was yesterday (days_since_recent == 1) - user can still journal today
    # Streak breaks if entry was 2+ days ago (days_since_recent >= 2)
    if days_since_recent <= 1:
        # We have an active streak - count backwards
        check_date = most_recent_date
        streak_count = 1
        
        for i in range(len(date_objects) - 2, -1, -1):
            date_obj = date_objects[i]
            days_diff = (check_date - date_obj).days
            
            if days_diff == 1:
                # Consecutive day
                streak_count += 1
                check_date = date_obj
            else:
                # Gap found - streak ends
                break
        
        current_streak = streak_count
    # else: days_since_recent >= 2, streak is broken, current_streak remains 0
    
    # Convert most recent date back to string
    if date_objects:
        last_date_str = date_objects[-1].strftime("%Y-%m-%d")
    
    return {
        "current_streak": current_streak,
        "longest_streak": longest_streak,
        "last_journal_date": last_date_str,
        "total_days": len(journal_dates)
    }


def update_streak(journal_date):
    """
    Update streak based on new journal entry date
    Recalculates from all entries for accuracy
    Preserves milestone data
    Returns updated streak data
    """
    # Get current streak data to preserve milestone
    saved_data = get_streak_data()
    milestone = saved_data.get("milestone")
    
    # Recalculate streak from entries
    streak_data = calculate_streak_from_entries()
    
    # Preserve milestone in recalculated data
    streak_data["milestone"] = milestone
    
    # Save with milestone preserved
    save_streak_data(streak_data)
    return streak_data


def set_milestone(milestone_days):
    """
    Set a streak milestone goal
    milestone_days: Target number of days for the streak (or None to clear)
    """
    streak_data = get_streak_data()
    streak_data["milestone"] = milestone_days if milestone_days and milestone_days > 0 else None
    save_streak_data(streak_data)
    return streak_data


def get_streak_info():
    """
    Get comprehensive streak information
    Includes check for whether user has journaled today and milestone progress
    Returns streak data dict with has_entry_today flag and milestone info
    """
    streak_data = calculate_streak_from_entries()
    
    # Get milestone from saved data
    saved_data = get_streak_data()
    milestone = saved_data.get("milestone")
    
    # Merge calculated streak data with saved milestone
    streak_data["milestone"] = milestone
    save_streak_data(streak_data)
    
    # Check if user has journaled today (Pacific time)
    today = get_pacific_date_str()
    has_entry_today = False
    if os.path.exists("data.json") and os.path.getsize("data.json") > 0:
        with open("data.json", "r") as f:
            try:
                data = json.load(f)
                has_entry_today = any(
                    entry.get("date") == today 
                    for entry in data 
                    if entry.get("date")
                )
            except json.JSONDecodeError:
                pass
    
    # Calculate milestone progress
    current_streak = streak_data.get("current_streak", 0)
    milestone_progress = None
    days_remaining = None
    
    if milestone and milestone > 0:
        milestone_progress = min((current_streak / milestone) * 100, 100)  # Percentage, max 100
        days_remaining = max(0, milestone - current_streak)
    
    return {
        "current_streak": current_streak,
        "longest_streak": streak_data.get("longest_streak", 0),
        "total_days": streak_data.get("total_days", 0),
        "last_journal_date": streak_data.get("last_journal_date"),
        "has_entry_today": has_entry_today,
        "milestone": milestone,
        "milestone_progress": milestone_progress,
        "days_remaining": days_remaining
    }
