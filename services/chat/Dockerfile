FROM node:24-slim

WORKDIR /app

# Install production dependencies first for layer caching
COPY package.json package-lock.json ./
RUN npm install --production

# Copy application source
COPY lib/ ./lib/
COPY sql/ ./sql/
COPY server.js ./

# Blog content mount point (optional; can be bind-mounted at runtime)
VOLUME /app/blog

EXPOSE 3000

CMD ["node", "server.js"]
