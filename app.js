/**
 * PlantLog - Core Application Logic
 * CS50 Final Project
 * 
 * Supports both Flask REST API backend (SQLite database)
 * and automatic fallback to LocalStorage for offline/static preview.
 */

// Determine API base endpoint based on execution environment
const API_BASE = window.location.origin && window.location.origin.includes(':5000')
    ? '/api'
    : 'http://127.0.0.1:5000/api';

const STORAGE_KEY = 'plantLogDatabase';

// Initial fallback seed data for offline mode
const DEFAULT_PLANTS = [
    {
        id: 1,
        name: "Monstera Deliciosa",
        type: "Tropical",
        quantity: 6,
        watering: "Every 7 days",
        sunlight: "Bright indirect",
        description: "Iconic Swiss cheese plant with dramatic split leaves. Thrives in moderate humidity.",
        last_watered: new Date(Date.now() - 2 * 86400000).toISOString(),
        needs_watering: false
    },
    {
        id: 2,
        name: "Snake Plant",
        type: "Indoor",
        quantity: 12,
        watering: "Every 14 days",
        sunlight: "Low",
        description: "Hardy air-purifying plant with upright architectural leaves. Tolerates low light.",
        last_watered: new Date(Date.now() - 5 * 86400000).toISOString(),
        needs_watering: false
    },
    {
        id: 3,
        name: "Fiddle Leaf Fig",
        type: "Indoor",
        quantity: 2,
        watering: "Every 7 days",
        sunlight: "Bright indirect",
        description: "Striking fiddle-shaped glossy leaves. Requires consistent light and steady watering.",
        last_watered: new Date(Date.now() - 8 * 86400000).toISOString(),
        needs_watering: true
    },
    {
        id: 4,
        name: "Aloe Vera",
        type: "Succulent",
        quantity: 5,
        watering: "Every 14 days",
        sunlight: "Direct sunlight",
        description: "Medicinal succulent that loves sun and well-draining soil.",
        last_watered: new Date(Date.now() - 15 * 86400000).toISOString(),
        needs_watering: true
    },
    {
        id: 5,
        name: "English Lavender",
        type: "Outdoor",
        quantity: 8,
        watering: "Every 3 days",
        sunlight: "Direct sunlight",
        description: "Aromatic Mediterranean herb that attracts pollinators and needs full sun.",
        last_watered: new Date(Date.now() - 1 * 86400000).toISOString(),
        needs_watering: false
    }
];

// Helper to calculate watering requirement
function checkNeedsWatering(plant) {
    if (!plant.last_watered) return true;
    const intervalMap = {
        'Every day': 1,
        'Every 3 days': 3,
        'Every 7 days': 7,
        'Every 14 days': 14
    };
    const days = intervalMap[plant.watering] || 7;
    const last = new Date(plant.last_watered).getTime();
    const now = Date.now();
    const daysPassed = (now - last) / (1000 * 60 * 60 * 24);
    return daysPassed >= days;
}

// -------------------------------------------------------------
// LOCALSTORAGE FALLBACK HELPERS
// -------------------------------------------------------------
function getLocalPlants() {
    let data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_PLANTS));
        return DEFAULT_PLANTS;
    }
    try {
        let plants = JSON.parse(data);
        if (!Array.isArray(plants) || plants.length === 0) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_PLANTS));
            return DEFAULT_PLANTS;
        }
        return plants.map(p => ({
            ...p,
            quantity: parseInt(p.quantity, 10) || 0,
            needs_watering: checkNeedsWatering(p)
        }));
    } catch (e) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_PLANTS));
        return DEFAULT_PLANTS;
    }
}

function saveLocalPlants(plants) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plants));
}

