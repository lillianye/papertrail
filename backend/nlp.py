from textblob import TextBlob

def analyze_entry(text):
    polarity = TextBlob(text).sentiment.polarity

    sentiment = (
        "positive" if polarity > 0.2 else
        "negative" if polarity < -0.2 else
        "neutral"
    )

    themes = []
    if "work" in text.lower():
        themes.append("work")
    if "stress" in text.lower():
        themes.append("stress")

    return {
        "sentiment": sentiment,
        "themes": themes
    }