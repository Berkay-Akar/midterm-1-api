const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const secretKey = "secretKey";

const sql = require("mssql");
const { get } = require("http");

/**
/**
 * @swagger
 * /tickets:
 *   get:
 *     summary: Retrieve a list of tickets
 *     description: Endpoint to get information about all users. Requires JWT authentication.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: page
 *         in: query
 *         description: Page number (default: 1)
 *         schema:
 *           type: integer
 *           default: 1
 *       - name: pageSize
 *         in: query
 *         description: Number of items per page (default: 10)
 *         schema:
 *           type: integer
 *           default: 10
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

app.get("/tickets", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    console.log(authHeader);
    if (!authHeader) {
      return res.status(401).send("No token provided");
    }
    const token = authHeader.split(" ")[1];
    jwt.verify(token, secretKey); // Verify the token synchronously

    const { page = 1, pageSize = 10 } = req.query;
    const offset = (page - 1) * pageSize;

    const request = new sql.Request();
    const result = await request.query(
      `SELECT * FROM [dbo].[tickets] ORDER BY DESC OFFSET ${offset} ROWS FETCH NEXT ${pageSize} ROWS ONLY`
    );

    res.send(result.recordset); // Send the result
  } catch (err) {
    // Specific error for invalid JWT
    if (err.name === "JsonWebTokenError") {
      return res.status(401).send("Invalid token");
    }
    console.error(err);
    return res.status(500).send("Internal Server Error");
  }
});

/**
 * @swagger
 * /buyTicket:
 *   post:
 *     summary: Buy a ticket for a specific flight
 *     description: Endpoint to purchase a ticket for a given flight number.
 *     parameters:
 *       - in: header
 *         name: Authorization
 *         required: true
 *         schema:
 *           type: string
 *         description: JWT Token for authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ticketNumber
 *             properties:
 *               companyId:
 *                type: int
 *               description: Company id for the flight
 *               ticketNumber:
 *                 type: string
 *                 description: Ticket number for the flight
 *     responses:
 *       200:
 *         description: Ticket successfully purchased
 *       400:
 *         description: Invalid request parameters
 *       401:
 *         description: Authentication error
 */
app.post("/buyTicket", async (req, res) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).send("No token provided");
    }

    const token = authHeader.split(" ")[1];
    console.log("token", token);
    jwt.verify(token, secretKey); // Verify the token
    const user = jwt.decode(token);
    console.log("user", user);

    // Extract ticketNumber and companyId from request body
    const { ticketNumber, companyId } = req.body;

    const request = new sql.Request();
    request.input("ticketNumber", sql.Int, ticketNumber);
    request.input("companyId", sql.Int, companyId);

    // Check if the ticket is available (userId is null) and belongs to the given company
    const ticketResult = await request.query(
      `SELECT * FROM [dbo].[tickets] WHERE id = @ticketNumber AND userId IS NULL AND companyId = @companyId`
    );

    //check if ticket is exist
    const ticketExist = await request.query(
      `SELECT * FROM [dbo].[tickets] WHERE id = @ticketNumber`
    );
    if (ticketExist.recordset.length === 0) {
      return res.status(400).send("Ticket not exist.");
    }

    if (ticketResult.recordset.length === 0) {
      return res.status(400).send("Ticket not available or already purchased");
    }

    // Process the ticket purchase by setting the userId
    await request.query(
      `UPDATE [dbo].[tickets] SET userId = (SELECT id FROM [dbo].[user] WHERE username = '${user.username}') WHERE id = @ticketNumber`
    );

    res.status(200).send("Ticket successfully purchased");
  } catch (err) {
    if (err.name === "JsonWebTokenError") {
      return res.status(401).send("Invalid token");
    }
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

/**
 * @swagger
 * /companies:
 *   get:
 *     summary: Retrieve a list of companies
 *     description: Endpoint to get information about all companies. Requires JWT authentication.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: page
 *         in: query
 *         description: Page number (default: 1)
 *         schema:
 *           type: integer
 *           default: 1
 *       - name: pageSize
 *         in: query
 *         description: Number of items per page (default: 10)
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: A list of companies
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/company'
 *       401:
 *         description: Unauthorized access - No token provided or token is invalid
 */

app.get("/companies", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).send("No token provided");
    }
    const token = authHeader.split(" ")[1];
    jwt.verify(token, secretKey); // Verify the token synchronously

    const { page = 1, pageSize = 10 } = req.query;
    const offset = (page - 1) * pageSize;

    const request = new sql.Request();
    const result = await request.query(
      `SELECT * FROM [dbo].[company] ORDER BY DESC OFFSET ${offset} ROWS FETCH NEXT ${pageSize} ROWS ONLY`
    );

    res.send(result.recordset); // Send the result
  } catch (err) {
    // Specific error for invalid JWT
    if (err.name === "JsonWebTokenError") {
      return res.status(401).send("Invalid token");
    }
    console.error(err);
    return res.status(500).send("Internal Server Error");
  }
});

module.exports = app;
