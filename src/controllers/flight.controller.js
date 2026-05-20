
import axios from "axios";

// =========================
// HELPER FUNCTION
// =========================
const getCabinPrices = async (
  origin,
  destination,
  departure_date,
  apiKey
) => {
  const cabinClasses = [
    "economy",
    "premium_economy",
    "business",
    "first",
  ];

  const results = await Promise.all(
    cabinClasses.map(async (cabin) => {
      try {
        const response = await axios.post(
          "https://api.duffel.com/air/offer_requests",
          {
            data: {
              slices: [
                {
                  origin,
                  destination,
                  departure_date,
                },
              ],
              passengers: [{ type: "adult" }],
              cabin_class: cabin,
            },
          },
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Duffel-Version": "v2",
              "Content-Type": "application/json",
            },
          }
        );
        const offers = response.data.data.offers || [];
        
        const cheapestPrice =
          offers.length > 0
            ? Math.min(
                ...offers.map((o) => parseFloat(o.total_amount))
              )
            : null;

        return {
          cabin_class: cabin,
          price: cheapestPrice,
          currency: offers[0]?.total_currency || "USD",
        };
      } catch (err) {
        console.log(
          "Cabin Error:",
          cabin,
          err.response?.data || err.message
        );

        return {
          cabin_class: cabin,
          price: null,
        };
      }
    })
  );

  return results;
};

// =========================
// SEARCH FLIGHTS
// =========================

export const searchFlights = async (req, res) => {
  const {
    from,
    to,
    date,
    adults,
    children,
    infants,
    cabin_class,
    return_date,
  } = req.body;

  if (!from || !to || !date) {
    return res.status(400).json({
      message: "Departure, Destination and Date are mandatory.",
    });
  }

  try {
    const apiKey = process.env.DUFFEL_API_KEY;

    // PASSENGERS
    const passengers = [];

    for (let i = 0; i < (parseInt(adults) || 1); i++) {
      passengers.push({ type: "adult" });
    }

    for (let i = 0; i < (parseInt(children) || 0); i++) {
      passengers.push({ type: "child" });
    }

    for (let i = 0; i < (parseInt(infants) || 0); i++) {
      passengers.push({ type: "infant_without_seat" });
    }

    // SLICES
    const slices = [
      {
        origin: from,
        destination: to,
        departure_date: date,
      },
    ];

    // ROUND TRIP
    if (return_date) {
      slices.push({
        origin: to,
        destination: from,
        departure_date: return_date,
      });
    }

    // STEP 1 → CREATE REQUEST
    const createResponse = await axios.post(
      "https://api.duffel.com/air/offer_requests",
      {
        data: {
          slices,
          passengers,
          cabin_class: cabin_class || "economy",
        },
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Duffel-Version": "v2",
          "Content-Type": "application/json",
        },
      }
    );

    const requestId = createResponse.data.data.id;

    // WAIT
    await new Promise((resolve) => setTimeout(resolve, 2500));

    // STEP 2 → FETCH OFFERS
    const offersResponse = await axios.get(
      `https://api.duffel.com/air/offer_requests/${requestId}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Duffel-Version": "v2",
          "Content-Type": "application/json",
        },
      }
    );

    const offers = offersResponse.data.data.offers || [];
    const routeCache = {};

    // FINAL DATA
    const flights = await Promise.all(
    offers.map(async (offer) => {
    const firstSlice = offer.slices?.[0];

    const routeKey = `${firstSlice.origin?.iata_code}-${firstSlice.destination?.iata_code}-${firstSlice.segments?.[0]?.departing_at?.split("T")[0]}`;

    // CACHE CHECK
    if (!routeCache[routeKey]) {
      routeCache[routeKey] = await getCabinPrices(
        firstSlice.origin?.iata_code,
        firstSlice.destination?.iata_code,
        firstSlice.segments?.[0]?.departing_at?.split("T")[0],
        apiKey
      );
    }

    return {
      id: offer.id,

      total_amount: offer.total_amount,

      currency: offer.total_currency,

      airline_name:
        offer.owner?.name ||
        offer.slices?.[0]?.segments?.[0]?.operating_carrier?.name,

      airline_logo: offer.owner?.logo_symbol_url,

      // CACHED CABIN PRICES
      cabin_prices: routeCache[routeKey],

      slices: offer.slices.map((slice) => ({
        origin: slice.origin?.city_name || slice.origin?.name,

        origin_code: slice.origin?.iata_code,

        destination:
          slice.destination?.city_name || slice.destination?.name,

        destination_code: slice.destination?.iata_code,

        departure_time: slice.segments?.[0]?.departing_at,

        arrival_time:
          slice.segments?.[slice.segments.length - 1]?.arriving_at,

        duration: slice.duration,

        stops: slice.segments.length - 1,

        airline:
          slice.segments?.[0]?.operating_carrier?.name || "Unknown",
      })),
    };
  })
);

const simplifiedData = {
  total_flights: offers.length,
  search_id: requestId,
  flights,
};
    
    res.status(200).json(simplifiedData);
  } catch (error) {
    console.log(
      "Duffel Error:",
      error.response?.data || error.message
    );

    res.status(500).json({
      error: "Search Failed",
      details:
        error.response?.data?.errors?.[0]?.message ||
        error.message,
    });
  }
};

// =========================
// AIRPORT SEARCH
// =========================
export const getAirports = async (req, res) => {
  const { query } = req.query;

  if (!query || query.length < 2) {
    return res.status(400).json({
      error: "Query must be atleast 2 character long",
    });
  }

  const apiKey = process.env.DUFFEL_API_KEY;

  try {
    const response = await axios.get(
      `https://api.duffel.com/places/suggestions?query=${encodeURIComponent(query)}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Duffel-Version": "v2",
          "Content-Type": "application/json",
        },
      }
    );

    const suggestions = response.data.data
      .filter((place) => place.type === "airport")
      .map((airport) => ({
        id: airport.id,
        name: airport.name,
        iata_code: airport.iata_code,
        city_name: airport.city?.name || airport.name,
        country_name:
          airport.city?.parent_country?.name || "",

        label: `${airport.name} (${airport.iata_code}) - ${airport.city?.name || ""}`,
      }));

    return res.status(200).json(suggestions);
  } catch (error) {
    console.error(
      "Duffel Airport API Error:",
      error.response?.data || error.message
    );

    return res.status(500).json({
      error: "Failed to fetch airport suggestions",
      details:
        error.response?.data?.errors?.[0]?.message ||
        "Internal Error",
    });
  }
};
