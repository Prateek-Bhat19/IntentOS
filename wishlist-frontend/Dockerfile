# User official Node.js image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package.json and lock file
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application
COPY . .

# Build the Next.js app
RUN npm run build

# Expose port (Next.js default is 3000)
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
