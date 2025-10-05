FROM emscripten/emsdk:3.1.46

WORKDIR /app

# Clone and build OpenSCAD WASM
RUN git clone https://github.com/openscad/openscad-wasm.git . && \
    npm install && \
    npm run build

EXPOSE 8789

CMD ["npm", "start"]