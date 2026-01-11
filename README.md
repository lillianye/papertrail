# PaperTrail - AI Journaling Platform

A private, empathetic, and intelligent journaling platform that makes self-reflection a seamless and insightful daily habit. Built with React and Flask, powered by OpenAI's GPT-3.5-turbo.

## ✨ Features

- 📅 **Calendar View**: Visual calendar with sentiment and theme indicators for each entry
- ✍️ **Venting Mode**: Free-form journaling for unstructured thoughts and emotions
- 💬 **Conversation Mode**: Interactive AI conversations with empathetic responses and goal generation
- 🎨 **Visual Insights**: Color-coded calendar based on sentiment and themes
- 📊 **Insights Dashboard**: Sentiment trends, theme analysis, and AI-generated weekly/monthly summaries
- 🔥 **Streak Tracking**: Gamified journaling streaks with milestone progress
- 💡 **Writing Prompts**: Context-aware prompts to overcome "blank page" anxiety
- 🎯 **Goal Generation**: AI-generated actionable goals based on your conversations

## 🛠️ Tech Stack

**Frontend:**
- React 19.2.0 with React Router DOM 7.12.0
- Vite 7.2.4 for build tooling
- Custom SVG charts for data visualization

**Backend:**
- Flask 3.1.2 (Python web framework)
- Flask-CORS 6.0.2 for cross-origin requests
- OpenAI API (GPT-3.5-turbo) for AI features
- JSON file-based data persistence

## 📋 Prerequisites

Before running this application, make sure you have:

- **Node.js** (v16 or higher) - [Download](https://nodejs.org/)
- **Python** (v3.7 or higher) - [Download](https://www.python.org/)
- **npm** (comes with Node.js)
- **pip** (comes with Python)
- **OpenAI API Key** - [Get one here](https://platform.openai.com/api-keys)

## 🚀 Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/ai-journal.git
cd ai-journal
```

### 2. Install Frontend Dependencies

```bash
npm install
```

This will install all React, Vite, and other frontend dependencies listed in `package.json`.

### 3. Install Backend Dependencies

```bash
cd backend
pip install -r requirements.txt
cd ..
```

This will install:
- Flask (web framework)
- Flask-CORS (CORS support)
- OpenAI (API client)
- zoneinfo (timezone handling)

### 4. Set Up OpenAI API Key

**Option A: Environment Variable (Recommended)**

Create a `.env` file in the `backend/` directory:

```bash
cd backend
echo "OPENAI_API_KEY=your-api-key-here" > .env
cd ..
```

Then update `backend/app.py` line 30 to:

```python
import os
from dotenv import load_dotenv

load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")
```

**Option B: Direct Configuration (for testing)**

Edit `backend/app.py` and replace the hardcoded API key on line 30:

```python
openai.api_key = "your-api-key-here"
```

⚠️ **Note:** Never commit your API key to version control!

### 5. Initialize Data Files

The backend will automatically create the following files when you first use the app:
- `backend/data.json` - Journal entries storage
- `backend/streak.json` - Streak tracking data
- `backend/prompts.json` - Saved writing prompts

You can also create them manually as empty arrays:

```bash
cd backend
echo "[]" > data.json
echo "[]" > streak.json
echo "{}" > prompts.json
cd ..
```

## 🏃 Running the Application

### Start the Backend Server

Open a terminal and run:

```bash
cd backend
python app.py
```

The backend server will start on `http://localhost:5001`

### Start the Frontend Development Server

Open another terminal (keep the backend running) and run:

```bash
npm run dev
```

The frontend will start on `http://localhost:5173` (or another port if 5173 is occupied)

### Access the Application

Open your browser and navigate to:
```
http://localhost:5173
```
