const express = require("express");
const app = express();
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");
const authenticationRouter = require("./routes/authentication");
const airlineRouter = require("./routes/airlines");
const swaggerDocument = require("./swagger.json");
const getConnection = require("./connection/config");
const PORT = 3001;

let pool = null;

async function dbConnectionMiddleware(req, res, next) {
  try {
    if (pool == null) {
      pool = await getConnection();
      console.log("Database connected!");
    }
    next();
  } catch (error) {
    console.error("Database connection failed:", error);
    res.status(500).send("Internal Server Error");
  }
}

/**
 * @swagger
 * /tickets:
 *   get:
 *     summary: Retrieve a list of tickets
 *     description: Endpoint to get information about all users. Requires JWT authentication.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of tickets
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ticket'
 *       401:
 *         description: Unauthorized access - No token provided or token is invalid
 */
//get all tickets from database with authentification
app.get("/", async (req, res) => {
  res.status(200).send("API Server is running!");
});

app.use(cors());
app.use(express.json());
app.use(dbConnectionMiddleware);
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerDocument, { explorer: true })
);
app.use("/auth", authenticationRouter);
app.use("/airline", airlineRouter);

if (process.env.VERCEL == "1") {
} else {
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

module.exports = app;