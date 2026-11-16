# Create new environment using powershell
python -m venv venv

# Activate the powershell
venv\Scripts\Activate.ps1

# Install requirements
pip install -r .\requirements.txt

# Run the program
python manage.py runserver

# Migration
python manage.py check
python manage.py makemigrations cards
python manage.py migrate