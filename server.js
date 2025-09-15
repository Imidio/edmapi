//const express = require("express")
import express from "express";
import dotenv from "dotenv"
import { sql } from "./config/db.js"
import rateLimiter from "./middleware/rateLimiter.js";

//import { pool } from "./config/db.js";

const app = express();

const port = process.env.PORT || 5002;

dotenv.config();

/* async function initDB1() {
  try {
    const res = await pool.query("SELECT NOW()");
    console.log("Banco conectado:", res.rows[0]);
  } catch (err) {
    console.error("Erro ao conectar:", err);
    process.exit(1);
  }
}

initDB1(); */


// Função helper para queries usando template literals




//app.use(rateLimiter);
app.use(express.json());

app.use((req, res, next) => {
    console.log("Requisicao, método: ", req.method);
    next();
});

app.get("/", (req, res) => {
    res.send("Funcionando");
});

async function initDB() {
    try {
        await sql`CREATE TABLE IF NOT EXISTS brands (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL
        )`;

        await sql`CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL
        )`;

        await sql`CREATE TABLE IF NOT EXISTS models (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        brand_id INT REFERENCES brands(id) ON DELETE CASCADE
        )`;


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
                current_amperes INT,
                location VARCHAR(100),
                userId VARCHAR(100),
                installation_date DATE,
                status VARCHAR(20) DEFAULT 'Active'
            )
            `

        await sql`
        CREATE TABLE IF NOT EXISTS device_usage_logs (
            id SERIAL PRIMARY KEY,
            device_id INT REFERENCES devices(id) ON DELETE CASCADE,
            start_time TIMESTAMP NOT NULL,
            end_time TIMESTAMP NOT NULL,
            power_watts INT NOT NULL, -- precisa ser salvo no momento do uso
            duration_hours DECIMAL(5,2),
            energy_kwh DECIMAL(10,3)
        )
        `;
        await sql`
            CREATE TABLE IF NOT EXISTS profile(
                id SERIAL PRIMARY KEY,
                user_id VARCHAR(255) NOT NULL,
                name VARCHAR(255) NOT NULL,
                location VARCHAR(255) NOT NULL,
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

});

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
});

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
});

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
});

//Profile
app.post("/api/profile", async (req, res) => {
    try {
        const { user_id, name, location, type } = req.body;

        await sql`
      INSERT INTO profile (user_id, name, location, type)
      VALUES (${user_id}, ${name}, ${location}, ${type})
    `;

        res.status(201).json({ message: "Profile created successfully" });
    } catch (error) {
        res.status(500).json({ error: "Error creating profile" });
    }
});

app.put("/api/profile/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { name, location, type } = req.body;

        await sql`
            UPDATE profile
            SET name = ${name}, location = ${location}, type = ${type}
            WHERE user_id = ${id}
            `;

        res.status(200).json({ message: "Profile updated successfully" });
    } catch (error) {
        res.status(500).json({ error: "Error updating profile" });
    }
});

