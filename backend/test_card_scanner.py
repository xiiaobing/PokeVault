from cardcorpus_scanner import Scanner
from pprint import pprint

print("Loading CardCorpus Scanner...")

scanner = Scanner.load()

print("Scanner loaded successfully!")

image_path = "media/cards/pk_1c812fed25a3244a335be91aa1b1519c2020a82b5e7e52f58489ac1f4eaccaa63e6a420514f629e_PeTYmHn.jpg"

print("Scanning card...")

result = scanner.scan(image_path)

print("\nRecognition results:")
pprint(result)

print("\nRecognized cards:")

for card in result["cards"]:
    if card.get("candidates"):
        best = card["candidates"][0]

        print("Name:", best["name"])
        print("Set:", best["set_name"])
        print("Number:", best["number"])
        print("Print:", best["print"])
