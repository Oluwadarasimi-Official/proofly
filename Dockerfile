# PROOFLY on Rumpty Cloud - self-contained image (node:20 has node+npm)
FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# NEXT_PUBLIC_* are inlined at build time (public values by design)
ENV NEXT_PUBLIC_SUPABASE_URL=https://tziximfuystheohpckpo.supabase.co
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6aXhpbWZ1eXN0aGVvaHBja3BvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1MTk4ODIsImV4cCI6MjEwNjA5NTg4Mn0.L3wTYrwD1fpFKMUchZ6hTfWCrcD-Ee05ekzmG0ALuBg
ENV NEXT_PUBLIC_SITE_URL=https://proofly.rumptycloud.app
RUN npm run build
EXPOSE 8080
CMD ["sh","-c","npm start"]
