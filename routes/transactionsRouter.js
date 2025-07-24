import express from "express"
import { sql } from "../config/db.js"

const router = express.Router();


router.get("/:userId", async (req, res) => {
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

router.delete("/:id", async (req, res) => {
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

router.post("/", async (req, res) => {
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

router.get("/summary/:userId", async (req, res) => {
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

export default router;