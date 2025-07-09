FROM node:16

# Create app directory
WORKDIR /app

# Create a non-root user
RUN groupadd -r appuser && useradd -r -g appuser appuser

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Create necessary directories with correct permissions
RUN mkdir -p node_modules/.cache && \
    chown -R appuser:appuser /app

# Copy app source
COPY . .

# Change ownership of all files to appuser
RUN chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

EXPOSE 3000

CMD ["npm", "start"]
