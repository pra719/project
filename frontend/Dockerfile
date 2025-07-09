FROM node:16

# Create app directory
WORKDIR /app

# Create a non-root user and their home directory
RUN groupadd -r appuser && \
    useradd -r -g appuser appuser && \
    mkdir -p /home/appuser && \
    chown -R appuser:appuser /home/appuser

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
