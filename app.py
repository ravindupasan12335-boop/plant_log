from flask import Flask, request, jsonify, send_from_directory, abort
from flask_cors import CORS
from models import db, Plant
from datetime import datetime, timedelta
import os

app = Flask(__name__)
CORS(app)  # Enables cross-origin requests for API calls

# Database Configuration
basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'plants.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

def seed_initial_plants():
    """Seed sample plants if database is empty."""
    if Plant.query.count() == 0:
        sample_plants = [
            Plant(
                name="Monstera Deliciosa",
                type="Tropical",
                quantity=6,
                watering="Every 7 days",
                sunlight="Bright indirect",
                description="Iconic Swiss cheese plant with dramatic split leaves. Thrives in moderate humidity.",
                last_watered=datetime.utcnow() - timedelta(days=2)
            ),
            Plant(
                name="Snake Plant",
                type="Indoor",
                quantity=12,
                watering="Every 14 days",
                sunlight="Low",
                description="Hardy air-purifying plant with upright architectural leaves. Tolerates low light.",
                last_watered=datetime.utcnow() - timedelta(days=5)
            ),
            Plant(
                name="Fiddle Leaf Fig",
                type="Indoor",
                quantity=2,
                watering="Every 7 days",
                sunlight="Bright indirect",
                description="Striking fiddle-shaped glossy leaves. Requires consistent light and steady watering.",
                last_watered=datetime.utcnow() - timedelta(days=8)  # Needs watering!
            ),
            Plant(
                name="Aloe Vera",
                type="Succulent",
                quantity=5,
                watering="Every 14 days",
                sunlight="Direct sunlight",
                description="Medicinal succulent that loves sun and well-draining soil.",
                last_watered=datetime.utcnow() - timedelta(days=15)  # Needs watering!
            ),
            Plant(
                name="English Lavender",
                type="Outdoor",
                quantity=8,
                watering="Every 3 days",
                sunlight="Direct sunlight",
                description="Aromatic Mediterranean herb that attracts pollinators and needs full sun.",
                last_watered=datetime.utcnow() - timedelta(days=1)
            )
        ]
        db.session.bulk_save_objects(sample_plants)
        db.session.commit()

with app.app_context():
    db.create_all()
    seed_initial_plants()

# -------------------------------------------------------------
# FRONTEND STATIC ROUTES
# -------------------------------------------------------------
@app.route('/')
def index():
    """Serve home page."""
    return send_from_directory(basedir, 'index.html')

@app.route('/<path:filename>')
def serve_file(filename):
    """Serve HTML and static files directly from project root."""
    file_path = os.path.join(basedir, filename)
    if os.path.exists(file_path) and os.path.isfile(file_path):
        return send_from_directory(basedir, filename)
    abort(404)

# -------------------------------------------------------------
# REST API ENDPOINTS
# -------------------------------------------------------------
@app.route('/api/plants', methods=['GET'])
def get_plants():
    """Retrieve all plants."""
    plants = Plant.query.order_by(Plant.id.asc()).all()
    return jsonify([plant.to_dict() for plant in plants])

@app.route('/api/plants/<int:plant_id>', methods=['GET'])
def get_plant(plant_id):
    """Retrieve a single plant by ID."""
    plant = Plant.query.get(plant_id)
    if not plant:
        return jsonify({'error': 'Plant not found'}), 404
    return jsonify(plant.to_dict())

@app.route('/api/plants', methods=['POST'])
def add_plant():
    """Add a new plant to the database."""
    data = request.get_json(force=True, silent=True) or {}
    
    name = (data.get('name') or '').strip()
    if not name:
        return jsonify({'error': 'Plant name is required'}), 400

    try:
        qty = int(data.get('quantity', 0))
        if qty < 0:
            qty = 0
    except (ValueError, TypeError):
        qty = 0

    new_plant = Plant(
        name=name,
        type=data.get('type') or 'Indoor',
        quantity=qty,
        watering=data.get('watering') or 'Every 7 days',
        sunlight=data.get('sunlight') or 'Bright indirect',
        description=(data.get('description') or '').strip(),
        last_watered=datetime.utcnow()
    )
    db.session.add(new_plant)
    db.session.commit()
    return jsonify(new_plant.to_dict()), 201

@app.route('/api/plants/<int:plant_id>', methods=['PUT'])
def update_plant(plant_id):
    """Update details of an existing plant."""
    plant = Plant.query.get(plant_id)
    if not plant:
        return jsonify({'error': 'Plant not found'}), 404

    data = request.get_json(force=True, silent=True) or {}
    if 'name' in data and data['name'].strip():
        plant.name = data['name'].strip()
    if 'type' in data:
        plant.type = data['type']
    if 'watering' in data:
        plant.watering = data['watering']
    if 'sunlight' in data:
        plant.sunlight = data['sunlight']
    if 'description' in data:
        plant.description = data['description'].strip()
    if 'quantity' in data:
        try:
            plant.quantity = max(0, int(data['quantity']))
        except (ValueError, TypeError):
            pass

    db.session.commit()
    return jsonify(plant.to_dict())

@app.route('/api/plants/<int:plant_id>/quantity', methods=['PATCH'])
def update_quantity(plant_id):
    """Increment or decrement plant quantity in inventory."""
    plant = Plant.query.get(plant_id)
    if not plant:
        return jsonify({'error': 'Plant not found'}), 404

    data = request.get_json(force=True, silent=True) or {}
    delta = data.get('delta', 0)
    try:
        delta = int(delta)
    except (ValueError, TypeError):
        delta = 0

    new_qty = (plant.quantity or 0) + delta
    if new_qty < 0:
        new_qty = 0
    plant.quantity = new_qty

    db.session.commit()
    return jsonify(plant.to_dict())

@app.route('/api/plants/<int:plant_id>/water', methods=['POST'])
def water_plant(plant_id):
    """Log watering for a plant (updates last_watered to now)."""
    plant = Plant.query.get(plant_id)
    if not plant:
        return jsonify({'error': 'Plant not found'}), 404

    plant.last_watered = datetime.utcnow()
    db.session.commit()
    return jsonify(plant.to_dict())

@app.route('/api/plants/<int:plant_id>', methods=['DELETE'])
def delete_plant(plant_id):
    """Delete a plant."""
    plant = Plant.query.get(plant_id)
    if not plant:
        return jsonify({'error': 'Plant not found'}), 404

    db.session.delete(plant)
    db.session.commit()
    return jsonify({'message': f'Plant {plant_id} deleted successfully'})

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Get dashboard stats: total plants, total inventory, and plants needing water."""
    plants = Plant.query.all()
    total_plants = len(plants)
    total_stock = sum(p.quantity or 0 for p in plants)
    needing_water = sum(1 for p in plants if p.needs_watering())
    return jsonify({
        'total_plants': total_plants,
        'total_stock': total_stock,
        'plants_needing_watering': needing_water
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)