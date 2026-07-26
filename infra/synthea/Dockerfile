FROM eclipse-temurin:21-jdk-alpine

ENV JAVA_TOOL_OPTIONS="-XX:+UseSerialGC -XX:TieredStopAtLevel=1 -Xms128m -Xmx1024m -XX:ErrorFile=/tmp/rce-synthea-hs-err-%p.log"

ARG SYNTHEA_VERSION=4.0.0
ARG SYNTHEA_SHA256=ed43c20ad40ba5c3bc724503a5af032715fe3c491620b766148e7c2361e6ecc1

RUN apk add --no-cache bash curl jq \
  && curl --fail --location --show-error --silent \
    --retry 3 --retry-delay 2 \
    "https://github.com/synthetichealth/synthea/releases/download/v${SYNTHEA_VERSION}/synthea-with-dependencies.jar" \
    --output /opt/synthea.jar \
  && echo "${SYNTHEA_SHA256}  /opt/synthea.jar" | sha256sum -c -

COPY infra/synthea/generate-and-load.sh /usr/local/bin/generate-and-load

RUN chmod 0755 /usr/local/bin/generate-and-load

LABEL org.opencontainers.image.source="https://github.com/synthetichealth/synthea" \
  org.opencontainers.image.version="${SYNTHEA_VERSION}" \
  org.opencontainers.image.licenses="Apache-2.0"

ENTRYPOINT ["/usr/local/bin/generate-and-load"]