// -------------------------------------------------------------
// UNIFIED DATA CLIENT (API with LocalStorage fallback)
// -------------------------------------------------------------
const DataClient = {
    async getPlants() {
        try {
            const res = await fetch(`${API_BASE}/plants`, { signal: AbortSignal.timeout(3000) });
            if (res.ok) {
                const plants = await res.json();
                saveLocalPlants(plants); // sync local cache
                return plants;
            }
        } catch (err) {
            console.warn('Backend API unreachable, using local storage fallback.', err);
        }
        return getLocalPlants();
    },

    async getPlant(id) {
        try {
            const res = await fetch(`${API_BASE}/plants/${id}`, { signal: AbortSignal.timeout(3000) });
            if (res.ok) return await res.json();
        } catch (err) {
            console.warn('Backend API unreachable, using local storage fallback for single plant.', err);
        }
        const plants = getLocalPlants();
        return plants.find(p => p.id === parseInt(id, 10)) || null;
    },

    async addPlant(plantData) {
        try {
            const res = await fetch(`${API_BASE}/plants`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(plantData),
                signal: AbortSignal.timeout(3000)
            });
            if (res.ok) {
                const created = await res.json();
                const plants = getLocalPlants();
                plants.push(created);
                saveLocalPlants(plants);
                return created;
            }
        } catch (err) {
            console.warn('Backend API unreachable, saving plant to local storage.', err);
        }

        // Local storage fallback
        const plants = getLocalPlants();
        const newPlant = {
            id: Date.now(),
            name: plantData.name,
            type: plantData.type || 'Indoor',
            quantity: parseInt(plantData.quantity, 10) || 0,
            watering: plantData.watering || 'Every 7 days',
            sunlight: plantData.sunlight || 'Bright indirect',
            description: plantData.description || '',
            last_watered: new Date().toISOString(),
            needs_watering: false
        };
        plants.push(newPlant);
        saveLocalPlants(plants);
        return newPlant;
    },

    async updateQuantity(id, delta) {
        try {
            const res = await fetch(`${API_BASE}/plants/${id}/quantity`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ delta }),
                signal: AbortSignal.timeout(3000)
            });
            if (res.ok) {
                const updated = await res.json();
                const plants = getLocalPlants();
                const idx = plants.findIndex(p => p.id === updated.id);
                if (idx !== -1) {
                    plants[idx] = updated;
                    saveLocalPlants(plants);
                }
                return updated;
            }
        } catch (err) {
            console.warn('Backend API unreachable, updating quantity locally.', err);
        }

        // Local storage fallback
        const plants = getLocalPlants();
        const idx = plants.findIndex(p => p.id === parseInt(id, 10));
        if (idx !== -1) {
            plants[idx].quantity = Math.max(0, (parseInt(plants[idx].quantity, 10) || 0) + delta);
            saveLocalPlants(plants);
            return plants[idx];
        }
        return null;
    },

    async waterPlant(id) {
        try {
            const res = await fetch(`${API_BASE}/plants/${id}/water`, {
                method: 'POST',
                signal: AbortSignal.timeout(3000)
            });
            if (res.ok) {
                const updated = await res.json();
                const plants = getLocalPlants();
                const idx = plants.findIndex(p => p.id === updated.id);
                if (idx !== -1) {
                    plants[idx] = updated;
                    saveLocalPlants(plants);
                }
                return updated;
            }
        } catch (err) {
            console.warn('Backend API unreachable, logging watering locally.', err);
        }

        // Local storage fallback
        const plants = getLocalPlants();
        const idx = plants.findIndex(p => p.id === parseInt(id, 10));
        if (idx !== -1) {
            plants[idx].last_watered = new Date().toISOString();
            plants[idx].needs_watering = false;
            saveLocalPlants(plants);
            return plants[idx];
        }
        return null;
    },

    async deletePlant(id) {
        try {
            const res = await fetch(`${API_BASE}/plants/${id}`, {
                method: 'DELETE',
                signal: AbortSignal.timeout(3000)
            });
            if (res.ok) {
                let plants = getLocalPlants().filter(p => p.id !== parseInt(id, 10));
                saveLocalPlants(plants);
                return true;
            }
        } catch (err) {
            console.warn('Backend API unreachable, deleting plant locally.', err);
        }

        // Local storage fallback
        let plants = getLocalPlants().filter(p => p.id !== parseInt(id, 10));
        saveLocalPlants(plants);
        return true;
    },

    async getStats() {
        try {
            const res = await fetch(`${API_BASE}/stats`, { signal: AbortSignal.timeout(3000) });
            if (res.ok) return await res.json();
        } catch (err) {
            console.warn('Backend API unreachable, computing stats locally.', err);
        }

        const plants = getLocalPlants();
        const totalStock = plants.reduce((sum, p) => sum + (parseInt(p.quantity, 10) || 0), 0);
        const needingWater = plants.filter(p => checkNeedsWatering(p)).length;
        return {
            total_plants: plants.length,
            total_stock: totalStock,
            plants_needing_watering: needingWater
        };
    }
};

// -------------------------------------------------------------
// UI CONTROLLERS
// -------------------------------------------------------------

