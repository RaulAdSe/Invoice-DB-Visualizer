#!/bin/bash

# Set variables
PROJECT_ID="utopian-honor-438919-b9"
REGION="europe-southwest1"
REPOSITORY="invoiceapp"
REGISTRY="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}"

# Configure gcloud project
echo "Configuring gcloud project..."
gcloud config set project ${PROJECT_ID}

# Configure Docker for GCP
echo "Configuring Docker authentication..."
gcloud auth configure-docker ${REGION}-docker.pkg.dev
# Stop and remove all running containers
echo "Cleaning up existing containers..."
docker stop $(docker ps -a -q) 2>/dev/null || true
docker rm $(docker ps -a -q) 2>/dev/null || true

# Build the images with no-cache
echo "Building Docker images..."
docker build --no-cache -t servitec-db-app-frontend:latest -f Dockerfile.frontend .
docker build --no-cache -t servitec-db-app-backend:latest -f Dockerfile.backend .

# Tag the images
echo "Tagging Docker images..."
docker tag servitec-db-app-frontend:latest ${REGISTRY}/servitec-frontend:latest
docker tag servitec-db-app-backend:latest ${REGISTRY}/servitec-backend:latest

# Push the images
echo "Pushing images to Container Registry..."
docker push ${REGISTRY}/servitec-frontend:latest
docker push ${REGISTRY}/servitec-backend:latest

# Deploy to Cloud Run
echo "Deploying to Cloud Run..."
gcloud run deploy servitec-frontend \
  --image ${REGISTRY}/servitec-frontend:latest \
  --platform managed \
  --region ${REGION} \
  --allow-unauthenticated

gcloud run deploy servitec-backend \
  --image ${REGISTRY}/servitec-backend:latest \
  --platform managed \
  --region ${REGION} \
  --allow-unauthenticated \
  --add-cloudsql-instances=${PROJECT_ID}:${REGION}:servitec-invoices \
  --set-env-vars=INSTANCE_CONNECTION_NAME=${PROJECT_ID}:${REGION}:servitec-invoices