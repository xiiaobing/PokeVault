import os
from cardcorpus_scanner import Scanner

_scanner = None


def get_scanner():
    """
    Load CardCorpus Scanner once and reuse it.
    """
    global _scanner

    if _scanner is None:
        print("Loading CardCorpus Scanner...")
        print("Process ID:", os.getpid())

        _scanner = Scanner.load()

        print("CardCorpus Scanner loaded successfully!")

    return _scanner


def scan_card_image(image_path):
    """
    Scan one Pokémon card image and return recognition results.
    """
    scanner = get_scanner()

    result = scanner.scan(str(image_path))

    return result