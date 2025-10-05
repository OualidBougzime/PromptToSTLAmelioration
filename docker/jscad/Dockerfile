FROM node:18-alpine

WORKDIR /app

# Install JSCAD packages
RUN npm install @jscad/modeling @jscad/io @jscad/csg express cors

# Copy server file
COPY server.js .

EXPOSE 8790

CMD ["node", "server.js"]