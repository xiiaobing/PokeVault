import json
import os

from langchain_google_genai import ChatGoogleGenerativeAI


def generate_ai_advice(message, user_context):
    api_key = os.getenv("GOOGLE_API_KEY")

    if not api_key:
        raise ValueError("GOOGLE_API_KEY is not configured.")

    model = ChatGoogleGenerativeAI(
        model=os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite"),
        google_api_key=api_key,
        temperature=0.4,
        timeout=30,
        max_retries=1,
    )

    system_prompt = """
You are an AI assistant for a Pokémon TCG portfolio management platform.

Your job is to help users understand their Pokémon card collection,
watchlist, market prices, and potential buying or selling decisions.

IMPORTANT RULES:

1. Use the supplied database information as the source of truth.
2. Only use market_price for actual market price information.
3. Do not use average_price, avg_1, avg_7, avg_30, or trend_price.
4. Never invent prices, historical records, or market trends.
5. Historical analysis is considered sufficient only when the
   supplied data explicitly says it is sufficient.
6. If historical data is insufficient, provide general advice
   based on the available card information and collecting
   considerations. Clearly explain that there is insufficient
   historical data.
7. Do not claim to know live market conditions because you do
   not have live external market access.
8. Consider the user's purchase price and quantity when
   discussing cards they already own.
9. If information is missing, clearly mention it.
10. Recommendations such as Buy, Hold, or Sell are opinions,
    not guaranteed predictions or financial advice.

Give practical explanations rather than simply returning
a recommendation.
"""

    context_json = json.dumps(user_context, indent=2)

    response = model.invoke([
        ("system", system_prompt),
        (
            "human",
            f"""
User's portfolio information:

{context_json}

User's question:

{message}

Please answer the user's question using the supplied information.
If historical data is insufficient, provide general advice instead
of pretending to know the price trend.
"""
        ),
    ])

    return response.content
