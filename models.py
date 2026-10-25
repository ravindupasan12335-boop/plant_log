from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class Plant(db.Model):
    __tablename__ = 'plants'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    type = db.Column(db.String(50), default='Indoor')
    quantity = db.Column(db.Integer, default=1)
    watering = db.Column(db.String(50), default='Every 7 days')
    sunlight = db.Column(db.String(50), default='Bright indirect')
    description = db.Column(db.Text, default='')
    last_watered = db.Column(db.DateTime, default=datetime.utcnow)

    def needs_watering(self):
        """Determine if this plant is due for watering based on schedule."""
        if not self.last_watered:
            return True
        
        interval_map = {
            'Every day': 1,
            'Every 3 days': 3,
            'Every 7 days': 7,
            'Every 14 days': 14
        }
        days = interval_map.get(self.watering, 7)
        delta = (datetime.utcnow() - self.last_watered).total_seconds() / 86400.0
        return delta >= days

    def to_dict(self):
        """Serialize model for frontend JSON consumption."""
        return {
            'id': self.id,
            'name': self.name,
            'type': self.type,
            'quantity': self.quantity if self.quantity is not None else 0,
            'watering': self.watering,
            'sunlight': self.sunlight,
            'description': self.description or '',
            'last_watered': self.last_watered.isoformat() if self.last_watered else None,
            'needs_watering': self.needs_watering()
        }