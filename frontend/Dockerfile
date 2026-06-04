# Stage 1: Build the React/Vite application
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --legacy-peer-deps

# Copy application source code
COPY . .

# Build the production bundle (creates files in /app/dist)
RUN npm run build

# Stage 2: Serve the build files using Nginx
FROM nginx:stable-alpine

# Copy built static files from Stage 1
COPY --from=build /app/dist /usr/share/nginx/html

# Copy the Nginx configuration template
COPY default.conf.template /etc/nginx/templates/default.conf.template

# Expose port 80
EXPOSE 80

# Substitute environment variables in the Nginx configuration at startup and run Nginx.
# If BACKEND_URL is not set, it defaults to https://co.nobaraafashion.co.in.
CMD ["/bin/sh", "-c", "export BACKEND_URL=${BACKEND_URL:-https://co.nobaraafashion.co.in} && envsubst '${BACKEND_URL}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && exec nginx -g 'daemon off;'"]