// 1. Dashboard (index.html)
async function initDashboard() {
    const totalElem = document.getElementById('total_plants_index');
    const waterElem = document.getElementById('plants_needing_watering');
    if (!totalElem || !waterElem) return;

    try {
        const stats = await DataClient.getStats();
        totalElem.innerText = stats.total_plants;
        waterElem.innerText = stats.plants_needing_watering;
    } catch (e) {
        console.error('Error loading dashboard stats:', e);
    }
}

// 2. Plants Gallery (plants.html)
async function initPlantsGallery() {
    const grid = document.getElementById('plantsGrid');
    if (!grid) return;

    grid.innerHTML = `
        <div class="col-12 text-center py-5">
            <div class="spinner-border text-success" role="status">
                <span class="visually-hidden">Loading plants...</span>
            </div>
        </div>
    `;

    try {
        const plants = await DataClient.getPlants();
        grid.innerHTML = '';

        if (!plants || plants.length === 0) {
            grid.innerHTML = `
                <div class="col-12 text-center py-5">
                    <p class="fs-5 text-muted mb-3">No plants added yet.</p>
                    <a href="add-plant.html" class="btn btn-success rounded-pill px-4 fw-bold">Add Your First Plant</a>
                </div>
            `;
            return;
        }

        plants.forEach(plant => {
            let badgeClass = 'bg-secondary bg-opacity-25 text-dark';
            if (plant.type === 'Tropical') badgeClass = 'bg-success bg-opacity-25 text-success';
            else if (plant.type === 'Indoor') badgeClass = 'bg-primary bg-opacity-25 text-primary';
            else if (plant.type === 'Outdoor') badgeClass = 'bg-warning bg-opacity-25 text-dark';
            else if (plant.type === 'Succulent') badgeClass = 'bg-info bg-opacity-25 text-dark';

            const qty = parseInt(plant.quantity, 10) || 0;
            let stockBadge = qty > 5
                ? '<span class="badge bg-success rounded-pill px-2 py-1">In Stock</span>'
                : qty > 0
                    ? '<span class="badge text-bg-warning rounded-pill px-2 py-1">Low Stock</span>'
                    : '<span class="badge bg-danger rounded-pill px-2 py-1">Sold Out</span>';

            const waterAlert = plant.needs_watering
                ? '<span class="badge bg-danger bg-opacity-10 text-danger border border-danger-subtle rounded-pill px-2 py-1 ms-1">Needs water!</span>'
                : '';

            const card = document.createElement('div');
            card.className = 'col';
            card.innerHTML = `
                <article class="card h-100 border-0 shadow-sm rounded-4 hover-effect p-2">
                    <div class="card-body d-flex flex-column">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h3 class="card-title h5 fw-bold text-dark m-0">${escapeHtml(plant.name)}</h3>
                            ${stockBadge}
                        </div>
                        <div class="mb-4">
                            <span class="badge ${badgeClass} mb-3 fs-6 px-3 py-1 rounded-pill">${escapeHtml(plant.type)}</span>
                            <p class="card-text text-muted mb-2">💧 <strong>Watering:</strong> ${escapeHtml(plant.watering)} ${waterAlert}</p>
                            <p class="card-text text-muted mb-2">☀️ <strong>Sunlight:</strong> ${escapeHtml(plant.sunlight)}</p>
                            <p class="card-text text-muted m-0">📦 <strong>Quantity:</strong> ${qty}</p>
                        </div>
                        <a href="plant_details.html?id=${plant.id}" class="btn btn-outline-success mt-auto w-100 rounded-pill fw-bold">View Details</a>
                    </div>
                </article>
            `;
            grid.appendChild(card);
        });
    } catch (e) {
        console.error('Error loading plants gallery:', e);
        grid.innerHTML = '<p class="text-danger text-center w-100">Failed to load plants.</p>';
    }
}

