# Invoice Management System

A full-stack application for managing invoices, elements, and projects with advanced filtering, reporting, and chat capabilities. Built with React and Flask, deployable to Google Cloud Platform.

## Features

- 📊 Project and invoice management
- 🔍 Advanced filtering and search
- 📑 Excel report generation
- 💬 AI-powered chat interface for data queries
- 🔐 Role-based access control (Admin/User)
- 📱 Responsive design
- 🚀 Cloud-ready with GCP deployment
- 🔄 Real-time updates
- 📈 Data visualization

## Technology Stack

### Frontend
- React 18
- Material-UI (MUI)
- Axios for API calls
- React Router for navigation
- DataGrid for data display

### Backend
- Flask
- PostgreSQL
- OpenAI integration
- JWT authentication
- SQLAlchemy

### Infrastructure
- Docker & Docker Compose
- Nginx
- Google Cloud Platform
- Cloud Run
- Cloud SQL

## Prerequisites

- Node.js v18+
- Python 3.10+
- Docker and Docker Compose
- Google Cloud CLI
- PostgreSQL 13+
- OpenAI API key

## Local Development Setup

1. Clone the repository
```bash
git clone <repository-url>
cd invoice-management-system
```

2. Set up environment variables:

Create `.env` file in the root directory:
```env
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key

# Security
SECRET_KEY=your_secret_key
JWT_SECRET=your_jwt_secret
PASSWORD_SALT=your_password_salt

# Database Configuration
DB_HOST=localhost
DB_NAME=ServitecInvoiceDataBase
DB_USER=postgres
DB_PASSWORD=your_db_password

# Application Settings
PORT=8080
FLASK_ENV=development

# User Authentication
ADMIN_PASSWORD=your_admin_password
USER_PASSWORD=your_user_password

# Development URLs
API_BASE_URL=http://localhost:8080
BACKEND_URL=http://localhost:8080

# VPN Configuration (if needed)
VPN_SUBNET=your_vpn_subnet
```

3. Install dependencies:
```bash
# Frontend dependencies
cd frontend
npm install

# Backend dependencies
cd backend
pip install -r requirements.txt
```

4. Start the development servers:
```bash
# Start backend
python server.py

# Start frontend (in another terminal)
npm start
```

## Docker Development

1. Build and run with Docker Compose:
```bash
docker-compose up --build
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend: http://localhost:5000

## Database Setup

1. Create PostgreSQL database:
```bash
psql -U postgres
CREATE DATABASE "ServitecInvoiceDataBase";
```

2. Run migrations:
```bash
cd backend
python manage.py db upgrade
```

## Google Cloud Platform Deployment

1. Configure GCP:
```bash
# Install Google Cloud CLI
gcloud init
gcloud config set project your-project-id
```

2. Set up environment:
```bash
# Configure Docker for GCP
gcloud auth configure-docker REGION-docker.pkg.dev
```

3. Deploy:
```bash
# Run deployment script
./deploy.sh
```

The deployment script will:
- Build Docker images
- Push to Google Container Registry
- Deploy to Cloud Run
- Configure Cloud SQL connection

## Environment Variables

Create a `.env` file based on `.env.example`. Required variables:

### Backend Variables
```env
OPENAI_API_KEY=        # Your OpenAI API key
SECRET_KEY=            # Flask secret key
JWT_SECRET=            # JWT signing key
PASSWORD_SALT=         # Password hashing salt
DB_HOST=               # Database host
DB_NAME=               # Database name
DB_USER=               # Database user
DB_PASSWORD=           # Database password
ADMIN_PASSWORD=        # Admin user password
USER_PASSWORD=         # Regular user password
```

### Frontend Variables
```env
REACT_APP_API_URL=     # Backend API URL
```

### Deployment Variables
```env
PROJECT_ID=            # GCP project ID
REGION=                # GCP region
INSTANCE_CONNECTION_NAME= # Cloud SQL instance connection name
```

## Security

- JWT-based authentication
- Role-based access control
- SQL injection protection
- Rate limiting
- Secure password hashing
- CORS protection

## Available Scripts

```bash
# Development
npm start              # Start frontend
python server.py       # Start backend

# Docker
docker-compose up      # Start all services
docker-compose down    # Stop all services

# Deployment
./deploy.sh           # Deploy to GCP
```



## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License.
