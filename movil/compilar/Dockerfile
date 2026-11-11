# Compila el APK de la app sin Android Studio ni cuenta de Expo.
#   docker build -t tw-android movil/compilar
#   (luego movil/compilar/apk.sh)
# Gradle descarga por su cuenta lo que le falte del SDK (plataforma, NDK,
# CMake) porque las licencias quedan aceptadas aquí; los volúmenes de caché
# evitan bajarlo de nuevo en cada compilación.
# La imagen base se baja del espejo de Google por defecto: Docker Hub corta
# descargas a ratos («short read: unexpected EOF») y la compilación moría a los
# 20 segundos. Es la misma imagen oficial.
ARG BASE=mirror.gcr.io/library/eclipse-temurin:17-jdk-jammy
FROM ${BASE}

ENV ANDROID_HOME=/opt/android \
    ANDROID_SDK_ROOT=/opt/android \
    GRADLE_USER_HOME=/cache/gradle \
    NODE_OPTIONS=--max-old-space-size=4096
ENV PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools

RUN apt-get update && apt-get install -y --no-install-recommends curl unzip git ca-certificates xz-utils \
 && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
 && apt-get install -y --no-install-recommends nodejs \
 && rm -rf /var/lib/apt/lists/*

RUN mkdir -p $ANDROID_HOME/cmdline-tools \
 && curl -fsSL -o /tmp/cl.zip https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip \
 && unzip -q /tmp/cl.zip -d $ANDROID_HOME/cmdline-tools && mv $ANDROID_HOME/cmdline-tools/cmdline-tools $ANDROID_HOME/cmdline-tools/latest \
 && rm /tmp/cl.zip \
 && yes | sdkmanager --licenses >/dev/null \
 && sdkmanager "platform-tools" >/dev/null

WORKDIR /repo/movil
