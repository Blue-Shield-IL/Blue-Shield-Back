import morgan from "morgan";
import cookieParser from "cookie-parser";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AppModule } from "./app.module";

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

  app.enableCors({
    origin: "http://localhost:5173",
    credentials: true,
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>("PORT", 3000);

  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
};

main();
