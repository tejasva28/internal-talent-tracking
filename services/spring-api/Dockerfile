FROM gradle:8.8-jdk17 as build
WORKDIR /home/gradle/project
COPY . .
RUN gradle clean bootJar --no-daemon

FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /home/gradle/project/build/libs/*.jar app.jar
ENV SPRING_PROFILES_ACTIVE=prod
EXPOSE 8080
# Use memory limits for Render free tier (512MB)
ENTRYPOINT ["java","-Xmx384m","-Xms384m","-jar","/app/app.jar"]
