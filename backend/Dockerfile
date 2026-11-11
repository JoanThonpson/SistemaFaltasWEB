# ---------- Etapa 1: instala as dependências de produção ----------
FROM node:24 AS deps
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev
# Se o SQLite nativo não carregar, o erro aparece AQUI (na construção), e não em produção:
RUN node -e "const D=require('better-sqlite3'); console.log('SQLite', new D(':memory:').prepare('select sqlite_version() v').get().v)"

# ---------- Etapa 2: imagem final, só o que roda ----------
FROM node:24-slim
ENV NODE_ENV=production
WORKDIR /app/backend

COPY --from=deps /app/backend/node_modules ./node_modules
COPY backend/package.json ./
COPY backend/src ./src
COPY frontend /app/frontend

# Pasta do banco e dos backups, com dono "node" (usuário sem privilégios)
RUN mkdir -p data/backups && chown -R node:node data
USER node

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://localhost:'+(process.env.PORT||3000)+'/api/saude').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "src/server.js"]