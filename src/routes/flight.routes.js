import express from "express";

import {searchFlights, getAirports } from "../controllers/flight.controller.js";

const router = express.Router();
router.post('/search', searchFlights);
router.get('/airports', getAirports)
// router.get('/fare-calendar', getFareCalendar)

export default router

