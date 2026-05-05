# Smart Complaint & Incident Management System

##  How to Start the Application

### 1. Start the Backend
Open a terminal in the `backend/` directory and run:
```powershell
# Set environment to use local SQLite for testing
$env:USE_SQLITE='true'

# Install dependencies (if not done)
pip install -r requirements.txt

# Start the FastAPI server
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
- **API Documentation**: [http://localhost:8000/docs](http://localhost:8000/docs)

### 2. Start the Frontend
Open a **new** terminal in the `frontend/` directory and run:
```powershell
# Install dependencies (if not done)
npm install

# Start the React dev server
npm run dev -- --port 3000
```
- **Web App**: [http://localhost:3000](http://localhost:3000)

---

##  Permission & Access Control (RBAC)

Yes, this is a **permission-based** system. We use JWT (JSON Web Tokens) to enforce the following roles:

| Role | Permissions |
| :--- | :--- |
| **Admin** | Can view **all** complaints, assign staff, update any status, and access the admin panel. |
| **Staff** | Can view complaints **assigned to them** and update their status/priority. |
| **User** | Can only view and track **their own** complaints. |

### Multi-Tenant / Privacy Logic:
While this is currently a single-instance system, it follows "multi-tenant" privacy principles:
- **Data Isolation**: Users are logically isolated. A regular user's API request for `GET /complaints/` only returns rows where `user_id == current_user.id`.
- **Protected Routes**: The frontend and backend both check the `role` claim in the JWT before allowing access to specific features (like the Admin Panel).

---

##  Tech Stack Recap
- **Backend**: FastAPI (Async), SQLAlchemy 2.0, JWT.
- **Frontend**: React (Vite), Tailwind CSS, Lucide Icons.
- **Real-time**: WebSockets for instant status updates.
- **Async Jobs**: Celery + Redis (for auto-escalation).
- **Database**: PostgreSQL (Production) / SQLite (Test).