// 3. Add Plant Form (add-plant.html)
function initAddPlant() {
    const addPlantForm = document.getElementById('addPlantForm');
    if (!addPlantForm) return;

    addPlantForm.addEventListener('submit', async function(event) {
        event.preventDefault();

        const nameInput = document.getElementById('name');
        const typeInput = document.getElementById('type');
        const quantityInput = document.getElementById('quantity');
        const wateringInput = document.getElementById('watering');
        const sunlightInput = document.getElementById('sunlight');
        const descriptionInput = document.getElementById('description');
        const formMessage = document.getElementById('formMessage');

        const name = nameInput.value.trim();
        const type = typeInput.value;
        const quantity = parseInt(quantityInput.value, 10);
        const watering = wateringInput.value;
        const sunlight = sunlightInput.value;
        const description = descriptionInput.value.trim();

        if (!name) {
            formMessage.className = 'text-danger fw-bold text-center p-3 mb-0';
            formMessage.innerText = 'Please enter a plant name!';
            nameInput.focus();
            return;
        }

        if (isNaN(quantity) || quantity < 0) {
            formMessage.className = 'text-danger fw-bold text-center p-3 mb-0';
            formMessage.innerText = 'Quantity cannot be negative!';
            quantityInput.focus();
            return;
        }

        const plantPayload = {
            name: name,
            type: type,
            quantity: quantity,
            watering: watering,
            sunlight: sunlight,
            description: description
        };

        try {
            formMessage.className = 'text-muted fw-bold text-center p-3 mb-0';
            formMessage.innerText = 'Saving plant...';

            const created = await DataClient.addPlant(plantPayload);
            formMessage.className = 'text-success fw-bold text-center p-3 mb-0';
            formMessage.innerText = `🌿 "${created.name}" has been successfully added to your PlantLog!`;
            addPlantForm.reset();
        } catch (e) {
            console.error('Error adding plant:', e);
            formMessage.className = 'text-danger fw-bold text-center p-3 mb-0';
            formMessage.innerText = 'Failed to save plant. Please try again.';
        }
    });
}

