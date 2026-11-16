import os
from dotenv import load_dotenv
from langchain.chat_models import init_chat_model
import streamlit as st
from langchain.agents import create_agent
from langchain.tools import tool
from langchain.messages import HumanMessage, AIMessage, SystemMessage

load_dotenv()

# streamlit framework
st.title("Langchain demo with Gemini API")
input_text = st.text_input("Search the topic you want: ")


# tools
@tool
def search(query: str) -> str:
    """Search for information."""
    return f"Results for: {query}"


# Initilize Gemini AI Model
model = init_chat_model(
    "google_genai:gemini-3.5-flash-lite",
    timeout=30,
    max_tokens=1000,
    max_retries=6,
)

messages = [
    SystemMessage("You are a wikipedia"),
    HumanMessage(input_text),
    AIMessage("Cherry blossoms bloom..."),
]
response = model.invoke(messages)

if input_text:
    response = model.invoke(input_text)
    # if isinstance(response.content, str):
    #     text = response.content
    # else:
    #     text = "".join(
    #         block.get("text", "")
    #         for block in response.content
    #         if isinstance(block, dict) and block.get("type") == "text"
    #     )

    st.write(response)
