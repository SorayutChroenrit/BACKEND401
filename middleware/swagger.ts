import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import path from "path";
import { Express } from "express";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "API Documentation",
      version: "1.0.0",
      description: "API documentation for the application",
    },
  },
  apis: [path.resolve(__dirname, "../src/**/*.ts")],
};

const swaggerSpec = swaggerJsdoc(options);

export function useSwagger(app: Express): void {
  app.use("/document", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}
