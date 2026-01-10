# Use official Puppeteer image which includes Chrome
FROM ghcr.io/puppeteer/puppeteer:21.5.2

# Set working directory
WORKDIR /usr/src/app

# Switch to root to install dependencies if needed (though puppeteer user is default in this image)
USER root

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencie
# --ignore-scripts skips puppeteer download since it's already in the base image
RUN npm ci --ignore-scripts

# Copy the rest of the application code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build the TypeScript code
RUN npm run build

# Switch ownership of everything to the puppeteer user
RUN chown -R ppttruser:ppttruser /usr/src/app

# Switch back to non-root user for security (provided by the base image)
USER ppttruser

# Expose the port the app runs on
EXPOSE 8000

# Command to run the application
CMD ["node", "dist/server.js"]
