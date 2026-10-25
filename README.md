# 🌱 PlantLog

#### CS50 Final Project
**PlantLog** is a full-stack web application designed for plant lovers, hobby gardeners, and plant shop managers to organize plant collections, track watering schedules, and manage plant inventory in real-time.

---

## 🚀 Features

- **Dashboard**: Live statistics displaying total plants in your collection and the exact count of plants that need watering today.
- **Plant Gallery (`plants.html`)**: Beautiful visual card catalog of all your plants with species category badges, watering intervals, sunlight requirements, and stock availability.
- **Detailed Plant View (`plant_details.html`)**: Deep-dive information for every plant with one-click **"💧 Water Plant"** (updates care timestamps) and **"🗑️ Delete"** options.
- **Add New Plant (`add-plant.html`)**: Interactive form with live validation allowing users to log new plants with type, quantity, watering interval, sunlight level, and care notes.
- **Stock & Inventory Manager (`inventory.html`)**: Quick-action inventory table featuring interactive `+` and `-` quantity controls, dynamic status badges (*In Stock*, *Low Stock*, *Sold Out*), and item deletion.
- **Dual-Mode Persistence**: Powered by a robust Python/Flask REST API and SQLite database with seamless client-side caching and fallback.

---

## 📂 Project Structure

- `app.py`: The Flask application serving static frontend pages and providing the RESTful API endpoints (`/api/plants`, `/api/stats`, etc.).
- `models.py`: SQLAlchemy database models defining the `Plant` schema with care schedule calculation logic (`needs_watering()`) and JSON serialization (`to_dict()`).
- `plants.db`: SQLite database storing all plant and inventory records.
- `app.js`: Unified frontend controller managing DOM updates, asynchronous API calls, real-time inventory incrementation, and watering actions.
- `index.html`: Home dashboard displaying garden metrics and quick navigation shortcuts.
- `plants.html`: Gallery grid showing all plants with status badges and detail links.
- `add-plant.html`: Form to add new plants to the database.
- `inventory.html`: Inventory management view for tracking and adjusting stock.
- `plant_details.html`: Individual plant care and profile viewer.
- `requirements.txt`: Python package dependencies.

---

## 🛠️ Setup & Running

### 1. Activate the Virtual Environment

On Windows (PowerShell):
```powershell
.\venv\Scripts\Activate.ps1
```

Or on Windows (CMD):
```cmd
venv\Scripts\activate.bat
```

Or on Linux / macOS:
```bash
source venv/bin/activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Run the Server

```bash
python app.py
```

Open your browser and navigate to:
```
http://127.0.0.1:5000
```

---

## 📡 REST API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/plants` | Returns all plants in JSON format |
| `GET` | `/api/plants/<id>` | Returns details of a single plant |
| `POST` | `/api/plants` | Adds a new plant |
| `PUT` | `/api/plants/<id>` | Updates an existing plant's information |
| `PATCH` | `/api/plants/<id>/quantity` | Increments or decrements plant quantity (`{"delta": 1}` or `{"delta": -1}`) |
| `POST` | `/api/plants/<id>/water` | Records that a plant was watered today |
| `DELETE` | `/api/plants/<id>` | Removes a plant from the system |
| `GET` | `/api/stats` | Returns total plants, stock count, and plants needing water |
