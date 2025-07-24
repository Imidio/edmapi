//const express = require("express")
import express from "express";
import dotenv from "dotenv"
import { sql } from "./config/db.js"
import rateLimiter from "./middleware/rateLimiter.js";
const app = express()

const port = process.env.PORT || 5002

dotenv.config();

//app.use(rateLimiter);
app.use(express.json());

app.use((req, res, next) => {
    console.log("Requisicao, método: ", req.method);
    next();
});

app.get("/", (req, res) => {
    res.send("Funcionando");
})

async function initDB() {
    try {
        await sql`
            CREATE TABLE IF NOT EXISTS transactions(
                id SERIAL PRIMARY KEY,
                user_id VARCHAR(255) NOT NULL,
                title VARCHAR(255) NOT NULL,
                amount DECIMAL(10,2) NOT NULL,
                category VARCHAR(255) NOT NULL,
                created_at DATE NOT NULL DEFAULT CURRENT_DATE
            )
        `;
        await sql`
            CREATE TABLE IF NOT EXISTS category(
                id SERIAL PRIMARY KEY,
                description VARCHAR(255) NOT NULL,
                created_at DATE NOT NULL DEFAULT CURRENT_DATE
            )
        `;
        await sql`
            CREATE TABLE IF NOT EXISTS subcategory(
                id SERIAL PRIMARY KEY,
                category_id numeric NOT NULL,
                description VARCHAR(255) NOT NULL,
                created_at DATE NOT NULL DEFAULT CURRENT_DATE
            )
        `;
        await sql`
            CREATE TABLE IF NOT EXISTS st(
                id SERIAL PRIMARY KEY,
                description VARCHAR(255) NOT NULL,
                category_id number NOT NULL,
                subcategory_id number NOT NULL,
                capacity decimal(16,2) NOT NULL,
                created_at DATE NOT NULL DEFAULT CURRENT_DATE
            )
        `;

        await sql`
            CREATE TABLE IF NOT EXISTS profile(
                id SERIAL PRIMARY KEY,
                user_id VARCHAR(255) NOT NULL,
                picture VARCHAR(255) NOT NULL,
                age VARCHAR(255) NOT NULL,
                type VARCHAR(255) NOT NULL,
                created_at DATE NOT NULL DEFAULT CURRENT_DATE
            )
        `;
        console.log("BD INICIALIZADA: ");
    } catch (error) {
        console.log("Erro ao inicializar BD: ", error);
        process.exit(1);
    }
}

app.get("/", (req, res) => {

})

app.get("/api/transactions/:userId", async (req, res) => {
    try {
        const { userId } = req.params;
        const transactions = await sql`
            SELECT * FROM transactions WHERE user_id = ${userId} ORDER BY created_at DESC
        `;
        console.log("Data:", 1);

        res.status(200).json(transactions); // ✅ corrected
    } catch (error) {
        console.error("Erro buscando dados:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
})

app.delete("/api/transactions/:id", async (req, res) => {
    try {
        const { id } = req.params;

        if (isNaN(parseInt(id))) {
            return res.status(400).json({ message: "Id Inválido!!" });
        }

        const result = await sql`
            DELETE FROM transactions WHERE id = ${id} RETURNING *
        `;

        if (result.length === 0) {
            return res.status(404).json({ message: "Não encontrado!!" });
        }

        res.status(200).json({ message: "Deletado com sucesso!!" });
    } catch (error) {
        console.error("Error while deleting transaction:", error);
        return res.status(500).json({ error: "Failed to delete transaction." });
    }
});

app.post("/api/transactions", async (req, res) => {
    try {

        const { title, amount, category, user_id } = req.body;


        if (!title || !user_id || !category || amount === undefined) {
            return res.status(400).json({ message: "Capos obrigatorios" })
        }
        const transaction =
            await sql`
            INSERT INTO transactions(user_id, title,amount,category)
            VALUES (${user_id},${title},${amount},${category})
            RETURNING *
            `

        res.status(201).json(transaction[0]);

    } catch (error) {
        console.log("Erro ao inicializar BD: ", error);
        res.status(500).json({ message: "Falha ao inserir dados na BD" })
    }
})

app.get("/api/transactions/summary/:userId", async (req, res) => {
    try {
        const { userId } = req.params;

        const balanceResult = await sql`
            SELECT COALESCE(SUM(amount), 0) AS balance FROM transactions WHERE user_id = ${userId}
        `;

        const incomeResult = await sql`
            SELECT COALESCE(SUM(amount), 0) AS income FROM transactions 
            WHERE user_id = ${userId} AND amount > 0
        `;

        const expensesResult = await sql`
            SELECT COALESCE(SUM(amount), 0) AS expenses FROM transactions 
            WHERE user_id = ${userId} AND amount < 0
        `;

        res.status(200).json({
            balance: balanceResult[0].balance,
            income: incomeResult[0].income,
            expenses: expensesResult[0].expenses,
        });
    } catch (error) {
        console.error("Error while calculating summary:", error);
        return res.status(500).json({ error: "Failed to retrieve summary." });
    }
})

initDB().then(() => {
    app.listen(port, () => {
        console.log("Servidor correndo na porta: ", port);
    })
})