// 4. Inventory Table (inventory.html)
async function renderInventory() {
    const inventoryBody = document.getElementById('inventoryBody');
    if (!inventoryBody) return;

    inventoryBody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-muted"><div class="spinner-border spinner-border-sm text-success me-2"></div>Loading inventory...</td></tr>';

    try {
        const savedPlants = await DataClient.getPlants();
        inventoryBody.innerHTML = '';

        if (!savedPlants || savedPlants.length === 0) {
            inventoryBody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-muted">No inventory data available. Add plants to see them here!</td></tr>';
            return;
        }

        savedPlants.forEach(plant => {
            const qty = parseInt(plant.quantity, 10) || 0;
            const textMutedClass = qty === 0 ? "text-muted" : "";

            let statusBadge = "";
            if (qty > 5) {
                statusBadge = '<span class="badge bg-success rounded-pill px-3 py-2">In Stock</span>';
            } else if (qty > 0) {
                statusBadge = '<span class="badge text-bg-warning rounded-pill px-3 py-2">Low Stock</span>';
            } else {
                statusBadge = '<span class="badge bg-danger rounded-pill px-3 py-2">Sold Out</span>';
            }

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="px-4 fw-bold ${textMutedClass}">${escapeHtml(plant.name)}</td>
                <td class="px-4 text-center fs-5 ${textMutedClass}">${qty}</td>
                <td class="px-4">${statusBadge}</td>
                <td class="px-4 text-start">
                    <button class="btn btn-sm btn-outline-success rounded-pill fw-bold me-2 px-3" onclick="handleQuantityChange(${plant.id}, 1)">+</button>
                    <button class="btn btn-sm btn-outline-warning rounded-pill fw-bold px-3" onclick="handleQuantityChange(${plant.id}, -1)" ${qty <= 0 ? 'disabled' : ''}>-</button>
                </td>
                <td class="px-4 text-end">
                    <button class="btn btn-sm btn-outline-danger rounded-pill fw-bold" onclick="handleDeletePlant(${plant.id}, '${escapeHtml(plant.name.replace(/'/g, "\\'"))}')">Delete</button>
                </td>
            `;
            inventoryBody.appendChild(tr);
        });
    } catch (e) {
        console.error('Error rendering inventory:', e);
        inventoryBody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-danger">Failed to load inventory.</td></tr>';
    }
}

// Global functions for Inventory action buttons
window.handleQuantityChange = async function(plantId, delta) {
    try {
        await DataClient.updateQuantity(plantId, delta);
        renderInventory();
    } catch (e) {
        console.error('Error updating quantity:', e);
    }
};

window.handleDeletePlant = async function(plantId, plantName) {
    if (confirm(`Are you sure you want to delete "${plantName}" from your inventory?`)) {
        try {
            await DataClient.deletePlant(plantId);
            renderInventory();
        } catch (e) {
            console.error('Error deleting plant:', e);
        }
    }
};

// 5. Plant Details (plant_details.html)
async function initPlantDetails() {
    const detailName = document.getElementById('detailName');
    if (!detailName) return;

    const urlParams = new URLSearchParams(window.location.search);
    const plantId = parseInt(urlParams.get('id'), 10);

    if (isNaN(plantId)) {
        window.location.href = "plants.html";
        return;
    }

    try {
        const plant = await DataClient.getPlant(plantId);
        if (!plant) {
            alert('Plant not found!');
            window.location.href = "plants.html";
            return;
        }

        detailName.innerText = plant.name;
        
        const wateringElem = document.getElementById('detailWatering');
        const isDue = plant.needs_watering || checkNeedsWatering(plant);
        wateringElem.innerText = `${plant.watering} ${isDue ? '⚠️ Due now!' : '✓ OK'}`;
        if (isDue) {
            wateringElem.classList.add('text-danger');
        } else {
            wateringElem.classList.remove('text-danger');
        }

        document.getElementById('detailSunlight').innerText = plant.sunlight;
        document.getElementById('detailQuantity').innerText = `${plant.quantity} Available`;
        document.getElementById('detailDescription').innerText = plant.description || "No description provided.";

        // Category Badge
        const categoryBadge = document.getElementById('detailCategory');
        categoryBadge.innerText = plant.type;
        if (plant.type === 'Tropical') {
            categoryBadge.className = "badge bg-success bg-opacity-25 text-success mb-4 fs-6 px-3 py-2 rounded-pill";
        } else if (plant.type === 'Indoor') {
            categoryBadge.className = "badge bg-primary bg-opacity-25 text-primary mb-4 fs-6 px-3 py-2 rounded-pill";
        } else if (plant.type === 'Outdoor') {
            categoryBadge.className = "badge bg-warning bg-opacity-25 text-dark mb-4 fs-6 px-3 py-2 rounded-pill";
        } else {
            categoryBadge.className = "badge bg-info bg-opacity-25 text-dark mb-4 fs-6 px-3 py-2 rounded-pill";
        }

        // Status Badge
        const statusBadge = document.getElementById('detailStatus');
        const qty = parseInt(plant.quantity, 10) || 0;
        if (qty > 5) {
            statusBadge.innerText = "In Stock";
            statusBadge.className = "badge bg-success rounded-pill px-3 py-2 shadow-sm";
        } else if (qty > 0) {
            statusBadge.innerText = "Low Stock";
            statusBadge.className = "badge text-bg-warning rounded-pill px-3 py-2 shadow-sm";
        } else {
            statusBadge.innerText = "Sold Out";
            statusBadge.className = "badge bg-danger rounded-pill px-3 py-2 shadow-sm";
        }

        // Wire Water Button
        const waterBtn = document.getElementById('detailWaterBtn');
        if (waterBtn) {
            waterBtn.onclick = async function() {
                try {
                    waterBtn.disabled = true;
                    waterBtn.innerText = '💧 Watering...';
                    await DataClient.waterPlant(plantId);
                    
                    const msg = document.getElementById('detailMessage');
                    if (msg) {
                        msg.innerHTML = '<div class="alert alert-success py-2 px-3 rounded-pill">🌿 Plant watered successfully!</div>';
                        setTimeout(() => { msg.innerHTML = ''; }, 3000);
                    }
                    
                    // Refresh details
                    initPlantDetails();
                } catch (e) {
                    console.error('Error watering plant:', e);
                } finally {
                    if (waterBtn) {
                        waterBtn.disabled = false;
                        waterBtn.innerText = '💧 Water Plant';
                    }
                }
            };
        }

        // Wire Delete Button
        const deleteBtn = document.getElementById('detailDeleteBtn');
        if (deleteBtn) {
            deleteBtn.onclick = async function() {
                if (confirm(`Are you sure you want to delete "${plant.name}"?`)) {
                    try {
                        deleteBtn.disabled = true;
                        await DataClient.deletePlant(plantId);
                        window.location.href = "plants.html";
                    } catch (e) {
                        console.error('Error deleting plant:', e);
                        deleteBtn.disabled = false;
                    }
                }
            };
        }

    } catch (e) {
        console.error('Error loading plant details:', e);
        window.location.href = "plants.html";
    }
}

// XSS Sanitizer Helper
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// -------------------------------------------------------------
// MAIN BOOTSTRAP DISPATCHER
// -------------------------------------------------------------
document.addEventListener('DOMContentLoaded', function() {
    initDashboard();
    initPlantsGallery();
    initAddPlant();
    if (document.getElementById('inventoryBody')) {
        renderInventory();
    }
    initPlantDetails();
});