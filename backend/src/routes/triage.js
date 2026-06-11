import { Router } from "express";
import { triageTicket, listTickets, getTicket, deleteTicket, seedExampleTickets } from "../services/triage.js";


export const triageRouter = Router();


// Seed demo data on first load
seedExampleTickets();


/** POST /api/triage — classify a new ticket */
triageRouter.post("/", async (req, res, next) => {
 try {
   const { text } = req.body;
   if (!text?.trim()) {
     return res.status(400).json({ error: "text field is required" });
   }
   const result = await triageTicket(text);
   res.json(result);
 } catch (err) {
   next(err);
 }
});


/** GET /api/triage — list all tickets with optional filters */
triageRouter.get("/", (req, res) => {
 const { category, priority, sentiment } = req.query;
 const tickets = listTickets({ category, priority, sentiment });
 res.json({ tickets, total: tickets.length });
});


/** GET /api/triage/:id — get single ticket */
triageRouter.get("/:id", (req, res) => {
 const ticket = getTicket(req.params.id);
 if (!ticket) return res.status(404).json({ error: "Ticket not found" });
 res.json(ticket);
});


/** DELETE /api/triage/:id — delete a ticket */
triageRouter.delete("/:id", (req, res) => {
 const deleted = deleteTicket(req.params.id);
 res.json({ deleted });
});
