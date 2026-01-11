# PaperTrail - AI Journaling Companion

A private, empathetic, and intelligent journaling companion that makes self-reflection a seamless and insightful daily habit. Built with React and Flask, powered by OpenAI's GPT-3.5-turbo.

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

## 📁 Project Structure

```
ai-journal/
├── backend/
│   ├── app.py              # Flask backend server
│   ├── requirements.txt    # Python dependencies
│   ├── data.json          # Journal entries storage (auto-generated, gitignored)
│   ├── streak.json        # Streak data (auto-generated, gitignored)
│   ├── prompts.json       # Saved prompts (auto-generated, gitignored)
│   ├── streak/
│   │   ├── __init__.py
│   │   └── streak.py      # Streak calculation logic
│   ├── nlp.py             # Unused NLP utilities
│   └── prompts.py         # Unused prompt utilities
├── src/
│   ├── components/
│   │   ├── Calendar.jsx   # Calendar view component
│   │   ├── Journal.jsx    # Journal entry page
│   │   ├── JournalCard.jsx # Journal card component
│   │   ├── LandingPage.jsx # Landing page
│   │   ├── Insights.jsx  # Insights dashboard
│   │   ├── StreakBadge.jsx # Streak widget
│   │   └── notebookPaper.png # Landing page image
│   ├── api/
│   │   └── journalApi.js  # API client functions
│   ├── utils/
│   │   └── dateUtils.js   # Date utility functions
│   ├── App.jsx            # Main app component with routing
│   └── main.jsx           # Entry point
├── package.json           # Frontend dependencies
├── package-lock.json      # Dependency lock file
├── vite.config.js         # Vite configuration
└── README.md              # This file
```

## 🔌 API Endpoints

The backend provides the following REST API endpoints:

- `POST /journal` - Save a journal entry (venting or conversation mode)
- `GET /entries` - Get all entries or filter by date/mode
- `DELETE /entries/<date>` - Delete entry/entries for a specific date
- `POST /goal` - Generate an actionable goal from conversation history
- `GET /streak` - Get streak information
- `GET /insights/sentiment-trends` - Get sentiment trends (daily/weekly/monthly)
- `GET /insights/ai-summary` - Get AI-generated summaries and patterns
- `GET /prompts` - Generate new context-aware writing prompts
- `POST /prompts` - Save prompts for a specific date
- `GET /prompts/saved` - Get saved prompts for a specific date

## 🎨 Features in Detail

### Calendar View
- Visual indicators for entries with sentiment-based colors
- Theme icons for quick pattern recognition
- Click any date to view or create an entry

### Venting Mode
- Free-form text entry for unstructured thoughts
- Automatic sentiment analysis and theme extraction
- Simple, distraction-free interface

### Conversation Mode
- Interactive AI conversations with empathetic responses
- Context-aware goal generation
- Conversation history tracking

### Insights Dashboard
- Sentiment trends over time with interactive charts
- Theme-based visualization
- AI-generated weekly/monthly summaries
- Pattern insights and reflection questions
- Progress comparison between periods

### Writing Prompts
- Context-aware prompts based on your journaling history
- Manual prompt generation with "Give me a prompt" button
- Prompts persist across sessions

## 🐛 Troubleshooting

### Backend won't start
- Make sure Python dependencies are installed: `pip install -r backend/requirements.txt`
- Check that port 5001 is not already in use
- Verify your OpenAI API key is correct and has sufficient credits
- Ensure you're using Python 3.7 or higher

### Frontend won't start
- Make sure Node.js dependencies are installed: `npm install`
- Check that no other process is using the port (default: 5173)
- Try deleting `node_modules` and running `npm install` again

### API errors
- Verify the backend is running on `http://localhost:5001`
- Check browser console for CORS errors
- Ensure your OpenAI API key has sufficient credits
- Check backend console for error messages

### CORS errors
- Make sure Flask-CORS is installed: `pip install flask-cors`
- Verify the backend is running and accessible
- Check that the frontend is making requests to the correct backend URL

### Entries not saving/loading
- Check that `backend/data.json` exists and is writable
- Verify file permissions in the backend directory
- Check backend console for file write errors
- Ensure the backend has write access to the directory

## 🔒 Privacy & Data

- All journal entries are stored locally in `backend/data.json`
- No data is sent to external servers except OpenAI API for AI features
- Your entries are never shared or stored by OpenAI beyond the API request
- Data files (`data.json`, `streak.json`, `prompts.json`) are gitignored and not committed to version control

## 🚧 Future Enhancements

- [ ] User authentication and multi-user support
- [ ] Cloud storage options (optional)
- [ ] Data export capabilities (JSON, PDF, CSV)
- [ ] Search and filter functionality
- [ ] Mobile app version
- [ ] Dark mode
- [ ] Custom theme colors
- [ ] Entry tags and categories
- [ ] Reminder notifications

## 📝 License

This project is for educational/demo purposes.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/yourusername/ai-journal/issues).

## 👤 Author

Your Name - [@yourusername](https://github.com/yourusername)

## 🙏 Acknowledgments

- OpenAI for the GPT-3.5-turbo API
- React and Flask communities
- All the open-source libraries that made this project possible
