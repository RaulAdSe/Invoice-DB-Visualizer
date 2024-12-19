<<<<<<< HEAD
# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
=======
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
- Psycopg2

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

## Project Structure
```
.
├── frontend/            # React frontend
│   ├── src/            # Source files
│   ├── public/         # Static files
│   └── package.json    # Dependencies
├── backend/            # Flask backend
│   ├── server.py       # Main server file
│   └── requirements.txt# Python dependencies
├── nginx/              # Nginx configuration
├── docker-compose.yml  # Docker compose config
├── deploy.sh           # Deployment script
└── README.md          # This file
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License.
>>>>>>> 342adafaa9cf08c9764b746f6b140e0c6a3cf5ee
