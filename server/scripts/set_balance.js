const pool = require('../config/db');

const updateBalance = async () => {
    try {
        const amount = 1000;
        // Solo actualizar el balance de los jugadores (no administradores)
        // Esto respeta la regla de "sin modificar al rol de administrador" (no tocamos admins)
        const res = await pool.query(
            "UPDATE users SET balance = $1 WHERE is_admin = FALSE", 
            [amount]
        );
        console.log(`¡Éxito! Balance de ${res.rowCount} jugadores actualizado a $${amount}.`);
        process.exit();
    } catch (err) {
        console.error("Error actualizando balance:", err);
        process.exit(1);
    }
};

updateBalance();
