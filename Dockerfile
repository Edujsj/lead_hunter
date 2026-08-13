# Imagem base oficial do Playwright com dependências do Chromium + Node.js
# Usando a versão jammy (Ubuntu 22.04) que é estável e vem com Node 20
FROM mcr.microsoft.com/playwright:v1.62.1-jammy

WORKDIR /app

# Copiar os arquivos de dependência
COPY package.json package-lock.json* ./

# Instalar as dependências do projeto
RUN npm ci

# Copiar o restante do código fonte
COPY . .

# Construir a aplicação Next.js
RUN npm run build

# O Next.js roda na porta 3000 por padrão
EXPOSE 3000

# Variáveis de ambiente padrão
ENV NODE_ENV=production
ENV PORT=3000

# Opcional: Para evitar que o Playwright tente fazer download extra de browsers já que a imagem já possui
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# Rodar o projeto
CMD ["npm", "run", "start"]
