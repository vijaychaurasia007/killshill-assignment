# KillShill — Trading Signal Tracker

A full-stack trading signal tracking application with live Binance price integration, automated status resolution, and a real-time dashboard.

---

## Tech Stack

| Layer    | Technology                              |
|----------|-----------------------------------------|
| Backend  | Node.js, Express, TypeScript            |
| Database | MongoDB + Mongoose                      |
| Frontend | React, TypeScript, Vite                 |
| Prices   | Binance REST API (`/api/v3/ticker/price`) |
| Validation | Zod (backend) + client-side form checks |

---

## Setup Instructions

### Prerequisites
- Node.js 18+
- MongoDB running locally OR Docker

### Option A — Local Development

**1. Clone & install**
```bash
git clone <your-repo-url>
cd killshill

# Backend
cd backend
npm install
cp .env.example .env          # edit MONGODB_URI if needed
npm run dev                   # runs on http://localhost:4001

# Frontend (new terminal)
cd ../frontend
npm install
npm run dev                   # runs on http://localhost:3000
```

**2. MongoDB**  
Make sure MongoDB is running locally on port `27017`. No migrations needed — Mongoose creates collections automatically on first write.

---

### Option B — Docker Compose (full stack)

```bash
docker compose up --build
```

- Frontend → http://localhost:3000  
- Backend  → http://localhost:4001  
- MongoDB  → mongodb://localhost:27017/killshill

---

## Database Schema

Collection: `signals`

| Field         | Type      | Notes                                    |
|---------------|-----------|------------------------------------------|
| `_id`         | ObjectId  | Auto-generated primary key               |
| `symbol`      | String    | e.g. `BTCUSDT`, stored uppercase         |
| `direction`   | Enum      | `BUY` or `SELL`                          |
| `entry_price` | Number    | Signal entry price                       |
| `stop_loss`   | Number    | Stop loss level                          |
| `target_price`| Number    | Take-profit level                        |
| `entry_time`  | Date      | When signal becomes active               |
| `expiry_time` | Date      | Must be after `entry_time`               |
| `created_at`  | Date      | Auto-set by Mongoose timestamps          |
| `status`      | Enum      | `OPEN` \| `TARGET_HIT` \| `STOPLOSS_HIT` \| `EXPIRED` |
| `realized_roi`| Number?   | Nullable — set when signal resolves      |

Indexes: `status`, `symbol`, `expiry_time`

---

## API Documentation

### `POST /api/signals`
Create a new signal.

**Request body:**
```json
{
  "symbol": "BTCUSDT",
  "direction": "BUY",
  "entry_price": 65000,
  "stop_loss": 63000,
  "target_price": 70000,
  "entry_time": "2026-05-01T10:00:00.000Z",
  "expiry_time": "2026-05-02T10:00:00.000Z"
}
```

**Validation rules:**
- BUY: `stop_loss < entry_price`, `target_price > entry_price`
- SELL: `stop_loss > entry_price`, `target_price < entry_price`
- `expiry_time` must be after `entry_time`
- `entry_time` can be up to 24 hours in the past (historical signals)

**Response:** `201 Created`
```json
{ "success": true, "data": { ...signal } }
```

---

### `GET /api/signals`
List all signals enriched with live prices, live ROI, and resolved status.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "symbol": "BTCUSDT",
      "status": "OPEN",
      "current_price": 67342.1,
      "live_roi": 3.60,
      "time_remaining_ms": 82800000,
      ...
    }
  ]
}
```

---

### `GET /api/signals/:id`
Get a single signal by ID with live price data.

---

### `GET /api/signals/:id/status` *(recommended)*
Lightweight endpoint returning current live status + ROI for a single signal. Useful for polling.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "symbol": "BTCUSDT",
    "status": "OPEN",
    "current_price": 67342.1,
    "live_roi": 3.60,
    "time_remaining_ms": 82800000
  }
}
```

---

### `DELETE /api/signals/:id`
Delete a signal permanently.

**Response:** `200 OK`
```json
{ "success": true, "message": "Signal deleted" }
```

---

### Error Responses

All errors follow this shape:
```json
{ "success": false, "error": "Human-readable message" }
```

Validation errors:
```json
{
  "success": false,
  "errors": [
    { "field": "stop_loss", "message": "BUY: stop_loss must be less than entry_price" }
  ]
}
```

---

## Architecture

```
killshill/
├── backend/
│   └── src/
│       ├── index.ts              # Entry point + graceful shutdown
│       ├── app.ts                # Express app, middleware, routes
│       ├── lib/
│       │   ├── db.ts             # Mongoose connection
│       │   └── AppError.ts       # Typed error class
│       ├── models/
│       │   └── signal.model.ts   # Mongoose schema + model
│       ├── services/
│       │   ├── signal.service.ts # Business logic (create, list, resolve)
│       │   └── binance.service.ts# Price fetching with 5s cache
│       ├── controllers/
│       │   └── signal.controller.ts
│       ├── middleware/
│       │   ├── validate.middleware.ts  # Zod validation
│       │   └── error.middleware.ts     # Global error handler
│       └── routes/
│           └── signal.routes.ts
│
└── frontend/
    └── src/
        ├── api/signals.ts        # Axios API calls
        ├── hooks/useSignals.ts   # Data fetching + 15s auto-refresh
        ├── components/
        │   ├── SignalForm.tsx     # Create form with validation UI
        │   └── SignalTable.tsx    # Dashboard table
        ├── types/index.ts
        ├── App.tsx
        └── styles.css
```

### Key Design Decisions

**Status Resolution:** Computed at read-time by comparing live Binance price against thresholds. When a non-OPEN status is detected, it's persisted immediately to MongoDB so the signal is "locked in" and never re-evaluated. EXPIRED signals are fully immutable.

**Binance Price Caching:** A 5-second in-memory cache prevents rate-limiting when multiple signals share the same symbol. The `GET /api/signals` endpoint fetches all unique symbols in a single Binance API call using `/ticker/price` (no symbol param returns all).

**ROI Formula:**
- BUY:  `(currentPrice − entryPrice) / entryPrice × 100`
- SELL: `(entryPrice − currentPrice) / entryPrice × 100`

**Frontend Auto-Refresh:** `useSignals` hook sets a `setInterval` at 15 seconds. Refresh calls are "silent" (no loading spinner on refresh, only on initial load) to avoid UI flicker.

**Layered Architecture:** Controller → Service → Model. Controllers handle HTTP concerns only. Services contain all business logic. No business logic leaks into routes or models.

---

## ROI Display

ROI is always shown to 2 decimal places (e.g. `+3.60%`, `-1.24%`). For OPEN signals, this is live ROI based on current Binance price. For resolved signals, it's the `realized_roi` locked in at resolution time.
# killshill-assignment
