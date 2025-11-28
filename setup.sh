#!/bin/bash

# FitGPT Setup Script
# This script sets up the development environment for the FitGPT project

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Flags
SKIP_SEED=false
SKIP_BUILD=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --skip-seed)
      SKIP_SEED=true
      shift
      ;;
    --skip-build)
      SKIP_BUILD=true
      shift
      ;;
    --help|-h)
      echo "FitGPT Setup Script"
      echo ""
      echo "Usage: ./setup.sh [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --skip-seed    Skip seeding exercise database"
      echo "  --skip-build   Skip building backend TypeScript"
      echo "  --help, -h     Show this help message"
      echo ""
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

# Helper functions
print_step() {
  echo -e "\n${BLUE}==>${NC} ${1}"
}

print_success() {
  echo -e "${GREEN}✓${NC} ${1}"
}

print_error() {
  echo -e "${RED}✗${NC} ${1}"
}

print_warning() {
  echo -e "${YELLOW}⚠${NC} ${1}"
}

# Check if command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Main setup process
main() {
  echo -e "${GREEN}"
  echo "╔═══════════════════════════════════════╗"
  echo "║     FitGPT Development Setup          ║"
  echo "╚═══════════════════════════════════════╝"
  echo -e "${NC}"

  # 1. Check prerequisites
  print_step "Checking prerequisites..."

  # Check Docker
  if ! command_exists docker; then
    print_error "Docker is not installed"
    echo "Please install Docker from https://www.docker.com/get-started"
    exit 1
  fi
  print_success "Docker is installed"

  # Check if Docker daemon is running
  if ! docker info >/dev/null 2>&1; then
    print_error "Docker daemon is not running"
    echo "Please start Docker and try again"
    exit 1
  fi
  print_success "Docker daemon is running"

  # Check Node.js
  if ! command_exists node; then
    print_error "Node.js is not installed"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
  fi
  NODE_VERSION=$(node --version)
  print_success "Node.js is installed (${NODE_VERSION})"

  # Check npm
  if ! command_exists npm; then
    print_error "npm is not installed"
    echo "Please install npm"
    exit 1
  fi
  NPM_VERSION=$(npm --version)
  print_success "npm is installed (v${NPM_VERSION})"

  # Check for pgvector Docker image availability
  print_step "Checking pgvector Docker image..."
  if docker pull pgvector/pgvector:pg16 >/dev/null 2>&1; then
    print_success "pgvector Docker image is available"
  else
    print_warning "Could not pull pgvector image, but will continue (may already exist locally)"
  fi

  # 2. Create .env files if they don't exist
  print_step "Setting up environment files..."

  # Backend .env
  if [ ! -f "backend/.env" ]; then
    if [ -f "backend/.env.example" ]; then
      cp backend/.env.example backend/.env
      print_success "Created backend/.env from .env.example"
      print_warning "Please update backend/.env with your configuration (especially JWT_SECRET and ANTHROPIC_API_KEY)"
    else
      print_error "backend/.env.example not found"
      exit 1
    fi
  else
    print_success "backend/.env already exists"
  fi

  # Frontend .env
  if [ ! -f "frontend/.env" ]; then
    if [ -f "frontend/.env.example" ]; then
      cp frontend/.env.example frontend/.env
      print_success "Created frontend/.env from .env.example"
    else
      print_error "frontend/.env.example not found"
      exit 1
    fi
  else
    print_success "frontend/.env already exists"
  fi

  # 3. Install dependencies
  print_step "Installing dependencies..."

  # Install backend dependencies
  echo "Installing backend dependencies..."
  (cd backend && npm install) || {
    print_error "Failed to install backend dependencies"
    exit 1
  }
  print_success "Backend dependencies installed"

  # Install frontend dependencies
  echo "Installing frontend dependencies..."
  (cd frontend && npm install) || {
    print_error "Failed to install frontend dependencies"
    exit 1
  }
  print_success "Frontend dependencies installed"

  # 4. Start Docker containers
  print_step "Starting Docker containers..."

  # Check if containers are already running
  if docker compose ps | grep -q "fit-gpt-postgres.*Up"; then
    print_success "Docker containers are already running"
  else
    docker compose up -d || {
      print_error "Failed to start Docker containers"
      exit 1
    }
    print_success "Docker containers started"
  fi

  # 5. Wait for database to be ready
  print_step "Waiting for database to be ready..."

  MAX_RETRIES=30
  RETRY_COUNT=0
  until docker compose exec -T postgres pg_isready -U postgres >/dev/null 2>&1; do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
      print_error "Database failed to become ready after ${MAX_RETRIES} attempts"
      exit 1
    fi
    echo -n "."
    sleep 1
  done
  echo ""
  print_success "Database is ready"

  # 6. Run migrations
  print_step "Running database migrations..."

  (cd backend && npm run migrate:latest) || {
    print_error "Failed to run migrations"
    exit 1
  }
  print_success "Database migrations completed"

  # 7. Seed exercises (optional)
  if [ "$SKIP_SEED" = false ]; then
    print_step "Seeding exercise database..."
    print_warning "This may take a few minutes..."

    (cd backend && npm run seed:exercises) || {
      print_warning "Failed to seed exercises (you can seed manually later with: cd backend && npm run seed:exercises)"
    }
    print_success "Exercise database seeded"
  else
    print_warning "Skipping exercise seeding (use --skip-seed to skip)"
  fi

  # 8. Build backend (optional)
  if [ "$SKIP_BUILD" = false ]; then
    print_step "Building backend TypeScript..."

    (cd backend && npm run build) || {
      print_error "Failed to build backend"
      exit 1
    }
    print_success "Backend built successfully"
  else
    print_warning "Skipping backend build"
  fi

  # 9. Summary
  echo -e "\n${GREEN}"
  echo "╔═══════════════════════════════════════╗"
  echo "║     Setup Complete! 🎉                ║"
  echo "╚═══════════════════════════════════════╝"
  echo -e "${NC}"

  echo -e "\n${BLUE}Next steps:${NC}"
  echo ""
  echo "1. Update environment variables (if needed):"
  echo "   - backend/.env (JWT_SECRET, ANTHROPIC_API_KEY)"
  echo "   - frontend/.env (API_BASE_URL)"
  echo ""
  echo "2. Start the backend:"
  echo "   ${GREEN}cd backend && npm run dev${NC}"
  echo ""
  echo "3. In a new terminal, start the frontend:"
  echo "   ${GREEN}cd frontend && npm start${NC}"
  echo ""
  echo "4. Access the API docs:"
  echo "   ${BLUE}http://localhost:3000/api-docs${NC}"
  echo ""
}

# Run main function
main
