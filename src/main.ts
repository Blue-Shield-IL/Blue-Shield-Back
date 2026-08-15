import morgan from "morgan";
import { AppModule } from "./app.module";
import cookieParser from "cookie-parser";
import { NestFactory, Reflector } from "@nestjs/core";
import { ClassSerializerInterceptor, ValidationPipe } from "@nestjs/common";

const main = async () => {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());
  app.use(morgan(":method :url :status :response-time ms"));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  const allowedOrigins = (
    process.env.CLIENT_URL || "http://localhost:5173"
  )
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  const PORT = parseInt(process.env.PORT || "3000");
  await app.listen(PORT, () => console.log(`Listening on port: ${PORT}`));
};

main();
