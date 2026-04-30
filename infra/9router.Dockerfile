FROM node:22-alpine

ARG NINE_ROUTER_VERSION=0.4.8
ENV PORT=20128
ENV HOSTNAME=0.0.0.0

RUN npm install -g "9router@${NINE_ROUTER_VERSION}"

EXPOSE 20128

CMD ["9router", "--port", "20128", "--no-browser", "--skip-update"]
