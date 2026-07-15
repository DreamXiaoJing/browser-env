FROM docker.1ms.run/library/node:22-slim
#FROM node:22-slim

WORKDIR /app
COPY . .
CMD ["node", "examples/h5st.js"]