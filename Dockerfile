# -----------------------------------------------------------------------------
# Protos Treat API — Docker image
# -----------------------------------------------------------------------------
FROM node:20-alpine

WORKDIR /app

# Install dependencies first (better layer caching — this step is skipped on
# rebuilds unless package.json actually changes).
COPY package*.json ./
RUN npm install

# Now copy the rest of the source and generate the Prisma client.
COPY . .
RUN npx prisma generate

# Compile TypeScript -> dist/
RUN npm run build

EXPOSE 5001

CMD ["npm", "start"]
