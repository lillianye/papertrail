def generate_prompt(analysis):
    if analysis["sentiment"] == "negative":
        return "That sounded heavy. Was there anything that helped today?"
    if "work" in analysis["themes"]:
        return "How did work affect your energy today?"
    return "What stood out most about today?"