app.get("/api/profile/:userId", async (req, res) => {
    try {
        const { userId } = req.params;
        const profile = await sql`
            SELECT * FROM profile WHERE user_id = ${userId} ORDER BY created_at DESC limit 1
        `;
        console.log("Data:", 1);

        res.status(200).json(profile);
    } catch (error) {
        console.error("Erro buscando dados:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

//devices
app.post('/api/devices', async (req, res) => {
    const {
        name,
        brand,
        model,
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
            name, brand, model, category_id, type,
            power_watts, voltage_volts, current_amperes, location,
            responsible_person, installation_date, status
        ) VALUES (
            ${name}, ${brand}, ${model}, ${category_id}, ${type},
            ${power_watts}, ${voltage_volts}, ${current_amperes}, ${location},
            ${responsible_person}, ${installation_date}, ${status}
        ) RETURNING *
        `;
        res.json(result[0]);
    } catch (error) {
        console.error("Erro ao inserir equipamento:", error); // Logs full error in terminal
        res.status(500).json({ error: error.message || 'Erro ao inserir equipamento.' });
    }
});

app.get("/api/devices/:userId", async (req, res) => {
    try {
        const { userId } = req.params;
        const devices = await sql`
            SELECT * FROM devices WHERE responsable_person = ${userId} order by installation_date desc
        `;
        console.log("Data:", 1);

        res.status(200).json(devices); // ✅ corrected
    } catch (error) {
        console.error("Erro buscando dados:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

app.get("/api/devices", async (req, res) => {
    try {
        const devices = await sql`
            SELECT * FROM devices order by installation_date desc
        `;
        console.log("Data:", 1);

        res.status(200).json(devices); // ✅ corrected
    } catch (error) {
        console.error("Erro buscando dados:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});


app.get("/api/devices/:deviceId/details", async (req, res) => {
    try {
        const { deviceId } = req.params;
        const devices = await sql`
            SELECT * FROM devices WHERE id = ${deviceId} limit 1
        `;
        console.log("Data:", 1);

        res.status(200).json(devices); // ✅ corrected
    } catch (error) {
        console.error("Erro buscando dados:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});


app.delete("/api/devices/:id", async (req, res) => {
    try {
        const { id } = req.params;

        if (isNaN(parseInt(id))) {
            return res.status(400).json({ message: "Id Inválido!!" });
        }

        const result = await sql`
            DELETE FROM devices WHERE id = ${id} RETURNING *
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

app.put("/api/devices/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { name, brand, category_id, type, power_watts, voltage_volts, current_amperes,
            location, installation_date, model, status
        } = req.body;

        if (isNaN(parseInt(id))) {
            return res.status(400).json({ message: "Id Inválido!!" });
        }

        const result = await sql`
            UPDATE devices
            SET name = ${name}, brand = ${brand}, model = ${model}, category_id = ${category_id},
            type = ${type}, power_watts = ${power_watts}, voltage_volts = ${voltage_volts},
            current_amperes = ${current_amperes}, location = ${location}, installation_date = ${installation_date},
            status = ${status} WHERE id = ${id}
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

app.get("/api/brands", async (req, res) => {
    try {
        const brands = await sql`
            SELECT * FROM brands
        `;
        res.status(200).json(brands);
    } catch (error) {
        console.error("Erro buscando dados:", error);
        res.status(500).json({ message: "Internal Server Error" });
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

app.get("/api/categories", async (req, res) => {
    try {
        const categories = await sql`
            SELECT * FROM categories
        `;
        res.status(200).json(categories);
    } catch (error) {
        console.error("Erro buscando dados:", error);
        res.status(500).json({ message: "Internal Server Error" });
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

app.get("/api/models", async (req, res) => {
    try {
        const models = await sql`
            SELECT * FROM models
        `;
        res.status(200).json(models);
    } catch (error) {
        console.error("Erro buscando dados:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

app.get("/api/transactions/summary/:userId", async (req, res) => {
    const hours = 24; // exemplo: 5h/dia
    const pricePerKwh = 12; // exemplo: 14,5 MZN por kWh

    try {
        const { userId } = req.params;

        const balanceResult = await sql`
            SELECT 
                COALESCE(SUM(power_watts * ${hours}) / 1000, 0) AS balance
            FROM devices      

        `;
        //      SELECT COALESCE(SUM(amount), 0) AS balance FROM transactions WHERE user_id = ${userId}

        const incomeResult = await sql`
            SELECT
             ((sum(power_watts) * ${hours})/1000) * ${pricePerKwh}  AS income
            FROM devices       
        `;       
        const expensesResult = await sql`
            SELECT 
                COALESCE(SUM(power_watts * ${hours}) / 1000, 0) AS expenses
            FROM devices
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
});

initDB().then(() => {
    app.listen(port, () => {
        console.log("Servidor correndo na porta: ", port);
    })
});

