# Frontend

The live UI remains in the existing root pages:
- demo.html
- index.html
- waitlist.html
- css/styles.css
- js/app.js
- js/demo.js
- js/utils.js

The scanner now calls the FastAPI backend at http://localhost:8000/scan and uses the real API client in js/services/api.js.
