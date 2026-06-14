import express from "express";
import {
    createSpace,
    addSpaceUnit,
    getAllSpaces,
    getSpaceById,
    getMySpaces,
    updateSpace,
    deleteSpace,
    getAllUnitsOfSpace,
    getUnitById,
    updateUnit,
    deleteUnit,
    // Import the simple type-specific controllers
    getOpenDesks,
    getDedicatedDesks,
    getPrivateCabins,
    getMeetingRooms,
    getUnitDetails,
    getUnitImages,
} from "../controllers/spaceController.js";
import protect from "../middleware/protect.middleware.js";

const spacesRoutes = express.Router();

// Public routes (no login needed)                        Admin routes



spacesRoutes.get("/allspaces", getAllSpaces);
spacesRoutes.get("/space/:id", getSpaceById);
spacesRoutes.get("/:spaceId/units", getAllUnitsOfSpace);
spacesRoutes.get("/:spaceId/units/:unitId", getUnitById);


// done clear checked






// SIMPLE UNIT TYPE ROUTES for main page                  guest routes 
spacesRoutes.get("/unit/open_desks", getOpenDesks);
spacesRoutes.get("/unit/dedicated_desks", getDedicatedDesks);
spacesRoutes.get("/unit/private_cabins", getPrivateCabins);
spacesRoutes.get("/unit/meeting_rooms", getMeetingRooms);
// spacesRoutes.get("/unit/:unitId", getUnitDetails);
spacesRoutes.get('/api/spaces/unit/:unitId', getUnitDetails);
spacesRoutes.get('/api/spaces/unit/:unitId/images', getUnitImages);
// Unit routes (nested under spaces)










// Protected routes (must be logged in) for the           user routes
spacesRoutes.post("/creation", protect, createSpace);
spacesRoutes.get("/owner/my-spaces", protect, getMySpaces);
spacesRoutes.put("/updating/:id", protect, updateSpace);
spacesRoutes.delete("/:id", protect, deleteSpace);

// done clear checked

// users remaining routes
spacesRoutes.post("/:spaceId/addunits", protect, addSpaceUnit);
spacesRoutes.put("/:spaceId/units/:unitId", protect, updateUnit);
spacesRoutes.get("/:spaceId/units", getAllUnitsOfSpace);
spacesRoutes.delete("/:spaceId/units/:unitId", protect, deleteUnit);
// Add this with your other public routes

// done clear checked

// Get single unit by its ID

export default spacesRoutes;