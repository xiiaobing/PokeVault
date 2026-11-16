import requests
import os
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

# Retrieve API key
API_KEY = os.getenv("POKEWALLET_API_KEY")

print("API Key loaded:", API_KEY is not None)

url = "https://api.pokewallet.io/search"

headers = {
    "Authorization": f"Bearer {API_KEY}"
}

params = {
    "q": "24541 199"
}

response = requests.get(
    url,
    headers=headers,
    params=params,
    timeout=30
)

print("Status Code:", response.status_code)
print("Response:", response.text)