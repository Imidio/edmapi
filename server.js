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
        CREATE TABLE IF NOT EXISTS devices (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            type VARCHAR(50),
            brand_id INT REFERENCES brands(id),
            model_id INT REFERENCES models(id),
            category_id INT REFERENCES categories(id),
            power_watts INT,
            voltage_volts INT,
            location VARCHAR(100),
            userId VARCHAR(100),
            installation_date DATE,
            status VARCHAR(20) DEFAULT 'Active'
        );
        `;

        await sql`CREATE TABLE IF NOT EXISTS brands (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL
        );`;
        await sql`CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL
        );`;
        await sql`CREATE TABLE IF NOT EXISTS models (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        brand_id INT REFERENCES brands(id) ON DELETE CASCADE
        );`;

        await sql`
        CREATE TABLE IF NOT EXISTS device_usage_logs (
            id SERIAL PRIMARY KEY,
            device_id INT REFERENCES devices(id) ON DELETE CASCADE,
            start_time TIMESTAMP NOT NULL,
            end_time TIMESTAMP NOT NULL,
            power_watts INT NOT NULL, -- precisa ser salvo no momento do uso
            duration_hours DECIMAL(5,2),
            energy_kwh DECIMAL(10,3)
        );
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
                category_id int NOT NULL,
                description VARCHAR(255) NOT NULL,
                created_at DATE NOT NULL DEFAULT CURRENT_DATE
            )
        `;
        await sql`
            CREATE TABLE IF NOT EXISTS st(
                id SERIAL PRIMARY KEY,
                description VARCHAR(255) NOT NULL,
                category_id int NOT NULL,
                subcategory_id int NOT NULL,
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

app.get("/api/transactions/:transactionId/details", async (req, res) => {
    try {
        const { transactionId } = req.params;
        const transactions = await sql`
            SELECT * FROM transactions WHERE id = ${transactionId} limit 1
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

app.put("/api/transactions/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { title, amount, category, user_id } = req.body;

        if (isNaN(parseInt(id))) {
            return res.status(400).json({ message: "Id Inválido!!" });
        }

        const result = await sql`
            UPDATE transactions
            SET title = ${title}, amount = ${amount}, category = ${category}
            WHERE id = ${id}
            RETURNING *
        `;

        if (result.length === 0) {
            return res.status(404).json({ message: "Não encontrado!!" });
        }

        res.status(200).json({ message: "Actualizado com sucesso!!!", updated: result[0] });
    } catch (error) {
        console.error("Falha ao actualizar Equipamento:", error);
        res.status(500).json({ error: "Failed to update equipment." });
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

//devices
app.post('/api/devices', async (req, res) => {
    const {
        name,
        brand_id,
        model_id,
        category_id,
        type,
        power_watts,
        voltage_volts,
        current_amperes,
        location,
        responsible_person,
        installation_date,
        status
    } = req.body;

    try {
        const result = await sql`
      INSERT INTO devices (
        name, brand_id, model_id, category_id, type,
        power_watts, voltage_volts, current_amperes, location,
        responsible_person, installation_date, status
      ) VALUES (
        ${name}, ${brand_id}, ${model_id}, ${category_id}, ${type},
        ${power_watts}, ${voltage_volts}, ${current_amperes}, ${location},
        ${responsible_person}, ${installation_date}, ${status}
      ) RETURNING *
    `;
        res.json(result[0]);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao inserir equipamento.' });
    }
});


//Brands
app.post('/api/brands', async (req, res) => {
    const { name } = req.body;
    try {
        const result = await sql`
      INSERT INTO brands (name) VALUES (${name}) RETURNING *
    `;
        res.json(result[0]);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao inserir marca.' });
    }
});

//Categories
app.post('/api/categories', async (req, res) => {
    const { name } = req.body;
    try {
        const result = await sql`
      INSERT INTO categories (name) VALUES (${name}) RETURNING *
    `;
        res.json(result[0]);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao inserir categoria.' });
    }
});

//models
app.post('/api/models', async (req, res) => {
    const { name, brand_id } = req.body;
    try {
        const result = await sql`
      INSERT INTO models (name, brand_id) VALUES (${name}, ${brand_id}) RETURNING *
    `;
        res.json(result[0]);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao inserir modelo.' });
    }
});

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

