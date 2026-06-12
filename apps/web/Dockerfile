FROM node:20-alpine

WORKDIR /app

# Install deps first (cache layer)
COPY package*.json ./
RUN npm install

# Copy source
COPY . .

# Build will happen on dev start
EXPOSE 3000

CMD ["npm", "run", "dev"]
